import {
  getSubscription,
  isRepoLicensed,
  isSubscriptionActive,
  isRepoSeated,
  countSeatsUsed,
  getSeatedRepos,
  claimSeat,
  releaseSeat,
  trimSeatsToQuantity,
  logRequest,
  countRequestsThisMonth,
  getSession,
  getReposForUser,
  addToWaitlist,
  getInstallationForRepo,
  countPrivateRepos,
  userOwnsInstallation,
  pruneExpiredSessions,
  pruneOldRequests,
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
import { getAllPosts, getPost } from "./posts";
import { blogIndexPage, blogPostPage, blogRssFeed } from "./blog";
import { robotsTxt, sitemapXml } from "./seo";
import { notFoundPage } from "./notfound";
import { ogImageSvg } from "./ogimage";

export interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_CLIENT_TOKEN: string;
  // "sandbox" to exercise checkout with Paddle test cards; anything else
  // (including unset) means real charges.
  PADDLE_ENV?: string;
  PADDLE_PRICE_ID: string;
  PADDLE_API_KEY: string;
  CHECKOUT_BASE_URL: string; // e.g. "https://api.docdrifter.dev"
  PRICE_AMOUNT: string; // e.g. "$9"
  PRICE_UNIT: string; // e.g. "per month\nper private repo"
  GITHUB_APP_CLIENT_ID: string;
  GITHUB_APP_CLIENT_SECRET: string;
  GITHUB_WEBHOOK_SECRET: string;
  STATE_SECRET: string;
  PUBLIC_RATE_LIMITER: RateLimit;
}

// True (allowed) on a rate-limiter failure -- if Cloudflare's rate limiting
// service itself is unavailable, that should never be the reason a real
// visitor gets blocked from a page. This is a defense against abuse, not a
// dependency the app should go down with.
async function checkRateLimit(limiter: RateLimit, key: string): Promise<boolean> {
  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    return true;
  }
}

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "unknown";
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

  // `body.is_private` is the client's own claim (the Action's local GitHub
  // API call) -- never trust it for licensing or cap decisions, since a
  // caller with a valid OIDC token for their own private repo could just
  // send `is_private: false` to skip the license check and get the looser
  // public cap. The installation_repos row (populated by GitHub's own
  // installation webhook) is the actual source of truth.
  const installation = await getInstallationForRepo(env.DB, repo);
  const isPrivate = installation ? installation.isPrivate : body.is_private;

  if (isPrivate) {
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

    const [sub, hasSeat] = await Promise.all([
      getSubscription(env.DB, installation.installationId),
      isRepoSeated(env.DB, installation.installationId, repo),
    ]);
    if (!isRepoLicensed(sub, hasSeat)) {
      await logRequest(env.DB, { repo, isPrivate: true, allowed: false });
      const checkoutUrl = `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
      // Distinguish "you have no subscription" from "you have one, but this
      // particular repo doesn't hold a seat" -- the second is fixable from
      // the dashboard without paying again, so saying "not licensed" flatly
      // would send a paying customer to checkout for no reason.
      const seatedButUnlicensed = isSubscriptionActive(sub) && !hasSeat;
      return json(
        {
          error: seatedButUnlicensed ? "repo_not_activated" : "repo_not_licensed",
          message: seatedButUnlicensed
            ? "This private repo isn't one of the repos your DocDrifter subscription covers. Activate it from the dashboard, or add a seat if you're at your limit."
            : "DocDrifter is free for public repos. This repo is private and needs an active subscription.",
          checkout_url: seatedButUnlicensed ? `${env.CHECKOUT_BASE_URL}/dashboard` : checkoutUrl,
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
  const monthlyCap = isPrivate ? PRIVATE_MONTHLY_CAP : PUBLIC_MONTHLY_CAP;
  const usedThisMonth = await countRequestsThisMonth(env.DB, repo);
  if (usedThisMonth >= monthlyCap) {
    await logRequest(env.DB, { repo, isPrivate, allowed: false });
    return json(
      {
        error: "monthly_limit_reached",
        message: `DocDrifter's fair-use limit for this repo (${monthlyCap} PR checks/month) has been reached. It resets at the start of next month.`,
      },
      429
    );
  }

  await logRequest(env.DB, { repo, isPrivate, allowed: true });

  try {
    const verdict = await callDeepSeek(env.DEEPSEEK_API_KEY, body.system_prompt, body.user_prompt);
    return json(verdict, 200);
  } catch (err) {
    return json({ error: "evaluation_failed" }, 502);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleWaitlist(req: Request, env: Env): Promise<Response> {
  if (!(await checkRateLimit(env.PUBLIC_RATE_LIMITER, `waitlist:${clientIp(req)}`))) {
    return json({ error: "rate_limited" }, 429);
  }
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

  // Checkout shows and acts on billing details for a whole installation
  // (private repo count, account login, and opens a Paddle checkout bound
  // to that installation_id) -- only the person who installed the App
  // should see or trigger that, so this requires a session, unlike
  // /status which is linked from PR comments and must stay anonymous.
  const loginUrl = `/auth/github/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
  const sessionId = getSessionCookieValue(req);
  const session = sessionId ? await getSession(env.DB, sessionId) : null;
  if (!session) {
    return new Response(null, { status: 302, headers: { Location: loginUrl } });
  }

  if (!(await checkRateLimit(env.PUBLIC_RATE_LIMITER, `checkout:${clientIp(req)}`))) {
    return new Response("Too many requests, try again shortly.", { status: 429 });
  }

  const installation = await getInstallationForRepo(env.DB, repo);
  if (!installation) {
    return new Response(null, {
      status: 302,
      headers: { Location: `/status?repo=${encodeURIComponent(repo)}` },
    });
  }
  const owns = await userOwnsInstallation(env.DB, session.userId, installation.installationId);
  if (!owns) {
    return new Response("You don't have access to manage this repo's subscription.", { status: 403 });
  }

  // Someone with an active subscription and a spare seat shouldn't be sent
  // to Paddle at all -- just claim the seat and send them to the repo's
  // status page. Only a genuine capacity shortfall needs a payment.
  const [existingSub, seatsUsed] = await Promise.all([
    getSubscription(env.DB, installation.installationId),
    countSeatsUsed(env.DB, installation.installationId),
  ]);
  if (isSubscriptionActive(existingSub) && existingSub && seatsUsed < existingSub.quantity) {
    await claimSeat(env.DB, installation.installationId, repo);
    return new Response(null, {
      status: 302,
      headers: { Location: `/status?repo=${encodeURIComponent(repo)}` },
    });
  }

  const html = checkoutPage(
    repo,
    env.PADDLE_CLIENT_TOKEN,
    env.PADDLE_PRICE_ID,
    installation.installationId,
    installation.accountLogin,
    env.PADDLE_ENV === "sandbox" ? "sandbox" : "production"
  );
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleStatusPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo") ?? "";
  if (!repo) {
    return new Response("Missing repo parameter", { status: 400 });
  }

  // Fully anonymous and takes a free-text repo param -- the one endpoint
  // here an attacker could script to enumerate repo names and check which
  // ones have the App installed, so it gets the rate limit even though the
  // response itself no longer leaks anything beyond a status badge.
  if (!(await checkRateLimit(env.PUBLIC_RATE_LIMITER, `status:${clientIp(req)}`))) {
    return new Response("Too many requests, try again shortly.", { status: 429 });
  }

  const installation = await getInstallationForRepo(env.DB, repo);

  // /status is linked from PR comments, so it's intentionally reachable
  // without a session -- but anyone with a valid session can be checked
  // against the installation's owner, and only the owner gets to see
  // account login, renewal date, plan quantity, or a "manage subscription"
  // link. Anonymous or non-owner visitors get the status badge and nothing
  // billing-identifying beyond that.
  let isOwner = false;
  if (installation) {
    const sessionId = getSessionCookieValue(req);
    const session = sessionId ? await getSession(env.DB, sessionId) : null;
    isOwner = session ? await userOwnsInstallation(env.DB, session.userId, installation.installationId) : false;
  }

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
    const [sub, hasSeat] = await Promise.all([
      getSubscription(env.DB, installation.installationId),
      isRepoSeated(env.DB, installation.installationId, repo),
    ]);
    if (isRepoLicensed(sub, hasSeat) && sub) {
      const portalUrl = isOwner && sub.paddle_customer_id
        ? await createPortalSessionUrl(env.PADDLE_API_KEY, sub.paddle_customer_id, sub.paddle_subscription_id, env.PADDLE_ENV)
        : null;
      html = statusPageActive(repo, sub, portalUrl, installation.accountLogin, isOwner);
    } else {
      // An active subscription that just doesn't cover this repo yet is a
      // dashboard trip, not a second purchase.
      const needsSeatOnly = isSubscriptionActive(sub);
      const checkoutUrl = needsSeatOnly
        ? `${env.CHECKOUT_BASE_URL}/dashboard`
        : `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
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
  const seatsByInstallation = new Map(
    await Promise.all(
      installationIds.map(async (id) => [id, new Set(await getSeatedRepos(env.DB, id))] as const)
    )
  );
  const repos = userRepos.map((r) => ({
    repo: r.repo,
    isPrivate: r.is_private === 1,
    installationId: r.installation_id,
    subscription: subsByInstallation.get(r.installation_id) ?? null,
    hasSeat: seatsByInstallation.get(r.installation_id)?.has(r.repo) ?? false,
  }));
  const seatUsage = new Map(
    installationIds.map((id) => [
      id,
      { used: seatsByInstallation.get(id)?.size ?? 0, total: subsByInstallation.get(id)?.quantity ?? 0 },
    ])
  );

  // login/avatar aren't stored on the session row -- look them up once via
  // the users table so the dashboard header can greet the right person.
  const user = await env.DB
    .prepare("SELECT login, avatar_url FROM users WHERE github_id = ?")
    .bind(session.userId)
    .first<{ login: string; avatar_url: string | null }>();

  const html = dashboardPage(user?.login ?? "there", user?.avatar_url ?? null, repos, INSTALL_URL, seatUsage);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Assign or free a seat from the dashboard. Only moves seats already paid
// for -- claiming past the plan's quantity is refused rather than silently
// upgrading someone's bill.
async function handleSeatChange(req: Request, env: Env): Promise<Response> {
  const sessionId = getSessionCookieValue(req);
  const session = sessionId ? await getSession(env.DB, sessionId) : null;
  if (!session) {
    return json({ error: "not_authenticated" }, 401);
  }

  let body: { repo?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const repo = (body.repo ?? "").trim().toLowerCase();
  const action = body.action;
  if (!repo || (action !== "claim" && action !== "release")) {
    return json({ error: "invalid_request" }, 400);
  }

  const installation = await getInstallationForRepo(env.DB, repo);
  if (!installation) {
    return json({ error: "repo_not_found" }, 404);
  }
  if (!(await userOwnsInstallation(env.DB, session.userId, installation.installationId))) {
    return json({ error: "forbidden" }, 403);
  }
  if (!installation.isPrivate) {
    return json({ error: "public_repos_are_free" }, 400);
  }

  if (action === "release") {
    await releaseSeat(env.DB, installation.installationId, repo);
    return json({ ok: true }, 200);
  }

  const [sub, seatsUsed] = await Promise.all([
    getSubscription(env.DB, installation.installationId),
    countSeatsUsed(env.DB, installation.installationId),
  ]);
  if (!isSubscriptionActive(sub) || !sub) {
    return json({ error: "no_active_subscription" }, 402);
  }
  if (seatsUsed >= sub.quantity) {
    return json({ error: "no_seats_available" }, 409);
  }
  await claimSeat(env.DB, installation.installationId, repo);
  return json({ ok: true }, 200);
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
        return await handleGithubLogin(req, env);
      }
      if (req.method === "GET" && url.pathname === "/auth/github/callback") {
        return await handleGithubCallback(req, env);
      }
      if (req.method === "POST" && url.pathname === "/auth/logout") {
        return await handleLogout(req, env);
      }
      if (req.method === "POST" && url.pathname === "/dashboard/seat") {
        return await handleSeatChange(req, env);
      }
      if (req.method === "GET" && url.pathname === "/dashboard") {
        return await handleDashboardPage(req, env);
      }
      if (req.method === "GET" && url.pathname === "/") {
        return new Response(landingPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/robots.txt") {
        return new Response(robotsTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/sitemap.xml") {
        return new Response(sitemapXml(getAllPosts()), { headers: { "Content-Type": "application/xml; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/og-image.svg") {
        return new Response(ogImageSvg(), {
          headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
        });
      }
      if (req.method === "GET" && url.pathname === "/privacy") {
        return new Response(privacyPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/terms") {
        return new Response(termsPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/blog") {
        return new Response(blogIndexPage(getAllPosts()), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname === "/blog/rss.xml") {
        return new Response(blogRssFeed(getAllPosts()), { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
      }
      if (req.method === "GET" && url.pathname.startsWith("/blog/")) {
        const slug = url.pathname.slice("/blog/".length);
        const post = getPost(slug);
        if (!post) {
          return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        return new Response(blogPostPage(post), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      return new Response(notFoundPage(), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    } catch (err) {
      console.error("Unhandled error:", err);
      return json({ error: "internal_error" }, 500);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    const [sessionsDeleted, requestsDeleted] = await Promise.all([
      pruneExpiredSessions(env.DB),
      pruneOldRequests(env.DB),
    ]);
    console.log(`Daily cleanup: ${sessionsDeleted} expired sessions, ${requestsDeleted} old request logs deleted.`);
  },
};
