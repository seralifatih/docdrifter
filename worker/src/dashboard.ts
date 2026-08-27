import type { SubscriptionRow } from "./db";
import { BASE_STYLES, FAVICON_TAG, THEME_INIT_SCRIPT } from "./styles";

function esc(s: string): string {
  return s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]!));
}

const BOOK_ICON = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" fill="var(--brand)" opacity=".22"></path><path d="M16 8.5C13 6 8.5 5.5 4 6v18c4.5-.5 9 0 12 2.5 3-2.5 7.5-3 12-2.5V6c-4.5-.5-9 0-12 2.5Z" stroke="var(--brand)" stroke-width="1.6" stroke-linejoin="round"></path><path d="M16 8.5v20" stroke="var(--brand)" stroke-width="1.6"></path></svg>`;

const MANAGE_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;

const STATUS_COLORS: Record<string, string> = {
  free: "#1a7f4e",
  active: "#1a7f4e",
  past_due: "#a56a00",
  inactive: "#b23b2e",
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

export interface DashboardRepo {
  repo: string;
  isPrivate: boolean;
  installationId: number;
  subscription: SubscriptionRow | null;
  hasSeat: boolean;
}

function repoCardHtml(r: DashboardRepo, seatsAvailable: boolean): string {
  // Public repos are always free. A private repo is active only if it holds
  // one of the subscription's seats -- having a subscription isn't enough,
  // since a plan can cover fewer repos than the installation contains.
  let status: string;
  if (!r.isPrivate) {
    status = "free";
  } else if (!r.hasSeat) {
    status = "inactive";
  } else if (r.subscription && (r.subscription.status === "past_due" || r.subscription.status === "paused")) {
    status = r.subscription.status;
  } else {
    status = "active";
  }
  const color = STATUS_COLORS[status] ?? "#b23b2e";

  // Seat controls only make sense for private repos, and only for the two
  // states the user can actually act on from here.
  let seatControl = "";
  if (r.isPrivate && r.hasSeat) {
    seatControl = `<button class="seat-btn" data-repo="${esc(r.repo)}" data-action="release">Free seat</button>`;
  } else if (r.isPrivate && !r.hasSeat && seatsAvailable) {
    seatControl = `<button class="seat-btn seat-btn-primary" data-repo="${esc(r.repo)}" data-action="claim">Activate</button>`;
  } else if (r.isPrivate && !r.hasSeat) {
    seatControl = `<a class="seat-btn" href="/checkout?repo=${encodeURIComponent(r.repo)}">Add seat</a>`;
  }

  return `
  <div class="repo-card card">
    <a class="repo-name-link" href="/status?repo=${encodeURIComponent(r.repo)}">
      <div class="repo-name">${esc(r.repo)}</div>
    </a>
    <div class="repo-card-foot">
      <span class="repo-status">
        <span class="dot" style="background:${color};box-shadow:0 0 0 3px color-mix(in srgb, ${color} 16%, transparent)"></span>
        <span style="color:${color}">${statusLabel(status)}</span>
      </span>
      ${seatControl}
    </div>
  </div>`;
}

export function dashboardPage(
  login: string,
  avatarUrl: string | null,
  repos: DashboardRepo[],
  installUrl: string,
  seatUsage: Map<number, { used: number; total: number }>
): string {
  const anySeatsAvailable = (installationId: number): boolean => {
    const u = seatUsage.get(installationId);
    return u ? u.used < u.total : false;
  };

  // One summary line per installation that has a plan, so the seat buttons
  // below have context ("why can't I activate this?").
  const seatSummary = [...seatUsage.entries()]
    .filter(([, u]) => u.total > 0)
    .map(([id, u]) => {
      const login = repos.find((r) => r.installationId === id)?.repo.split("/")[0] ?? "";
      const free = u.total - u.used;
      return `<div class="seat-summary card">
        <span><strong>${esc(login)}</strong> — ${u.used} of ${u.total} seat${u.total === 1 ? "" : "s"} in use</span>
        <span class="seat-summary-note">${
          free > 0
            ? `${free} seat${free === 1 ? "" : "s"} free — activate any private repo below at no extra cost.`
            : `All seats taken. Adding another private repo needs an extra seat.`
        }</span>
      </div>`;
    })
    .join("");

  const rows = repos.length
    ? `<div class="repo-grid">${repos
        .map((r) => repoCardHtml(r, anySeatsAvailable(r.installationId)))
        .join("")}</div>`
    : `<div class="empty-state card">
         <p>No repos yet. Install DocDrifter Dashboard on a repo to see it here.</p>
         <a class="btn btn-primary" href="${esc(installUrl)}">Install on a repo</a>
       </div>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DocDrifter — Dashboard</title>
<meta name="robots" content="noindex">
<meta name="theme-color" content="#6b3fa0">
${FAVICON_TAG}
${THEME_INIT_SCRIPT}
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
.repo-card { display: block; padding: 18px 20px; color: inherit; transition: border-color .15s ease; }
.repo-card:hover { border-color: color-mix(in srgb, var(--brand) 45%, var(--color-divider)); }
.repo-name-link { text-decoration: none; color: inherit; }
.repo-name-link:hover { text-decoration: underline; }
.repo-name { font-family: var(--font-mono); font-size: 13px; word-break: break-word; }
.repo-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
.repo-status { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
.dot { width: 8px; height: 8px; }
.manage-icon { color: var(--color-text-faint); display: flex; }
.seat-btn { font-family: var(--font-body); font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: var(--radius-sm); border: 1px solid var(--color-divider); background: transparent; color: var(--color-text-muted); cursor: pointer; text-decoration: none; white-space: nowrap; }
.seat-btn:hover { border-color: color-mix(in srgb, var(--brand) 45%, var(--color-divider)); color: var(--color-text); text-decoration: none; }
.seat-btn-primary { background: var(--brand); border-color: var(--brand); color: #fff; }
.seat-btn-primary:hover { background: var(--brand-600); border-color: var(--brand-600); color: #fff; }
.seat-btn[disabled] { opacity: .5; cursor: default; }
.seat-summary { margin-top: 24px; padding: 14px 18px; display: flex; flex-direction: column; gap: 4px; font-size: 13.5px; }
.seat-summary-note { color: var(--color-text-muted); font-size: 13px; }
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
  <p class="subhead">Public repos are checked for free. Private repos each take a seat on your plan — activate the ones you want covered, and free a seat any time to move it elsewhere.</p>
  ${seatSummary}
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
<script>
document.querySelectorAll(".seat-btn[data-action]").forEach(function (btn) {
  btn.addEventListener("click", function () {
    var repo = btn.getAttribute("data-repo");
    var action = btn.getAttribute("data-action");
    btn.disabled = true;
    btn.textContent = action === "claim" ? "Activating…" : "Freeing…";
    fetch("/dashboard/seat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repo: repo, action: action })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (b) { throw new Error(b.error || "failed"); });
      // Seat counts and every card's available/unavailable state change
      // together, so a reload is simpler and less error-prone than patching
      // the DOM in several places.
      window.location.reload();
    }).catch(function (err) {
      btn.disabled = false;
      btn.textContent = action === "claim" ? "Activate" : "Free seat";
      alert(
        err.message === "no_seats_available"
          ? "No free seats on this plan. Add a seat from checkout to cover another repo."
          : err.message === "no_active_subscription"
            ? "This installation doesn't have an active subscription yet."
            : "Something went wrong — try again."
      );
    });
  });
});
</script>
</body>
</html>`;
}
