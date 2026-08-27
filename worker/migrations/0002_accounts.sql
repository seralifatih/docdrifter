CREATE TABLE users (
  github_id INTEGER PRIMARY KEY,       -- GitHub's stable numeric user id, never `login`
  login TEXT NOT NULL,                 -- current username, display-only, refreshed each login
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                 -- random 256-bit token, base64url; also the cookie value
  user_id INTEGER NOT NULL REFERENCES users(github_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE installations (
  id INTEGER PRIMARY KEY,              -- GitHub's installation id
  account_login TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('User', 'Organization')),
  installed_by_user_id INTEGER REFERENCES users(github_id), -- from the webhook's `sender` field
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE installation_repos (
  installation_id INTEGER NOT NULL REFERENCES installations(id),
  repo TEXT NOT NULL,                  -- "owner/name", lowercase -- matches repos.repo's normalization
  PRIMARY KEY (installation_id, repo)
);
CREATE INDEX idx_installation_repos_repo ON installation_repos(repo);
