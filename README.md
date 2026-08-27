# DocDrifter

A GitHub Action that flags pull requests which change source code without
updating the docs.

## Why

Docs drift silently: someone changes a function signature or adds a config
option, the PR gets reviewed and merged, and the docs page describing that
behavior quietly goes stale. DocDrifter checks each PR's diff against an LLM
and leaves a comment only when it thinks the docs actually need an update.

## Validation

Before building this, the detection approach was validated against 90+ real
merged PRs from two open-source projects (apiflask, pygeoapi), with manually
labeled ground truth. A naive title-keyword heuristic got 42% precision. The
diff-aware LLM approach in `scripts/llm_pipeline.py` gets 85%+ precision and
90%+ recall on both repos. The full methodology, prompt iteration history,
and raw results are in [`data/`](data/).

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
      - uses: seralifatih/docdrifter/action@v1
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
`https://docdrifter-api.h-f-ilhan.workers.dev/status?repo=owner/name` — it
shows whether the repo is licensed, the next renewal date, and a link to
Paddle's customer portal for invoices, card updates, and cancellation.

## Status

Early prototype, not yet published to the GitHub Marketplace. Currently
tested via [`.github/workflows/dogfood.yml`](.github/workflows/dogfood.yml),
which runs this repo's own action against its own PRs.
