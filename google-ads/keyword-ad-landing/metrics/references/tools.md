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
at keyword grain, IS at campaign grain, CTR/CVR at ad grain. **Every** pull — A, B AND C — carries
the SEARCH filter **literally** and sorts by `google_ads_cost_micros desc`:
`[[{ "field":"google_ads_campaign_advertising_channel_type", "operator":"equals", "value":"SEARCH" }]]`
(A and C also AND the chosen ad groups; B ANDs the chosen campaigns — IS is campaign-grain). It is
easy to drop the filter on the campaign-grain pull B — don't.

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
> exceeds 10 it was summed across instances → **emit `quality_score: null`** (don't divide, don't
> blind re-pull). A missing grade is `null` too, never `0`.
> **Filter (this pull):** `[[{channel_type = SEARCH}], [{ad_group_name in [...chosen...]}]]`, sort `cost_micros desc`.

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
budget. Set `is_lost_to` to whichever of rank-lost / budget-lost is **larger**, and disclose it.
(Account-total IS does not aggregate cleanly — keep it at campaign grain.)
**Filter (this pull):** `[[{channel_type = SEARCH}], [{campaign_name in [...chosen...]}]]`, sort `cost_micros desc` — easy to forget the SEARCH filter here; include it.

## Pull C — Ad behavior (ad grain, `ad_id`)
CTR is native; CVR is computed. Split from A because this is ad grain, not keyword grain:

```
["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_ad_group_ad_ad_id",
 "google_ads_impressions", "google_ads_clicks", "google_ads_ctr", "google_ads_conversions",
 "google_ads_cost_micros"]
```

Compute **CVR = `conversions / clicks`** per ad (guard divide-by-zero → `null`, not `0`). **Use the
native `ctr` — do NOT recompute `clicks / impressions`:** verified live on a real Search account that
Porter's ad-grain `impressions` undercounts, so the recompute ran ~3× the native ctr. Native ctr
returns as a percentage → emit it as a **fraction** (`ctr: 0.0397`, **not** `3.97`); if the value
comes back ≥ 1 it is still a percent → divide by 100. Clicks-weight it to roll ads up to a journey.
**Filter (this pull):** `[[{channel_type = SEARCH}], [{ad_group_name in [...chosen...]}]]`, sort `cost_micros desc`.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This is instrumentation; the *alignment* skill reads the page.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **`reauth_required` → STOP, don't degrade.** If any `query_data` returns `detail:"reauth_required
  component=google-ads url=…"`, the Google Ads connection expired — surface that URL, ask the user to
  reauthorize, and resume; never emit zeros or a partial pull as if it were the data.
- **`cost_micros > 0` auto-filter:** asking for cost hides 0-spend rows — fine for ranking by spend.
- **Grades are historical and can be missing.** New / low-volume keywords return no grade → blank, not `0`.
- **`conversions`, not `all_conversions`** for CVR (primary actions = the UI). Offer `all_conversions` only if the user asks for phone/store/cross-device.
- **Split, don't fight the MCP.** If a pull returns *"cannot be combined"*, break it to the grain that fits; never retry the same field list.
