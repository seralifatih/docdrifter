import { timingSafeEqualHex, computeHmac } from "./crypto";

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
      .prepare("INSERT OR IGNORE INTO installation_repos (installation_id, repo) VALUES (?, ?)")
      .bind(installationId, r.full_name.toLowerCase())
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

async function handleInstallationRepositoriesEvent(
  db: D1Database,
  event: InstallationRepositoriesEvent
): Promise<void> {
  if (event.action === "added" && event.repositories_added) {
    await addInstallationRepos(db, event.installation.id, event.repositories_added);
  }
  if (event.action === "removed" && event.repositories_removed) {
    await removeInstallationRepos(db, event.installation.id, event.repositories_removed);
  }
}

export async function handleGithubWebhookEvent(
  db: D1Database,
  eventType: string | null,
  raw: string
): Promise<void> {
  if (!eventType) return;

  switch (eventType) {
    case "installation":
      await handleInstallationEvent(db, JSON.parse(raw) as InstallationEvent);
      return;
    case "installation_repositories":
      await handleInstallationRepositoriesEvent(db, JSON.parse(raw) as InstallationRepositoriesEvent);
      return;
    default:
      // Unhandled event types are fine to ignore.
      return;
  }
}
