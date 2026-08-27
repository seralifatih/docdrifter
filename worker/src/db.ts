export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "paused";

export interface SubscriptionRow {
  installation_id: number;
  status: SubscriptionStatus;
  quantity: number;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
}

const PAID_STATUSES: SubscriptionStatus[] = ["active", "past_due"];

// Whether the subscription itself is payable-and-current. Says nothing about
// which repos it covers -- see isRepoLicensed for that.
export function isSubscriptionActive(row: SubscriptionRow | null): boolean {
  return row !== null && PAID_STATUSES.includes(row.status);
}

// A private repo is licensed only if its installation has a paid
// subscription AND that repo explicitly holds one of the seats (a
// licensed_repos row). Seats are claimed at checkout, not inferred from
// the installation's repo count -- otherwise someone with 31 private repos
// could never license just one of them.
export function isRepoLicensed(row: SubscriptionRow | null, hasSeat: boolean): boolean {
  return isSubscriptionActive(row) && hasSeat;
}

export async function getSubscription(db: D1Database, installationId: number): Promise<SubscriptionRow | null> {
  const row = await db
    .prepare(
      "SELECT installation_id, status, quantity, paddle_customer_id, paddle_subscription_id, current_period_end FROM subscriptions WHERE installation_id = ?"
    )
    .bind(installationId)
    .first<SubscriptionRow>();
  return row ?? null;
}

// Paddle webhooks identify a subscription by its own id, not ours -- needed
// to find which installation a quantity change applies to.
export async function getSubscriptionByPaddleId(
  db: D1Database,
  paddleSubscriptionId: string
): Promise<SubscriptionRow | null> {
  const row = await db
    .prepare(
      "SELECT installation_id, status, quantity, paddle_customer_id, paddle_subscription_id, current_period_end FROM subscriptions WHERE paddle_subscription_id = ?"
    )
    .bind(paddleSubscriptionId)
    .first<SubscriptionRow>();
  return row ?? null;
}

export async function upsertSubscriptionByPaddleId(
  db: D1Database,
  args: {
    installationId?: number;
    paddleSubscriptionId: string;
    paddleCustomerId: string;
    status: SubscriptionStatus;
    quantity?: number;
    currentPeriodEnd?: string | null;
  }
): Promise<void> {
  if (args.installationId) {
    // First time we see this subscription: installation id comes from customData.
    await db
      .prepare(
        `INSERT INTO subscriptions (installation_id, status, quantity, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(installation_id) DO UPDATE SET
           status = excluded.status,
           quantity = excluded.quantity,
           paddle_customer_id = excluded.paddle_customer_id,
           paddle_subscription_id = excluded.paddle_subscription_id,
           current_period_end = excluded.current_period_end,
           updated_at = datetime('now')`
      )
      .bind(
        args.installationId,
        args.status,
        args.quantity ?? 0,
        args.paddleCustomerId,
        args.paddleSubscriptionId,
        args.currentPeriodEnd ?? null
      )
      .run();
    return;
  }

  // Subsequent events (updated/canceled/transaction.*): look up by subscription id.
  await db
    .prepare(
      `UPDATE subscriptions SET
         status = ?,
         quantity = COALESCE(?, quantity),
         current_period_end = COALESCE(?, current_period_end),
         updated_at = datetime('now')
       WHERE paddle_subscription_id = ?`
    )
    .bind(args.status, args.quantity ?? null, args.currentPeriodEnd ?? null, args.paddleSubscriptionId)
    .run();
}

// Called after Paddle confirms a quantity change (subscription.updated), so
// the stored quantity always mirrors what's actually being billed.
export async function setSubscriptionQuantity(
  db: D1Database,
  installationId: number,
  quantity: number
): Promise<void> {
  await db
    .prepare("UPDATE subscriptions SET quantity = ?, updated_at = datetime('now') WHERE installation_id = ?")
    .bind(quantity, installationId)
    .run();
}

export async function logRequest(
  db: D1Database,
  args: { repo: string; isPrivate: boolean; allowed: boolean }
): Promise<void> {
  // Also the source of truth for the monthly fair-use cap below -- not
  // purely observational anymore, but still best-effort: a failed insert
  // here shouldn't fail the PR check itself.
  try {
    await db
      .prepare("INSERT INTO requests (repo, is_private, allowed) VALUES (?, ?, ?)")
      .bind(args.repo.toLowerCase(), args.isPrivate ? 1 : 0, args.allowed ? 1 : 0)
      .run();
  } catch {
    // best-effort
  }
}

// How many LLM calls (allowed=1 requests -- the only ones that actually
// cost money) has this repo made so far this calendar month. Used to cap
// cost per repo, since billing is flat per-repo/per-installation but cost
// is per-PR -- a quiet repo and a 400-PR/month monorepo pay the same price
// today, so this is what keeps the gap from being unbounded.
export async function countRequestsThisMonth(db: D1Database, repo: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as n FROM requests
       WHERE repo = ? AND allowed = 1
         AND created_at >= strftime('%Y-%m-01T00:00:00', 'now')`
    )
    .bind(repo.toLowerCase())
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// Daily cleanup (called from the scheduled handler). Neither table had
// retention before: expired sessions were filtered on read but never
// deleted, and `requests` grew forever even though only the current
// calendar month is ever queried (the fair-use cap above). 60 days of
// slack covers the cap query plus any debugging that looks a month back.
export async function pruneExpiredSessions(db: D1Database): Promise<number> {
  const result = await db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
  return result.meta.changes ?? 0;
}

export async function pruneOldRequests(db: D1Database): Promise<number> {
  const result = await db.prepare("DELETE FROM requests WHERE created_at < datetime('now', '-60 days')").run();
  return result.meta.changes ?? 0;
}

// --- Accounts (GitHub App login + dashboard) ---

export interface UserRow {
  github_id: number;
  login: string;
  avatar_url: string | null;
}

export async function upsertUser(
  db: D1Database,
  args: { githubId: number; login: string; avatarUrl: string | null }
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (github_id, login, avatar_url, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(github_id) DO UPDATE SET
         login = excluded.login,
         avatar_url = excluded.avatar_url,
         updated_at = datetime('now')`
    )
    .bind(args.githubId, args.login, args.avatarUrl)
    .run();
}

export async function createSession(
  db: D1Database,
  args: { sessionId: string; userId: number; expiresAt: string }
): Promise<void> {
  await db
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(args.sessionId, args.userId, args.expiresAt)
    .run();
}

export async function getSession(db: D1Database, sessionId: string): Promise<{ userId: number } | null> {
  const row = await db
    .prepare("SELECT user_id as userId FROM sessions WHERE id = ? AND expires_at > datetime('now')")
    .bind(sessionId)
    .first<{ userId: number }>();
  return row ?? null;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

export interface UserRepoRow {
  repo: string;
  is_private: number; // SQLite integer boolean (0/1)
  installation_id: number;
}

export async function getReposForUser(db: D1Database, userId: number): Promise<UserRepoRow[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT ir.repo, ir.is_private, ir.installation_id FROM installation_repos ir
       JOIN installations i ON i.id = ir.installation_id
       WHERE i.installed_by_user_id = ?
       ORDER BY ir.repo`
    )
    .bind(userId)
    .all<UserRepoRow>();
  return result.results ?? [];
}

// Whether this user is the one who installed the given GitHub App
// installation -- the only person allowed to open (or view billing details
// on) a checkout for it. `installed_by_user_id` comes from the webhook's
// `sender` field at install time, so this is GitHub-attested, not
// self-reported.
export async function userOwnsInstallation(db: D1Database, userId: number, installationId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM installations WHERE id = ? AND installed_by_user_id = ?")
    .bind(installationId, userId)
    .first();
  return row !== null;
}

export async function addToWaitlist(db: D1Database, email: string): Promise<void> {
  // OR IGNORE against the unique index on email -- a repeat signup (or a
  // script retrying the same address) is a silent no-op, not an error.
  await db.prepare("INSERT OR IGNORE INTO waitlist (email) VALUES (?)").bind(email.trim().toLowerCase()).run();
}

export interface RepoInstallation {
  installationId: number;
  isPrivate: boolean;
  accountLogin: string;
}

// The licensing lookup a PR check needs: given a repo, which installation
// (if any) covers it, and is that repo private. Returns null if the App
// isn't installed on this repo -- private repos require the App to be
// licensed at all (see PRIVATE_REPO_REQUIRES_APP note in index.ts).
//
// `repo` is not unique in installation_repos (PK is installation_id+repo),
// so more than one installation can legitimately claim the same repo name
// -- most plausibly after a repo transfer between two accounts that both
// have the App installed, if GitHub's installation_repositories webhooks
// don't cleanly remove the old row (there's no dedicated `repository`
// transfer-event handling here, only installation-level add/remove). Since
// this decides billing, silently taking an arbitrary row via LIMIT 1 was
// the wrong call -- pick the most recently updated installation instead
// (most likely to be the current real owner) and log the ambiguity so it's
// visible rather than silently resolved.
export async function getInstallationForRepo(db: D1Database, repo: string): Promise<RepoInstallation | null> {
  const result = await db
    .prepare(
      `SELECT ir.installation_id as installationId, ir.is_private as isPrivate, i.account_login as accountLogin
       FROM installation_repos ir
       JOIN installations i ON i.id = ir.installation_id
       WHERE ir.repo = ?
       ORDER BY i.updated_at DESC`
    )
    .bind(repo.toLowerCase())
    .all<{ installationId: number; isPrivate: number; accountLogin: string }>();

  const rows = result.results ?? [];
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    console.error(
      `Repo ${repo.toLowerCase()} is claimed by ${rows.length} installations ` +
        `(${rows.map((r) => r.installationId).join(", ")}); using the most recently updated one.`
    );
  }
  const row = rows[0];
  return { installationId: row.installationId, isPrivate: row.isPrivate === 1, accountLogin: row.accountLogin };
}

// How many private repos does this installation currently have -- the
// number a subscription's quantity must cover to license all of them.
export async function countPrivateRepos(db: D1Database, installationId: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM installation_repos WHERE installation_id = ? AND is_private = 1")
    .bind(installationId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// --- Seats (which private repos a subscription actually covers) ---

export async function isRepoSeated(db: D1Database, installationId: number, repo: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM licensed_repos WHERE installation_id = ? AND repo = ?")
    .bind(installationId, repo.toLowerCase())
    .first();
  return row !== null;
}

export async function countSeatsUsed(db: D1Database, installationId: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) as n FROM licensed_repos WHERE installation_id = ?")
    .bind(installationId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function getSeatedRepos(db: D1Database, installationId: number): Promise<string[]> {
  const result = await db
    .prepare("SELECT repo FROM licensed_repos WHERE installation_id = ? ORDER BY created_at")
    .bind(installationId)
    .all<{ repo: string }>();
  return (result.results ?? []).map((r) => r.repo);
}

export async function claimSeat(db: D1Database, installationId: number, repo: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO licensed_repos (installation_id, repo) VALUES (?, ?)")
    .bind(installationId, repo.toLowerCase())
    .run();
}

export async function releaseSeat(db: D1Database, installationId: number, repo: string): Promise<void> {
  await db
    .prepare("DELETE FROM licensed_repos WHERE installation_id = ? AND repo = ?")
    .bind(installationId, repo.toLowerCase())
    .run();
}

// When a subscription shrinks (quantity lowered in Paddle, or cancelled),
// drop the newest seats until usage fits. Oldest seats win, so the repo
// someone first paid for isn't the one silently dropped.
export async function trimSeatsToQuantity(db: D1Database, installationId: number, quantity: number): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM licensed_repos
       WHERE installation_id = ?1
         AND repo NOT IN (
           SELECT repo FROM licensed_repos
           WHERE installation_id = ?1
           ORDER BY created_at
           LIMIT ?2
         )`
    )
    .bind(installationId, Math.max(quantity, 0))
    .run();
  return result.meta.changes ?? 0;
}
