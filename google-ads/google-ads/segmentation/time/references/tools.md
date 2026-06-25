# Tools — Google Ads Time Segmentation

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`** — here there are **two** of them (a chronological pull and a
cyclical pull), because `day_of_week` / `hour` are segment fields that need their own segmented
query, separate from the chronological `date` pull.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Porter connectors
- `google-ads`

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | **chronological pull** — see below | Daily counts for the trend / contribution-to-change (bucket up to week / month / quarter / year in code). |
| 3 | `tool:porter-reporting:query_data` | `execute` | **cyclical pull** — see below | Counts segmented by `day_of_week` and by `hour` for the recurring-pattern views. |

## Step 2 — chronological pull (`query_data` args)
Dimension: **`google_ads_date`** (chronological — bucket up to week / month / quarter / year in
code; do **not** ask the MCP for week/month buckets).

Base counts (everything else is derived from these):
- `google_ads_impressions`
- `google_ads_clicks`
- `google_ads_cost_micros`
- `google_ads_conversions`
- `google_ads_conversions_value`

Granularity: **daily**. Period: the **report period AND its comparison period** (e.g. this month
vs last) — the whole method is a vs-previous-period attribution, so both windows are pulled.

## Step 3 — cyclical pull (`query_data` args)
Run as a **separate** segmented query (these are segment fields). Dimensions:
- `google_ads_day_of_week` — cyclical (weekday pattern).
- `google_ads_hour` — cyclical (hour-of-day pattern; together they make the DoW×hour heatmap).

Same base counts as Step 2 (`impressions`, `clicks`, `cost_micros`, `conversions`,
`conversions_value`).

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used; this is count math over time, not landing analysis.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **Compute every rate/cost from the base counts** — native ratio fields are wrong at the
  aggregate. Pull only the 5 counts; derive CTR / CPC / CPM / CPA / ROAS / conversion-rate.
- **Ratios don't sum across buckets** — attribute a ratio's move via its numerator/denominator
  counts, not by summing bucket ratios.
- **`day_of_week` / `hour` are segment fields** — they need their own segmented pull, separate
  from the chronological `date` pull (hence two `query_data` calls).
- **A long range × `hour` is heavy** — cap the range or pre-aggregate.
- **Volume floor for cyclical:** a weekday/hour slot below the floor → report "insufficient
  data", don't claim a pattern.
