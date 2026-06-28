# Tools — Branded vs Non-Branded Incrementality

The ordered MCP calls. Saved/executable args live in [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics: [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query=<HINT>` | Discover the account object. |
| 2 | `tool:porter-reporting:query_data` | `execute` | campaign KPIs, **current** | The headline split. |
| 3 | `tool:porter-reporting:query_data` | `execute` | campaign KPIs, **previous period** | The Δ vs previous (the report's "vs previous period"). |
| 4 | `tool:porter-reporting:query_data` | `execute` | the **search-terms report** | Typo-aware brand detection → leakage / uncaptured demand. |

## Step 2/3 — campaign KPIs (the split)
Fields (campaign grain, one row per campaign):
- `google_ads_campaign_name` — the unit classified brand vs non-brand (by marker).
- `google_ads_cost_micros`, `google_ads_conversions`, `google_ads_conversions_value`,
  `google_ads_clicks`, `google_ads_impressions` — the KPIs (value present ⇒ ecommerce/ROAS mode).

Run twice: `date_range.preset = "last_month"` (current) and an explicit prior-month
`{date_from, date_to}` (previous). `limit: 100`, sort by `cost_micros` desc.

## Step 4 — the search-terms report (reconciliation)
Fields: `google_ads_search_term`, `google_ads_keyword_info_text`, `google_ads_keyword_info_match_type`,
`google_ads_campaign_name`, `google_ads_cost_micros`, `google_ads_conversions`
(+ `google_ads_conversions_value`, `google_ads_impressions`). Pull a high limit (brand demand lives in
the long tail; brand terms are cheap, so a small top-N-by-cost pull **under-detects** leakage — note it).

## Required business context (per-account input)
A `context.json` (see [`../scripts/example.context.json`](../scripts/example.context.json)):
- `brand_terms` — your brand/product names → typo-aware search-term brand detection.
- `competitor_terms` — rivals (for the conquest nuance; LLM-confirmed).
- `brand_campaign_markers` *(optional)* — the brand-campaign naming markers (default `brand`/`(br)`/…).
- `brand_campaign_names` *(optional)* — explicit brand campaign names, for brand campaigns with no marker.

## Where it goes
`process.py campaigns.json context.json [search_terms.json] [campaigns_prev.json]` → the split JSON. The
LLM writes `synthesis` + confirms ambiguous brand matches. See [`output.md`](output.md).

## Gotchas
- **`cost_micros > 0` auto-filter** hides 0-spend campaigns — harmless for a spend split.
- **Markers, not the brand word**, classify campaigns (company-name prefixing).
- **Leakage under-detection:** a top-N-by-cost search-term pull misses cheap brand typos — pull deep.
- **ecommerce vs lead-gen** auto-detects from conversion value; ROAS for ecommerce, CPA for lead-gen.
