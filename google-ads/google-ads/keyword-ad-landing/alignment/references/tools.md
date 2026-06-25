# Tools — Keyword → ad → landing alignment

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the steps below — not a separate thing. A deterministic
script (`scripts/assemble.py`) then collapses the pulls + the scraped pages into `packets.json`.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../_framework/porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` (+ `query` if named) | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | step 0 | Coverage map — spend by campaign type (what's covered vs PMax/DG). |
| 3 | `tool:porter-reporting:query_data` | `execute` | step 1 | Pick the journeys — spend by ad group, **filtered to SEARCH**, ranked. |
| 4 | `tool:porter-reporting:query_data` | `execute` | step 2a | Intent — `search_term` + the `keyword` that caught it, in ONE query. |
| 5 | `tool:porter-reporting:query_data` | `execute` | step 2b | Ads — the RSA copy + final URLs, at **ad level** (`ad_id`). |
| 6 | `tool:porter-tools:scrape` | `fetch` | step 3 | Scrape each unique final URL (whole page + structured H1/hero). |

`query_data` goes via **`execute`** (Porter marks it `not_read_only` → `fetch` rejects it).
`list_accounts` and `scrape` are read-only → **`fetch`**. Every `fields`/`filters` entry carries the
**`google_ads_` prefix**. Cost is already in account currency despite the `_micros` name.

## Scope filter — SEARCH only, on every term/ad pull
`search_term_view` + `keyword_view` exist only for `SEARCH`, so steps 1, 2a, 2b all carry:
`[[{ "field":"google_ads_campaign_advertising_channel_type", "operator":"equals", "value":"SEARCH" }]]`.

## Step 0 — coverage map (`query_data`, ALWAYS first)
`["google_ads_campaign_name", "google_ads_campaign_advertising_channel_type", "google_ads_cost_micros"]`
→ report "$X SEARCH (covered) · $Y PMax/Demand Gen (not covered)". Never skip — silence on uncovered spend reads as "I audited everything".

## Step 1 — pick the journeys (SEARCH only)
`["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_cost_micros"]`,
`sort` by `google_ads_cost_micros desc`, keep the highest-spend ad groups.

## Step 2a — intent (`intent.json`) — search term × keyword in ONE query
`["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_search_term", "google_ads_keyword_info_text", "google_ads_keyword_info_match_type", "google_ads_cost_micros"]`
✅ Validated: `search_term` + `keyword_info_text` combine in `search_term_view` — no join step.
This is exactly the shape `assemble.py --intent` expects. `match_type` is a splitter, not a metric.

## Step 2b — ads (`ads.json`) — AD level
`["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_ad_group_ad_ad_id", "google_ads_ad_group_ad_ad_responsive_search_ad_headlines", "google_ads_ad_group_ad_ad_responsive_search_ad_descriptions", "google_ads_ad_group_ad_ad_final_urls", "google_ads_cost_micros"]`
The `ad_id` matters: each ad is judged with ITS copy and ITS landing, not a group average.

> ⚠️ **Always `sort` by `cost_micros desc` + a high `limit`** on 2a/2b. A low `limit` without `sort`
> truncates and eats the highest-spend search terms (giving journeys with fake spend). The
> search-term level overflows context → the MCP writes it to file; copy it to `data/raw/`.

## Step 3 — scrape the landings (`tool:porter-tools:scrape`, read-only → `fetch`)
Take the unique final URLs from 2b. One call per URL, **two formats**: `markdown` (whole page, for
top-to-bottom coherence) + `json` (structured H1/hero, the highest-weight signal). Save to
`data/landings/<slug>.json`.
```
fetch(tool_id="tool:porter-tools:scrape", args={
  "url": "<final_url>", "formats": ["markdown", "json"], "onlyMainContent": true,
  "waitFor": 3500, "proxy": "auto",
  "jsonOptions": { "schema": { "h1":"string", "hero_headline":"string", "hero_subheadline":"string",
    "primary_offer":"string", "primary_cta":"string", "product_named":"string",
    "form_summary":"string", "proof_points":["string"] } }
})
```
Empty scrape → retry `"proxy":"stealth"`; still empty → mark not-scraped (L3/L4 = Needs review, never guess).

## Fields NOT pulled here (kept minimal — they're not relevance signals)
No conversions, no `cost_per_conversion`, no Quality Score / Ad Relevance / Landing Page Experience.
Those are **performance / Google's own grade** — they live in the sibling **keyword-ad-landing-metrics**
skill (`google_ads_historical_quality_score`, `google_ads_historical_creative_quality_score`,
`google_ads_historical_landing_page_quality_score`, `google_ads_ctr`). This skill judges **words only**.

## Gotchas
- **`scrape` is Porter-native + read-only** (`tool:porter-tools:scrape`, via `fetch`; no API key). If a
  page comes back empty, retry `proxy:"stealth"`; if still empty, mark that landing not-scraped → L3/L4 =
  Needs review for that journey (report the keyword↔ad half honestly). Never guess, never swap in an
  external scraper.
- **`cost_micros > 0` auto-filter:** asking for cost drops zero-spend rows. Fine here (we go by spend).
- **No `last_90_days`/`last_quarter` preset** → use explicit `{date_from, date_to}` (30–90 days).
- **Same ad-group name in two campaigns** = two packets. Keyed by `(campaign, ad_group)`, not name alone.
- **`accounts` = the COMPLETE object** from step 1, not the id string (a bare id renders empty).
