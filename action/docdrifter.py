"""DocDrifter GitHub Action entrypoint.

Runs inside a GitHub Actions job on a pull_request event. Fetches the PR's
changed files, and if source files changed but no docs files did, asks an
LLM whether docs should have been updated. If yes, posts (or updates) a
single PR comment flagging it. If the PR already touches docs, or the LLM
says no, the action stays silent (or removes a stale flag comment).

Required env vars:
  GITHUB_TOKEN     - provided automatically by GitHub Actions
  DEEPSEEK_API_KEY - user-supplied secret
  GITHUB_REPOSITORY - "owner/repo", provided automatically
  PR_NUMBER        - the pull request number to check

Configured via action inputs (passed as env vars by action.yml):
  SRC_PATH   - path prefix for source files, e.g. "src/"
  DOCS_PATH  - path prefix for docs files, e.g. "docs/"
  REPO_DESC  - one-line description of the project, for the LLM prompt
"""
import json
import os
import re
import sys
import urllib.request

MARKER = "<!-- docdrifter:comment -->"

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
    return val


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


def get_pr_title(repo, pr_number, token):
    pr = gh_request("GET", f"/repos/{repo}/pulls/{pr_number}", token)
    return pr["title"]


def build_user_prompt(title, files, src_path):
    patches = []
    for f in files:
        if f["filename"].startswith(src_path) and f.get("patch"):
            patches.append(f"--- {f['filename']} ---\n{f['patch'][:3000]}")
    diff_text = "\n\n".join(patches)
    return f"PR title: {title}\n\nSource diff:\n{diff_text}"


def call_llm(system_prompt, user_prompt, api_key):
    req = urllib.request.Request(
        "https://api.deepseek.com/chat/completions",
        data=json.dumps({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
        }).encode(),
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    content = result["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
    parsed = json.loads(content)
    return parsed["docs_should_update"], parsed.get("reason", "")


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


def get_pr_labels(repo, pr_number, token):
    pr = gh_request("GET", f"/repos/{repo}/pulls/{pr_number}", token)
    return {label["name"] for label in pr.get("labels", [])}


def main():
    token = env("GITHUB_TOKEN")
    api_key = env("DEEPSEEK_API_KEY")
    repo = env("GITHUB_REPOSITORY")
    pr_number = env("PR_NUMBER")
    src_path = env("SRC_PATH", required=False, default="src/")
    docs_path = env("DOCS_PATH", required=False, default="docs/")
    repo_desc = env("REPO_DESC", required=False, default="a software project")
    skip_labels = {
        l.strip() for l in env("SKIP_LABELS", required=False, default="").split(",") if l.strip()
    }

    if skip_labels:
        pr_labels = get_pr_labels(repo, pr_number, token)
        if pr_labels & skip_labels:
            print(f"PR has a skip label ({pr_labels & skip_labels}), skipping.")
            return

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

    title = get_pr_title(repo, pr_number, token)
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(repo_desc=repo_desc, docs_path=f"{docs_path}*")
    user_prompt = build_user_prompt(title, files, src_path)

    should_update, reason = call_llm(system_prompt, user_prompt, api_key)
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
