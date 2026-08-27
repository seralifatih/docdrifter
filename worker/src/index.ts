import { getRepo, isPaid, logRequest } from "./db";
import { verifyGithubOidcToken } from "./oidc";
import { callDeepSeek } from "./deepseek";
import { verifyPaddleSignature, handlePaddleEvent, createPortalSessionUrl } from "./paddle";
import { checkoutPage } from "./checkout";
import { statusPageActive, statusPageNeedsActivation } from "./status";
import { landingPage } from "./landing";
import { verifyGithubWebhookSignature, handleGithubWebhookEvent } from "./githubApp";

export interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_CLIENT_TOKEN: string;
  PADDLE_PRICE_ID: string;
  PADDLE_API_KEY: string;
  CHECKOUT_BASE_URL: string; // e.g. "https://api.docdrifter.dev"
  PRICE_LABEL: string; // e.g. "Single repo — $9 / month"
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
    const row = await getRepo(env.DB, repo);
    if (!isPaid(row)) {
      await logRequest(env.DB, { repo, isPrivate: true, allowed: false });
      const checkoutUrl = `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
      return json(
        {
          error: "repo_not_licensed",
          message:
            "DocDrifter is free for public repos. This repo is private and needs an active subscription.",
          checkout_url: checkoutUrl,
        },
        402
      );
    }
  }

  await logRequest(env.DB, { repo, isPrivate: body.is_private, allowed: true });

  try {
    const verdict = await callDeepSeek(env.DEEPSEEK_API_KEY, body.system_prompt, body.user_prompt);
    return json(verdict, 200);
  } catch (err) {
    return json({ error: "evaluation_failed" }, 502);
  }
}

async function handleCheckoutPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo") ?? "";
  if (!repo) {
    return new Response("Missing repo parameter", { status: 400 });
  }
  const html = checkoutPage(repo, env.PADDLE_CLIENT_TOKEN, env.PADDLE_PRICE_ID);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleStatusPage(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = url.searchParams.get("repo") ?? "";
  if (!repo) {
    return new Response("Missing repo parameter", { status: 400 });
  }

  const row = await getRepo(env.DB, repo);

  let html: string;
  if (isPaid(row) && row) {
    const portalUrl = row.paddle_customer_id
      ? await createPortalSessionUrl(env.PADDLE_API_KEY, row.paddle_customer_id, row.paddle_subscription_id)
      : null;
    html = statusPageActive(repo, row, portalUrl, env.PRICE_LABEL || "Single repo — subscription");
  } else {
    const checkoutUrl = `${env.CHECKOUT_BASE_URL}/checkout?repo=${encodeURIComponent(repo)}`;
    html = statusPageNeedsActivation(repo, checkoutUrl, env.PRICE_AMOUNT || "$9", env.PRICE_UNIT || "per month");
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
    await handleGithubWebhookEvent(env.DB, req.headers.get("X-GitHub-Event"), raw);
    return json({ ok: true }, 200);
  } catch (err) {
    // Non-2xx so GitHub retries rather than silently dropping an install event.
    return json({ error: "processing_failed" }, 500);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(req.url);

      if (req.method === "POST" && url.pathname === "/v1/evaluate") {
        return await handleEvaluate(req, env);
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
      if (req.method === "GET" && url.pathname === "/") {
        return new Response(landingPage(), { headers: { "Content-Type": "text/html; charset=utf-8" } });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.error("Unhandled error:", err);
      return json({ error: "internal_error" }, 500);
    }
  },
};
