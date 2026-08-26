# Skip labels

Set `skip-labels` to a comma-separated list of PR labels. If a PR has any of
these labels, DocDrifter skips the check entirely.

```yaml
- uses: seralifatih/docdrifter/action@v1
  with:
    skip-labels: "no-docs-needed,dependencies"
```
