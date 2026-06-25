# Tools — the full audit pipeline (ordered MCP calls)

The ordered inventory of Porter MCP calls the assembled audit makes. Each per-check **data pull** uses
that check's own `references/tools.md` for the exact field list — this file is the **conductor**, not a
re-listing of every field. Portal mechanics (fetch vs execute, the 7 meta-tools, the `cost_micros`-in-
dollars + fan-out gotchas): [`../../../_framework/porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).

## A. Discover + scope
| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` (+ `query` if named) | The account **object** (id, name, component_name, source_user_id, company_id). Never invent the id; embed the FULL object in every query. |
| 2 | `tool:porter-reporting:query_data` | `execute` | fingerprint pull (below) | Campaign mix → decides which sections apply. |

**Fingerprint pull (step 2):** `["google_ads_campaign_name","google_ads_campaign_advertising_channel_type","google_ads_campaign_bidding_strategy_type","google_ads_impressions","google_ads_clicks","google_ads_cost_micros","google_ads_conversions","google_ads_conversions_value","google_ads_all_conversions"]`, period = the audit window, `sort` cost desc. Read off: Search vs PMax/DG/Shopping, the brand campaign, value vs no-value campaigns, the paused tail (compare to the `campaign.list` count in step C).

## B. Per-check data pulls (`tool:porter-reporting:query_data` via `execute`)
Run the pulls each applicable check defines — see its `references/tools.md`. The audit window is the
**performance** period (e.g. `last_month` or `{date_from,date_to}`); settings/targets/assets are read
as-of-now; the comparison period is the prior period (for scorecard deltas).

| Check | Its tools.md | Grain / notes |
|---|---|---|
| Conversion tracking | `conversion-tracking/references/tools.md` | 2 queries (config + metrics), join by action name — they don't combine. |
| Spend allocation | `spend-allocation/references/tools.md` | campaign grain + impression-share (Search only); use **overall** lost-IS, not `_top_`. |
| Campaign settings | `campaign-settings/references/tools.md` | geo type + network toggles (strings); flag networks only on SEARCH. |
| Audience & demographics | `audience-demographics/references/tools.md` | age, then gender (separate queries); audiences separate. |
| Quality Score | `../keyword-ad-landing/metrics/references/tools.md` | 3 grades (keyword grain), IS (campaign grain), CTR/CVR (ad grain). **Numeric QS is summed/unusable → use the 3 Above/Average/Below pillars.** |
| Search terms & negatives | `../search-terms/relevance/references/tools.md` + `term-routing` | term↔keyword per match type; for waste, pull the **full term tail** (`search_term · cost · conversions · conversions_value`, sort cost desc, high limit → MCP writes a file) and run `scripts/ngram.py`. |
| Device & dayparting | `../segmentation/time/references/tools.md` | `google_ads_device`; `google_ads_day_of_week` / `google_ads_hour` (separate segmented pulls). |
| Geography | `../segmentation/audience/geography/references/tools.md` | one geo dimension (e.g. `google_ads_geo_target_region`); sort + cap. |
| Ad assets | `ad-assets/references/tools.md` | one asset type per query, account-level, status-filtered, ≤30d. Connector partly unreliable → flag "verify in-account". |
| Ads / RSA copy | `../keyword-ad-landing/alignment/references/tools.md` (step 2b) | RSA headlines/descriptions + final URLs (ad grain) — for the real ad-copy read + the landing list. |

## C. True bid targets + budgets — the connector action (NOT query_data)
The per-campaign tROAS / tCPA / budget fields in `query_data` are **fan-out corrupted**. Pull the real
values from the Google Ads API directly:
```
execute(tool:porter-automations:execute_connector_action, {
  connector:"google-ads", action_id:"campaign.list",
  source_user_id:<account.source_user_id>, company_id:<account.company_id>,
  params:{ customer_id:"<10-digit before the dash in account.id>",
    query:"SELECT campaign.name, campaign.bidding_strategy_type, campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas, campaign.target_cpa.target_cpa_micros, campaign.maximize_conversions.target_cpa_micros, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'" }})
```
`target_roas` is a ratio (1.2 = 120%); `*_micros` ÷1e6 = currency. Join to the actuals by `campaign.name`.
This also reveals the **paused/legacy campaign tail** (only some campaigns spend in the window).

## D. Landing pages — Porter's native scrape (read-only via `fetch`)
Take the unique final URLs from the Ads pull, ranked by spend; scrape the top ones:
```
fetch(tool:porter-tools:scrape, {
  url:"<final_url>", formats:["markdown","json"], onlyMainContent:true, waitFor:3500, proxy:"auto",
  jsonOptions:{ schema:{ headline:"string", subheadline:"string", primary_offer:"string",
    primary_cta:"string", product_named:"string", form_summary:"string", proof_points:["string"] }}})
```
`json` = the hero (highest-weight signal); `markdown` = whole-page coherence. **Empty → retry
`proxy:"stealth"`; still empty → landing verdict "needs review", never guess, never use an external
scraper.** No API key — Porter manages it. See `landing-cro/references/tools.md`.

## E. Deploy the rendered audit as a hosted Porter report
After the standalone HTML is written + verified (out-of-repo):
| # | Tool | Meta-tool | Args |
|---|------|-----------|------|
| 1 | — | — | `python3 scripts/to_porter_bundle.py <audit.html> <out-dir>` → `report.js` + `style.css` + `pages/main.html` |
| 2 | `tool:porter-reports:get_report_template` | `fetch` | `{}` then `{variant:"blank"}` — capture `template_version` (validated server-side) |
| 3 | `tool:porter-reports:create_report` | `execute` | `name`, `template_version`, `variant:"blank"`, `files:[…3 bundle files…]`, `pages:[{id:"main",title:"Account Audit",file:"pages/main.html"}]`, `default_page_id:"main"`, `config:{charts:{}}`, `visibility:"PRIVATE"` |
| 4 | `tool:porter-reports:get_report_diagnostics` | `fetch` | `{report_id}` — only if `charts_health` is non-empty |
Reply with the local file path + the `report_url`. (Sharing → the `share_report` tool, only if asked.)

## Tools NOT used
- No write/mutation against the ad account (no bid/budget changes) — the audit recommends only.
- No external scraper / API keys — scraping is `tool:porter-tools:scrape`.

## Gotchas (cluster-wide)
- `query_data` via **`execute`**; `list_accounts` + `scrape` + report reads via **`fetch`**.
- `accounts` = the **full object**, not the id string.
- `cost_micros` already arrives in account **currency** (despite the name).
- Large pulls (search terms, RSA copy) overflow chat → the MCP **persists them to a file**; process the
  file with a script / subagent, don't dump rows into context.
- No `last_90_days` preset → use explicit `{date_from,date_to}`.
