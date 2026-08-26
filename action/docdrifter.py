"""DocDrifter GitHub Action entrypoint.

Runs inside a GitHub Actions job on a pull_request event. Fetches the PR's
changed files, and if source files changed but no docs files did, asks an
LLM whether docs should have been updated. If yes, posts (or updates) a
single PR comment flagging it. If the PR already touches docs, or the LLM
says no, the action stays silent (or removes a stale flag comment).

The actual LLM call happens server-side (DocDrifter's own backend), gated
on whether the repo is private and, if so, licensed. This action only
builds the prompts and proves its own identity to that backend via a
GitHub Actions OIDC token -- it never sees or needs an LLM API key.

Required env vars:
  GITHUB_TOKEN       - provided automatically by GitHub Actions
  GITHUB_REPOSITORY  - "owner/repo", provided automatically
  PR_NUMBER          - the pull request number to check

Also required (for the OIDC token used to authenticate to DocDrifter's
backend): the calling workflow must grant `permissions: id-token: write`,
which makes GitHub populate ACTIONS_ID_TOKEN_REQUEST_URL and
ACTIONS_ID_TOKEN_REQUEST_TOKEN automatically.

Configured via action inputs (passed as env vars by action.yml):
  SRC_PATH    - path prefix for source files, e.g. "src/"
  DOCS_PATH   - path prefix for docs files, e.g. "docs/"
  REPO_DESC   - one-line description of the project, for the LLM prompt
  SKIP_LABELS - comma-separated PR labels that bypass the check (case-insensitive)
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

MARKER = "<!-- docdrifter:comment -->"
WORKER_URL = "https://docdrifter-api.h-f-ilhan.workers.dev/v1/evaluate"
OIDC_AUDIENCE = "docdrifter"

SYSTEM_PROMPT_TEMPLATE = """You are a documentation-drift detector for a software \
project ({repo_desc}).

Given a pull request's title and its diff (source code files only, not docs \
or tests), decide whether the PROJECT'S STATIC DOCUMENTATION (files under \
{docs_path}, which describe public API usage for human readers) should be \
updated as a result of this PR.

Docs should be updated when the PR (these take priority over the exclusions below):
- Adds, removes, or changes a PUBLIC API's behavior, signature, or accepted arguments
  (a function/class/method that external users import and call directly -- not a
  private/internal helper only used by the library's own internals)
- Adds a new user-facing feature or configuration option
- Changes a documented DEFAULT VALUE of a config option or parameter, even if the
  new default is itself a URL, endpoint, or other "infrastructure-looking" value --
  if a docs page states "Default value: X" and the PR changes X, that line is now
  wrong and docs must update, regardless of why the default changed
- Changes how input the user provides is interpreted or normalized (e.g. a header
  name, a field name, a query value) -- this is observable behavior, not just
  internal spec generation, even when the mechanism is small
- Fixes a bug in a way that changes what users see/receive (e.g. wrong output format)

Docs do NOT need updating when the PR:
- Is an internal refactor, type-checking fix, or code-quality change with no
  behavior change visible to API users
- Only changes a private/internal helper function or class not part of the
  public API surface (e.g. not exported from the package's public module,
  prefixed with `_`, or only called from within the library itself) --
  even if that helper's behavior changes, unless the change is also visible
  through a public entry point
- Updates build tooling, CI, linting config, or dependency versions (but NOT
  config options the library itself exposes to ITS users -- see above)
- Only changes generated/runtime output content (e.g. field ordering or internal
  bookkeeping in the OpenAPI spec JSON) without changing any documented value,
  default, or how a developer writes their code
- Fixes a bug that makes the code correctly enforce/apply a contract that was
  ALREADY documented or already configurable by the user (e.g. a config option
  that existed but was silently ignored, and the fix makes it take effect;
  a documented constraint that wasn't being checked, and the fix checks it).
  The docs already describe the correct/intended behavior -- the PR just makes
  the code match them, so nothing in the docs text needs to change. This applies
  even if the change touches how input is validated or interpreted, as long as
  it's enforcing something already documented rather than introducing a new
  rule. -- unless the fix reveals docs never covered this case, or changes
  a default/value that IS stated in the docs (e.g. "Default value: X")
- Only touches tests
- Already fully updates the relevant public-facing docstring(s) in the same
  diff AND the change is minor/narrow enough (e.g. one new optional parameter
  with a one-line description) that a docstring realistically covers it --
  for a substantial new feature (new decorators, new config sections, new
  behavior with multiple usage examples), assume the prose docs/*.md still
  need their own update even if the docstring was also touched

Respond with strict JSON only, no markdown fences: \
{{"docs_should_update": true|false, "reason": "<one sentence>"}}
"""


def env(name, required=True, default=None):
    val = os.environ.get(name, default)
    if required and not val:
        print(f"ERROR: missing required env var {name}", file=sys.stderr)
        sys.exit(1)
    return val.strip() if val else val


def gh_request(method, path, token, body=None):
    url = f"https://api.github.com{path}"
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "docdrifter-action")
    if data:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


def get_pr_files(repo, pr_number, token):
    files = []
    page = 1
    while True:
        result = gh_request(
            "GET", f"/repos/{repo}/pulls/{pr_number}/files?per_page=100&page={page}", token
        )
        if not result:
            break
        files.extend(result)
        if len(result) < 100:
            break
        page += 1
    return files


def get_pr(repo, pr_number, token):
    return gh_request("GET", f"/repos/{repo}/pulls/{pr_number}", token)


def is_repo_private(repo, token):
    return gh_request("GET", f"/repos/{repo}", token)["private"]


def build_user_prompt(title, files, src_path):
    patches = []
    for f in files:
        if f["filename"].startswith(src_path) and f.get("patch"):
            patches.append(f"--- {f['filename']} ---\n{f['patch'][:3000]}")
    diff_text = "\n\n".join(patches)
    return f"PR title: {title}\n\nSource diff:\n{diff_text}"


def get_oidc_token():
    """Fetches a short-lived GitHub Actions OIDC JWT proving this run is
    executing in the context of GITHUB_REPOSITORY. Requires the calling
    workflow to have granted `permissions: id-token: write`."""
    request_url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL")
    request_token = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN")
    if not request_url or not request_token:
        return None
    req = urllib.request.Request(f"{request_url}&audience={OIDC_AUDIENCE}")
    req.add_header("Authorization", f"Bearer {request_token}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())["value"]


class NotLicensed(Exception):
    def __init__(self, message, checkout_url):
        super().__init__(message)
        self.message = message
        self.checkout_url = checkout_url


def call_worker(system_prompt, user_prompt, repo, is_private, oidc_token):
    """Calls DocDrifter's backend, which authorizes the request (public repos
    are always free; private repos need an active subscription) and makes
    the LLM call on our behalf. Raises NotLicensed on 402, or returns None
    on any other failure so the caller can skip this run without crashing."""
    req = urllib.request.Request(
        WORKER_URL,
        data=json.dumps({
            "repo": repo,
            "is_private": is_private,
            "system_prompt": system_prompt,
            "user_prompt": user_prompt,
        }).encode(),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {oidc_token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
        return result["docs_should_update"], result.get("reason", "")
    except urllib.error.HTTPError as e:
        raw_body = e.read()
        print(f"  DEBUG: HTTPError code={e.code} raw_body={raw_body!r}", file=sys.stderr)
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            body = {}
        if e.code == 402:
            raise NotLicensed(body.get("message", ""), body.get("checkout_url", ""))
        print(f"  WARN: DocDrifter backend returned {e.code}: {body}", file=sys.stderr)
        return None
    except (urllib.error.URLError, json.JSONDecodeError, KeyError) as e:
        print(f"  WARN: DocDrifter backend call failed: {e}", file=sys.stderr)
        return None


def find_existing_comment(repo, pr_number, token):
    comments = gh_request("GET", f"/repos/{repo}/issues/{pr_number}/comments?per_page=100", token)
    for c in comments or []:
        if MARKER in c.get("body", ""):
            return c["id"]
    return None


def post_or_update_comment(repo, pr_number, token, body):
    full_body = f"{MARKER}\n{body}"
    existing_id = find_existing_comment(repo, pr_number, token)
    if existing_id:
        gh_request("PATCH", f"/repos/{repo}/issues/comments/{existing_id}", token, {"body": full_body})
    else:
        gh_request("POST", f"/repos/{repo}/issues/{pr_number}/comments", token, {"body": full_body})


def delete_existing_comment_if_any(repo, pr_number, token):
    existing_id = find_existing_comment(repo, pr_number, token)
    if existing_id:
        gh_request("DELETE", f"/repos/{repo}/issues/comments/{existing_id}", token)


def main():
    token = env("GITHUB_TOKEN")
    repo = env("GITHUB_REPOSITORY")
    pr_number = env("PR_NUMBER")
    src_path = env("SRC_PATH", required=False, default="src/")
    docs_path = env("DOCS_PATH", required=False, default="docs/")
    repo_desc = env("REPO_DESC", required=False, default="a software project")
    skip_labels = {
        l.strip().lower()
        for l in env("SKIP_LABELS", required=False, default="").split(",") if l.strip()
    }

    files = get_pr_files(repo, pr_number, token)
    src_changed = [f for f in files if f["filename"].startswith(src_path)]
    docs_changed = [f for f in files if f["filename"].startswith(docs_path)]

    if not src_changed:
        print("No source files changed, skipping.")
        return

    if docs_changed:
        print("PR already touches docs, skipping.")
        delete_existing_comment_if_any(repo, pr_number, token)
        return

    pr = get_pr(repo, pr_number, token)

    if skip_labels:
        pr_labels = {label["name"].lower() for label in pr.get("labels", [])}
        matched = pr_labels & skip_labels
        if matched:
            print(f"PR has a skip label ({', '.join(matched)}), skipping.")
            delete_existing_comment_if_any(repo, pr_number, token)
            return

    title = pr["title"]
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(repo_desc=repo_desc, docs_path=f"{docs_path}*")
    user_prompt = build_user_prompt(title, files, src_path)

    oidc_token = get_oidc_token()
    if not oidc_token:
        print(
            "  WARN: no OIDC token available (does the workflow grant "
            "`permissions: id-token: write`?); skipping this run.",
            file=sys.stderr,
        )
        return

    is_private = is_repo_private(repo, token)

    try:
        result = call_worker(system_prompt, user_prompt, repo, is_private, oidc_token)
    except NotLicensed as e:
        print(f"  repo not licensed: {e.message}")
        body = (
            "**DocDrifter: this private repo isn't licensed yet**\n\n"
            f"{e.message}\n\n"
            f"[Activate DocDrifter for this repo]({e.checkout_url})"
        )
        post_or_update_comment(repo, pr_number, token, body)
        return

    if result is None:
        print("  DocDrifter backend call failed, skipping this run.")
        return

    should_update, reason = result
    print(f"docs_should_update={should_update} reason={reason}")

    if should_update:
        body = (
            "**DocDrifter: possible docs drift detected**\n\n"
            f"This PR changes source files under `{src_path}` but doesn't update anything "
            f"under `{docs_path}`. {reason}\n\n"
            "_If this doesn't need a docs update, feel free to ignore this comment._"
        )
        post_or_update_comment(repo, pr_number, token, body)
    else:
        delete_existing_comment_if_any(repo, pr_number, token)


if __name__ == "__main__":
    main()
