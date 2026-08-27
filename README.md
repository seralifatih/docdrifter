# DocDrifter

A GitHub Action that flags pull requests which change source code without
updating the docs.

## Why

Docs drift silently: someone changes a function signature or adds a config
option, the PR gets reviewed and merged, and the docs page describing that
behavior quietly goes stale. DocDrifter checks each PR's diff against an LLM
and leaves a comment only when it thinks the docs actually need an update.

## Validation

Before building this, the detection approach was validated against 92 real
merged PRs from two open-source projects (apiflask, pygeoapi), with manually
labeled ground truth. A naive title-keyword heuristic got 42% precision. The
diff-aware LLM approach in `scripts/llm_pipeline.py` gets:

| Repo | Precision | Recall |
| --- | --- | --- |
| apiflask, raw labels (n=44) | 68.2% | 100% |
| apiflask, 2 labels corrected (n=44) | 77.3% | 100% |
| pygeoapi, raw labels (n=48) | 84.6% | 91.7% |

That's **68–85% precision, 92–100% recall** across two repos — not a
uniform number, and apiflask stays the weaker repo even after correction
(77.3% vs pygeoapi's 84.6%). apiflask's 17 of 44 PRs were real drift, so the
100% recall isn't a fluke of a tiny positive class.

This was **not** a blind eval — the prompt went through a few iterations
against this same labeled set before settling on what ships today. Along the
way, a manual re-read of apiflask's false positives found two PRs we'd
originally labeled "no drift" that were, on closer look, real drift the
model had actually caught correctly. We corrected those two labels and
re-scored; the row above shows both the original and corrected numbers so
you can judge either one. No other label was touched after seeing model
output, and pygeoapi's ground truth was never revised. The correction is
noted inline in [`data/dataset.json`](data/dataset.json). The full
methodology, prompt iteration history, and raw results (including the
false-positive review notes) are in [`data/`](data/) — nothing is held
back.

## Usage

```yaml
name: DocDrifter
on:
  pull_request:
    types: [opened, synchronize, reopened, labeled, unlabeled]

permissions:
  pull-requests: write
  contents: read
  id-token: write

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: seralifatih/docdrifter@v1
        with:
          src-path: "src/"
          docs-path: "docs/"
          repo-description: "describe your project here"
          skip-labels: "no-docs-needed,dependencies" # optional
```

No API key to configure — the action proves its identity to DocDrifter's
backend via a GitHub Actions OIDC token, which is why `id-token: write` is
required. **Free for public repos.** Private repos need an active
subscription; if yours isn't licensed yet, DocDrifter will comment on your
next PR with a link to activate it.

Check a repo's subscription status anytime at
`https://docdrifter.com/status?repo=owner/name` — it shows whether the repo
is licensed, the next renewal date, and a link to Paddle's customer portal
for invoices, card updates, and cancellation.

## Data and privacy

Each PR sends only its diff and title to DocDrifter's backend, which
forwards them to DeepSeek for evaluation — nothing else in the repo is read.
DocDrifter's own database does not store your diff or code, only the repo
name, its public/private status, and whether the request was allowed. Full
details, including what the dashboard's GitHub login stores and how Paddle
billing works, are at [docdrifter.com/privacy](https://docdrifter.com/privacy)
and [docdrifter.com/terms](https://docdrifter.com/terms).

## Status

Running in production, not yet listed on the GitHub Marketplace. Install it
today by pointing `uses:` at `seralifatih/docdrifter@v1` in your workflow
(see Usage above) — no Marketplace listing is required to use the action.
This repo dogfoods itself via
[`.github/workflows/dogfood.yml`](.github/workflows/dogfood.yml), and it's
also running on a handful of external repos today.
