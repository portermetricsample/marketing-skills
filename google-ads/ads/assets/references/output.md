# Output — Ad Extensions (Assets) Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, `recommendation`, and notes.
- `extension_type`: `sitelinks` · `callouts` · `structured_snippets` · `images`
- `verdict`: `present` · `missing` · `ineligible`
  - `present` — count of active assets > 0.
  - `missing` — count of active assets = 0 (and the type IS eligible).
  - `ineligible` — Images (or another type) came back empty AND may not be eligible for this account/vertical → soft note, not a hard fail.
- `action`: `keep` · `add_extension` · `none`
  - `keep` — type is present; nothing to do.
  - `add_extension` — type is missing; add it (pairs with a `recommendation`).
  - `none` — `ineligible` (nothing actionable; flag only).
- `level`: `account` (presence is account-level — per-campaign is deferred).

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "ad-extensions-assets-audit",
    "period": { "from": "2026-05-22", "to": "2026-06-21", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "Only 1 of the 4 essential extension types is active — the ads are leaving space (and clicks) on the table.",
    "diagnosis": "Callouts, Structured Snippets and Images are all missing — three free ad expansions the account never claims.",
    "action":    "Add Callouts first (account level): 3-4 short selling points (e.g. Free Trial, No Credit Card) so the ad takes up more space and lifts CTR."
  },

  // One finding per essential extension type. Every controlled value comes from the enums above.
  "extensions": [
    {
      "extension_type": "sitelinks",
      "level": "account",
      "active_count": 6,
      "verdict": "present",
      "action": "keep",
      "recommendation": null
    },
    {
      "extension_type": "callouts",
      "level": "account",
      "active_count": 0,
      "verdict": "missing",
      "action": "add_extension",
      "recommendation": {
        "where": "Account level (all Search campaigns)",
        "what":  "Add 3-4 short callouts — single selling points like Free Trial, No Credit Card, 24/7 Support (setting: Callout assets).",
        "why":   "So your ads take up more space on the page and get more clicks."
      }
    },
    {
      "extension_type": "structured_snippets",
      "level": "account",
      "active_count": 0,
      "verdict": "missing",
      "action": "add_extension",
      "recommendation": {
        "where": "Account level (all Search campaigns)",
        "what":  "Add a Structured Snippet (pick a header like Services or Features, then list 3-4 values) (setting: Structured snippet assets).",
        "why":   "So the ad shows a quick list of what you offer and stands out."
      }
    },
    {
      "extension_type": "images",
      "level": "account",
      "active_count": 0,
      "verdict": "ineligible",
      "action": "none",
      "recommendation": null,
      "note": "None active — image extensions may be ineligible for this account/vertical; confirm before treating as a gap."
    }
  ],

  // Roll-up → the action list. Which essential types are present vs missing.
  "rollup": {
    "present": ["sitelinks"],
    "missing": ["callouts", "structured_snippets"],
    "ineligible": ["images"],
    "action": "Add Callouts and Structured Snippets (account level)."
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field (`extension_type`, `verdict`, `action`, `level`) uses a value from the
  **Enums** above — never free text.
- `verdict` reflects **active-asset presence only** (status-filtered count). Never count `REMOVED`
  / `NOT_ELIGIBLE` assets as present.
- Each `recommendation` (present only when missing) names the **exact entity** (account level, since
  per-campaign is deferred) + the **exact change**, in language a non-technical owner can act on
  (`where` / `what` / `why`). See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
  When `verdict` is `present` or `ineligible`, `recommendation` is `null`.
- **Images empty → `ineligible`, not `missing`** — image extensions aren't eligible for every
  vertical; flag as a soft note, not a hard fail.
- Scope is **account-level**: do NOT emit per-campaign findings (the asset↔campaign join returns
  blank — say "account-level" explicitly). Copy quality and PMax asset groups are out of scope.
