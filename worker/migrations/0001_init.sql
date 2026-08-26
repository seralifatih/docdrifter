CREATE TABLE repos (
  repo TEXT PRIMARY KEY,              -- "owner/name", lowercase-normalized
  status TEXT NOT NULL DEFAULT 'cancelled'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT UNIQUE,
  current_period_end TEXT,            -- ISO8601, informational only
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_repos_paddle_customer ON repos(paddle_customer_id);

-- Observability only, not load-bearing for licensing correctness.
CREATE TABLE requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo TEXT NOT NULL,
  is_private INTEGER NOT NULL,
  allowed INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_requests_repo_time ON requests(repo, created_at);
