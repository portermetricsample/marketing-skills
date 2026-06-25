# Porter Metrics MCP calls (routes / tool-ids)

How to **actually execute** what the `datos.md` files describe. The Porter MCP is a **portal**:
the "queries" and `list_accounts` are NOT direct functions — they're invoked through meta-tools.

## The portal (7 meta-tools)
`whoami` · `search` · `get_tool_schema` · **`fetch`** (reads) · **`execute`** (mutations
and some reads) · `prepare_upload` · `graph_query`.

## Canonical pattern (the catalog is DYNAMIC — confirm ids via `search`)
1. `search(["natural-language intent"])` → **current** ids + schema.
2. `get_tool_schema(tool_id)` if the schema is missing.
3. `fetch(tool_id, args)` for reads · `execute(tool_id, args)` for mutations.

> Don't hardcode: ids and schemas change between releases. `search` returns the current state.
> The ids below are the **validated ones (Jun 2026)** — reconfirm via `search` if something fails.

## Known tool-ids
| Action | tool_id | Meta-tool | Note |
|--------|---------|-----------|------|
| Discover account | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`; never make up the id |
| Run data query | `tool:porter-reporting:query_data` | **`execute`** | goes through `execute`, NOT `fetch` (it's marked not_read_only); `accounts` = the COMPLETE object from `list_accounts`, not the id string |
| List fields | `tool:porter-reporting:list_fields` | `fetch` | `data_source_name="google-ads"`, `search="..."` |
| Custom fields per account | `tool:porter-reporting:list_custom_fields` | `fetch` | `conversion_action_<id>`, `lead_form_<key>` |
| Scrape a landing page | `tool:porter-tools:scrape` | `fetch` | **Live, native, read-only.** Porter-managed (no API key). `formats:["markdown","json"]` + `jsonOptions.schema` for structured hero/offer/CTA. Empty → retry `proxy:"stealth"`; still empty → degrade, never use an external scraper. |
| Crawl a whole site | `tool:porter-tools:crawl` | `fetch`→async | Multi-page; returns a job id → poll `check_crawl_status`. Not used by the audit (one page per URL). |

## Shape of `query_data`
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<complete DataSourceAccount object from list_accounts>],  // or "blend_id" / "blend_query_destination_id"
  "fields": ["google_ads_..."],
  "date_range": {"preset":"last_month"}  // or {"date_from":"YYYY-MM-DD","date_to":"YYYY-MM-DD"}
  "filters": [[{"field":"...","operator":"equals|contains|...","value":"..."}]],  // AND of ORs
  "sort": [{"field":"...","direction":"desc"}],
  "limit": 5000
})
```
`date_range` presets: `today, yesterday, last_7_days, last_30_days, last_month, this_month, this_year`.
There is NO `last_90_days`/`last_quarter` → use `{date_from, date_to}`.

## Campaign targets & budget — use the connector action, NOT `query_data`

⚠️ **Validated bug (Jun 2026, logged in the MCP-feedback repo).** The per-campaign **target ROAS /
target CPA / budget** fields in `query_data` are **fan-out corrupted**: the SAME field returns
DIFFERENT values depending on which OTHER fields share the query (a join that multiplies these
non-additive settings by the joined rows). The value is **non-deterministic by query shape and
matches nothing** — e.g. a target-ROAS field came back ~9× larger in a 2-field query than in a
5-field query, with the same multiplier on the budget. A printed "tROAS 36 / 3,600%" against a
~1.2× actual is this artifact, **not a real setting**. From `query_data`, trust ONLY
`campaign_bidding_strategy_type` (it is stable).

**Reliable source = the connector action (GAQL → hits the Google Ads API directly, no join layer):**

| Action | tool_id | Meta-tool | Returns |
|--------|---------|-----------|---------|
| Campaigns + targets | `tool:porter-automations:execute_connector_action` · `action_id="campaign.list"` | **`execute`** | strategy + true tROAS/tCPA + budget ref |
| Campaign budgets | `tool:porter-automations:execute_connector_action` · `action_id="budget.list"` | **`execute`** | budget amounts (micros) |

It is a READ but routes through `execute` (calling it via `fetch` returns `not_read_only`).

```
execute(tool_id="tool:porter-automations:execute_connector_action", args={
  "connector": "google-ads",
  "action_id": "campaign.list",
  "source_user_id": <account.source_user_id>,   // from list_accounts
  "company_id":     <account.company_id>,        // from list_accounts
  "params": {
    "customer_id": "<the 10-digit id BEFORE the dash in account.id>",
    "query": "SELECT campaign.name, campaign.bidding_strategy_type, campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas, campaign.target_cpa.target_cpa_micros, campaign.maximize_conversions.target_cpa_micros, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'"
  }
})
```
GAQL truths: `target_roas` is a **real ratio** (`1.2` = 120% = 1.2×); `*_micros` ÷1e6 = currency;
GAQL `WHERE` has **no `OR`** (one condition family per call, else filter client-side); the strategy
is in `biddingStrategyType` and the target nests under the matching strategy
(e.g. `maximizeConversionValue.targetRoas`). Join back to `query_data` actuals by `campaign.name`.

## Cross-cutting gotchas
- `query_data` via **`execute`** (not `fetch`).
- **Campaign targets/budget**: never read tROAS/tCPA/budget from `query_data` — fan-out corrupted (see the section above); pull them from the `campaign.list` / `budget.list` connector action.
- `accounts` = **complete object**, not the id string.
- Large results are **persisted to a file** (the limit is the chat) → export to CSV and process with a script.
- **Paginate by campaign / range** for 100% coverage (a single query hits the `limit`).
- Each `datos.md` lists the specific **fields** and **combinations** for its skill; this reference is only the **invocation route**.
