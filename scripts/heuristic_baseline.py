"""Baseline heuristic: predict whether a PR should have touched docs/*.md,
then compare against ground truth (whether it actually did).

This is NOT "did docs/*.md change" (that's the label itself) -- it's a
proxy signal a bot could compute BEFORE knowing the ground truth, using
only the PR title and the src/*.py diff.

Heuristic v1 (title-keyword based):
  - Flag as "docs should be updated" if title suggests a new/changed
    user-facing feature: starts with or contains feat/add/support/deprecate
  - Flag negative (internal-only) if title suggests a pure bugfix/refactor
    with no public-surface change: fix (of an internal bug), refactor,
    decouple, type checking, chore, version bump support, release
"""
import json
import re

POSITIVE_PATTERNS = [
    r"\badd\b", r"\bsupport\b", r"\bdeprecate\b", r"\bfeat\b",
    r"\breplace\b", r"\bnormalize\b",
]
NEGATIVE_PATTERNS = [
    r"\bdecouple\b", r"\btype checking\b", r"\brelease\b",
    r"\bpython3\.\d+\b", r"^chore", r"\bmethodview\b",
]


def predict(pr):
    title = pr["title"].lower()

    for pat in NEGATIVE_PATTERNS:
        if re.search(pat, title):
            return False

    for pat in POSITIVE_PATTERNS:
        if re.search(pat, title):
            return True

    # "fix" is ambiguous: default to True only if it doesn't look like an
    # internal-only fix (heuristic: no strong signal -> predict True,
    # since under-predicting negatives is cheap and a doc bot missing a
    # real drift is worse than a false positive... but our target is
    # precision, so default to False on pure "fix:" titles)
    if title.startswith("fix"):
        return False

    return True


def main():
    with open("data/dataset.json", encoding="utf-8") as f:
        dataset = json.load(f)

    tp = fp = tn = fn = 0
    errors = []
    for pr in dataset:
        actual = pr["ground_truth_docs_affected"]
        pred = predict(pr)
        if pred and actual:
            tp += 1
        elif pred and not actual:
            fp += 1
            errors.append(("FP", pr["number"], pr["title"]))
        elif not pred and actual:
            fn += 1
            errors.append(("FN", pr["number"], pr["title"]))
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0

    print(f"TP={tp} FP={fp} TN={tn} FN={fn}")
    print(f"Precision: {precision:.2%}")
    print(f"Recall:    {recall:.2%}")
    print()
    print("Errors:")
    for kind, num, title in errors:
        print(f"  {kind}  #{num}  {title}")


if __name__ == "__main__":
    main()
