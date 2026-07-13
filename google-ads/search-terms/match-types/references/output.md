# Output — Match Types: Efficiency & Concentration

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, `recommendation`, and notes.
- `match_type`: `BROAD` · `PHRASE` · `EXACT` (never "AI Max" — not a match type in the keyword view)
- `verdict`: `concentrated` · `balanced` · `untested` · `directional`
- `action`: `rebalance` · `test_type` · `keep` · `verify`
- `lean`: `over_concentrated` · `balanced` · `untested` (the account-level direction in `synthesis`/`rollup`)

> Semantics: `concentrated` (one type ~≥70% of spend) → `rebalance`. `untested` ($0 spend) →
> `test_type`. `balanced` → `keep`. `directional` is set when the **blend guardrail** fires
> (>1 primary conversion action): efficiency is not trustworthy → `verify` (and the concentration /
> untested verdict still stands on its own, spend-based, line). When efficiency is blended, set
> `directional: true` on **every** entry and never assert "most/least efficient".

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "match-types",
    "period": { "from": "2026-05-24", "to": "2026-06-23", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: the concentration (top type's % of spend) + the move to make.",
    "diagnosis": "Which way the account leans — over-concentrated vs untested — and whether per-type efficiency is trustworthy (blend guardrail).",
    "action":    "The one move now — where / what / why."
  },

  // The main finding array: one entry per match type present (and per untested type at $0).
  "match_types": [
    {
      "match_type": "BROAD",            // enum
      "cost": 18420,                    // summed cost in currency (cost_micros ÷ 1e6)
      "conversions": 49,                // summed conversions (a BLEND if >1 primary action)
      "cost_per_conversion": 376,       // computed cost ÷ conversions
      "spend_share": 0.78,              // this type's cost ÷ total cost
      "verdict": "concentrated",        // enum
      "action": "rebalance",            // enum
      "directional": true,              // true → efficiency not trustworthy (conversions is a blend)
      "recommendation": {
        "where": "Broad match (account-wide)",
        "what":  "Shift some budget off broad toward the type that already converts; pilot, don't flip all at once.",
        "why":   "Almost four-fifths of spend rides one setting — too much risk on a single match type, and its true cost-per-lead can't be confirmed."
      }
    },
    {
      "match_type": "PHRASE",
      "cost": 0,
      "conversions": 0,
      "cost_per_conversion": null,      // null when no conversions / no spend
      "spend_share": 0.0,
      "verdict": "untested",            // enum
      "action": "test_type",            // enum
      "directional": false,
      "recommendation": {
        "where": "Phrase match",
        "what":  "Pilot phrase match on the 2–3 best-performing ad groups before committing budget.",
        "why":   "It has never been tried, so there's a whole match type of demand you haven't measured."
      }
    }
  ],

  // Account-level roll-up → the section summary.
  "rollup": {
    "top_type_share": 0.78,             // the largest single match type's share of spend
    "untested": ["PHRASE"],             // match types sitting at $0
    "lean": "over_concentrated",        // enum: the dominant direction
    "topFixes": [ /* the highest-$ recommendations, ordered by spend */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `match_type` / `verdict` / `action` / `lean` uses a value from the **Enums** above — never free text.
- **Compute every ratio** (cost/conv, spend_share) from base counts — native ratio fields are wrong
  at aggregate. `cost_per_conversion` is `null` when conversions or spend is 0.
- **The blend guardrail overrides efficiency claims:** if >1 primary conversion action feeds
  `conversions`, set `directional: true` on **every** entry, report cost/conv as directional, and
  **never** assert one type is "most/least efficient" — concentration + untested verdicts remain valid.
- `verdict` reflects **spend concentration + untested** (the safe, spend-based read). Efficiency is
  context, not the verdict, whenever `directional` is true.
- **Exclude branded terms before computing** shares + efficiency
  ([`../../../../_framework/brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)) — branded
  keywords are usually Exact and skew that type.
- Each `recommendation` names the **exact match type** + the **exact move**, in language a
  non-technical owner can act on (`where` / `what` / `why`), the technical term in parentheses.
  See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
