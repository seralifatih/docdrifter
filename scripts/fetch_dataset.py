"""Fetch full diffs for candidate PRs and build the eval dataset.

Reads a candidates.json (PR metadata + ground-truth labels),
fetches each PR's file-level patches via `gh api`, and writes
a dataset.json with one entry per PR:

{
  "number": int,
  "title": str,
  "url": str,
  "ground_truth_docs_affected": bool,
  "docs_files_touched": [str],
  "src_files": [str],
  "files": [{"filename", "status", "additions", "deletions", "patch"}]
}
"""
import argparse
import json
import subprocess
import sys
import time

NOISE_FILES = {"CHANGES.md", "CHANGELOG.md"}


def gh_api(path):
    result = subprocess.run(
        ["gh", "api", path],
        capture_output=True, text=True, encoding="utf-8"
    )
    if result.returncode != 0:
        print(f"ERROR fetching {path}: {result.stderr}", file=sys.stderr)
        return None
    return json.loads(result.stdout)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", required=True, help="e.g. geopython/pygeoapi")
    parser.add_argument("--candidates", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    with open(args.candidates, encoding="utf-8") as f:
        candidates = json.load(f)

    dataset = []
    for i, pr in enumerate(candidates):
        num = pr["number"]
        print(f"[{i+1}/{len(candidates)}] fetching PR #{num}...", file=sys.stderr)
        files_data = gh_api(f"repos/{args.repo}/pulls/{num}/files?per_page=100")
        if files_data is None:
            continue

        files = []
        for fd in files_data:
            files.append({
                "filename": fd["filename"],
                "status": fd["status"],
                "additions": fd["additions"],
                "deletions": fd["deletions"],
                "patch": fd.get("patch", ""),
            })

        dataset.append({
            "number": num,
            "title": pr["title"],
            "url": pr["url"],
            "mergedAt": pr["mergedAt"],
            "ground_truth_docs_affected": pr["ground_truth_docs_affected"],
            "docs_files_touched": pr["docs_files_touched"],
            "src_files": pr["src_files"],
            "files": [f for f in files if f["filename"] not in NOISE_FILES],
        })
        time.sleep(0.3)  # be nice to rate limits

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"Saved {len(dataset)} PRs to {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
