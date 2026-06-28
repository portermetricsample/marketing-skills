# Tools — Landing Page CRO Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing. This skill also **scrapes**
the live page (step 3), which is the gating dependency.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the ad final URLs by spend. `accounts` = the full object from step 1. |
| 3 | `tool:porter-tools:scrape` | `fetch` | see below | Read the live landing page (full-page `markdown` + structured `json`). Porter-native, no API key needed. |

## Step 2 — `query_data` args (this is "the query")
Pick the pages — the high-spend landing URLs (same pull as `keyword-ad-landing-alignment`, step 2b):

- `google_ads_campaign_name` — for context / naming the journey.
- `google_ads_ad_group_name` — for context / naming the journey.
- `google_ads_ad_group_ad_ad_final_urls` — the landing page URL to scrape.
- `google_ads_cost_micros` — the spend, to rank pages by dollars (÷1e6 for currency).

Filter: `google_ads_campaign_advertising_channel_type equals SEARCH`.
Sort: `cost_micros desc`. Period: `last_month` or a `{date_from, date_to}` of 30–90 days.
Take the **unique** final URLs (top by spend) — one scrape per unique URL, not per ad.

## Step 3 — `scrape` args (the gated dependency)
```
fetch(tool_id="tool:porter-tools:scrape", args={
  "url": "<final_url>",
  "formats": ["markdown", "json"],
  "onlyMainContent": true, "waitFor": 3500, "proxy": "auto",
  "jsonOptions": { "schema": {
    "headline":"string", "subheadline":"string", "primary_offer":"string",
    "primary_cta":"string", "product_named":"string", "form_summary":"string",
    "proof_points":["string"] }}
})
```

## Tools NOT needed here (keep it minimal)
- `crawl` — not used. One page per final URL is enough; no site-wide crawl.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by a complementary skill, not here)
- `google_ads_search_term`, `google_ads_keyword_info_text` — the search→keyword→ad chain feeds
  `keyword-ad-landing-alignment` (message match), not this page-quality check.
- `conversions`, `cost_per_conversion`, `conversion_value_per_cost` — performance metrics; this
  skill judges the page copy, not its conversion numbers.

## Gotchas
- **Freshness:** scrape reads the **live** page (no historical window) — fine; CRO judges the page
  as it is today.
- **SPA sites** return empty without `waitFor` (let JS render); bump `proxy` to `stealth` if blocked.
- **Empty scrape → verdict `review`** for that page (C-links unknown); never guess page content.
- **Don't commit scraped page dumps** to the repo (could include client data) — keep them local.
- **Dedupe URLs:** many ads share one final URL; scrape each unique URL once, then attribute the
  summed spend across the ads pointing to it.
