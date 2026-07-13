# Output — RSA Strength & Headline Diversity Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, `recommendation`, headline `text`, and notes.
- `strength`: `POOR` · `AVERAGE` · `GOOD` · `EXCELLENT` (Google's Ad Strength rating)
- `verdict`: `strong` · `needs_work`
- `issue` (each item in `issues[]`): `low_strength` · `over_pinned` · `duplicate_headlines` · `few_assets` · `none`
- `action`: `keep` · `unpin_headline` · `replace_headline` · `add_headlines` · `rewrite_ad`
- `assetLabel` (per headline): `PENDING` · `LEARNING` · `LOW` · `GOOD` · `BEST`
- `dominant` (the account-level weakness in `synthesis`/`rollup`): `over_pinning` · `duplicate_headlines` · `thin_assets` · `low_strength` · `none`

> Semantics: `low_strength` → `rewrite_ad` (fix the underlying weakness). `over_pinned` →
> `unpin_headline`. `duplicate_headlines` → `replace_headline` (rewrite one to a distinct benefit).
> `few_assets` → `add_headlines`. A `PENDING` / `LEARNING` label means "not enough data" — never
> emit a `LOW`-based `replace_headline` on it. `issues: ["none"]` ⇒ `verdict: strong`, `action: keep`.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "rsa-strength-copy-diversity-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: the weakest high-impression ad + the single move to make.",
    "diagnosis": "The account's dominant weakness — over-pinning vs duplicate headlines vs thin assets vs low strength.",
    "action":    "The one ad to fix now — where / what / why."
  },

  // The main finding array: one entry per RSA. Ranked by impressions desc.
  "ads": [
    {
      "ad_group":       "Acme_Life_SEM_(HD)",
      "ad_id":          "1234567890",        // optional, when available
      "strength":       "AVERAGE",           // enum
      "headline_count": 6,                   // how many headline assets the RSA has
      "impressions":    18230,               // serving volume → ranking
      "pinned":         ["HEADLINE_1"],      // the non-null pinnedField slots (evidence)
      "duplicates":     ["Acme Insurance Software", "Acme Insurance App"], // near-identical text pairs/groups, if any
      "lowLabels":      [],                  // headline texts whose assetPerformanceLabel is LOW (only on a window with real volume)
      "labelsPending":  true,               // true → per-asset labels are PENDING/LEARNING; don't trust LOW yet
      "issues":         ["over_pinned"],     // enum list; ["none"] when clean
      "verdict":        "needs_work",        // enum
      "action":         "unpin_headline",    // enum
      "recommendation": {
        "where": "Acme_Life_SEM_(HD) — main RSA",
        "what":  "Unpin the brand headline from position 1 (setting: remove the pin on HEADLINE_1) so Google can rotate all headlines.",
        "why":   "The pin forces the same line every time, so Google can't test combinations and Ad Strength stays at Average."
      }
    }
  ],

  // Account-level roll-up → the section summary.
  "rollup": {
    "strength_mix": { "POOR": 1, "AVERAGE": 4, "GOOD": 6, "EXCELLENT": 2 }, // count of ads per rating
    "weakest_ads":  [ /* the lowest-strength, highest-impression ads, ordered */ ],
    "dominant":     "over_pinning",          // enum: the account's most common weakness
    "topFixes":     [ /* the highest-leverage recommendations, ordered by impressions */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `strength` / `verdict` / `issue` / `action` / `assetLabel` / `dominant` uses a value from the
  **Enums** above — never free text.
- `verdict` reflects **build quality of the copy only** — strength + headline diversity + pinning.
  Never derive it from CTR/CVR (outcomes) or from message-match to the keyword/landing (that's the
  [`keyword-ad-landing`](../../../keyword-ad-landing/) cluster).
- **`labelsPending: true` overrides any LOW-based action** → do not emit `replace_headline` from a
  per-asset label that is `PENDING` / `LEARNING`; say "not enough data yet" and, if anything, widen
  the window. `lowLabels` should only be populated on a window with real volume.
- **`over_pinned` is the brand/generic-in-slot-1 pattern**, not every pin. A legitimate legal
  disclaimer pin is not a defect — note it, don't recommend unpinning it.
- **`duplicates` is a `text` judgment** — list the near-identical headline texts as evidence; Google's
  labels won't surface this.
- **PMax / asset-group rows are out of scope** — note them, don't force a `strength`/`verdict`.
- Each `recommendation` names the **exact ad group / ad** + the **exact headline move**, in language a
  non-technical owner can act on (`where` / `what` / `why`), the technical setting in parentheses.
  See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
