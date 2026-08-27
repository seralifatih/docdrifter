---
title: Silence is the feature — why DocDrifter doesn't comment on most PRs
description: A docs bot that comments on every diff gets muted within a week. The interesting design work in DocDrifter is everything it decides not to flag, and being honest about the corners that gets cut.
date: 2026-08-27
---

The easiest version of a docs-drift bot to build is also the one nobody keeps switched on: flag every pull request that touches `src/` without touching `docs/`. It takes an afternoon to write, and it's wrong constantly — it fires on internal refactors, type-checking fixes, dependency bumps, test-only changes. Teams turn it off within a week because the signal-to-noise ratio is worse than no bot at all.

We measured this directly. Against 44 hand-labeled pull requests from [apiflask](https://github.com/apiflask/apiflask), that naive heuristic gets **42% precision**. Less than half the PRs it flags actually needed a docs update.

So the real design problem for DocDrifter was never "detect changes near docs" — it was "decide, case by case, whether a documented behavior actually changed." That's a judgment call, and most of the judgment lives in [one prompt](https://github.com/seralifatih/docdrifter/blob/master/docdrifter.py).

## What actually counts as drift

The system prompt draws a line that's stricter than "the code changed":

- A public API's signature, behavior, or accepted arguments changing — yes.
- A documented default value changing, even if the new default looks like an implementation detail — yes. If a docs page says "Default: X" and the PR changes X, that line is now wrong regardless of why.
- An internal helper's behavior changing, where that helper isn't part of the public surface — no, even if the change is substantive.
- A bug fix that makes code correctly enforce a rule that was *already documented* — no. The docs already describe the intended behavior; the fix just makes the code match them.
- Build tooling, CI config, dependency bumps — no, unless what changed is a config option the library exposes to its own users, which is a different thing wearing similar clothes.

That last distinction — an already-documented rule finally being enforced, versus a new rule being introduced — turned out to be one of the more common ways naive detection breaks. The code diff looks identical in both cases: a validation check gets added where there wasn't one. Only the git history and the existing docs text tell you which one you're looking at.

## The part where we compromise

Every real system has a corner it cuts for simplicity, and it's worth naming the one here plainly rather than letting a user discover it.

DocDrifter's first move on every PR is coarse: it checks whether *any* file under your configured docs path changed. If one did, the action exits immediately — no model call, no comment, regardless of what else the PR touched.

That's a real limitation, not just a performance optimization. It assumes touching docs at all means the *right* docs got touched. A PR that updates one page while leaving three others stale, or a PR where someone adds a single blank line to a docs file specifically to suppress the check, both look identical to this gate: "docs were touched, move on." Point `docs-path` narrowly at the pages the LLM should actually be checking against, or use `skip-labels` to route specific PRs back through review, if this gap matters for your repo.

We could make this smarter — diff-aware doc coverage instead of a path-level touch check — and it's a real candidate for a future version. We chose the coarse version first because it's the one that's cheap to reason about and hard to get subtly wrong, and because the far more common failure mode in practice isn't "someone gamed the docs-touch check," it's "nobody touched docs at all," which is exactly the case the rest of the system is built to catch.

## Why the model has to see the description, not just the diff

One input that's easy to skip and shouldn't be: `repo-description`, a one-line description of what the project does, passed straight into the system prompt. It's optional — there's a generic fallback — but it isn't decoration. Whether a change is "internal" or "public-facing" is relative to what the project actually is, and a one-line description is often enough context for the model to draw that line correctly instead of guessing from code shape alone.

The result of all this is a bot that, on the PRs we've tested against, mostly says nothing. That's deliberate. A comment that shows up once, is specific, and is right earns attention. A comment that shows up on every PR gets an eslint-disable-style reflex: dismissed on sight, whether or not it's correct that time.
