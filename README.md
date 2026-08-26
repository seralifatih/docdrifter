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

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: seralifatih/docdrifter/action@v1
        with:
          deepseek-api-key: ${{ secrets.DEEPSEEK_API_KEY }}
          src-path: "src/"
          docs-path: "docs/"
          repo-description: "describe your project here"
          skip-labels: "no-docs-needed,dependencies" # optional
```

Requires a [DeepSeek API key](https://platform.deepseek.com/) added as a repo
secret.

## Status

Early prototype, not yet published to the GitHub Marketplace. Currently
tested via [`.github/workflows/dogfood.yml`](.github/workflows/dogfood.yml),
which runs this repo's own action against its own PRs.
