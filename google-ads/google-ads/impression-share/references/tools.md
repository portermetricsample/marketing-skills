# Tools — Impression Share Trend (daily pull → weekly trajectory)

The ordered plan of MCP calls. The "query" is the **arguments of `query_data`**, nested in step 2.

> 🔌 Portal mechanics (fetch vs execute, tool-ids): see
> [`../../../_framework/porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).
> **Every field + every gotcha below was live-validated on the `google-ads` connector (a connected Search account,
> 2026-06-23).** `query_data` is classified read-but-billable → it routes through **execute**.

## Tool plan (ordered)
| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` (or `query="<name>"`) | Discover the account **object**. Use the `connection_status="connected"` row. ⚠️ `connection_status` is stored registration state, NOT a live token check — a "connected/Active" account can still fail with `reauth_required`; the only proof is a live query. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | One DAILY pull, all campaigns, ~90 days. The result is large and Porter **auto-saves it to a file** — feed that file straight to `scripts/process.py` (don't pull it into context). |

## Step 2 — `query_data` args (the ONE validated query)
```jsonc
execute  tool:porter-reporting:query_data
{
  "accounts": [ <full connected account object from list_accounts> ],
  "fields": [
    "google_ads_date",                                    // DAILY grain — see "why daily"
    "google_ads_campaign_name",
    "google_ads_search_impression_share",                 // 0-1 fraction at daily grain
    "google_ads_search_rank_lost_impression_share",       // 0-1
    "google_ads_search_budget_lost_impression_share",     // 0-1
    "google_ads_impressions",                             // the weight for aggregation
    "google_ads_search_top_impression_share",             // top-of-page IS (snapshot mode)
    "google_ads_search_absolute_top_impression_share",    // absolute-top IS (the very first ad)
    "google_ads_search_rank_lost_top_impression_share"    // top-of-page reach lost to rank
  ],
  "date_range": { "date_from": "<~90d ago>", "date_to": "<today-1>" },   // explicit range
  "filters": [[ { "field": "google_ads_impressions", "operator": "greater_than", "value": "0" } ]],
  "limit": 2000,
  "sort": [{ "field": "google_ads_date", "direction": "asc" }]
}
```
Hand the saved result file to: `python3 scripts/process.py <file.json> > findings.json`.

## The gotchas (all verified — these are why the query looks the way it does)
1. **Use `google_ads_date` (daily). `google_ads_week` returns 0 rows with the IS family** — verified
   twice (with and without filters). Weekly aggregation happens in `process.py`, NOT in the query. →
   filed to porter-mcp-feedback.
2. **Do NOT filter on `google_ads_campaign_advertising_channel_type`.** That filter silently returns
   **0 rows** for IS queries (the IS view doesn't expose it as a filterable field). Filter
   `impressions > 0` instead; `process.py` drops the non-Search rows (Display/Demand Gen come back with
   IS = rank_lost = budget_lost = 0).
3. **Daily grain defeats the aggregation bug (#15).** At single-day grain the three IS fields are clean
   0-1 fractions that sum to **1.0** (`search_impression_share + rank_lost + budget_lost = 1`,
   verified). Over a multi-day range with NO date dimension the connector averages one field and sums
   the others — so always keep `google_ads_date` in the pull and weight up in code.
4. **Big result → file, not context.** ~13 campaigns × 90 days ≈ 850+ rows; Porter writes it to a
   `tool-results/*.txt` file (native `{columns, rows}` shape). `process.py` reads that shape directly —
   never pull the rows into the chat context.
5. **`reauth_required` is per-Google-login.** If the chosen account fails, a *different* account under
   a different Google login may still work; the failing login must reconnect at
   `app.portermetrics.com/porter-auth?component=google-ads`.

## Tools NOT needed here
- `list_fields` — only to re-validate a field name if a query fails. The 6 fields above are confirmed.
- Anything competitor / Auction-Insights — that resource is non-functional on this connector
  (timeout + reauth, no domain dimension).

## Period
~90 days gives ~13 weekly points after the partial edge weeks are trimmed (`process.py`) — enough for
`decay_core` to read a real trend and detect a crash (`n ≥ 8`). A campaign with < ~6 trimmed weeks of
history is classified but flagged thin (soften the verdict). Shorter windows (30 days ≈ 4 weeks) work
for a quick read but are too short to trust a crash/decline call.
