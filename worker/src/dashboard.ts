import type { RepoRow } from "./db";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

const BOOK_ICON = `<svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const STATUS_COLORS: Record<string, string> = {
  free: "#2f7d4f",
  active: "#2f7d4f",
  past_due: "#9a6b00",
  cancelled: "#b23b2e",
  paused: "#9a6b00",
};

function statusLabel(status: string): string {
  switch (status) {
    case "free":
      return "Free (public)";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "paused":
      return "Paused";
    default:
      return "Not activated";
  }
}

function repoRowHtml(repo: string, isPrivate: boolean, row: RepoRow | null): string {
  // Public repos are always free -- they never get a `repos` row (that
  // table only tracks Paddle subscriptions), so "no row" only means
  // "not activated" for a private repo. A public repo with no row is
  // simply free, not unlicensed.
  const status = !isPrivate ? "free" : row?.status ?? "cancelled";
  const color = STATUS_COLORS[status] ?? "#b23b2e";
  return `
  <div class="repo-row">
    <div class="repo-name">${esc(repo)}</div>
    <div class="repo-status">
      <span class="dot" style="background:${color};box-shadow:0 0 0 3px color-mix(in srgb, ${color} 16%, transparent)"></span>
      <span style="color:${color}">${statusLabel(status)}</span>
    </div>
    <a class="btn btn-ghost" href="/status?repo=${encodeURIComponent(repo)}">Manage</a>
  </div>`;
}

export function dashboardPage(
  login: string,
  avatarUrl: string | null,
  repos: Array<{ repo: string; isPrivate: boolean; row: RepoRow | null }>,
  installUrl: string
): string {
  const rows = repos.length
    ? repos.map((r) => repoRowHtml(r.repo, r.isPrivate, r.row)).join("")
    : `<div class="empty-state">
         <p>No repos yet. Install DocDrifter Dashboard on a repo to see it here.</p>
         <a class="btn btn-primary" href="${esc(installUrl)}">Install on a repo</a>
       </div>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — Dashboard</title>
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
.card { width: 720px; max-width: 100%; padding: 40px 44px 30px; }
.hdr { display: flex; align-items: center; gap: 10px; }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 20px; letter-spacing: -0.015em; }
.user { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: 13px; color: color-mix(in srgb, var(--color-text) 65%, transparent); }
.avatar { width: 24px; height: 24px; border-radius: 50%; }
.rule-thick { height: 3px; background: var(--color-text); margin-top: 18px; }
.dateline { display: flex; justify-content: space-between; gap: 16px; padding: 6px 0; font: 10px/1.4 ui-monospace, Menlo, monospace; letter-spacing: 0.1em; text-transform: uppercase; color: color-mix(in srgb, var(--color-text) 55%, transparent); flex-wrap: wrap; }
.rule-thin { height: 1px; background: var(--color-text); }
h1 { margin: 34px 0 0; font-family: var(--font-heading); font-weight: 600; font-size: 30px; letter-spacing: -0.02em; }
.subhead { margin: 10px 0 0; font-size: 15px; color: color-mix(in srgb, var(--color-text) 68%, transparent); }
.repo-list { margin-top: 30px; display: flex; flex-direction: column; }
.repo-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-divider); }
.repo-name { font-family: ui-monospace, Menlo, monospace; font-size: 14px; flex: 1; }
.repo-status { display: flex; align-items: center; gap: 8px; font-size: 14px; font-family: var(--font-heading); font-weight: 600; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.empty-state { margin-top: 30px; padding: 30px 0; text-align: center; }
.empty-state p { color: color-mix(in srgb, var(--color-text) 60%, transparent); margin: 0 0 16px; }
.btn { display: inline-flex; align-items: center; font-family: var(--font-heading); font-weight: 600; font-size: 13px; text-decoration: none; padding: 7px 14px; border-radius: 2px; border: 1px solid transparent; white-space: nowrap; }
.btn-primary { background: var(--brand); color: var(--color-bg); border-color: var(--brand); }
.btn-ghost { color: var(--color-accent-700); border-color: var(--color-divider); }
.action-row { display: flex; align-items: center; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
.footer-rule { height: 1px; background: var(--color-divider); margin-top: 40px; }
.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 14px; font-size: 13px; color: color-mix(in srgb, var(--color-text) 55%, transparent); flex-wrap: wrap; }
.footer a { color: var(--color-accent-700); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
form { margin: 0; }
</style>
</head>
<body>
<div class="card">
  <div class="hdr">
    ${BOOK_ICON}
    <span class="brand">DocDrifter</span>
    <div class="user">
      ${avatarUrl ? `<img class="avatar" src="${esc(avatarUrl)}" alt="">` : ""}
      <span>${esc(login)}</span>
    </div>
  </div>
  <div class="rule-thick"></div>
  <div class="dateline"><span>Dashboard</span><span>${repos.length} repo${repos.length === 1 ? "" : "s"}</span></div>
  <div class="rule-thin"></div>
  <h1>Your repos</h1>
  <p class="subhead">Repos covered by DocDrifter Dashboard installations you've set up. Public repos check for free; private repos need an active subscription.</p>
  <div class="repo-list">${rows}</div>
  <div class="action-row">
    <a class="btn btn-primary" href="${esc(installUrl)}">Manage installations</a>
    <form method="POST" action="/auth/logout"><button type="submit" class="btn btn-ghost" style="cursor:pointer">Log out</button></form>
  </div>
  <div class="footer-rule"></div>
  <div class="footer">
    <span>DocDrifter is free for public repos.</span>
    <a href="https://github.com/seralifatih/docdrifter">github.com/seralifatih/docdrifter ↗</a>
  </div>
</div>
</body>
</html>`;
}
