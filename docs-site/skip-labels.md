# Skip labels

Set `skip-labels` to a comma-separated list of PR labels. If a PR has any of
these labels, DocDrifter skips the check entirely.

```yaml
- uses: seralifatih/docdrifter@v1
  with:
    skip-labels: "no-docs-needed,dependencies"
```

Your workflow's `on.pull_request.types` needs to include `labeled` and
`unlabeled`, or adding the label to an already-open PR won't re-run the
action (it'll only take effect on the next push).
