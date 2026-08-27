---
title: How we measured DocDrifter's precision and recall (and why the raw numbers matter)
description: We hand-labeled 92 real pull requests across two open-source repos, found two mistakes in our own ground truth, and decided to publish both the raw and corrected numbers instead of picking the flattering one.
date: 2026-08-27
---

Before writing a line of the GitHub Action, we needed to know one thing: does an LLM reading a PR diff actually predict whether the docs need an update, better than the obvious heuristic everyone writes first?

The obvious heuristic is "flag any PR that touches `src/` without touching `docs/`." It's what most teams reach for, and it's also why most teams turn it off within a week — it fires on every internal refactor, every test-only change, every dependency bump.

## The setup

We pulled 92 merged pull requests from two real open-source Python projects — [apiflask](https://github.com/apiflask/apiflask) (44 PRs) and [pygeoapi](https://github.com/geopython/pygeoapi) (48 PRs) — and read every single one by hand. For each PR we recorded a binary label: did the documentation genuinely need an update after this change, yes or no. That's the ground truth.

Then we ran the same diff-aware LLM approach that ships in [`scripts/llm_pipeline.py`](https://github.com/seralifatih/docdrifter/blob/master/scripts/llm_pipeline.py) against that labeled set, and scored precision and recall.

We want to be upfront about something before the numbers: **this was not a blind evaluation.** The prompt went through a few iterations against this exact labeled set before we landed on the version that ships today. If you're the kind of person who discounts a benchmark the moment you learn the model saw the test set during development, that instinct is correct here too — take the numbers below as "tuned against this set," not "generalizes to yours with certainty."

## The numbers, raw and corrected

| Repo | Precision | Recall |
| --- | --- | --- |
| apiflask, raw labels (n=44) | 68.2% | 100% |
| apiflask, 2 labels corrected (n=44) | 77.3% | 100% |
| pygeoapi, raw labels (n=48) | 84.6% | 91.7% |

Two things worth explaining here, because both are easy to gloss over in a marketing page and we'd rather not.

**Why two rows for apiflask.** While reviewing the model's false positives by hand, we found two PRs we had originally labeled "no drift needed" that were, on a closer second read, genuinely wrong labels — the model had actually caught real drift our own ground truth missed. We fixed those two labels and rescored. We did not touch any label the model got right, and we did not revise pygeoapi's ground truth at all. The correction is [noted inline in the dataset](https://github.com/seralifatih/docdrifter/blob/master/data/dataset.json) rather than quietly folded in.

**Why apiflask stays weaker even after correction.** 77.3% is still meaningfully below pygeoapi's 84.6%. We're not claiming a flat "85%+ across the board" — the honest range is 68–85% precision depending on the repo, and if you're evaluating this for your own codebase, assume you're somewhere in that range, not at the top of it.

**Why 100% recall on apiflask isn't a red flag.** A perfect recall score on a small sample can be a sign the positive class was tiny (e.g. 3 out of 44), which would make it a coin-flip result dressed up as a metric. It isn't that here — 17 of the 44 apiflask PRs were real drift, roughly 39% of the set. Catching all 17 is a real result, not a sampling artifact.

Nothing here is held back: the [prompt iteration history](https://github.com/seralifatih/docdrifter/blob/master/scripts/llm_pipeline.py), the [false-positive review notes](https://github.com/seralifatih/docdrifter/blob/master/data/fp_manual_review.json), and every intermediate scoring run are in the repo, not summarized away.

## Why we published the ugly version

The tagline on our landing page is "measured, not asserted." That only means something if the measurement holds up when someone actually goes and checks it. A page that said "85%+ precision" without qualification would have been technically defensible for pygeoapi and false for apiflask — and the first person who cloned the repo, read `data/dataset.json`, and did the arithmetic would have found the gap in about five minutes.

The corrected version — showing the range, naming the weaker repo, and explaining exactly what changed and why — is a better result to publish than a single flattering number, not despite being less impressive, but because it's the one that survives contact with someone who checks.
