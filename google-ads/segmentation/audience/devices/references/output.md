# Output — Google Ads Device Segmentation

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(small bar chart or table, ≤4 categories). **No presentation here** — emojis/tables are a rendering
concern, not the analysis output.

## Enums (the only allowed values)
- `device`: `MOBILE` · `DESKTOP` · `TABLET` · `CONNECTED_TV`
- `direction`: `up` · `down` · `flat`
- `lever`: `lever` · `no_lever`
- `focal_metric`: `impressions` · `clicks` · `cost` · `conversions` · `conversions_value` · `roas` · `cpa` · `ctr` · `cpc` · `conversion_rate`
- `metric_kind`: `count` · `ratio`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Golf",
    "connector": "google-ads",
    "skill": "google-ads-device-segmentation",
    "period": { "from": "2026-03-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "USD",
    "focal_metric": "conversions_value",   // the metric whose move is being attributed
    "metric_kind": "ratio"                 // count → ΔM_dev sums to ΔM; ratio → attribute via num/denom
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: which device drove the move (or that none did) + the single takeaway.",
    "diagnosis": "Device is/ isn't a lever, and which device carries the spend.",
    "action":    "Bid-down a genuine-gap device, OR (no lever) protect the dominant-spend device's UX."
  },

  // Full coverage (~100% of spend) → no Undetermined bucket. One entry per device row returned.
  "devices": [
    {
      "device": "MOBILE",
      "counts": {                          // base counts: current + delta vs previous period
        "impressions":       { "value": 412000, "delta": 0.08 },
        "clicks":            { "value": 18400,  "delta": 0.05 },
        "cost":              { "value": 23210, "unit": "currency", "delta": 0.11 },
        "conversions":       { "value": 690,    "delta": 0.04 },
        "conversions_value": { "value": 145100, "unit": "currency", "delta": 0.03 }
      },
      "derived": {                         // ALWAYS computed from base counts, never summed across devices
        "roas": 6.25,
        "cpa":  33.64,
        "ctr":  0.0447,
        "cpc":  1.26,
        "conversion_rate": 0.0375
      },
      "share_of_spend": 0.71,              // this device's spend ÷ total spend (dominant-spend flag)
      "contribution": {                    // contribution to the focal metric's move
        "delta_metric": 4230,              // ΔM_dev for the focal metric (count → sums to ΔM)
        "share_of_change": 0.62            // |ΔM_dev| ÷ Σ|ΔM_dev|; rank devices by this
      }
    }
  ],

  // The lever verdict — the core honesty call of this skill.
  "lever": {
    "verdict": "no_lever",                 // lever | no_lever
    "roas_spread": { "min": 6.0, "max": 6.6 },   // tight band → no_lever; genuine gap → lever
    "dominant_spend_device": "MOBILE",     // the device to protect when there is no_lever
    "rationale": "ROAS even across devices (6.0–6.6); 71% of spend rides on mobile → mobile-first UX, not a bid swing."
  }
}
```

## Rules
- `synthesis.headline` is one sentence; `diagnosis` + `action` follow.
- **Full coverage** — devices sum to ~100% of spend; there is **no Undetermined bucket** (unlike
  demographics). Don't add one.
- **Every rate/cost in `derived` is computed from base counts** — never read a native rate field,
  never sum a ratio across devices.
- **`contribution.delta_metric`** for a **count** focal metric sums to ΔM across devices; for a
  **ratio** focal metric, attribute via numerator/denominator counts (the `delta_metric` is then the
  count-driven contribution, not a summed ratio).
- **`lever.verdict`** is `no_lever` when ROAS sits in a tight band (`roas_spread`); `lever` only on a
  genuine gap (e.g. mobile ROAS half of desktop). **A "no_lever" result is valid — don't manufacture a
  recommendation.**
- **Near-zero rows** (connected-TV / tablet) stay in `devices[]` but are folded into the read — don't
  weight a near-zero row equally.
