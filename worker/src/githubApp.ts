import { timingSafeEqualHex, computeHmac } from "./crypto";
import { releaseSeat } from "./db";

export async function verifyGithubWebhookSignature(
  signatureHeader: string | null,
  body: string,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const expectedHex = signatureHeader.slice("sha256=".length);
  const computed = await computeHmac(secret, body);
  return timingSafeEqualHex(computed, expectedHex);
}

interface RepoRef {
  full_name: string; // "owner/name"
  private: boolean;
}

interface InstallationEvent {
  action: string;
  installation: {
    id: number;
    account: { login: string; type: "User" | "Organization" };
  };
  sender: { id: number };
  repositories?: RepoRef[]; // present on installation "created"
}

interface InstallationRepositoriesEvent {
  action: string;
  installation: { id: number };
  repositories_added?: RepoRef[];
  repositories_removed?: RepoRef[];
}

async function addInstallationRepos(db: D1Database, installationId: number, repos: RepoRef[]): Promise<void> {
  for (const r of repos) {
    await db
      .prepare(
        `INSERT INTO installation_repos (installation_id, repo, is_private)
         VALUES (?, ?, ?)
         ON CONFLICT(installation_id, repo) DO UPDATE SET is_private = excluded.is_private`
      )
      .bind(installationId, r.full_name.toLowerCase(), r.private ? 1 : 0)
      .run();
  }
}

async function removeInstallationRepos(db: D1Database, installationId: number, repos: RepoRef[]): Promise<void> {
  for (const r of repos) {
    await db
      .prepare("DELETE FROM installation_repos WHERE installation_id = ? AND repo = ?")
      .bind(installationId, r.full_name.toLowerCase())
      .run();
  }
}

async function handleInstallationEvent(db: D1Database, event: InstallationEvent): Promise<void> {
  const { installation, sender, action } = event;

  if (action === "created") {
    await db
      .prepare(
        `INSERT INTO installations (id, account_login, account_type, installed_by_user_id, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           account_login = excluded.account_login,
           account_type = excluded.account_type,
           installed_by_user_id = excluded.installed_by_user_id,
           updated_at = datetime('now')`
      )
      .bind(installation.id, installation.account.login, installation.account.type, sender.id)
      .run();

    if (event.repositories) {
      await addInstallationRepos(db, installation.id, event.repositories);
    }
    return;
  }

  if (action === "deleted") {
    await db.prepare("DELETE FROM installation_repos WHERE installation_id = ?").bind(installation.id).run();
    await db.prepare("DELETE FROM installations WHERE id = ?").bind(installation.id).run();
    return;
  }

  // Other actions (suspend/unsuspend/new_permissions_accepted, etc.) are fine to ignore.
}

interface PaddleSyncEnv {
  PADDLE_API_KEY: string;
  PADDLE_PRICE_ID: string;
}

// After a repo is added/removed under an installation that already has an
// active or past_due subscription, push its private-repo count to Paddle as
// the new quantity -- so a newly-added private repo is covered immediately
// instead of silently failing licensing until someone notices. Best-effort:
// if the Paddle call fails, the DB keeps the old quantity and the repo will
// show as "under quota" on the dashboard rather than being silently broken.
async function handleInstallationRepositoriesEvent(
  db: D1Database,
  _env: PaddleSyncEnv,
  event: InstallationRepositoriesEvent
): Promise<void> {
  if (event.action === "added" && event.repositories_added) {
    // Adding a repo costs nothing now -- it only becomes billable when
    // someone assigns it a seat. (This used to auto-raise the Paddle
    // quantity, which meant connecting a repo silently increased the
    // customer's bill without them asking.)
    await addInstallationRepos(db, event.installation.id, event.repositories_added);
  }
  if (event.action === "removed" && event.repositories_removed) {
    await removeInstallationRepos(db, event.installation.id, event.repositories_removed);
    // Free the seats those repos held so they can be reassigned. The
    // subscription quantity is left alone -- the customer keeps the seats
    // they're paying for and can point them at other repos.
    for (const r of event.repositories_removed) {
      await releaseSeat(db, event.installation.id, r.full_name.toLowerCase());
    }
  }
}

export async function handleGithubWebhookEvent(
  db: D1Database,
  env: PaddleSyncEnv,
  eventType: string | null,
  raw: string
): Promise<void> {
  if (!eventType) return;

  switch (eventType) {
    case "installation":
      await handleInstallationEvent(db, JSON.parse(raw) as InstallationEvent);
      return;
    case "installation_repositories":
      await handleInstallationRepositoriesEvent(db, env, JSON.parse(raw) as InstallationRepositoriesEvent);
      return;
    default:
      // Unhandled event types are fine to ignore.
      return;
  }
}
