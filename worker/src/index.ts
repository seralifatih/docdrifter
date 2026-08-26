import { getRepo, isPaid, logRequest } from "./db";
import { verifyGithubOidcToken } from "./oidc";
import { callDeepSeek } from "./deepseek";
import { verifyPaddleSignature, handlePaddleEvent } from "./paddle";
import { checkoutPage } from "./checkout";

export interface Env {
  DB: D1Database;
  DEEPSEEK_API_KEY: string;
  PADDLE_WEBHOOK_SECRET: string;
  PADDLE_CLIENT_TOKEN: string;
  PADDLE_PRICE_ID: string;
  CHECKOUT_BASE_URL: string; // e.g. "https://api.docdrifter.dev"
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/v1/evaluate") {
      return handleEvaluate(req, env);
    }
    if (req.method === "POST" && url.pathname === "/v1/webhook/paddle") {
      return handlePaddleWebhook(req, env);
    }
    if (req.method === "GET" && url.pathname === "/checkout") {
      return handleCheckoutPage(req, env);
    }

    return new Response("Not found", { status: 404 });
  },
};
