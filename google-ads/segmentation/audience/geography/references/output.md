# Output — Google Ads Geography Segmentation

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(choropleth map when an atlas exists, else a ranked bar). **No presentation here** —
emojis / maps / tables are a rendering concern, not the analysis output.

## Enums (the only allowed values)
- `granularity`: `country` · `region` · `metro` · `city` · `most_specific`
- `location_type`: `physical_presence` · `presence_or_interest`
- `direction` (of the metric's move): `up` · `down` · `flat`
- `state` (per-location efficiency verdict): `efficient` · `wasteful` · `expansion` · `exclusion` · `neutral`
- `action` (the recommendation): `bid_up` · `bid_down` · `expand` · `exclude` · `audit` · `hold`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Golf",
    "connector": "google-ads",
    "skill": "google-ads-geography-segmentation",
    "period": { "from": "2026-03-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "USD",
    "granularity": "region",            // one of the granularity enum
    "location_type": "presence_or_interest",  // which the account targets
    "movement_metric": "conversions_value"    // the metric whose move is being attributed
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: which location drove the move + the single action.",
    "diagnosis": "The dominant location of the metric's move (+ its share of ΔM) and the efficiency pattern (efficient vs wasteful — ROAS/CPA over volume).",
    "action":    "The one specific fix to take now (bid up / down / expand / exclude) — where / what / why."
  },

  // One entry per location, at the chosen granularity, sorted by the value metric.
  "locations": [
    {
      "name": "California",                // plain string as returned (region names need no remap)
      "code": "US-CA",                     // optional (country/region codes when present)
      "state": "efficient",                // efficiency verdict from the enum
      "action": "bid_up",                  // recommendation from the enum
      // Period vs comparison metrics. Rates/costs computed from base counts, NOT summed.
      "metrics": {
        "impressions":       { "value": 412000, "delta": 0.08 },
        "clicks":            { "value": 18400,  "delta": 0.05 },
        "cost":              { "value": 9200,   "delta": 0.03, "unit": "currency" },
        "conversions":       { "value": 540,    "delta": 0.12 },
        "conversions_value": { "value": 87400,  "delta": 0.15, "unit": "currency" },
        "roas":              { "value": 9.5,    "delta": 0.11 },   // derived: conv_value / cost
        "cpa":               { "value": 17.0,   "delta": -0.08, "unit": "currency" } // derived: cost / conversions
      },
      "contribution": {                    // contribution-to-change for the movement_metric
        "delta_abs": 11400,                // ΔM_loc — for a COUNT metric these sum to ΔM
        "share_of_change": 0.34            // |ΔM_loc| / Σ|ΔM_loc| — what explains the move
      },
      "recommendation": {                  // ALWAYS executable + plain
        "where": "California",
        "what":  "Apply a positive location bid adjustment.",
        "why":   "Leads volume AND efficiency (ROAS ≈ 9.5) and drove 34% of the gain."
      }
    }
  ],

  // The capped long tail + the candidate lists.
  "rollup": {
    "all_others": {                        // rolled-up tail below the cap
      "locations_count": 38,
      "cost":              { "value": 4100, "unit": "currency" },
      "conversions_value": { "value": 9800, "unit": "currency" }
    },
    "expansion":  [ "Iowa" ],              // low-spend high-ROAS → action: expand
    "exclusion":  [ ],                      // wasteful → action: bid_down / exclude
    "byState":    { "efficient": 3, "wasteful": 2, "expansion": 1, "exclusion": 0, "neutral": 19 }
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (the dominant
  location of the move + the efficiency pattern), `action` (the single bid up/down/expand/exclude).
  No `highlights`.
- Every `locations[]` item has a `state` and an `action` from the enums above — never free text.
- **Efficiency over volume** — `state` ranks by ROAS / CPA, then weights by volume; the
  biggest-spend location is not automatically `efficient`.
- **Contribution to change:** for a **count** metric, `contribution.delta_abs` across locations
  **sums to ΔM**. For a **ratio** (ROAS / CPA), attribute via numerator / denominator counts —
  **never sum the ratio across locations**.
- **Compute every rate / cost (`roas`, `cpa`, CTR, CPC…) from base counts.** Ratios don't sum.
- **Every figure carries `delta` vs the previous period.**
- **Low-spend high-ROAS → `expansion`; high-spend low-ROAS → `exclusion`** (`bid_down` / `exclude`).
- **Long tail:** sort by the value metric, cap the list, roll the rest into `rollup.all_others`.
- The viz (map vs ranked bar) is a reporting decision driven by atlas availability — **not** an
  output field. When no atlas exists (e.g. Canada provinces), reporting falls back to bars; the
  analysis JSON is identical.
