---
name: meta-ads-rules-optimizer
description: Optimize Meta (Facebook/Instagram) ad performance by rules — read results, then pause / scale / adjust ad sets and ads by CPA/ROAS thresholds (e.g. pause ad sets over 3× target CPA, scale winners gradually, cut fatigued creative). Use when the user wants to optimize, prune losers, scale winners, cut wasted spend, or set up "if CPA > X then pause" logic. NOTE: Meta's native automated rules are NOT exposed by the Porter MCP, so this runs as ASSISTANT logic (read insights → decide → write). Always confirm each write with the user; scale gradually and respect the account-safety limits.
---

# Meta Ads — Rules Optimizer

Turn performance into action: **pause the losers, scale the winners, cut the waste** — by explicit,
transparent rules. Because Meta's native automated-rules engine is **not exposed by the MCP**, this is
implemented as a loop the assistant runs, not a rule Meta enforces server-side.

## The loop
1. **Read** performance with `meta-ads-insights-reporting` (per ad set / ad, with the result metric for
   the objective — CPA for leads/sales, ROAS for e-comm).
2. **Rank + classify** each entity vs the target (see thresholds).
3. **Decide** the action; **confirm with the user** (money + irreversibility).
4. **Write** via `adset_update` / `ad_update` (`status`, `daily_budget_amount`) — budget in the same
   MINOR-units convention as everywhere ([`../_budget/budget.md`](../_budget/budget.md)).
5. **Re-read** later to verify the effect. This is a repeatable cadence, not a one-shot.

## Thresholds (a sane default rubric — tune per account)
| Signal | Rule of thumb | Action |
|---|---|---|
| CPA > **3× target** (with enough spend/conversions) | clear loser | **Pause** the ad set/ad |
| CPA at/under target + volume | winner | **Scale budget +20–30% max/day** (never 2×) |
| Frequency high + CTR dropping over the week | creative fatigue | **Refresh creative** (new ad), pause the tired one |
| High CTR but low conversion | offer/landing problem, not the ad | Don't cut the ad — flag offer/landing |
| Too little spend/conversions | not enough signal | **Wait** — don't judge yet (learning phase ~50 conv/week) |

## Safety (non-negotiable — see [`../../account-safety/`](../../account-safety/))
- **Confirm each write** with the user; never silently pause/scale money.
- **Scale gradually** (≤20–30%/day). Big overnight jumps flag "unusual activity" and reset learning.
- **Respect the learning phase** — don't cut an ad set before it exits learning (~50 conversions/week)
  unless CPA is catastrophic.
- **Throttle backoff:** on `2859015` or a rate-limit error → back off, don't retry-storm.
- **One change at a time per entity** so you can attribute the effect.

## Gotchas
- **No native rules** (`adrules_library` not exposed) → this is assistant logic, runs when invoked, not
  a Meta-side automation. Say so; don't promise "always-on" rules.
- `optimization_goal` / `billing_event` are frozen at ad-set create — you can only change status/budget/bid, not the goal.
- Budget writes = MINOR units (×offset), read-back to verify (money).

## Scope
- ✅ Read → decide → pause/scale/adjust ad sets & ads by rules, with confirmation.
- ❌ Creating campaigns/ad sets/ads (setup skills). ❌ Server-side Meta automated rules (not exposed).
