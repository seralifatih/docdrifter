"""LLM decision layer: for each PR, show the title + src/*.py patches to an
LLM and ask whether docs/*.md should have been updated. Compare against
ground truth (whether docs actually changed in that PR).

Uses DeepSeek's OpenAI-compatible API. Requires DEEPSEEK_API_KEY in .env.
"""
import argparse
import json
import os
import re
import sys

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

API_KEY = os.environ.get("DEEPSEEK_API_KEY")
if not API_KEY:
    print("ERROR: DEEPSEEK_API_KEY not set in .env", file=sys.stderr)
    sys.exit(1)

client = OpenAI(api_key=API_KEY, base_url="https://api.deepseek.com")

SYSTEM_PROMPT_TEMPLATE = """You are a documentation-drift detector for a Python \
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


def build_user_prompt(pr, src_prefix):
    patches = []
    for f in pr["files"]:
        if f["filename"].startswith(src_prefix):
            patches.append(f"--- {f['filename']} ---\n{f['patch'][:3000]}")
    diff_text = "\n\n".join(patches)
    return f"PR title: {pr['title']}\n\nSource diff:\n{diff_text}"


def predict(pr, system_prompt, src_prefix):
    resp = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": build_user_prompt(pr, src_prefix)},
        ],
        temperature=0,
    )
    content = resp.choices[0].message.content.strip()
    content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
    try:
        parsed = json.loads(content)
        return parsed["docs_should_update"], parsed.get("reason", "")
    except (json.JSONDecodeError, KeyError):
        print(f"  WARN: could not parse response: {content!r}", file=sys.stderr)
        return None, content


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", default="data/dataset.json")
    parser.add_argument("--results", default="data/llm_results.json")
    parser.add_argument("--repo-desc", default="apiflask, a Flask extension for building OpenAPI-documented APIs")
    parser.add_argument("--docs-path", default="docs/*.md")
    parser.add_argument("--src-prefix", default="src/apiflask/")
    args = parser.parse_args()

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(
        repo_desc=args.repo_desc, docs_path=args.docs_path
    )

    with open(args.dataset, encoding="utf-8") as f:
        dataset = json.load(f)

    results = []
    tp = fp = tn = fn = 0
    for i, pr in enumerate(dataset):
        print(f"[{i+1}/{len(dataset)}] PR #{pr['number']}: {pr['title'][:60]}", file=sys.stderr)
        pred, reason = predict(pr, system_prompt, args.src_prefix)
        actual = pr["ground_truth_docs_affected"]
        results.append({
            "number": pr["number"],
            "title": pr["title"],
            "predicted": pred,
            "actual": actual,
            "reason": reason,
        })
        if pred is None:
            continue
        if pred and actual:
            tp += 1
        elif pred and not actual:
            fp += 1
        elif not pred and actual:
            fn += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0

    with open(args.results, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print()
    print(f"TP={tp} FP={fp} TN={tn} FN={fn}")
    print(f"Precision: {precision:.2%}")
    print(f"Recall:    {recall:.2%}")
    print()
    print("Errors:")
    for r in results:
        if r["predicted"] is None:
            continue
        if r["predicted"] != r["actual"]:
            kind = "FP" if r["predicted"] else "FN"
            print(f"  {kind}  #{r['number']}  {r['title']}")
            print(f"       reason: {r['reason']}")


if __name__ == "__main__":
    main()
