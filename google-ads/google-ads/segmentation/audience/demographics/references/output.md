# Output — Demographics Segmentation

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(bar chart segment vs spend, coverage % as caption). **No presentation here** — emojis/tables are
a rendering concern, not the analysis output.

## Enums (the only allowed values)
- `dimension`: `age` · `gender`
- `age` segment values: `AGE_RANGE_18_24` · `AGE_RANGE_25_34` · `AGE_RANGE_35_44` · `AGE_RANGE_45_54` · `AGE_RANGE_55_64` · `AGE_RANGE_65_UP` · `AGE_RANGE_UNDETERMINED`
- `gender` segment values: `MALE` · `FEMALE` · `UNDETERMINED`
- `metric` (the moved metric being attributed): `impressions` · `clicks` · `cost` · `conversions` · `conversions_value` · `cpa` · `roas` · `conversion_rate`
- `metric_kind`: `count` (sums to ΔM) · `ratio` (attributed via numerator/denominator)
- `direction`: `up` · `down` · `flat`
- `verdict` (per-segment efficiency): `efficient` · `wasteful` · `average` · `undetermined` · `volume_skew`
- `action`: `bid_up` · `bid_down` · `leave` · `brief_creative` · `human_review`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Golf",
    "connector": "google-ads",
    "skill": "demographics-segmentation",
    "dimension": "age",                    // age | gender — ONE per emitted object (two queries → two objects)
    "metric": "conversions_value",         // the metric whose move is being attributed
    "metric_kind": "count",                // count | ratio
    "period":     { "from": "2026-03-01", "to": "2026-05-31" },
    "comparison": { "from": "2025-12-01", "to": "2026-02-28" },
    "coverage_pct": 0.13,                  // demographic spend ÷ account-total spend — STATED UP FRONT
    "coverage_note": "Within demographic-eligible campaigns only ($4.1k of $32.7k)."
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  // Every figure carries vs-previous-period. Coverage % is led with, not buried.
  "synthesis": {
    "headline":  "One sentence: the coverage %, the direction + Δ, and the single demographic action.",
    "diagnosis": "Which segment drove the move and which converts efficiently — vs previous period.",
    "action":    "One specific demographic bid / creative action to take now."
  },

  // The metric's total move, attributed across segments.
  "movement": {
    "direction": "up",                     // up | down | flat
    "delta": 18400,                        // ΔM = M(now) − M(prev), in metric units
    "delta_pct": 0.22
  },

  // One row per segment value (UNDETERMINED ALWAYS included).
  "segments": [
    {
      "segment": "AGE_RANGE_55_64",        // an enum value from the dimension's set above
      "label": "55–64",                    // human relabel (sort age manually, not alphabetically)
      "counts":  { "impressions": 21000, "clicks": 840, "cost": 1190, "conversions": 70, "conversions_value": 14040 },
      "rates":   { "cpc": 1.42, "cpa": 17.0, "roas": 11.8, "conversion_rate": 0.083 },  // COMPUTED from counts
      "delta_share": 0.41,                 // share of ΔM this segment contributes (counts: sums to 1 across non-UNDET drivers)
      "verdict": "efficient",
      "action":  "bid_up"
    },
    {
      "segment": "AGE_RANGE_65_UP",
      "label": "65+",
      "counts":  { "impressions": 9000, "clicks": 300, "cost": 620, "conversions": 9, "conversions_value": 1674 },
      "rates":   { "cpc": 2.07, "cpa": 68.9, "roas": 2.7, "conversion_rate": 0.030 },
      "delta_share": -0.08,
      "verdict": "wasteful",
      "action":  "bid_down"
    },
    {
      "segment": "AGE_RANGE_UNDETERMINED",
      "label": "Undetermined",
      "counts":  { "impressions": 140000, "clicks": 4200, "cost": 6800, "conversions": 210, "conversions_value": 38000 },
      "rates":   { "cpc": 1.62, "cpa": 32.4, "roas": 5.6, "conversion_rate": 0.050 },
      "delta_share": 0.0,
      "verdict": "undetermined",           // never optimize on this bucket
      "action":  "leave"
    }
  ],

  // The pattern: best/worst segment by efficiency (UNDETERMINED never eligible).
  "best_segment":  { "segment": "AGE_RANGE_55_64", "by": "roas", "value": 11.8 },
  "worst_segment": { "segment": "AGE_RANGE_65_UP", "by": "roas", "value": 2.7 }
}
```

## Rules
- **Coverage `coverage_pct` is mandatory and led with.** A low-coverage split is directional —
  never an account-level claim ("the account's best age is…").
- **`segments[]` ALWAYS includes UNDETERMINED** with `verdict: "undetermined"` → never dropped,
  never optimized on. Dropping it overstates the known segments.
- **Every `rates` value is COMPUTED from `counts`** — never read native ratio fields (wrong at the
  aggregate).
- **`metric_kind: "count"`** → `delta_share` across non-UNDETERMINED drivers sums to ΔM (exact).
  **`metric_kind: "ratio"`** → no summing; attribute via numerator/denominator counts.
- **One emitted object per dimension** — age and gender are separate analyses (two queries → two
  objects). Never cross age × gender.
- **`segment` is always an enum string** from the dimension's set; `label` is the human relabel.
  Sort age manually (youngest→oldest), not alphabetically.
- **Every figure in `synthesis` / `movement` carries vs the comparison period.**
