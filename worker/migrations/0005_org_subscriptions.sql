-- Move billing from per-repo to per-installation (org/user), so a team with
-- N private repos gets one subscription instead of N separate ones. Paddle's
-- own quantity price breaks (configured in the Paddle dashboard) apply the
-- discount for more repos -- this schema just tracks status + quantity.
--
-- `repos` had zero live rows at migration time (no paying customers yet),
-- so this is a straight replacement, not a data migration.
DROP TABLE repos;

CREATE TABLE subscriptions (
  installation_id INTEGER PRIMARY KEY REFERENCES installations(id),
  status TEXT NOT NULL DEFAULT 'cancelled'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
  quantity INTEGER NOT NULL DEFAULT 0,   -- private repos this subscription is licensed for
  paddle_customer_id TEXT,
  paddle_subscription_id TEXT UNIQUE,
  current_period_end TEXT,               -- ISO8601, informational only
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_subscriptions_paddle_customer ON subscriptions(paddle_customer_id);
