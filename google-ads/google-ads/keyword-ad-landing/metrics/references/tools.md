# Tools — Keyword / Ad / Landing Metrics

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in steps 2–4 — not a separate thing. This skill only reads;
it never scrapes (that is the alignment sibling's job) and it computes one ratio (CVR) inline.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Field names validated against the live `google-ads` catalog (Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 0 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 0b | (campaign-type coverage) | — | reuse the alignment skill's step 0 | Keep only SEARCH journeys; report uncovered spend, don't print zeros. |
| A | `tool:porter-reporting:query_data` | `execute` | grades pull, below | Google's four `historical_*` grades, keyed by keyword (+ match type). |
| B | `tool:porter-reporting:query_data` | `execute` | impression-share pull, below | Search Impression Share — **campaign grain**. |
| C | `tool:porter-reporting:query_data` | `execute` | ad-behavior pull, below | CTR (native) + the counts to compute CVR — **ad grain**. |

Three separate `query_data` calls **because of grain**, not because of a combine error: grades live
at keyword grain, IS at campaign grain, CTR/CVR at ad grain. Filter **every** pull to **Search + the
chosen ad groups** and sort by `google_ads_cost_micros desc`, exactly like the alignment skill.

## Pull A — Google grades (`keyword_view`, keyword + match type)
The four `historical_*` grades **do combine** with `campaign_name` / `ad_group_name` (validated — no
"cannot be combined"). Include `match_type` to keep the QS grain fine (see the aggregation trap in
[`framework.md`](framework.md)):

```
["google_ads_campaign_name", "google_ads_ad_group_name",
 "google_ads_keyword_info_text", "google_ads_keyword_info_match_type",
 "google_ads_historical_quality_score", "google_ads_historical_creative_quality_score",
 "google_ads_historical_search_predicted_ctr", "google_ads_historical_landing_page_quality_score",
 "google_ads_cost_micros"]
```

> Read the three categorical grades directly. For the numeric QS apply the `≤ 10` sanity check; if it
> exceeds 10 it was summed across instances → re-pull at a finer grain or omit the number.

## Pull B — Search Impression Share (campaign grain)
IS is coarser than the journey, so it prints as **campaign context**, not per ad group. Use the
`*_top_*` variants on purpose (top-of-page IS); the plain `*_impression_share` fields also exist:

```
["google_ads_campaign_name", "google_ads_search_top_impression_share",
 "google_ads_search_absolute_top_impression_share",
 "google_ads_search_rank_lost_top_impression_share",
 "google_ads_search_budget_lost_top_impression_share", "google_ads_cost_micros"]
```

High rank-lost → loses the top auction on rank (bid / QS / assets); high budget-lost → capped by
budget. Disclose which. (Account-total IS does not aggregate cleanly — keep it at campaign grain.)

## Pull C — Ad behavior (ad grain, `ad_id`)
CTR is native; CVR is computed. Split from A because this is ad grain, not keyword grain:

```
["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_ad_group_ad_ad_id",
 "google_ads_impressions", "google_ads_clicks", "google_ads_ctr", "google_ads_conversions",
 "google_ads_cost_micros"]
```

Compute **CVR = `conversions / clicks`** per ad (guard divide-by-zero → `null`, not `0`). `ctr` also
aggregates as a metric — if you ever group it coarsely, recompute `clicks / impressions` yourself.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This is instrumentation; the *alignment* skill reads the page.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **`cost_micros > 0` auto-filter:** asking for cost hides 0-spend rows — fine for ranking by spend.
- **Grades are historical and can be missing.** New / low-volume keywords return no grade → blank, not `0`.
- **`conversions`, not `all_conversions`** for CVR (primary actions = the UI). Offer `all_conversions` only if the user asks for phone/store/cross-device.
- **Split, don't fight the MCP.** If a pull returns *"cannot be combined"*, break it to the grain that fits; never retry the same field list.
