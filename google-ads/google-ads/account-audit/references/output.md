# Output — the assembled audit object

The assembled audit emits ONE object: the global [`output-contract.md`](../../../_framework/output-contract.md)
envelope, where `checks[]` holds one entry **per applicable section**, each produced by its own check's
`output.md`. This skill does not invent a new schema — it **collects** the per-check objects under the
account-level `synthesis`. The rendered HTML (per [`render-rules.md`](render-rules.md)) is a projection of
this object; the object is the source of truth and the input to the verify gate (§6 of the framework).

## Shape
```jsonc
{
  "meta": {
    "account": "<advertiser>",
    "connector": "google-ads",
    "skill": "google-ads-account-audit",
    "period":  { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "comparison": "previous-period" },
    "currency": "<ISO>",
    "settings_as_of": "YYYY-MM-DD",
    "scrape_status": "ok"          // "ok" | "degraded" | "blocked"
  },

  // The account-level executive synthesis — EXACTLY three strings (the arc; no highlights[]).
  "synthesis": {
    "headline":  "The money verdict, period-over-period (de-biased: brand artifact called out).",
    "diagnosis": "Where it leaks — the funnel stage / real driver, via metric-relationships.",
    "action":    "The do-first move(s) — the highest-$ fix, where / what / why."
  },

  // Scorecards rendered at the top (each carries its prior-period delta).
  "scorecards": [
    { "label": "Spend", "value": 0, "unit": "currency", "delta": 0.0, "meaning": "bad|good|flat" }
    // Conversions, Conversion value, CPA, ROAS, Value/conversion
  ],

  // One entry per APPLICABLE section, severity-ordered by money at stake. Each is the canonical
  // object emitted by that check's own output.md (verdict + findings[{entity,state,evidence,
  // recommendation:{where,what,why}}] + rollup). Sections with no data are OMITTED (see framework §7),
  // optionally replaced by a one-line {"id","verdict":"n_a","note":"<reason / verify in-account>"}.
  "checks": [
    { "id": "conversion-tracking", "title": "...", "severity": "high",
      "verdict": "ok|review|broken|n_a",
      "findings": [ { "entity": {"level":"campaign|ad_group|keyword|ad|conversion_action|segment|landing|account","name":"..."},
                      "state": "ok|flag|raise|cut|review|broken",
                      "evidence": { },
                      "recommendation": { "where":"...", "what":"...", "why":"..." } } ],
      "rollup": { "byState": { }, "topFixes": [ ] } }
    // … bid-strategy, value-based-bidding, spend-allocation, quality-score, search-terms,
    //    device-dayparting, geography, audience-demographics, ad-assets, landing-cro, demand-gen …
  ],

  // Confirmed-good fundamentals (the "What's already set up right" cards).
  "clean": [ { "title": "Location = Presence", "detail": "all campaigns target people in-market" } ],

  // The cross-section action plan, ranked by dollar impact (drives the .todo list).
  "actionPlan": [ { "rank": 1, "title": "...", "detail": "...", "impact": "<$ / metric>" } ],

  // Honest method + every data gap (drives the footer).
  "caveats": [ "Numeric Quality Score unusable → pillars used.", "Brand modelled value is volatile.", "..." ]
}
```

## Rules
- **`synthesis` = exactly three strings.** No `highlights[]`.
- Every controlled field uses the **per-check enums** (verdict / state) — never free text; free text only
  in `synthesis`, `evidence` quotes, `recommendation`, `caveats`.
- **`severity` ∈ `high|med|low`** by money at stake (framework §3); the renderer orders sections by it.
- **Brand separated** in every efficiency number; report blended AND non-brand when they differ.
- **No presentation in the object** (no HTML/colors/emojis) — the render step owns the look.
- **Omit, don't fabricate.** A section with no data is dropped or marked `n_a` with a reason.
