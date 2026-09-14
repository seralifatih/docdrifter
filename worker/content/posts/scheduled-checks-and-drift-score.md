---
title: Drift doesn't wait for a pull request — why we added a scheduled check
description: DocDrifter only ever looked at pull requests. Commits pushed straight to a default branch walked right past it. Here's why that gap mattered, and why the fix updates a score instead of posting a comment.
date: 2026-09-14
---

DocDrifter's whole design, up to this point, assumed drift arrives through a pull request. The GitHub Action runs on `pull_request`, diffs the PR against its base, and comments if the model thinks the docs are now wrong. That covers the common case. It does not cover a maintainer merging locally and pushing straight to `main`, a bot committing directly to the default branch, or any repo where "everything goes through a PR" isn't actually a rule that's enforced. Those commits never trigger anything. The repo's docs can drift for months and the only signal you had — a comment on a PR — simply never fires, because there was no PR.

We closed that gap with a scheduled check, and getting the design right meant reusing almost nothing from the PR path.

## Why this can't just be "run the same check more often"

The PR workflow has a diff for free — GitHub hands it a base and a head. A scheduled check has no such thing. It needs its own idea of "since when," which means storing state: the commit SHA a repo was last checked at, per repo, updated after every run.

```sql
CREATE TABLE drift_check_state (
  repo TEXT PRIMARY KEY,
  last_checked_sha TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Each day, the backend fires a `repository_dispatch` event at every connected repo. The workflow that listens for it diffs `last_checked_sha` against the default branch's current HEAD and evaluates whatever changed in between — which might be one commit, might be forty, might be zero.

That "might be zero" case is the reason the first run after connecting a repo doesn't evaluate anything at all. There's no prior SHA to diff from yet, so the first scheduled check just records the current HEAD as a starting point. It would be easy to instead diff from the beginning of the repo's history, but that produces a meaningless result — a brand-new repo's entire commit history isn't "recent drift," it's just the repo. The second run, once there's an actual range of commits since the first, is the first one that means anything.

## Why a detected drift doesn't post a comment

The PR-triggered check has an obvious place to put its verdict: a comment on the PR, visible to whoever's about to merge it. The scheduled check has no such place. There's no PR, no diff author to notify, no natural thread to post into.

We didn't try to invent one — a Slack webhook, an email, a synthetic issue opened on every drift. Each of those is a new integration surface with its own failure modes (wrong channel, stale email, an issue nobody triages), and none of them was the actual problem we were trying to solve. So a scheduled check that finds drift does one thing: it writes the verdict to `drift_scores`, the same table the PR path already writes to.

```sql
CREATE TABLE drift_scores (
  repo TEXT PRIMARY KEY,
  docs_should_update INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

That table already existed for the README badge — a single persisted verdict per repo, not a history log, because the badge only ever needs to answer "is this repo's documentation currently believed to be in sync, yes or no." The scheduled check just became a second writer to the same row. A repo's badge and dashboard status now reflect reality even during a long stretch with no open PRs, and neither the badge code nor the dashboard had to change to make that true — they were already reading "the latest verdict for this repo," and now that verdict has two ways of getting updated instead of one.

One consequence worth stating plainly: `skip-labels`, the mechanism for routing a specific PR's check back to manual review, does nothing here. There's no PR to carry a label. If a scheduled check's verdict is wrong for a specific commit, the only lever right now is the same one that governs every other verdict — `src-path`, `docs-path`, and `repo-description` — not a per-run override.

## What this doesn't solve

The scheduled check still runs once a day, so drift introduced by a direct push sits unflagged for up to 24 hours — fine for a badge that answers "is this repo in sync right now," not fine if you needed real-time notice the moment a commit landed. We picked a daily cadence because it matches what the badge and dashboard actually need and because firing `repository_dispatch` more often for every connected repo is a cost that scales with install count for a use case (direct pushes to default) that's the exception, not the common path, on most repos we've seen. If that tradeoff is wrong for a specific repo, the honest answer today is: it isn't configurable yet, and doing so is a more natural next step than inventing a notification channel would have been.
