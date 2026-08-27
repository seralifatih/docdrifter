import { upsertUser, createSession, deleteSession } from "./db";
import { timingSafeEqualHex, computeHmac } from "./crypto";

const SESSION_COOKIE = "docdrifter_session";
const STATE_COOKIE = "docdrifter_oauth_state";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export function getCookie(req: Request, name: string): string | null {
  const header = req.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signState(state: string, secret: string): Promise<string> {
  const hmac = await computeHmac(secret, state);
  return `${state}.${hmac}`;
}

async function verifyState(cookieValue: string, queryState: string, secret: string): Promise<boolean> {
  const dot = cookieValue.lastIndexOf(".");
  if (dot < 0) return false;
  const state = cookieValue.slice(0, dot);
  const hmac = cookieValue.slice(dot + 1);
  const expectedHmac = await computeHmac(secret, state);
  if (!timingSafeEqualHex(hmac, expectedHmac)) return false;
  return state === queryState;
}

export async function handleGithubLogin(env: {
  GITHUB_APP_CLIENT_ID: string;
  STATE_SECRET: string;
  CHECKOUT_BASE_URL: string;
}): Promise<Response> {
  const state = randomToken(24);
  const signed = await signState(state, env.STATE_SECRET);
  const redirectUri = `${env.CHECKOUT_BASE_URL}/auth/github/callback`;
  const authorizeUrl =
    `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(env.GITHUB_APP_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

  const headers = new Headers();
  headers.set("Location", authorizeUrl);
  headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=${signed}; HttpOnly; Secure; SameSite=Lax; Path=/auth/github; Max-Age=600`
  );
  return new Response(null, { status: 302, headers });
}

export async function handleGithubCallback(
  req: Request,
  env: {
    DB: D1Database;
    GITHUB_APP_CLIENT_ID: string;
    GITHUB_APP_CLIENT_SECRET: string;
    STATE_SECRET: string;
    CHECKOUT_BASE_URL: string;
  }
): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateCookie = getCookie(req, STATE_COOKIE);

  if (!code || !state || !stateCookie) {
    return new Response("Missing code or state", { status: 400 });
  }
  const stateValid = await verifyState(stateCookie, state, env.STATE_SECRET);
  if (!stateValid) {
    return new Response("Invalid state", { status: 400 });
  }

  const redirectUri = `${env.CHECKOUT_BASE_URL}/auth/github/callback`;
  const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: env.GITHUB_APP_CLIENT_ID,
      client_secret: env.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResp.ok) {
    return new Response("GitHub token exchange failed", { status: 502 });
  }
  const tokenData = await tokenResp.json<{ access_token?: string; error?: string }>();
  if (!tokenData.access_token) {
    return new Response("GitHub token exchange failed", { status: 502 });
  }

  const userResp = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "docdrifter-app",
      Accept: "application/vnd.github+json",
    },
  });
  if (!userResp.ok) {
    return new Response("Failed to fetch GitHub user", { status: 502 });
  }
  const user = await userResp.json<{ id: number; login: string; avatar_url: string | null }>();

  await upsertUser(env.DB, { githubId: user.id, login: user.login, avatarUrl: user.avatar_url });

  const sessionId = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await createSession(env.DB, { sessionId, userId: user.id, expiresAt });

  const headers = new Headers();
  headers.set("Location", "/dashboard");
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`
  );
  headers.append("Set-Cookie", `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/auth/github; Max-Age=0`);
  return new Response(null, { status: 302, headers });
}

export async function handleLogout(req: Request, env: { DB: D1Database }): Promise<Response> {
  const sessionId = getCookie(req, SESSION_COOKIE);
  if (sessionId) {
    await deleteSession(env.DB, sessionId);
  }
  const headers = new Headers();
  headers.set("Location", "/");
  headers.append("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
  return new Response(null, { status: 302, headers });
}

export function getSessionCookieValue(req: Request): string | null {
  return getCookie(req, SESSION_COOKIE);
}
