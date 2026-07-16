# Output — Budget Pacing

The skill emits ONE JSON object. Pure data — no emojis, markdown, tables, or colors; a renderer
(`formats/*`) turns it into the human document.

## Enums

- `verdict`: `over_pacing` · `on_track` · `under_pacing`
- `cap`: `budget` · `rank_or_demand` · `none`  (why an over/under pacer is where it is)
- `period`: `DAILY`  (Google Ads budget period; almost always daily)

## Top-level schema

```json
{
  "_meta": {
    "skill": "budget-pacing",
    "version": "1.0.0",
    "account_id": "123-456-7890",
    "period_start": "2026-07-01",
    "period_end": "2026-07-31",
    "days_in_period": 31,
    "days_elapsed": 15,
    "status": "complete"
  },
  "synthesis": {
    "headline": "One string: total projected vs total budget for the period, and the single loudest pacer (the campaign most over- or under-pacing in dollars).",
    "diagnosis": "One string: where budget is capped-and-losing-reach vs set-but-idle — the pacing shape of the account.",
    "action": "One string: the highest-impact move — which campaign to throttle or fund, where / what / why."
  },
  "campaigns": [
    {
      "campaign_id": "111",
      "campaign_name": "Brand — Search",
      "status": "ENABLED",
      "daily_budget": 200.0,
      "expected_period_spend": 6200.0,
      "spend_to_date": 4300.0,
      "run_rate": 286.7,
      "projected_period_spend": 8887.0,
      "pace": 1.43,
      "utilization_to_date": 1.43,
      "budget_lost_is": 0.31,
      "rank_lost_is": 0.05,
      "verdict": "over_pacing",
      "cap": "budget",
      "shared_budget_group": null,
      "recommendation": {
        "where": "Brand — Search daily budget",
        "what": "Throttle to ~$140/day to land on the $6,200 plan, OR fund it if the efficiency (see spend-allocation) justifies the extra reach.",
        "why": "Projected to spend 143% of budget and already losing 31% of impressions to budget — a real cap, not a spend glitch."
      }
    },
    {
      "campaign_id": "222",
      "campaign_name": "Prospecting — Broad",
      "status": "ENABLED",
      "daily_budget": 300.0,
      "expected_period_spend": 9300.0,
      "spend_to_date": 2600.0,
      "run_rate": 173.3,
      "projected_period_spend": 5372.0,
      "pace": 0.58,
      "utilization_to_date": 0.58,
      "budget_lost_is": 0.0,
      "rank_lost_is": 0.22,
      "verdict": "under_pacing",
      "cap": "rank_or_demand",
      "shared_budget_group": null,
      "recommendation": {
        "where": "Prospecting — Broad",
        "what": "Do NOT raise budget. The idle spend is a rank/demand limit — fix bids/quality (see bid-strategy) or accept the lower reach.",
        "why": "Projected to land at 58% of budget with 0% lost to budget and 22% lost to rank — money is reserved but rank, not budget, is the ceiling."
      }
    }
  ],
  "rollup": {
    "total_budget": 46000.0,
    "total_projected_spend": 41200.0,
    "account_pace": 0.90,
    "top_over_pacers": [{ "campaign_id": "111", "campaign_name": "Brand — Search", "projected_over": 2687.0 }],
    "top_under_pacers": [{ "campaign_id": "222", "campaign_name": "Prospecting — Broad", "projected_under": 3928.0 }],
    "shared_budgets": [
      { "budget_id": "b-9", "campaign_ids": ["333", "334"], "combined_budget": 12400.0, "combined_projected": 15000.0, "pace": 1.21 }
    ]
  }
}
```

## Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `daily_budget` | number | `campaign_budget.amount_micros / 1e6` |
| `expected_period_spend` | number | `daily_budget × days_in_period` |
| `spend_to_date` | number | Σ daily `cost_micros` (query_data → already currency, no /1e6) over elapsed days |
| `run_rate` | number | `spend_to_date / days_elapsed` |
| `projected_period_spend` | number | `run_rate × days_in_period` |
| `pace` | number | `projected / expected` (1.00 = on plan) |
| `utilization_to_date` | number | `spend_to_date / (daily_budget × days_elapsed)` |
| `budget_lost_is` | number | `search_budget_lost_impression_share` (0–1), period total |
| `rank_lost_is` | number | `search_rank_lost_impression_share` (0–1), period total |
| `verdict` | enum | `over_pacing` · `on_track` · `under_pacing` |
| `cap` | enum | `budget` · `rank_or_demand` · `none` |
| `shared_budget_group` | string\|null | budget id if this campaign shares its budget |
| `recommendation` | object | `{where, what, why}` — the executable move |

## Error / edge states
- **No budget on a campaign** (rare — e.g. removed budget): skip, note in `_meta`.
- **`days_elapsed < 3`**: include with `verdict: on_track` and a note "too new to pace" — never project off 1–2 days.
- **Shared budget**: per-campaign pace is null; the group's joint pace lives in `rollup.shared_budgets`.
- **Closed month** (`period_end < today`): `days_elapsed = days_in_period`, so `projected = actual` — the skill reports final pace instead of a projection.
