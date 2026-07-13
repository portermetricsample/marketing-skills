# Output — Search Term Performance

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(the spend-ranked table + narrative). **No presentation here** — emojis/tables are a rendering concern.

The `terms[]` (metrics, class, destination, dollars) are produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). The **LLM** only writes `synthesis`.

> All values below come from the **fictional** `../scripts/example.json` fixture (Acme Insurance) —
> no real account data.

## Enums (the only allowed values)
- `class`: `winning` · `watch` · `waste`
- `destination`: `promote_to_exact` · `leave` · `add_negative`
- `account_type`: `lead_gen` · `ecommerce`
- `benchmark_source`: `target_cpa` · `median_converting` · `none`
- `match_types[]` items: `EXACT` · `PHRASE` · `BROAD`

## Schema

```jsonc
{
  "meta": {
    "skill": "search-term-performance",
    "account_type": "lead_gen",            // ecommerce when conversion value is present
    "benchmark_cpa": 40,                   // the bar a term must beat; null = nothing converts
    "benchmark_source": "target_cpa",      // target_cpa | median_converting | none
    "thin_data_floor_clicks": 20,          // 0-conv terms below this are unproven (Watch), not Waste
    "account_conv_rate": 0.0505,
    "roas_target": null,                   // set only for ecommerce
    "totals": { "cost": 1522.0, "clicks": 773, "conversions": 39.0, "value": null }
  },

  // Executive synthesis — three strings, LLM-written, rendered before the table.
  "synthesis": {
    "headline":  "$150 of spend on terms that don't convert — led by `life insurance jobs` ($90).",
    "diagnosis": "Waste sits on two broad-served informational terms; the winners are the exact/phrase quote terms.",
    "action":    "Add `life insurance jobs` and `free life insurance` as negatives; promote `term life insurance` to exact."
  },

  // ONE row per search term, sorted by cost desc. Base counts aggregated across its keywords.
  "terms": [
    {
      "term": "term life insurance",
      "match_types": ["BROAD", "PHRASE"],  // every match type that served it (drives the destination)
      "campaigns": ["Acme_Life_SEM"],
      "cost": 380.0, "clicks": 210, "conversions": 14.0, "value": null,
      "cpa": 27.14, "conv_rate": 0.0667, "roas": null,
      "class": "winning",
      "destination": "promote_to_exact",   // broad-served winner → promote
      "dollars_at_risk": 0.0,              // > 0 only for waste (the burning spend)
      "below_floor": false                 // true = 0-conv term under the thin-data floor (unproven)
    },
    {
      "term": "life insurance jobs",
      "match_types": ["BROAD"], "campaigns": ["Acme_Life_SEM"],
      "cost": 90.0, "clicks": 45, "conversions": 0.0, "value": null,
      "cpa": null, "conv_rate": 0.0, "roas": null,
      "class": "waste", "destination": "add_negative",
      "dollars_at_risk": 90.0, "below_floor": false
    },
    {
      "term": "is life insurance worth it",
      "match_types": ["BROAD"], "campaigns": ["Acme_Life_SEM"],
      "cost": 12.0, "clicks": 5, "conversions": 0.0, "value": null,
      "cpa": null, "conv_rate": 0.0, "roas": null,
      "class": "watch", "destination": "leave",
      "dollars_at_risk": 0.0, "below_floor": true   // only 5 clicks → unproven, NOT waste
    }
  ],

  "rollup": {
    "terms_count": 7,
    "byClass": { "winning": { "count": 3, "cost": 1060.0 },
                 "watch":   { "count": 2, "cost": 312.0 },
                 "waste":   { "count": 2, "cost": 150.0 } },
    "waste_cost": 150.0,                   // recoverable-dollars input for the insights card
    "winning_cost": 1060.0,
    "watch_cost": 312.0
  }
}
```

## Rules
- **Aggregate the base counts** (cost/clicks/conv/value) per term *before* deriving CPA/conv-rate/ROAS.
  Never trust the native `cost_per_conversion` / `conversion_value_per_cost` — wrong at aggregate.
- **Cost is already currency** — `cost_micros` is pre-converted by Porter; do NOT divide by 1e6.
- **`class` is money only.** Relevance never enters here (a `waste` term may be perfectly relevant).
- **Thin-data floor is a hard guard:** a 0-conversion term under the floor is `watch` (`below_floor:
  true`), never `waste`. Don't call 5 clicks a verdict.
- **Benchmark:** `target_cpa` (account tCPA) when supplied; else the **median CPA across converting
  terms**; else `null` (then crown no winners — only flag waste — and say so in the synthesis).
- `dollars_at_risk` is the term's spend **only when `class == waste`**; 0 otherwise.
- **Content only** — the spend-ranked layout / chips / date range are a reporting concern, not baked in.
