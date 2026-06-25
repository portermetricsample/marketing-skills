# Data: Google Ads — Funnel Metrics

> 🔌 **How these queries are invoked on the MCP** (portal, tool-ids, fetch/execute): see [`porter-mcp-calls.md`](../../_framework/porter-mcp-calls.md).

Verified live against the `google-ads` connector catalog (Jun 2026). Exact field names —
**do not make them up**. Re-check: `list_fields(data_source_name="google-ads", search="...")`.

## Connector
- **Porter:** `google-ads`.
- **Account:** `list_accounts(component_name="google-ads")`. ID `<customer_id>-<login_customer_id>`. Never make it up.

## Fields to QUERY — only the base counts + Impression Share (everything else is computed)

Pull **only these** (they aggregate correctly). Derive all rates/costs yourself.
- `google_ads_impressions`
- `google_ads_clicks`
- `google_ads_cost_micros` (already in account currency despite the name)
- `google_ads_conversions` (**primary** = UI)
- `google_ads_conversions_value`
- `google_ads_all_conversions` (context only — to mention secondary actions)
- `google_ads_search_top_impression_share` · `google_ads_search_absolute_top_impression_share`
- `google_ads_search_rank_lost_top_impression_share` · `google_ads_search_budget_lost_top_impression_share`

## Metrics to COMPUTE from those counts (do NOT query the native ratio fields)
| Metric | Formula |
|--------|---------|
| CPM | `cost / impressions × 1000` |
| CPC | `cost / clicks` |
| CTR | `clicks / impressions` |
| CPA | `cost / conversions` |
| ROAS | `conversions_value / cost` *(show only if value > 0)* |
| Conversion rate | `conversions / clicks` |
| AOV | `conversions_value / conversions` *(ecommerce only)* |

> ⚠️ The native fields `ctr`, `average_cpc`, `conversions_from_interactions_rate`,
> `value_per_conversion`, `cost_per_conversion` are **unreliable at the account aggregate** —
> validated: native conv-rate = 0.0 with 100 conversions, native CTR 11.5% vs real 6.2%,
> native avg CPC $371 vs real $2.61. Compute from base counts instead.

## Period and granularity
- **Current:** `date_range = {"preset": "last_month"}` (or custom `{date_from, date_to}`).
- **vs previous:** a **second** query for the prior period; compute the % change (Porter does
  not compare periods in one call).
- **Series (optional):** add `google_ads_date` or `google_ads_week`.

## Suggested queries (run the SAME query TWICE — current + previous period)
1. **Account totals (the funnel):** `impressions + clicks + cost_micros + conversions +
   conversions_value + all_conversions + search_top_impression_share +
   search_absolute_top_impression_share + search_rank_lost_top_impression_share +
   search_budget_lost_top_impression_share` (no dimension = account totals; returns 1 row).
2. **By segment (optional):** add `campaign_name` or `device` or `date`.
   → **Always two runs:** current period and the equal-length window immediately before it.
   Compute every % change from the two. Porter does not compare periods in one call.

## Exact MCP calls (copy-paste)
> Portal meta-tools. If any id fails, re-confirm via `search` (the catalog is dynamic).

**1) Discover the account** — meta-tool `fetch`:
```
fetch(tool_id="tool:porter-accounts:list_accounts", args={"component_name": "google-ads"})
```
Keep the **complete** account object returned (id + source_user_id + company_id + flags).

**2) Funnel totals — CURRENT period** — meta-tool `execute` (NOT fetch):
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<the COMPLETE account object from step 1>],
  "fields": [
    "google_ads_impressions", "google_ads_clicks", "google_ads_cost_micros",
    "google_ads_conversions", "google_ads_conversions_value", "google_ads_all_conversions",
    "google_ads_search_top_impression_share", "google_ads_search_absolute_top_impression_share",
    "google_ads_search_rank_lost_top_impression_share", "google_ads_search_budget_lost_top_impression_share"
  ],
  "date_range": {"date_from": "2026-05-01", "date_to": "2026-05-31"}
})
```
→ no dimension = account totals (1 row). Dump to `data/raw/current.json`.

**3) Funnel totals — PREVIOUS period** — the **same call**, `date_range` = the equal-length
window immediately before (e.g. `{"date_from": "2026-04-01", "date_to": "2026-04-30"}`).
Dump to `data/raw/previous.json`.

**Optional:** add `"filters": [[{"field":"google_ads_campaign_advertising_channel_type","operator":"equals","value":"SEARCH"}]]`
for Search-only, or add `"google_ads_campaign_name"` to `fields` to segment.

Then `process.py --current ... --previous ...` computes every rate/cost + the vs-previous deltas.

## Gotchas (connector footguns)
- **CPA: do NOT use `google_ads_cost_per_conversion`** — wrong aggregate at account level
  (Acme Insurance: reported $9,230 vs real $259). Always compute `cost_micros / conversions`.
- **ROAS only when value exists.** Lead-gen accounts have `conversions_value ≈ 0` → hide ROAS
  and AOV; lead with CPA + conv. rate. Auto-detect, don't assume.
- **Impression Share is Search-only and campaign-level.** Top/Abs-Top measure the Search slot;
  PMax/Shopping/Display won't return them. If the account has those, say IS covers Search only.
- **`cost_micros > 0` auto-filter:** requesting cost hides 0-spend rows — fine for totals,
  watch it on segment breakdowns.
- **Primary vs all conversions:** `conversions` = primary (UI); `all_conversions` = incl.
  calls/secondary. State which one a number used.
- **No 90-day/quarter preset:** use `{date_from, date_to}`.
