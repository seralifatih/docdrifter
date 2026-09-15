---
title: We tried our own checkout and it wanted $279/mo for one repo
description: DocDrifter's private-repo billing was all-or-nothing by accident, not by design. Here's the bug, the number that exposed it, and the seat model that replaced it.
date: 2026-09-15
---

The bug wasn't in a test. It was in our own checkout page, using our own card, trying to license exactly one private repo out of an installation that had thirty-one.

The price came back as $279/mo.

## Why "one repo" became "all thirty-one"

The licensing check at the time was simple, in the way that simple things are simple right up until someone hits the edge: `subscription.quantity` had to be greater than or equal to the installation's *total* private repo count, or nothing was licensed. Not "nothing beyond what you paid for" — nothing at all.

That's an all-or-nothing gate wearing a quantity field's clothes. It looked like it supported buying a few seats, because `quantity` was right there and Paddle happily bills whatever number you send it. But the check behind it never asked "does this specific repo have a seat" — it asked "is quantity at least as large as the whole installation," which meant the only two states reachable were "license everything" or "license nothing." Pick a quantity smaller than your repo count and you'd complete a real charge and get zero working repos out of it, because the comparison still failed.

We found this by doing the thing that should have caught it earlier: using the product the way a real customer would, on an installation that wasn't a clean two-repo test fixture. The moment there was a realistic repo count behind the account, the math stopped being flattering.

## What a seat model actually requires

The fix wasn't "let the check pass at a lower number" — that's the same bug with a different threshold. It required a seat to be a real, addressable thing, not an inferred count.

```sql
CREATE TABLE licensed_repos (
  installation_id INTEGER NOT NULL REFERENCES installations(id),
  repo TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (installation_id, repo)
);
```

`subscription.quantity` is now just what Paddle bills — a count. Whether a specific repo is licensed is a row in this table, not an inequality against the installation's size. A repo is licensed if and only if it has a row here. That single change is what makes "buy one seat, license one specific repo" a state the system can actually be in.

A few things fell out of making seats a real row instead of a comparison:

- **Checkout claims a specific repo, not a quantity.** The repo you came in for rides through Paddle as `customData`, so the `subscription.created` webhook seats that exact repo — not "whichever repo happens to be first," not "none until someone manually assigns one."
- **Seats move without re-billing.** `/dashboard/seat` claims or releases a seat on a given repo, refusing to claim past the quantity already paid for rather than silently bumping the customer's bill to make room.
- **Freeing a repo doesn't touch quantity.** Removing a repo from the GitHub installation frees its seat, but we deliberately leave `quantity` alone — the customer paid for N seats and keeps N seats, free to assign to a different repo, rather than losing one because they disconnected the wrong thing.
- **Downgrades trim the newest seats first.** If a subscription drops from 3 seats to 2, the repo that's been licensed longest is the one that survives. The alternative — arbitrary or first-in-table order — would occasionally drop the repo someone specifically paid to activate.
- **A spare seat gets used immediately.** If someone already has an unused seat and hits `/checkout` again, they're seated on the spot and redirected to the status page. No second trip through Paddle for something they've already paid for.

One more distinction the old check couldn't make: `/v1/evaluate` now separates "no subscription exists" from "a subscription exists but this specific repo has no seat." Those used to collapse into the same 402 and the same "go to checkout" redirect — which meant a customer who was already paying could get sent to buy something they already had, for a different repo than the one that actually needed a seat. Now the first case routes to checkout and the second routes to the dashboard, where a spare seat (if one exists) is one click away instead of a second charge.

## The other thing we found while fixing this

Paddle's billing account is registered as LoopSignal — a name shared with another product — so every receipt, checkout page, and card statement says LoopSignal, not DocDrifter. A rename is requested and pending on Paddle's side. Until it lands, the honest move is disclosing it up front, on the checkout page and in the terms, rather than letting someone discover an unfamiliar company name at the exact moment they're entering a card number. A surprising name on a statement is the kind of thing that gets a charge disputed even when the charge is entirely legitimate — better to say it before checkout than explain it after.

Neither of these was a hypothetical edge case caught in review. Both surfaced from going through our own checkout as a customer would, with real numbers behind it instead of a fixture built to make the happy path look clean.
