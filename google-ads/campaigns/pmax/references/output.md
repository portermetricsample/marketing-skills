# Output — PMax Diagnostics

The skill emits ONE JSON object. Pure data — no emojis, markdown, tables, or colors; a renderer
(`formats/*`) turns it into the human document.

## Enums

- `verdict`: `earning` · `watch` · `underperforming` · `unprofitable`  (vs the non-brand Search baseline)
- `baseline_kind`: `non_brand_search` · `blended_account`  (the second inflates the baseline → understates the PMax gap)
- `ad_strength`: `POOR` · `AVERAGE` · `GOOD` · `EXCELLENT` · `UNSPECIFIED`
- `limit_topic`: `search_terms` · `placements` · `audience_signals` · `channel_split` · `impression_share`

## Top-level schema

```json
{
  "_meta": {
    "skill": "pmax-diagnostics",
    "version": "1.0.0",
    "account_id": "123-456-7890",
    "period_start": "2026-07-01",
    "period_end": "2026-07-31",
    "baseline_kind": "non_brand_search",
    "search_baseline_cpa": 22.0,
    "search_baseline_roas": 3.4,
    "status": "complete"
  },
  "synthesis": {
    "headline": "One string: does PMax earn its budget — total PMax spend, its blended CPA/ROAS vs the Search baseline, and the single loudest campaign (biggest earner or biggest drain in dollars).",
    "diagnosis": "One string: where PMax is earning vs quietly losing against the baseline — AND how much of the 'why' is limited by what the API hides (name that the search-term / placement / audience read is not available).",
    "action": "One string: the highest-$ move — raise / hold / trim / pause which campaign, where / what / why."
  },
  "pmax_campaigns": [
    {
      "campaign_id": "111",
      "campaign_name": "PMax — Shopping Feed",
      "status": "ENABLED",
      "spend": 12800.0,
      "conversions": 376.0,
      "conversions_value": 26880.0,
      "cpa": 34.04,
      "roas": 2.1,
      "cpa_ratio": 1.55,
      "roas_ratio": 0.62,
      "conv_rate": 0.041,
      "verdict": "underperforming",
      "low_volume": false,
      "asset_group_summary": {
        "group_count": 3,
        "spend_concentration": "Group A holds 80% of spend; Group C is idle",
        "groups": [
          { "asset_group_id": "ag-1", "name": "Group A — Bestsellers", "ad_strength": "GOOD", "spend": 10240.0, "conversions": 300.0 },
          { "asset_group_id": "ag-2", "name": "Group B — New Arrivals", "ad_strength": "EXCELLENT", "spend": 1920.0, "conversions": 64.0 },
          { "asset_group_id": "ag-3", "name": "Group C — Clearance", "ad_strength": "POOR", "spend": 640.0, "conversions": 12.0 }
        ],
        "note": "Directional only — asset-group-level cost/conv and ad_strength are the finest cut the API exposes for PMax. Not a creative verdict."
      },
      "recommendation": {
        "where": "PMax — Shopping Feed daily budget",
        "what": "Trim ~20% and re-weight assets toward Group B (EXCELLENT strength, starved). Do NOT scale until CPA closes on the Search baseline.",
        "why": "Runs at a $34 CPA vs the $22 non-brand Search baseline (1.55x) and 2.1x ROAS vs 3.4x — buying conversions at a premium the account beats in Search."
      }
    },
    {
      "campaign_id": "222",
      "campaign_name": "PMax — New Customers",
      "status": "ENABLED",
      "spend": 4100.0,
      "conversions": 21.0,
      "conversions_value": 0.0,
      "cpa": 195.24,
      "roas": 0.0,
      "cpa_ratio": 0.98,
      "roas_ratio": null,
      "conv_rate": 0.018,
      "verdict": "watch",
      "low_volume": true,
      "asset_group_summary": {
        "group_count": 1,
        "spend_concentration": "Single asset group",
        "groups": [
          { "asset_group_id": "ag-9", "name": "Group A — Prospecting", "ad_strength": "AVERAGE", "spend": 4100.0, "conversions": 21.0 }
        ],
        "note": "Directional only. Launched mid-period — still in the ~6-week learning ramp."
      },
      "recommendation": {
        "where": "PMax — New Customers",
        "what": "Hold. Reassess in 30 days once out of learning; lift ad strength from AVERAGE before judging.",
        "why": "CPA matches the Search baseline (0.98x) but on only 21 conversions and mid-ramp — directional, not yet a verdict."
      }
    }
  ],
  "visibility_limits": [
    { "topic": "search_terms", "exposed": false, "what_is_available": "Only coarse category buckets via campaign_search_term_insight (themes, not terms; not exclusion-ready).", "fallback": "Google Ads UI — and even there PMax search-term data is partial." },
    { "topic": "placements", "exposed": false, "what_is_available": "None — where PMax ads showed (URLs/apps/channels) is not returned by the connector.", "fallback": "Google Ads UI placement report." },
    { "topic": "audience_signals", "exposed": false, "what_is_available": "None — applied audience signals and their per-segment performance are not returned.", "fallback": "Google Ads UI." },
    { "topic": "channel_split", "exposed": false, "what_is_available": "None — Search / YouTube / Display / Discover / Gmail split inside a PMax campaign is not returned.", "fallback": "Google Ads UI / PMax insights." },
    { "topic": "impression_share", "exposed": false, "what_is_available": "PMax does not report impression share like Search; do not read a '0% IS' as a cap.", "fallback": "Not available for PMax." }
  ],
  "rollup": {
    "pmax_total_spend": 16900.0,
    "pmax_share_of_account_budget": 0.19,
    "pmax_blended_cpa": 42.57,
    "pmax_blended_roas": 1.59,
    "vs_baseline_cpa_ratio": 1.94,
    "vs_baseline_roas_ratio": 0.47,
    "biggest_earner": { "campaign_id": "222", "campaign_name": "PMax — New Customers", "note": "matches baseline but low volume" },
    "biggest_drain": { "campaign_id": "111", "campaign_name": "PMax — Shopping Feed", "dollars_above_baseline": 4512.0 }
  }
}
```

## Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `spend` | number | `cost_micros / 1e6` |
| `conversions` | number | `metrics.conversions` |
| `conversions_value` | number | `metrics.conversions_value` |
| `cpa` | number\|null | `spend / conversions` (null if no conversions) |
| `roas` | number\|null | `conversions_value / spend` (null if no value tracked) |
| `cpa_ratio` | number\|null | `cpa / search_baseline_cpa` (>1 = more expensive than Search) |
| `roas_ratio` | number\|null | `roas / search_baseline_roas` (<1 = worse return than Search) |
| `conv_rate` | number | `metrics.conversions_from_interactions_rate` — blended across the hidden PMax channels |
| `verdict` | enum | `earning` · `watch` · `underperforming` · `unprofitable` |
| `low_volume` | bool | true if under ~15–30 conversions or mid learning-ramp → verdict is directional |
| `asset_group_summary` | object | the visible creative-level read: group count, spend concentration, per-group cost/conv/ad_strength, and a "directional only" note |
| `recommendation` | object | `{where, what, why}` — the executable move |
| `visibility_limits` | array | **mandatory** — one entry per API blind spot, each `{topic, exposed:false, what_is_available, fallback}` |

## The `visibility_limits` block (mandatory — do not omit)

This is the honesty spine of the skill. It lists, per topic, **what the API does not show for PMax**,
**what limited signal (if any) IS available**, and **where to go instead** (the Google Ads UI). It must
be present in every emission, even when every campaign reads `earning` — the reader needs to know the
verdict rests on cost/conv the API returns, while the *why* (search terms, placements, audiences,
channel split, impression share) is not available. Never drop it, and never move a 🔴 topic out of it by
implying a verdict was formed from data that wasn't returned.

## Error / edge states
- **No PMax campaigns in the account**: `pmax_campaigns: []`, `status: "no_pmax"`, and still emit
  `visibility_limits` (so the reader knows what a future PMax read could and couldn't show).
- **No Search baseline supplied**: fall back to `baseline_kind: "blended_account"`, set the ratios off
  blended CPA/ROAS, and flag in `synthesis.diagnosis` that brand inflation understates the gap.
- **`conversions = 0`**: `cpa: null`, `verdict: "unprofitable"` if spend is material, and note the
  campaign is spending without converting.
- **Low volume / learning ramp**: `low_volume: true` and keep the verdict but mark it directional in
  the recommendation `why`.
