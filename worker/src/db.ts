export type RepoStatus = "active" | "past_due" | "cancelled" | "paused";

export interface RepoRow {
  repo: string;
  status: RepoStatus;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  current_period_end: string | null;
}

const PAID_STATUSES: RepoStatus[] = ["active", "past_due"];

export function isPaid(row: RepoRow | null): boolean {
  return row !== null && PAID_STATUSES.includes(row.status);
}

export async function getRepo(db: D1Database, repo: string): Promise<RepoRow | null> {
  const row = await db
    .prepare("SELECT repo, status, paddle_customer_id, paddle_subscription_id, current_period_end FROM repos WHERE repo = ?")
    .bind(repo.toLowerCase())
    .first<RepoRow>();
  return row ?? null;
}

export async function upsertRepoBySubscription(
  db: D1Database,
  args: {
    repo?: string;
    paddleSubscriptionId: string;
    paddleCustomerId: string;
    status: RepoStatus;
    currentPeriodEnd?: string | null;
  }
): Promise<void> {
  if (args.repo) {
    // First time we see this subscription: repo comes from customData.
    await db
      .prepare(
        `INSERT INTO repos (repo, status, paddle_customer_id, paddle_subscription_id, current_period_end, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(repo) DO UPDATE SET
           status = excluded.status,
           paddle_customer_id = excluded.paddle_customer_id,
           paddle_subscription_id = excluded.paddle_subscription_id,
           current_period_end = excluded.current_period_end,
           updated_at = datetime('now')`
      )
      .bind(
        args.repo.toLowerCase(),
        args.status,
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
      `UPDATE repos SET
         status = ?,
         current_period_end = COALESCE(?, current_period_end),
         updated_at = datetime('now')
       WHERE paddle_subscription_id = ?`
    )
    .bind(args.status, args.currentPeriodEnd ?? null, args.paddleSubscriptionId)
    .run();
}

export async function logRequest(
  db: D1Database,
  args: { repo: string; isPrivate: boolean; allowed: boolean }
): Promise<void> {
  // Observability only -- never let this fail the request.
  try {
    await db
      .prepare("INSERT INTO requests (repo, is_private, allowed) VALUES (?, ?, ?)")
      .bind(args.repo.toLowerCase(), args.isPrivate ? 1 : 0, args.allowed ? 1 : 0)
      .run();
  } catch {
    // best-effort
  }
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

export async function getReposForUser(db: D1Database, userId: number): Promise<string[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT ir.repo FROM installation_repos ir
       JOIN installations i ON i.id = ir.installation_id
       WHERE i.installed_by_user_id = ?
       ORDER BY ir.repo`
    )
    .bind(userId)
    .all<{ repo: string }>();
  return (result.results ?? []).map((r) => r.repo);
}
