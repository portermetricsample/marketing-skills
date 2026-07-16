---
name: budget-pacing
description: Tell the advertiser whether each Google Ads campaign is on track to spend its budget over the period — over-pacing (burning too fast, hitting the daily cap and losing impressions to budget), under-pacing (won't spend what's allocated), or on-track — with a projected end-of-period spend per campaign. Use this skill whenever the user asks about budget pacing, spend pace, "am I on track to spend my budget", over-pacing / under-pacing, burning budget too fast, campaigns hitting their daily cap by mid-day, under-delivering budgets, or month-end spend projection — even if they don't say "pacing". Judges spend PACE over time ONLY; where to reallocate budget belongs to the complementary `spend-allocation` skill, and bid targets to `bid-strategy`.
---

# Budget Pacing

## Goal (job-to-be-done)
Answer the question a media buyer asks mid-period: **is each campaign on track to spend its budget,
or is it burning too fast / not fast enough?** Google shows you today's spend and the daily budget,
but not the trajectory — whether a campaign will exhaust its budget early (and go dark), sit capped
all month (losing demand it could buy), or quietly underspend the money you set aside. This skill
reads each campaign's daily budget and its actual daily spend so far, projects end-of-period spend
from the run-rate, and returns a pacing verdict per campaign.

- **Who:** media buyer / PPC manager / whoever owns the monthly budget. **When:** a mid-period
  pacing check, or the "are budgets pacing" item on the account-audit checklist.
- **Decision it drives:** which campaign to throttle (over-pacing into a cap that's costing reach),
  which to un-cap or push (under-pacing with demand available), and whether month-end spend will
  land on plan.
- **The differentiator:** it separates the two failures that look identical in a spend column — a
  campaign **capped by budget** (over-pacing, `budget_lost_impression_share` > 0, more budget buys
  more) from one **limited by rank or demand** (under-pacing, raising budget does nothing) — and it
  projects, rather than just reporting today's number.

## Scope
- ✅ **Spend pace over time** — daily budget vs actual daily spend, projected end-of-period spend, over/under/on-track per campaign, and whether over-pacing is hitting the daily cap.
- ❌ **Where to move the money** (raise / cut / reallocate across campaigns) → complementary `spend-allocation` skill (efficiency × budget-lost IS).
- ❌ **Bid-strategy targets** (is tCPA/tROAS aligned with actuals?) → `bid-strategy`.
- ❌ **Whether the spend is efficient** (CPA/ROAS quality) → `spend-allocation` / `funnel-metrics`. Pacing judges *timing of spend*, not its return.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the TWO queries (budgets alone, then daily spend) and why they must be separate.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: expected-vs-projected pace, the over/under/on-track cut-offs, budget-cap vs rank-cap.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** the reporting period (with today's date inside it, or a closed month). Per campaign:
`campaign_budget.amount_micros` (the daily budget) and `campaign.status` — from a **budget-only**
query — plus daily `cost_micros` by `segments.date` across the period, and
`search_budget_lost_impression_share` (to confirm a cap is actually costing impressions). See
[`references/tools.md`](references/tools.md) for the two-query split and the budget-field gotcha.

**Process:** apply [`references/framework.md`](references/framework.md). Convert the daily budget to
an expected period spend; compute spend-to-date and days elapsed → run-rate → **projected**
end-of-period spend; take pace = projected ÷ expected. Classify each campaign **over-pacing /
under-pacing / on-track**, and for over-pacers separate a real budget cap (`budget_lost_impression_share`
> 0 → throttle or fund) from a burst that isn't yet losing reach. Gate on volume; annotate thin or
just-launched campaigns, don't project off two days of data. Budgets are **campaign-level** (or a
shared budget across campaigns — flag shared budgets, whose pace is joint).

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the pace story — total projected vs total budget and the
  loudest single pacer), `diagnosis` (where budget is capped-and-losing vs set-but-idle), `action`
  (the highest-impact throttle/push, where / what / why).
- `campaigns[]` — one per campaign, each with `pace` numbers, a `verdict`, and the executable
  `recommendation {where, what, why}`.
- `rollup` — total budget vs total projected spend, the biggest over-pacers and under-pacers by
  dollars, and any shared-budget groups.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`_framework/writing.md`](../../_framework/writing.md) — a question heading the data answers
> yes/no; the metric+delta carried as data, never spelled out in prose; first sentence answers the
> heading, then names the driver; one bridge line to the next section. Plain language for a
> non-technical owner.

## Example (illustrative — NOT rules)
- "Brand — Search" is projected to spend **142%** of its monthly budget and is already losing
  **31%** of impressions to budget: a real cap — throttle the daily budget or fund it, it has demand
  it can't buy. Meanwhile "Prospecting — Broad" will land at **58%** of budget with **0%** lost to
  budget: not a budget problem — the money is idle because rank/demand, not budget, is the limit.
