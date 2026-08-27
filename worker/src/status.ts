import type { RepoRow } from "./db";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

const BOOK_ICON = `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const LOCK_ICON = `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="position:relative;top:2px"><rect x="2.5" y="7" width="11" height="7" rx="1" fill="var(--color-text)" opacity=".2"></rect><rect x="2.5" y="7" width="11" height="7" rx="1" stroke="var(--color-text)" stroke-width="1.3"></rect><path d="M5.2 7V4.9a2.8 2.8 0 0 1 5.6 0V7" stroke="var(--color-text)" stroke-width="1.3"></path></svg>`;

function shell(repo: string, dateline: string, body: string): string {
  const [owner, name] = repo.split("/");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — ${esc(repo)}</title>
<style>
:root {
  --color-bg: #f3f2f2;
  --color-text: #201e1d;
  --color-divider: color-mix(in srgb, #201e1d 16%, transparent);
  --color-accent-700: #006786;
  --brand: #6b3fa0;
  --font-heading: "Source Serif 4", Georgia, serif;
  --font-body: Georgia, "Source Serif 4", serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --color-bg: #191817;
    --color-text: #f0edea;
    --color-divider: color-mix(in srgb, #f0edea 20%, transparent);
    --color-accent-700: #62c5ee;
    --brand: #b294ee;
  }
}
:root[data-theme="dark"] {
  --color-bg: #191817;
  --color-text: #f0edea;
  --color-divider: color-mix(in srgb, #f0edea 20%, transparent);
  --color-accent-700: #62c5ee;
  --brand: #b294ee;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); display: flex; justify-content: center; padding: 40px 16px; }
.card { width: 600px; max-width: 100%; padding: 40px 44px 30px; }
.hdr { display: flex; align-items: center; gap: 10px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 20px; letter-spacing: -0.015em; }
.domain { margin-left: auto; font: 10px/1 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 45%, transparent); }
.rule-thick { height: 3px; background: var(--color-text); margin-top: 18px; }
.dateline { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font: 10px/1.4 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 55%, transparent); flex-wrap: wrap; }
.rule-thin { height: 1px; background: var(--color-text); }
.title-row { display: flex; align-items: baseline; gap: 10px; margin-top: 34px; }
h1 { margin: 0; font-family: var(--font-heading); font-weight: 600; font-size: 33px; letter-spacing: -0.02em; word-break: break-word; }
.owner-sep { color: color-mix(in srgb, var(--color-text) 38%, transparent); }
.status-row { display: flex; align-items: center; gap: 9px; margin-top: 16px; flex-wrap: wrap; }
.dot { width: 9px; height: 9px; border-radius: 50%; }
.status-label { font-family: var(--font-heading); font-weight: 600; font-size: 17px; }
.status-note { font-size: 14px; color: color-mix(in srgb, var(--color-text) 55%, transparent); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px 40px; margin-top: 34px; }
.field-label { font: 10px/1.4 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 50%, transparent); }
.field-value { font-family: var(--font-heading); font-weight: 600; font-size: 18px; margin-top: 3px; }
h2 { font-family: var(--font-heading); font-weight: 600; margin: 30px 0 0; font-size: 30px; letter-spacing: -0.02em; max-width: 22ch; }
p.lede { margin: 12px 0 0; max-width: 46ch; font-size: 15px; color: color-mix(in srgb, var(--color-text) 68%, transparent); }
.price-row { display: flex; align-items: flex-end; gap: 14px; margin-top: 30px; }
.price { font-family: var(--font-heading); font-weight: 600; font-size: 58px; letter-spacing: -0.03em; color: var(--brand); line-height: 0.9; }
.price-note { font-size: 14px; line-height: 1.4; color: color-mix(in srgb, var(--color-text) 60%, transparent); padding-bottom: 6px; white-space: pre-line; }
.action-row { display: flex; align-items: center; gap: 14px; margin-top: 34px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; font-family: var(--font-heading); font-weight: 600; font-size: 14px; text-decoration: none; padding: 10px 18px; border-radius: 2px; border: 1px solid transparent; }
.btn-primary { background: var(--brand); color: var(--color-bg); border-color: var(--brand); }
.btn-ghost { color: var(--color-accent-700); padding-inline: 4px; }
.action-note { font-size: 13px; color: color-mix(in srgb, var(--color-text) 52%, transparent); }
.footer-rule { height: 1px; background: var(--color-divider); margin-top: 40px; }
.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; font-size: 13px; color: color-mix(in srgb, var(--color-text) 55%, transparent); flex-wrap: wrap; }
.footer a { color: var(--color-accent-700); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
    <span class="domain">docdrifter.dev</span>
  </div>
  <div class="rule-thick"></div>
  <div class="dateline"><span>Repo status</span><span>?repo=${esc(repo)}</span><span>${dateline}</span></div>
  <div class="rule-thin"></div>
  <div class="title-row">
    ${LOCK_ICON}
    <h1>${esc(owner ?? "")}<span class="owner-sep">/</span>${esc(name ?? "")}</h1>
  </div>
  ${body}
  <div class="footer-rule"></div>
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
  row: RepoRow,
  portalUrl: string | null,
  priceLabel: string
): string {
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const statColor = row.status === "past_due" ? "#9a6b00" : "#2f7d4f";
  const statLabel = row.status === "past_due" ? "Past due" : "Active";

  const manageButton = portalUrl
    ? `<a class="btn btn-primary" href="${esc(portalUrl)}">Manage subscription</a><span class="action-note">Opens Paddle — invoices, card, cancellation.</span>`
    : `<span class="action-note">Manage this subscription from the receipt emailed by Paddle at checkout.</span>`;

  const body = `
  <div class="status-row">
    <span class="dot" style="background:${statColor};box-shadow:0 0 0 4px color-mix(in srgb, ${statColor} 16%, transparent)"></span>
    <span class="status-label" style="color:${statColor}">${statLabel}</span>
    <span class="status-note">— ${row.status === "past_due" ? "payment needs attention" : "subscription in good standing"}</span>
  </div>
  <div class="grid">
    <div><div class="field-label">Next renewal</div><div class="field-value">${formatDate(row.current_period_end)}</div></div>
    <div><div class="field-label">Plan</div><div class="field-value">${esc(priceLabel)}</div></div>
  </div>
  <div class="action-row">${manageButton}</div>`;

  return shell(repo, dateline, body);
}

export function statusPageFree(repo: string): string {
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const body = `
  <div class="status-row">
    <span class="dot" style="background:#2f7d4f;box-shadow:0 0 0 4px color-mix(in srgb, #2f7d4f 16%, transparent)"></span>
    <span class="status-label" style="color:#2f7d4f">Free</span>
    <span class="status-note">— public repo, no subscription needed</span>
  </div>
  <p class="lede">This repo is public, so DocDrifter checks every pull request for free. No action needed here.</p>`;

  return shell(repo, dateline, body);
}

export function statusPageNeedsActivation(
  repo: string,
  checkoutUrl: string,
  priceAmount: string,
  priceUnit: string
): string {
  const dateline = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const body = `
  <div class="status-row">
    <span class="dot" style="background:#b23b2e;box-shadow:0 0 0 4px color-mix(in srgb, #b23b2e 16%, transparent)"></span>
    <span class="status-label" style="color:#b23b2e">Not activated</span>
    <span class="status-note">— the action exits and skips its checks</span>
  </div>
  <h2>Activate DocDrifter for this repo</h2>
  <p class="lede">Every PR gets its docs read against the diff, and drifted pages come back as a review comment. Private repos need a subscription; public ones don't.</p>
  <div class="price-row">
    <span class="price">${esc(priceAmount)}</span>
    <span class="price-note">${esc(priceUnit)}</span>
  </div>
  <div class="action-row">
    <a class="btn btn-primary" href="${esc(checkoutUrl)}">Subscribe this repo</a>
    <span class="action-note">Paddle checkout. Cancel any time.</span>
  </div>`;

  return shell(repo, dateline, body);
}
