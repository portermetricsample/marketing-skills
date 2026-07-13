# Tools — Placement Relevance & Brand-Safety

The ordered plan of MCP tool calls this skill makes. The "query" is the **arguments of
`query_data`**, nested in the steps — not a separate thing. This skill also calls **`scrape`**
(a second tool), conditionally, to read an ambiguous placement's page.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../../_framework/porter-mcp-calls.md`](../../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | FINGERPRINT — see below | **Applicability gate** — does the account run `DISPLAY` / `VIDEO` / `DEMAND_GEN`? If not, stop (`n/a`). |
| 3 | `tool:porter-reporting:query_data` | `execute` | PLACEMENT pull — see below | Per-placement name / url / type + base counts, ranked by spend. |
| 4 | `tool:porter-tools:scrape` | `execute` | `{ url: <placement target_url> }` | **Conditional** — only for placements that are *ambiguous by name* AND *above the spend threshold*. Read the page / channel content to classify. |

> Step 4 is **conditional and capped** — scrape only the handful of high-spend ambiguous placements,
> never the whole list. Scraping is the fragile, costly part; default to the `display_name` judgment.

## Step 2 — FINGERPRINT `query_data` args
- **Dimension:** `google_ads_campaign_advertising_channel_type` (+ `google_ads_campaign_name`).
- **Base counts:** `google_ads_impressions`, `google_ads_cost_micros`.
- **`accounts`** = the full object from step 1. **Gate:** proceed only if a value is `DISPLAY`,
  `VIDEO`, or `DEMAND_GEN`. `SEARCH`-only and `PERFORMANCE_MAX`-only → `verdict: "n/a"`, explain.

## Step 3 — PLACEMENT `query_data` args (this is "the query")
- **Dimensions:** `google_ads_detail_placement_view_placement` (the url / app id / video id),
  `google_ads_detail_placement_view_display_name` (the human name — **the field AI reads**),
  `google_ads_detail_placement_view_placement_type` (`WEBSITE` / `YOUTUBE_VIDEO` / `MOBILE_APPLICATION`),
  `google_ads_detail_placement_view_target_url` (the scrape target).
- **Base counts:** `google_ads_impressions`, `google_ads_clicks`, `google_ads_cost_micros`,
  `google_ads_conversions`.
- **Period:** the report period (comparison optional — this is a content judgment, not a movement attribution).
- **Sort + cap:** **sort by `cost_micros` desc** and **cap `limit`** (e.g. top 50). Placements have a
  huge long tail — classify the spend that matters, roll the rest up as "all others".

## Tools NOT needed here (keep it minimal)
- `list_custom_fields` — only to re-validate a field name if a query fails.
- The demographic / geo / device dimensions — a different sub-segment.

## Gotchas
- **Display / Video / Demand-Gen ONLY.** `detail_placement_view` returns **0 rows on Search and on
  Performance Max** (validated live across four accounts: Search = 0, PMax = 0, Demand-Gen = 15 real
  rows). Gate on the fingerprint, not on an empty result.
- **YouTube `display_name` is the video / channel title; `placement` is the bare id** — read the name.
  Some rows come back with an empty name (anonymized) → lower-confidence, name-only.
- **Threshold the tail.** Thousands of 1-impression rows — classify only above a spend / impression
  floor, or you "optimize" noise.
- **Scrape is fragile.** Pages get blocked / rate-limited; on failure, fall back to the `display_name`
  judgment with `confidence: "low"`. Do not swap in an external scraper — Porter's native web scraping is the source.
- **`google_ads_cost_micros` arrived already in currency** on the validated pull — sanity-check before dividing by 1e6.
- **Off-topic ≠ automatic exclude** — a competitor / adjacent placement may be intentional; flag, the human decides.
