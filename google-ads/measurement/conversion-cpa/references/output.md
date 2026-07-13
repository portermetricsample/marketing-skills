# Output — Per-Conversion-Action CPA

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's `formats/*`.

## Enums (the only allowed values)
> Free text is only allowed in `synthesis`, `recommendation`, `nonAdditiveWarning`, and notes.
- `cpa_type`: `true` (campaign optimizes to this one action) · `fully_loaded` (spend shared with other actions) · `global` (cost ÷ all conversions)
- `flag` (per action / campaign): `driver_mismatch` · `driven_not_optimized` · `single_goal_true_cpa` · `thin_volume` · `none`
- `count_basis`: `conversions` (in the "Conversions" column) · `all_conversions` (secondary / not counted)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "conversion-cpa",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]).
  "synthesis": {
    "headline":  "The cheapest vs most expensive action by fully-loaded cost + the one to act on.",
    "diagnosis": "Where the spend actually lands by action type — and which campaign's real driver isn't its goal.",
    "action":    "The one move — e.g. give the phone-call action its own single-goal campaign for a true CPA."
  },

  // The additive truth, stated once.
  "globalCpa": 44.22,                  // total cost / total conversions — the ONLY additive CPA
  "nonAdditiveWarning": "Per-action CPAs are fully-loaded; the same spend produced several actions — do not sum them.",

  // Account-level, one per conversion action.
  "actions": [
    {
      "action": "Contact || Phone Number Click",
      "category": "CONTACT",
      "count": 36,
      "count_basis": "conversions",     // enum
      "fully_loaded_cpa": 78.62,        // total cost / this action's count
      "cpa_type": "fully_loaded",       // enum
      "flag": "none"                    // enum
    },
    {
      "action": "Calls from ads",
      "category": "PHONE_CALL_LEAD",
      "count": 19,
      "count_basis": "all_conversions", // only in All conversions
      "fully_loaded_cpa": 148.96,
      "cpa_type": "fully_loaded",
      "flag": "driven_not_optimized"    // enum — happens but bidding ignores it
    }
  ],

  // Per campaign: the global CPA + each action's CPA + the name-vs-driver read.
  "campaigns": [
    {
      "campaign": "Acme_Search_Form_Submits",
      "spend": 1250.87,
      "conversions": 26,
      "globalCpa": 48.11,               // campaign cost / campaign conversions
      "singleGoal": false,              // from selective_optimization
      "topDriver": "Contact || Phone Number Click",   // biggest action by count
      "nameMatchesDriver": false,       // true → name/goal agrees with the real driver
      "flag": "driver_mismatch",        // enum
      "perAction": [
        { "action": "Contact || Phone Number Click", "count": 22, "cpa": 56.86,  "cpa_type": "fully_loaded" },
        { "action": "Contact Us || From Submit",     "count": 4,  "cpa": 312.72, "cpa_type": "fully_loaded" }
      ],
      "recommendation": {
        "where": "Acme_Search_Form_Submits",
        "what":  "Rename/retarget to phone calls, or split calls into their own campaign with campaign-specific goals (setting: campaign goals).",
        "why":   "It drives 22 phone clicks vs 4 form submits — its real product is calls, so a true cost-per-call needs a single-goal campaign."
      }
    }
  ],

  "rollup": {
    "cheapest_action":       "Contact || Phone Number Click",
    "most_expensive_action": "Contact Us || From Submit",
    "mismatches":            [ /* campaigns whose name/goal ≠ real driver */ ],
    "driven_not_optimized":  [ /* actions in All-conversions only */ ],
    "topFixes":              [ /* {where, what, why}, ordered by $ */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `cpa_type` / `flag` / `count_basis` uses a value from the **Enums** above — never free text.
- **Always emit `nonAdditiveWarning` and a `cpa_type` on every CPA.** A per-action CPA is `fully_loaded`
  unless the campaign optimizes to that single action (`true`). **Never sum per-action CPAs.**
- **`globalCpa` is the only additive CPA** (cost ÷ all conversions) — use it for "cost per conversion overall".
- Use `all_conversions` (with `count_basis: "all_conversions"`) for an action absent from the
  "Conversions" column, and set `flag: "driven_not_optimized"`.
- **Thin-volume** (1–2 conversions) → `flag: "thin_volume"`; don't present the CPA as reliable.
- Each `recommendation` names the exact campaign/action + the exact move (`where` / `what` / `why`),
  plain language + the setting in parens. See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
```
