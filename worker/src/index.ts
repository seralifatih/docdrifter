import {
  getSubscription,
  isLicensed,
  logRequest,
  countRequestsThisMonth,
  getSession,
  getReposForUser,
  addToWaitlist,
  getInstallationForRepo,
  countPrivateRepos,
} from "./db";

// Fair-use caps (allowed=1 requests per repo per calendar month). Private
// gets a higher ceiling since it's already paying; public gets a tighter
// one since it's free revenue-wise and otherwise unbounded.
const PRIVATE_MONTHLY_CAP = 100;
const PUBLIC_MONTHLY_CAP = 50;
import { verifyGithubOidcToken } from "./oidc";
import { callDeepSeek } from "./deepseek";
import { verifyPaddleSignature, handlePaddleEvent, createPortalSessionUrl } from "./paddle";
import { checkoutPage } from "./checkout";
import { statusPageActive, statusPageNeedsActivation, statusPageFree } from "./status";
import { landingPage } from "./landing";
import { privacyPage, termsPage } from "./legal";
import { verifyGithubWebhookSignature, handleGithubWebhookEvent } from "./githubApp";
import { handleGithubLogin, handleGithubCallback, handleLogout, getSessionCookieValue } from "./auth";
import { dashboardPage } from "./dashboard";

export interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_CLIENT_TOKEN: string;
  PADDLE_PRICE_ID: string;
  PADDLE_API_KEY: string;
  CHECKOUT_BASE_URL: string; // e.g. "https://api.docdrifter.dev"
  PRICE_AMOUNT: string; // e.g. "$9"
  PRICE_UNIT: string; // e.g. "per month\nper private repo"
  GITHUB_APP_CLIENT_ID: string;
  GITHUB_APP_CLIENT_SECRET: string;
  GITHUB_WEBHOOK_SECRET: string;
  STATE_SECRET: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface EvaluateRequest {
  repo: string;
  is_private: boolean;
  system_prompt: string;
  user_prompt: string;
}

async function handleEvaluate(req: Request, env: Env): Promise<Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return json({ error: "invalid_token" }, 401);
  }

  const trustedRepo = await verifyGithubOidcToken(token);
  if (!trustedRepo) {
    return json({ error: "invalid_token" }, 401);
  }

  let body: EvaluateRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  // The OIDC token's `repository` claim is the trusted identity -- never
  // the client-supplied `repo` field, which is only used for display/logging
  // once it's confirmed to match.
  if (body.repo?.toLowerCase() !== trustedRepo.toLowerCase()) {
    return json({ error: "repo_mismatch" }, 401);
  }
  const repo = trustedRepo;

  if (body.is_private) {
    const installation = await getInstallationForRepo(env.DB, repo);
    if (!installation) {
      // Private repos must have the GitHub App installed -- that's how we
      // know which installation (and therefore which subscription) covers
      // them. No installation on file means no possible license yet.
      await logRequest(env.DB, { repo, isPrivate: true, allowed: false });
      return json(
        {
          error: "app_not_installed",
          message:
            "DocDrifter is free for public repos. This repo is private and needs the DocDrifter Dashboard GitHub App installed before it can be licensed.",
          checkout_url: `${env.CHECKOUT_BASE_URL}/status?repo=${encodeURIComponent(repo)}`,
        },
        402
      );
    }

    const [sub, privateCount] = await Promise.all([
      getSubscription(env.DB, installation.installationId),
      countPrivateRepos(env.DB, installation.installationId),
    ]);
    if (!isLicensed(sub, privateCount)) {
      await logRequest(env.DB, { repo, isPrivate: true, allowed: false });
      const checkoutUrl = `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
      return json(
        {
          error: "repo_not_licensed",
          message:
            "DocDrifter is free for public repos. This repo is private and needs an active subscription covering its installation.",
          checkout_url: checkoutUrl,
        },
        402
      );
    }
  }

  // Fair-use cap: billing is flat per repo, but cost is per-PR, so a quiet
  // repo and a high-traffic monorepo currently pay the same price for very
  // different DeepSeek spend. This caps the gap rather than eliminating it
  // (a real per-usage price would be the fuller fix, but this is the cheap
  // guard against the worst case -- one noisy repo eating an unbounded
  // amount of margin, especially on the free/public tier).
  const monthlyCap = body.is_private ? PRIVATE_MONTHLY_CAP : PUBLIC_MONTHLY_CAP;
  const usedThisMonth = await countRequestsThisMonth(env.DB, repo);
  if (usedThisMonth >= monthlyCap) {
    await logRequest(env.DB, { repo, isPrivate: body.is_private, allowed: false });
    return json(
      {
        error: "monthly_limit_reached",
        message: `DocDrifter's fair-use limit for this repo (${monthlyCap} PR checks/month) has been reached. It resets at the start of next month.`,
      },
      429
    );
  }

  await logRequest(env.DB, { repo, isPrivate: body.is_private, allowed: true });

  try {
    const verdict = await callDeepSeek(env.DEEPSEEK_API_KEY, body.system_prompt, body.user_prompt);
    return json(verdict, 200);
  } catch (err) {
    return json({ error: "evaluation_failed" }, 502);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleWaitlist(req: Request, env: Env): Promise<Response> {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const email = (body.email ?? "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json({ error: "invalid_email" }, 400);
  }
  try {
    await addToWaitlist(env.DB, email);
  } catch (err) {
    return json({ error: "storage_failed" }, 500);
  }
  return json({ ok: true }, 200);
}

async function handleCheckoutPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo") ?? "";
  if (!repo) {
    return new Response("Missing repo parameter", { status: 400 });
  }
  const installation = await getInstallationForRepo(env.DB, repo);
  if (!installation) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/status?repo=${encodeURIComponent(repo)}` },
    });
  }
  const privateCount = await countPrivateRepos(env.DB, installation.installationId);
  const html = checkoutPage(
    repo,
    env.PADDLE_CLIENT_TOKEN,
    env.PADDLE_PRICE_ID,
    installation.installationId,
    installation.accountLogin,
    privateCount
  );
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleStatusPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo") ?? "";
  if (!repo) {
    return new Response("Missing repo parameter", { status: 400 });
  }

  const installation = await getInstallationForRepo(env.DB, repo);

  let html: string;
  if (!installation) {
    // App isn't installed on this repo at all. We can't tell public/private
    // from OIDC-only traffic alone, so point at installing the App -- that's
    // required for any private repo to ever become licensed, and is also
    // how a public repo would show up here with real status.
    const checkoutUrl = `${env.CHECKOUT_BASE_URL}/dashboard`;
    html = statusPageNeedsActivation(repo, checkoutUrl, env.PRICE_AMOUNT || "$9", env.PRICE_UNIT || "per month", true);
  } else if (!installation.isPrivate) {
    html = statusPageFree(repo);
  } else {
    const sub = await getSubscription(env.DB, installation.installationId);
    const privateCount = await countPrivateRepos(env.DB, installation.installationId);
    if (isLicensed(sub, privateCount) && sub) {
      const portalUrl = sub.paddle_customer_id
        ? await createPortalSessionUrl(env.PADDLE_API_KEY, sub.paddle_customer_id, sub.paddle_subscription_id)
        : null;
      html = statusPageActive(repo, sub, portalUrl, installation.accountLogin);
    } else {
      const checkoutUrl = `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
      html = statusPageNeedsActivation(repo, checkoutUrl, env.PRICE_AMOUNT || "$9", env.PRICE_UNIT || "per month", false);
    }
  }

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handlePaddleWebhook(req: Request, env: Env): Promise<Response> {
  const raw = await req.text();
  const valid = await verifyPaddleSignature(
    req.headers.get("paddle-signature"),
    raw,
    env.PADDLE_WEBHOOK_SECRET
  );
  if (!valid) {
    return json({ error: "invalid_signature" }, 401);
  }

  try {
    await handlePaddleEvent(env.DB, raw);
    return json({ ok: true }, 200);
  } catch (err) {
    // Non-2xx so Paddle retries rather than silently dropping a paid event.
    return json({ error: "processing_failed" }, 500);
  }
}

async function handleGithubWebhook(req: Request, env: Env): Promise<Response> {
  const raw = await req.text();
  const valid = await verifyGithubWebhookSignature(
    req.headers.get("X-Hub-Signature-256"),
    raw,
    env.GITHUB_WEBHOOK_SECRET
  );
  if (!valid) {
    return json({ error: "invalid_signature" }, 401);
  }

  try {
    await handleGithubWebhookEvent(env.DB, env, req.headers.get("X-GitHub-Event"), raw);
    return json({ ok: true }, 200);
  } catch (err) {
    // Non-2xx so GitHub retries rather than silently dropping an install event.
    return json({ error: "processing_failed" }, 500);
  }
}

const INSTALL_URL = "https://github.com/apps/docdrifter-dashboard/installations/new";

async function handleDashboardPage(req: Request, env: Env): Promise<Response> {
  const sessionId = getSessionCookieValue(req);
  if (!sessionId) {
    return new Response(null, { status: 302, headers: { Location: "/auth/github/login" } });
  }
  const session = await getSession(env.DB, sessionId);
  if (!session) {
    return new Response(null, { status: 302, headers: { Location: "/auth/github/login" } });
  }

  const userRepos = await getReposForUser(env.DB, session.userId);
  const installationIds = [...new Set(userRepos.map((r) => r.installation_id))];
  const subsByInstallation = new Map(
    await Promise.all(
      installationIds.map(async (id) => [id, await getSubscription(env.DB, id)] as const)
    )
  );
  const repos = userRepos.map((r) => ({
    repo: r.repo,
    isPrivate: r.is_private === 1,
    installationId: r.installation_id,
    subscription: subsByInstallation.get(r.installation_id) ?? null,
  }));

  // login/avatar aren't stored on the session row -- look them up once via
  // the users table so the dashboard header can greet the right person.
  const user = await env.DB
    .prepare("SELECT login, avatar_url FROM users WHERE github_id = ?")
    .bind(session.userId)
    .first<{ login: string; avatar_url: string | null }>();

  const html = dashboardPage(user?.login ?? "there", user?.avatar_url ?? null, repos, INSTALL_URL);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(req.url);

      if (req.method === "POST" && url.pathname === "/v1/evaluate") {
        return await handleEvaluate(req, env);
      }
      if (req.method === "POST" && url.pathname === "/waitlist") {
        return await handleWaitlist(req, env);
      }
      if (req.method === "POST" && url.pathname === "/v1/webhook/paddle") {
        return await handlePaddleWebhook(req, env);
      }
      if (req.method === "POST" && url.pathname === "/webhook/github") {
        return await handleGithubWebhook(req, env);
      }
      if (req.method === "GET" && url.pathname === "/checkout") {
        return await handleCheckoutPage(req, env);
      }
      if (req.method === "GET" && url.pathname === "/status") {
        return await handleStatusPage(req, env);
      }
      if (req.method === "GET" && url.pathname === "/auth/github/login") {
        return await handleGithubLogin(env);
      }
      if (req.method === "GET" && url.pathname === "/auth/github/callback") {
        return await handleGithubCallback(req, env);
      }
      if (req.method === "POST" && url.pathname === "/auth/logout") {
        return await handleLogout(req, env);
      }
      if (req.method === "GET" && url.pathname === "/dashboard") {
        return await handleDashboardPage(req, env);
      }
      if (req.method === "GET" && url.pathname === "/") {
        return new Response(landingPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/privacy") {
        return new Response(privacyPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/terms") {
        return new Response(termsPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Unhandled error:", err);
      return json({ error: "internal_error" }, 500);
    }
  },
};
