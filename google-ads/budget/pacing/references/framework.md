# Framework: Budget Pacing

## Mission
Turn a daily budget + the daily spend so far into a **projection** and a **pacing verdict** per
campaign, and separate the two failures that look the same in a spend column: over-pacing into a
budget cap (fixable with money) vs a campaign that just can't spend (rank/demand, not budget).

## The numbers (deterministic)

For each campaign, over the pacing window:

- **`daily_budget`** = `campaign_budget.amount_micros / 1e6`.
- **`days_in_period`** = calendar days in the window (e.g. 30 or 31 for a month; for a custom window,
  `period_end − period_start + 1`).
- **`days_elapsed`** = `min(today, period_end) − period_start + 1` (for a closed month, = `days_in_period`).
- **`expected_period_spend`** = `daily_budget × days_in_period`. (Google's budgets are daily; a
  campaign is "meant to" spend ≈ the daily budget each day. Google may overspend up to 2× on a given
  day and true-up over the month, so treat the daily budget as the *monthly ÷ days* target, not a hard
  daily ceiling.)
- **`spend_to_date`** = Σ `cost_micros` over the elapsed days.
- **`run_rate`** = `spend_to_date / days_elapsed` (avg daily spend so far).
- **`projected_period_spend`** = `run_rate × days_in_period`.
- **`pace`** = `projected_period_spend / expected_period_spend` (1.00 = perfectly on plan).
- **`utilization_to_date`** = `spend_to_date / (daily_budget × days_elapsed)` (are you spending your
  daily budget *so far*).

## Verdicts (cut-offs)

Read `pace`, then qualify with the impression-share cap signal:

| `pace` | Base verdict | Qualify with cap signal |
|---|---|---|
| `> 1.15` | **over-pacing** | if `search_budget_lost_impression_share > 0` → **capped** (real budget cap: throttle to control, or fund if efficient). Else → burning fast but not yet losing reach — watch. |
| `0.85 – 1.15` | **on-track** | — |
| `< 0.85` | **under-pacing** | if `search_budget_lost_impression_share ≈ 0` **and** `search_rank_lost_impression_share > 0` → **rank/demand-limited** (raising budget won't help — the money is idle because of rank/demand, not budget). Else → genuinely under-delivering the plan (bids too low, budget too high, or paused mid-period). |

- **Over-pacing + capped** is the loudest finding: proven demand it can't buy. Recommendation is
  either *throttle* (if you must hold the monthly number) or *fund* (if efficiency justifies it — defer
  the efficiency call to `spend-allocation`).
- **Under-pacing + rank-limited** is a trap: it looks like idle budget, but more budget does nothing.
  Do NOT recommend raising budget; the fix is bids/quality, not money.
- **Under-pacing + genuinely idle** = the budget is set but not being consumed — surface it (money
  reserved but not working).

## Shared budgets
If `campaign_budget.explicitly_shared = TRUE`, several campaigns draw from ONE budget. Group them and
compute pace on the **combined** budget and combined spend — per-campaign pace is meaningless for a
shared budget. Flag the group in `rollup.shared_budgets`.

## Volume & recency gate
- Ignore campaigns with `days_elapsed < 3` (a projection off 1–2 days is noise) — annotate as
  "too new to pace".
- Ignore campaigns whose `spend_to_date` is below a floor (e.g. < 1% of account spend) unless the user
  asked about them specifically — they don't move the account number.
- A campaign paused for part of the period will read as under-pacing; note status changes rather than
  treating a mid-period pause as an under-delivery.

## What this skill deliberately does NOT do
- It does not judge whether the spend is **efficient** (CPA/ROAS) — a well-paced campaign can still be
  wasting money. Efficiency is `spend-allocation` / `funnel-metrics`.
- It does not decide **where to move** freed or needed budget across campaigns — that is
  `spend-allocation`. Pacing says "this one is capped / idle"; allocation says "move $X from A to B".
