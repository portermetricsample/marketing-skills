# Tools — Budget Pacing

> 🔌 Portal mechanics (how to invoke `execute_connector_action` via the Porter Metrics MCP):
> [`../../../_framework/porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).

All calls go through the **Porter Metrics MCP** → `execute_connector_action`, connector `google-ads`,
action `report.query` (a read-only GAQL query; account params go inside `params`).

## ⚠️ The budget-field gotcha (why this is TWO queries, not one)

`campaign_budget.amount_micros` lives on the **`campaign_budget`** resource. When you SELECT it in the
**same** query as a per-date performance metric (`metrics.cost_micros` segmented by `segments.date`),
Google Ads returns the budget **multiplied/duplicated per segment row** or an outright incompatible-field
error — the amount you read back is wrong. **Never** put `campaign_budget.amount_micros` and a
date-segmented metric in one query. Pull the budget once (no metrics, no date segment), and the daily
spend separately, then join in code on `campaign.id`.

## Query 1 — Budgets (no metrics, no date segment)

- **Action**: `report.query` · **Connector**: `google-ads`
- **GAQL**:

```sql
SELECT
  campaign.id,
  campaign.name,
  campaign.status,
  campaign_budget.amount_micros,
  campaign_budget.period,
  campaign_budget.explicitly_shared
FROM campaign
WHERE campaign.status = 'ENABLED'
```

- Notes: `campaign_budget.period` is almost always `DAILY` (Google Ads budgets are daily). Convert to
  a period budget in the framework (daily × days-in-period). `explicitly_shared = TRUE` means several
  campaigns share ONE budget — flag it; their pace is joint, not per-campaign.

## Query 2 — Daily spend across the period (no budget field)

- **Action**: `report.query` · **Connector**: `google-ads`
- **GAQL**:

```sql
SELECT
  campaign.id,
  segments.date,
  metrics.cost_micros
FROM campaign
WHERE campaign.status = 'ENABLED'
  AND segments.date BETWEEN '{{period_start}}' AND '{{period_end}}'
ORDER BY campaign.id, segments.date
```

- `{{period_start}}`/`{{period_end}}` = the pacing window (the current month-to-date for a live check,
  or a closed month). Sum `cost_micros / 1e6` per campaign = spend-to-date; the number of distinct
  dates with data (or `today − period_start + 1`) = days elapsed.

## Query 3 — Budget-cap confirmation (period totals, no date segment)

- **Action**: `report.query` · **Connector**: `google-ads`
- **GAQL**:

```sql
SELECT
  campaign.id,
  metrics.cost_micros,
  metrics.search_budget_lost_impression_share,
  metrics.search_rank_lost_impression_share
FROM campaign
WHERE campaign.status = 'ENABLED'
  AND segments.date BETWEEN '{{period_start}}' AND '{{period_end}}'
```

- `search_budget_lost_impression_share > 0` on an over-pacer = a **real budget cap** (it is losing
  impressions it could buy → throttle or fund). Distinguish from `search_rank_lost_impression_share`
  (rank cap — more budget won't help). These IS fields are period totals — do NOT segment them by date
  (they aggregate wrong per-day).

## Fields read (chips)

`campaign.id` · `campaign.name` · `campaign.status` · `campaign_budget.amount_micros` ·
`campaign_budget.period` · `campaign_budget.explicitly_shared` · `segments.date` ·
`metrics.cost_micros` · `metrics.search_budget_lost_impression_share` ·
`metrics.search_rank_lost_impression_share`

## Data pulls (3)

1. Budgets per campaign (budget-only query).
2. Daily spend per campaign across the period.
3. Period budget/rank lost impression share (cap confirmation).

## Not needed here

- No conversion / value fields — pacing is about *timing of spend*, not its return (that is
  `spend-allocation` / `funnel-metrics`).
- No `process.py` — the join + projection is small; the framework does it inline. (If an account has
  thousands of campaigns, cache the daily-spend pull.)
