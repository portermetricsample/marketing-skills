# Output — Campaign Segmentation

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(SUMAS table, breakdown bar, contribution view). **No presentation here** — emojis/tables are a
rendering concern, not the analysis output.

## Enums (the only allowed values)
- `metric`: `impressions` · `clicks` · `cost` · `conversions` · `conversions_value` · `ctr` · `cpc` · `cpm` · `cpa` · `roas` · `conversion_rate`
- `metric_kind`: `count` · `ratio`
- `direction`: `up` · `down` · `flat`
- `campaign_type`: `search` · `pmax` · `shopping` · `demand_gen` · `display` · `video` · `other`
- `change_class`: `like_for_like` · `entry` · `exit`
- `entity_status`: `enabled` · `paused` · `removed`

> `count` metrics support contribution-to-change (campaigns sum back to ΔM). `ratio` metrics are
> **never summed** across campaigns — they carry a numerator/denominator decomposition instead.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "campaign-segmentation",
    "period":     { "from": "2026-05-01", "to": "2026-05-31" },
    "comparison": { "from": "2026-04-01", "to": "2026-04-30" },
    "currency": "CAD"
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: the metric's move + the single campaign/action that explains it.",
    "diagnosis": "The campaign that contributed most of the metric's change + where spend/return concentrates (top-N share).",
    "action":    "The one specific fix to take now (fund / fix / cut) — where / what / why."
  },

  // One entry per explained metric. Each is a full contribution-to-change finding.
  "metrics": [
    {
      "metric": "conversions",
      "kind": "count",                       // metric_kind
      "now": 90,
      "prev": 120,
      "delta": -30,                          // ΔM = now − prev
      "direction": "down",
      // Campaigns ranked by |ΔM_c|; for a count, contribution[].delta sums back to ΔM (like-for-like set).
      "contributors": [
        {
          "campaign": "Generic_Search",
          "campaign_id": "12345",
          "campaign_type": "search",
          "now": 40, "prev": 64,
          "delta": -24,                      // ΔM_c
          "share_of_change": 0.80            // |ΔM_c| / Σ|ΔM_c| over like-for-like — for count metrics
        }
      ],
      // For kind=="ratio": never summed. Decompose into the counts that move it.
      "ratio_decomposition": {               // present only when kind=="ratio"
        "numerator":   { "metric": "conversions", "delta": -30 },
        "denominator": { "metric": "clicks",      "delta": 50 },
        "note": "Rate fell because clicks rose faster than conversions — attribute via these counts."
      },
      "concentration": {                     // cumulative share for this metric
        "top_n": 3,
        "share": 0.70,                       // top-3 campaigns = 70% of the metric
        "note": "Over-reliance flag: a shock to any one swings the account."
      }
    }
  ],

  // Campaigns present in only ONE period — structural movers, kept APART from like-for-like.
  "entries_exits": [
    {
      "campaign": "PMax_Launch",
      "campaign_id": "67890",
      "campaign_type": "pmax",
      "change_class": "entry",               // entry | exit
      "status": "enabled",                   // entity_status
      "present_in": "period",                // "period" (entrant) | "comparison" (exit)
      "mechanical_effect": { "cost": 7000, "conversions": 12 },
      "note": "Live only this period → reported apart so it isn't read as existing campaigns spending more."
    }
  ],

  // The campaign-type cross-cut — spend/return per advertising channel type (gates comparability).
  "by_campaign_type": [
    {
      "campaign_type": "search",
      "cost": 42000, "cost_delta": -3000,
      "conversions": 70, "conversions_delta": -20,
      "conversions_value": 210000, "value_delta": -15000,
      "na_metrics": []                       // metrics N/A for this type (e.g. keyword data for pmax/shopping)
    }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (the campaign
  that contributed most + where spend/return concentrates), `action` (the single fund/fix/cut).
  No `highlights`.
- **Every rate/cost is computed from base counts** — never read a native ratio field; it's wrong at
  the aggregate.
- **`count` metrics:** `contributors[].delta` sums back to the like-for-like `delta`; `share_of_change`
  is over the like-for-like set, **excluding** entries/exits.
- **`ratio` metrics are never summed** across campaigns — emit `ratio_decomposition` (numerator/
  denominator counts) instead of a contribution sum.
- **Entry/exit ≠ performance change** — campaigns present in only one period go in `entries_exits[]`,
  NOT in `contributors[]`; they move the total mechanically.
- **Campaign type gates metrics** — mark per-type N/A metrics in `na_metrics`; don't compare
  type-incomparable sets as if equal.
- **Contribution ≠ cause** — `contributors[]` locates *which* campaign; any "why" (launch, budget
  change, seasonality) is a **marked interpretation**, carried in a `note`, never as observation.
