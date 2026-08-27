-- Which specific private repos a subscription actually covers.
--
-- Before this, licensing was all-or-nothing: `subscriptions.quantity` had to
-- be >= the installation's total private repo count, or nothing worked. That
-- forced anyone with 31 private repos into a $279/mo checkout just to try
-- DocDrifter on one of them -- and if they picked a smaller quantity, they'd
-- pay and still get nothing licensed.
--
-- Now quantity is the seat count (what Paddle bills) and this table records
-- which repos occupy those seats. A repo is licensed only if it has a row
-- here, so checkout explicitly claims the repo the user came in for.
CREATE TABLE licensed_repos (
  installation_id INTEGER NOT NULL REFERENCES installations(id),
  repo TEXT NOT NULL,                  -- "owner/name", lowercase
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (installation_id, repo)
);

CREATE INDEX idx_licensed_repos_repo ON licensed_repos(repo);
