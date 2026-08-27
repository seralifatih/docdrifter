import type { RepoRow } from "./db";
import { BASE_STYLES } from "./styles";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const MANAGE_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

const STATUS_COLORS: Record<string, string> = {
  free: "#1a7f4e",
  active: "#1a7f4e",
  past_due: "#a56a00",
  cancelled: "#b23b2e",
  paused: "#a56a00",
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

function repoCardHtml(repo: string, isPrivate: boolean, row: RepoRow | null): string {
  // Public repos are always free -- they never get a `repos` row (that
  // table only tracks Paddle subscriptions), so "no row" only means
  // "not activated" for a private repo. A public repo with no row is
  // simply free, not unlicensed.
  const status = !isPrivate ? "free" : row?.status ?? "cancelled";
  const color = STATUS_COLORS[status] ?? "#b23b2e";
  return `
  <a class="repo-card card" href="/status?repo=${encodeURIComponent(repo)}">
    <div class="repo-name">${esc(repo)}</div>
    <div class="repo-card-foot">
      <span class="repo-status">
        <span class="dot" style="background:${color};box-shadow:0 0 0 3px color-mix(in srgb, ${color} 16%, transparent)"></span>
        <span style="color:${color}">${statusLabel(status)}</span>
      </span>
      <span class="manage-icon">${MANAGE_ICON}</span>
    </div>
  </a>`;
}

export function dashboardPage(
  login: string,
  avatarUrl: string | null,
  repos: Array<{ repo: string; isPrivate: boolean; row: RepoRow | null }>,
  installUrl: string
): string {
  const rows = repos.length
    ? `<div class="repo-grid">${repos.map((r) => repoCardHtml(r.repo, r.isPrivate, r.row)).join("")}</div>`
    : `<div class="empty-state card">
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
${BASE_STYLES}
body { min-height: 100vh; }
.topbar { display: flex; align-items: center; gap: 10px; padding: 16px clamp(20px, 4vw, 48px); border-bottom: 1px solid var(--color-divider); }
.brand { font-family: var(--font-heading); font-weight: 600; font-size: 18px; letter-spacing: -0.01em; }
.user { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text-muted); }
.avatar { width: 24px; height: 24px; border-radius: 50%; }
.main { max-width: 900px; margin: 0 auto; padding: 40px clamp(20px, 4vw, 48px) 60px; }
h1 { font-size: 26px; }
.subhead { margin: 10px 0 0; font-size: 14.5px; line-height: 22px; color: var(--color-text-muted); max-width: 60ch; }
.repo-grid { margin-top: 28px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.repo-card { display: block; padding: 18px 20px; text-decoration: none; color: inherit; transition: border-color .15s ease; }
.repo-card:hover { border-color: color-mix(in srgb, var(--brand) 45%, var(--color-divider)); text-decoration: none; }
.repo-name { font-family: var(--font-mono); font-size: 13px; word-break: break-word; }
.repo-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
.repo-status { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
.dot { width: 8px; height: 8px; }
.manage-icon { color: var(--color-text-faint); display: flex; }
.empty-state { margin-top: 28px; padding: 40px 30px; text-align: center; }
.empty-state p { color: var(--color-text-muted); margin: 0 0 16px; font-size: 14.5px; }
.action-row { display: flex; align-items: center; gap: 14px; margin-top: 30px; flex-wrap: wrap; }
.footer { display: flex; justify-content: space-between; gap: 16px; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--color-divider); font-size: 13px; color: var(--color-text-faint); flex-wrap: wrap; }
.footer a { color: var(--color-accent-700); text-decoration: none; }
.footer a:hover { text-decoration: underline; }
form { margin: 0; }
</style>
</head>
<body class="dot-grid-bg">
<div class="topbar">
  ${BOOK_ICON}
  <span class="brand">DocDrifter</span>
  <div class="user">
    ${avatarUrl ? `<img class="avatar" src="${esc(avatarUrl)}" alt="">` : ""}
    <span>${esc(login)}</span>
  </div>
</div>
<div class="main">
  <h1>Your repos</h1>
  <p class="subhead">Repos covered by DocDrifter Dashboard installations you've set up. Public repos check for free; private repos need an active subscription.</p>
  ${rows}
  <div class="action-row">
    <a class="btn btn-secondary" href="${esc(installUrl)}">Manage installations</a>
    <form method="POST" action="/auth/logout"><button type="submit" class="btn btn-ghost">Log out</button></form>
  </div>
  <div class="footer">
    <span>DocDrifter is free for public repos.</span>
    <a href="https://github.com/seralifatih/docdrifter">github.com/seralifatih/docdrifter ↗</a>
  </div>
</div>
</body>
</html>`;
}
