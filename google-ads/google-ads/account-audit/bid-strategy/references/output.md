# Output — Bid Strategy Target vs Actual Alignment

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, `recommendation`, and notes.
- `strategy`: `TARGET_CPA` · `MAXIMIZE_CONVERSIONS` · `TARGET_ROAS` · `MAXIMIZE_CONVERSION_VALUE`
- `metric`: `cpa` · `roas` (which target/actual pair this campaign is judged on)
- `verdict`: `aligned` · `too_tight` · `too_loose` · `unit_suspect` · `thin_volume` · `no_target`
- `action`: `keep` · `lower_target` · `raise_target` · `verify_unit` · `gather_volume` · `set_target`
- `lean`: `throttling` · `slack` · `aligned` (the account-level direction in `synthesis`/`rollup`)

> Semantics: `lower_target`/`raise_target` are the literal numeric move. For **tCPA**, `too_tight`
> (actual ≥ ~1.2× target) → `raise_target`; `too_loose` (actual ≤ ~0.8× target) → `lower_target`.
> For **tROAS**, `too_tight` (actual ≤ ~0.8× target) → `lower_target`; `too_loose` (actual ≥ ~1.2×
> target) → `raise_target`. `unit_suspect` → `verify_unit` (never recommend a number). `thin_volume`
> → `gather_volume`. `no_target` → `set_target` (or leave, if the strategy doesn't take one).

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "bid-strategy-target-alignment",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: the most-off target on the biggest spender + the move to make.",
    "diagnosis": "Which way the account leans — throttling (targets too tight) vs slack (too loose) — via the funnel identity.",
    "action":    "The one target to move now — where / what / why."
  },

  // The main finding array: one entry per campaign on a target strategy. Ranked by spend.
  "campaigns": [
    {
      "campaign": "Acme_Life_SEM_(HD)",
      "strategy": "TARGET_ROAS",         // enum
      "metric":   "roas",                // enum: which pair is compared
      "target":   4.0,                   // normalized (tCPA already ÷1e6; tROAS as ratio)
      "actual":   1.55,                  // computed CPA, or native conversion_value_per_cost
      "gap":      -2.45,                 // actual − target (sign shows the lean)
      "spend":    14332,                 // for ranking by dollars
      "conversions": 63,                 // volume context / thin-volume check
      "verdict":  "too_tight",           // enum
      "action":   "lower_target",        // enum
      "thin_volume":  false,             // true → actual is noise, don't trust the gap
      "unit_suspect": false,             // true → the gap is likely a unit/portfolio artifact
      "recommendation": {
        "where": "Acme_Life_SEM_(HD)",
        "what":  "Lower the target return goal from 4.0 toward ~1.8 (setting: target ROAS).",
        "why":   "It only earns 1.55× back, so the 4.0 target is starving the campaign's spend."
      }
    }
  ],

  // Account-level roll-up → the section summary.
  "rollup": {
    "byVerdict": { "too_tight": 2, "too_loose": 1, "aligned": 3, "unit_suspect": 1, "thin_volume": 0, "no_target": 1 },
    "lean": "throttling",                // enum: the dominant direction by spend
    "topFixes": [ /* the highest-$ recommendations, ordered by spend */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `strategy` / `metric` / `verdict` / `action` / `lean` uses a value from the **Enums** above — never free text.
- `verdict` reflects **target realism only** — the set target vs the 30-day actual. Never derive it
  from whether the campaign *should* be on value bidding (that's `value-based-bidding`).
- **Normalize units before comparing** — tCPA target is in micros (÷1e6); tROAS is a ratio. A raw
  comparison without normalizing is the #1 false `too_tight`.
- **`unit_suspect: true` overrides the verdict's action** → emit `verify_unit`, surface both raw
  numbers in `recommendation.what`, and **never recommend a numeric target move** until the unit /
  portfolio-shared-target question is settled.
- **`thin_volume: true`** (few/no conversions) → `gather_volume`; the actual is noise, so don't put a
  number in the recommendation.
- Each `recommendation` names the **exact campaign** + the **exact target move**, in language a
  non-technical owner can act on (`where` / `what` / `why`), the technical setting in parentheses.
  See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
