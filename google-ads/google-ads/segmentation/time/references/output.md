# Output — Google Ads Time Segmentation

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it —
the **Time matrix** for chronological views and a **heatmap** (day-of-week × hour) for cyclical.
**No presentation here** — emojis/tables/colors are a rendering concern, not the analysis output.

## Enums (the only allowed values)
- `view`: `day` · `week` · `month` · `quarter` · `year` · `day_of_week` · `hour`
- `family`: `chronological` (day/week/month/quarter/year) · `cyclical` (day_of_week/hour)
- `metric`: `impressions` · `clicks` · `cost` · `conversions` · `conversions_value` · `ctr` · `cpc` · `cpm` · `cpa` · `roas` · `conversion_rate`
- `metric_kind`: `count` (summable Δ-attribution) · `ratio` (attributed via numerator/denominator counts)
- `direction`: `up` · `down` · `flat`
- `evidence_kind`: `observation` (in the data) · `interpretation` (marked; seasonality/holiday/auction/launch — never stated as fact unless a calendar source is wired)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "google-ads-time-segmentation",
    "period":     { "from": "2026-05-01", "to": "2026-05-31" },
    "comparison": { "from": "2026-04-01", "to": "2026-04-30" },  // vs-previous-period is mandatory
    "currency": "CAD",
    "mode": "auto_scan"          // "auto_scan" | "specified"
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: which metric moved, the direction + Δ, and WHEN it concentrated.",
    "diagnosis": "The dominant time driver named (most-concentrated view / bucket).",
    "action":    "One specific where-in-time action to take now."
  },

  // One finding per analysed metric × time view. Auto-scan ranks these by concentration.
  "findings": [
    {
      "metric": "clicks",
      "metric_kind": "count",
      "view": "week",
      "family": "chronological",
      "direction": "down",
      "delta": -1840,                       // M(now) − M(prev), absolute
      "delta_pct": -0.21,                   // vs previous period
      "concentration": 0.80,                // share of |ΔM| in the top buckets (auto-scan rank key)

      // CHRONOLOGICAL — buckets that explain the move; ΔM_b sums back to ΔM (count metrics only).
      "top_buckets": [
        { "bucket": "2026-05-W4", "delta": -1100, "share_of_change": 0.60 },
        { "bucket": "2026-05-W3", "delta": -370,  "share_of_change": 0.20 }
      ],
      "inflection": { "bucket": "2026-05-W3", "note": "Trend turned down here — the start of the drop." },

      // CYCLICAL — present instead of top_buckets/inflection when view ∈ day_of_week | hour.
      "best_slot":  null,                   // e.g. { "slot": "Tue", "value": 0.031, "metric": "ctr" }
      "worst_slot": null,                   // e.g. { "slot": "Sun", "value": 0.012, "metric": "ctr" }
      "insufficient_data_slots": [],        // slots below the volume floor — no pattern claimed

      // For RATIO metrics: do NOT sum bucket ratios — attribute via the underlying counts.
      "ratio_decomposition": null,          // e.g. { "numerator": "clicks", "denominator": "impressions",
                                            //        "driver": "clicks", "note": "Clicks fell (late weeks); impressions held." }

      "evidence_kind": "observation"
    }
  ]
}
```

## Rules
- **`comparison` period is mandatory** — every figure carries vs-previous-period; this skill *is*
  a movement attribution.
- **Count metrics:** `top_buckets[].delta` must **sum back to `delta`** (exact contribution, not a
  guess); `share_of_change` is each bucket's share of `|ΔM|`.
- **Ratio metrics:** never populate `top_buckets` with summed ratios — populate
  `ratio_decomposition` and attribute the numerator/denominator **counts'** movements instead.
- **`concentration`** is the auto-scan ranking key — surface the most-concentrated `view` first,
  offer the rest.
- **Cyclical views** (`day_of_week`, `hour`) use `best_slot` / `worst_slot` /
  `insufficient_data_slots` and leave `top_buckets` / `inflection` null; a slot below the volume
  floor goes to `insufficient_data_slots`, never to a slot claim.
- **`evidence_kind`**: a cause beyond the funnel identity (seasonality, holiday, auction, launch)
  is `interpretation` and marked as such — never `observation` unless a calendar source is wired.
- **Content only** — no HTML/colors/layout here; that's reporting + design-system.
