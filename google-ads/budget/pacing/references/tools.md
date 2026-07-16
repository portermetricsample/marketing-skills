# Tools — Budget Pacing

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested below — not raw GAQL.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).

## ⚠️ The budget-field gotcha (why budgets come from the connector action, not `query_data`)

`query_data` **fan-out corrupts** the budget/target fields: `campaign_budget.amount_micros` returns a
DIFFERENT value depending on which other fields share the query (a join that multiplies the
non-additive budget by the joined rows). The number you read back is non-deterministic by query shape
and matches nothing. **Never read the budget from `query_data`.** Read it from the connector action
(`budget.list`), which hits the Google Ads API directly with no join layer. Read the daily *spend*
from `query_data` (spend is additive and aggregates correctly), then join the two in code on the
campaign.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-automations:execute_connector_action` | `execute` | `action_id="budget.list"` | The **daily budget** per campaign (amount_micros) — from the API directly, NOT `query_data` (see gotcha). Also gives `explicitly_shared`. |
| 3 | `tool:porter-reporting:query_data` | `execute` | daily-spend fields (below) | The **actual daily spend** per campaign across the period. `accounts` = the full object from step 1. |
| 4 | `tool:porter-reporting:query_data` | `execute` | cap fields (below) | Period totals to confirm an over-pacer is really budget-capped. |

## Step 3 — daily-spend `query_data` args

- `google_ads_campaign_name` — the entity to join to its budget + name in the recommendation.
- `google_ads_date` — the day (time series across the pacing window). *(Validate the exact date
  dimension name with `list_fields(search="date")` if a query fails.)*
- `google_ads_cost_micros` — the daily spend (account currency).

Filter: `google_ads_campaign_status equals ENABLED`. Period: the pacing window
(`{date_from, date_to}` — current month-to-date for a live check, or a closed month). Sort:
`google_ads_campaign_name`, `google_ads_date`. Sum spend per campaign = spend-to-date; the count of
distinct dates (or `today − date_from + 1`) = days elapsed.

## Step 4 — budget-cap confirmation `query_data` args (period totals, NO date)

- `google_ads_campaign_name`
- `google_ads_cost_micros`
- `google_ads_search_budget_lost_impression_share` — the **budget cap** signal (> 0 on an over-pacer
  = a real cap, more budget buys more).
- `google_ads_search_rank_lost_impression_share` — the **rank cap** signal (raising budget won't help).

Filter: `google_ads_campaign_advertising_channel_type equals SEARCH` (impression share is Search-only).
Do NOT add `google_ads_date` here — the IS fields aggregate wrong when segmented by day; read them as
period totals. Use the **overall** IS field, not the `_top_` / `_absolute_top_` variants.

## Fields read (chips)

`google_ads_campaign_name` · `google_ads_campaign_status` · `google_ads_date` ·
`google_ads_cost_micros` · `google_ads_search_budget_lost_impression_share` ·
`google_ads_search_rank_lost_impression_share` · `budget.list` → daily budget (amount_micros) +
`explicitly_shared`.

## Data pulls (3)

1. Daily budgets per campaign — via `budget.list` (connector action).
2. Daily spend per campaign across the period — via `query_data`.
3. Period budget/rank lost impression share — via `query_data` (cap confirmation).

## Tools NOT needed here (keep it minimal)

- `scrape` / `crawl` — pacing is numeric.
- No conversion / value fields — pacing is about *timing of spend*, not its return (that is
  `spend-allocation` / `funnel-metrics`).
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas

- **Budget is campaign-level** (or shared — `budget.list` `explicitly_shared = true` means several
  campaigns draw from ONE budget; their pace is joint, compute it on the combined budget/spend).
- **Impression share is Search-only** and must be a period total, never date-segmented.
- **Spend is additive** (safe in `query_data`); **budget is not** (use `budget.list`) — never mix them
  in one query.
