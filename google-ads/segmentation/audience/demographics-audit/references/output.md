# Output — Audience & Demographics Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> Free text is only allowed in `synthesis`, `recommendation`, and `note`.
- `dimension`: `age` · `gender`
- `signal`: `over_performer` · `under_performer` · `inline` · `thin_volume`
- `action`: `bid_up` · `bid_down` · `exclude` · `negative_bid_adjustment` · `leave` · `human_review`
- `audience_usage`: `none_attached` · `observation_only` · `targeting` · `mixed`
- `audience_action`: `attach_observation` · `shift_to_targeting` · `keep` · `review`
- `business_model`: `ecommerce` · `lead_gen`
- `gap_field`: `income_range` · `parental_status`

> `negative_bid_adjustment` is reserved for the `UNDETERMINED` case (framework §4): large + weak,
> bid down but **never** `exclude`.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "audience-demographics-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD",
    "business_model": "ecommerce"        // decides ROAS vs CPA-only judgment
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "The biggest bid-adjustment opportunity by spend + whether audiences are in use.",
    "diagnosis": "Where the spend leaks — which segment / dimension drags the account, via the funnel identity.",
    "action":    "The highest-$ fix — where / what / why."
  },

  // One finding per demographic segment, at segment × campaign grain (so the recommendation
  // can name the exact campaign). Every controlled value comes from the enums above.
  "segments": [
    {
      "dimension": "age",
      "segment": "AGE_RANGE_55_64",
      "campaign": "Acme_Life_SEM_(TL)",   // the exact campaign — never account-level when avoidable
      "spend": 2959,
      "conversions": 16,
      "value": 1012,
      "cpa": 184.9,
      "roas": 0.34,                           // omit / null in lead_gen (CPA only)
      "vs_baseline": -0.87,                   // delta of ROAS (or CPA) vs the weighted account baseline
      "signal": "under_performer",
      "action": "bid_down",
      "recommendation": { "where": "Acme_Life_SEM_(TL)", "what": "Lower the bid for ages 55-64 (set a negative bid adjustment on that age range).", "why": "This age band spends real money but barely converts — the budget does better on 25-44." },
      "note": "Volume is real (16 conv) — not thin."
    },
    {
      "dimension": "age",
      "segment": "AGE_RANGE_UNDETERMINED",
      "campaign": "account-level",            // say so explicitly when the grain isn't available
      "spend": 50150,
      "conversions": 163,
      "value": 61103,
      "cpa": 307.7,
      "roas": 1.22,
      "vs_baseline": -1.42,
      "signal": "under_performer",
      "action": "negative_bid_adjustment",    // §4: large + weak → bid down, NEVER exclude
      "recommendation": { "where": "account-level", "what": "Reduce the bid for the unknown-age group (negative bid adjustment), do NOT exclude it.", "why": "These are real people Google couldn't classify — excluding them cuts reach hard." },
      "note": "2nd-biggest age segment by spend — the UNDETERMINED trade-off."
    }
  ],

  // The audience-usage block — are audiences attached at all? top/bottom + the Observation→Targeting call.
  "audiences": [
    {
      "usage": "none_attached",               // account-level usage state
      "audience": null,                        // a specific attached audience when usage != none_attached
      "spend": null,
      "conversions": null,
      "audience_action": "attach_observation",
      "recommendation": { "where": "account (all Search ad groups)", "what": "Attach relevant audiences in Observation mode (don't restrict targeting yet).", "why": "You can't bid on or learn from audiences you never attached — Observation watches them risk-free first." }
    }
  ],

  // Connector gaps — reported, NEVER as a segment finding (datos.md).
  "gaps": [
    { "field": "income_range",     "note": "Not exposed by the Porter google-ads connector — cannot audit income segments today." },
    { "field": "parental_status",  "note": "Not exposed by the Porter google-ads connector — cannot audit parental segments today." }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field uses a value from the **Enums** above — never free text.
- `signal` reflects **performance vs the account baseline only**, volume-gated. A CPA/ROAS on a
  handful of conversions is `thin_volume`, not a winner/loser — annotate the count, don't bid off it.
- **ROAS vs CPA branch:** in `lead_gen` accounts judge on **CPA** and omit `roas`; in `ecommerce`
  use **ROAS**. Set `meta.business_model`.
- **UNDETERMINED:** always `negative_bid_adjustment`, never `exclude` (framework §4).
- Each `recommendation` names the **exact entity** (campaign × segment) + the **exact change**, in
  language a non-technical owner can act on (`where` / `what` / `why`). When the `segment × campaign`
  grain isn't available, set `campaign: "account-level"` explicitly. See
  [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
- **Income & parental** go in `gaps[]` only — they are connector gaps, never segment findings.
