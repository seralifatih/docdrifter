import type { SubscriptionRow } from "./db";
import { BASE_STYLES, FAVICON_TAG, THEME_INIT_SCRIPT } from "./styles";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const LOCK_ICON = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="position:relative;top:2px"><rect x="2.5" y="7" width="11" height="7" rx="1.5" fill="var(--color-text)" opacity=".18"></rect><rect x="2.5" y="7" width="11" height="7" rx="1.5" stroke="var(--color-text)" stroke-width="1.3"></rect><path d="M5.2 7V4.9a2.8 2.8 0 0 1 5.6 0V7" stroke="var(--color-text)" stroke-width="1.3"></path></svg>`;

function shell(repo: string, dateline: string, body: string): string {
  const [owner, name] = repo.split("/");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — ${esc(repo)}</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#6b3fa0">
${FAVICON_TAG}
${THEME_INIT_SCRIPT}
<style>
${BASE_STYLES}
body { display: flex; justify-content: center; padding: 40px 16px; }
.wrap { width: 600px; max-width: 100%; }
.hdr { display: flex; align-items: center; gap: 10px; padding: 0 4px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.domain { margin-left: auto; font: 11px/1 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-faint); }
.card { margin-top: 16px; padding: 38px 42px 32px; }
.dateline-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.title-row { display: flex; align-items: baseline; gap: 10px; margin-top: 22px; }
h1 { font-size: 30px; word-break: break-word; }
.owner-sep { color: var(--color-text-faint); }
.status-row { display: flex; align-items: center; gap: 9px; margin-top: 18px; flex-wrap: wrap; }
.dot { width: 9px; height: 9px; }
.status-label { font-family: var(--font-heading); font-weight: 600; font-size: 16px; }
.status-note { font-size: 14px; color: var(--color-text-muted); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 32px; margin-top: 28px; }
.field-label { font: 11px/1.4 var(--font-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-faint); }
.field-value { font-family: var(--font-heading); font-weight: 600; font-size: 17px; margin-top: 4px; }
h2 { margin: 26px 0 0; font-size: 26px; max-width: 22ch; }
p.lede { margin: 12px 0 0; max-width: 46ch; font-size: 14.5px; line-height: 22px; color: var(--color-text-muted); }
.price-row { display: flex; align-items: flex-end; gap: 12px; margin-top: 26px; }
.price { font-family: var(--font-heading); font-weight: 600; font-size: 48px; letter-spacing: -0.02em; color: var(--brand); line-height: 0.9; }
.price-note { font-size: 13.5px; line-height: 1.4; color: var(--color-text-muted); padding-bottom: 6px; white-space: pre-line; }
.action-row { display: flex; align-items: center; gap: 14px; margin-top: 28px; flex-wrap: wrap; }
.action-note { font-size: 13px; color: var(--color-text-faint); }
.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 22px; padding: 0 4px; font-size: 13px; color: var(--color-text-faint); flex-wrap: wrap; }
.footer a { color: var(--color-accent-700); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
    <span class="domain">docdrifter.dev</span>
  </div>
  <div class="card">
    <div class="dateline-row">
      <span class="pill">Repo status</span>
      <span class="pill">${dateline}</span>
    </div>
    <div class="title-row">
      ${LOCK_ICON}
      <h1>${esc(owner ?? "")}<span class="owner-sep">/</span>${esc(name ?? "")}</h1>
    </div>
    ${body}
  </div>
  <div class="footer">
    <span>DocDrifter is free for public repos.</span>
    <a href="https://github.com/seralifatih/docdrifter">github.com/seralifatih/docdrifter ↗</a>
  </div>
</div>
</body>
</html>`;
}

export function statusPageActive(
  repo: string,
  row: SubscriptionRow,
  portalUrl: string | null,
  accountLogin: string,
  isOwner: boolean
): string {
  // Only called for a repo that actually holds a seat, so the only
  // remaining distinction is whether the plan's payment is healthy.
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const statColor = row.status === "past_due" ? "#a56a00" : "#1a7f4e";
  const statLabel = row.status === "past_due" ? "Past due" : "Active";
  const statusNote = row.status === "past_due" ? "payment needs attention" : "subscription in good standing";

  // Account login, renewal date, plan quantity, and the Paddle portal link
  // are only for the installation's owner -- this page is reachable by
  // anyone with the repo name (it's linked from PR comments), so a
  // non-owner or anonymous visitor only gets the status badge above.
  const details = isOwner
    ? `
  <div class="grid">
    <div><div class="field-label">Next renewal</div><div class="field-value">${formatDate(row.current_period_end)}</div></div>
    <div><div class="field-label">Plan size</div><div class="field-value">${row.quantity} seat${row.quantity === 1 ? "" : "s"}</div></div>
  </div>
  <p class="lede">This repo holds one of the seats on the <strong>${esc(accountLogin)}</strong> installation's plan. Seats can be moved between private repos from the dashboard at no extra cost.</p>
  <div class="action-row">${
    portalUrl
      ? `<a class="btn btn-primary" href="${esc(portalUrl)}">Manage subscription</a><span class="action-note">Opens Paddle — invoices, card, cancellation.</span>`
      : `<span class="action-note">Manage this subscription from the receipt emailed by Paddle at checkout.</span>`
  }<a class="btn btn-secondary" href="/dashboard">View all repos</a></div>`
    : `
  <p class="lede">This repo is licensed. <a href="/dashboard">Sign in</a> if you manage this installation and want to see renewal and billing details.</p>`;

  const body = `
  <div class="status-row">
    <span class="dot" style="background:${statColor};box-shadow:0 0 0 4px color-mix(in srgb, ${statColor} 16%, transparent)"></span>
    <span class="status-label" style="color:${statColor}">${statLabel}</span>
    <span class="status-note">— ${statusNote}</span>
  </div>
  ${details}`;

  return shell(repo, dateline, body);
}

export function statusPageFree(repo: string): string {
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const body = `
  <div class="status-row">
    <span class="dot" style="background:#1a7f4e;box-shadow:0 0 0 4px color-mix(in srgb, #1a7f4e 16%, transparent)"></span>
    <span class="status-label" style="color:#1a7f4e">Free</span>
    <span class="status-note">— public repo, no subscription needed</span>
  </div>
  <p class="lede">This repo is public, so DocDrifter checks every pull request for free. No action needed here.</p>`;

  return shell(repo, dateline, body);
}

export function statusPageNeedsActivation(
  repo: string,
  checkoutUrl: string,
  priceAmount: string,
  priceUnit: string,
  installationRequired: boolean
): string {
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const cta = installationRequired
    ? `<div class="action-row">
        <a class="btn btn-primary" href="${esc(checkoutUrl)}">Install DocDrifter Dashboard</a>
        <span class="action-note">Private repos need the GitHub App installed before they can be licensed — one install covers your whole account or org.</span>
      </div>`
    : `<div class="action-row">
        <a class="btn btn-primary" href="${esc(checkoutUrl)}">Activate this repo</a>
        <span class="action-note">Paddle checkout. One seat covers this repo; seats can be moved between private repos later. Cancel any time.</span>
      </div>`;

  const body = `
  <div class="status-row">
    <span class="dot" style="background:#b23b2e;box-shadow:0 0 0 4px color-mix(in srgb, #b23b2e 16%, transparent)"></span>
    <span class="status-label" style="color:#b23b2e">Not activated</span>
    <span class="status-note">— the action exits and skips its checks</span>
  </div>
  <h2>Activate DocDrifter for this repo</h2>
  <p class="lede">Every PR gets its docs read against the diff, and drifted pages come back as a review comment. Each private repo takes one seat on your plan; public repos are always free.</p>
  <div class="price-row">
    <span class="price">${esc(priceAmount)}</span>
    <span class="price-note">${esc(priceUnit)}</span>
  </div>
  ${cta}`;

  return shell(repo, dateline, body);
}
