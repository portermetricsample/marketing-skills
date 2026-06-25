# Output — Offline Conversion Tracking Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is
the handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit).
**No presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`. This is an account-level setup audit, so the body is three-level: account verdict per
question → per-action detail → hygiene.

## Enums (the only allowed values)
> Every controlled value the schema uses. Free text is only allowed in `synthesis` and the
> `recommendation` strings.
- `question.id`: `offline_import` · `optimization_depth` · `conversion_values`
- `verdict` (per question + account-level): `ok` · `review` · `broken` · `n/a`
- `rule` (which objective rule fired): `R1_offline_missing` · `R2_primary_shallow` · `R3_value_missing` · `R4_deprecated` · `none`
- `depth` (category → funnel ladder): `L1` (shallow: PAGE_VIEW, ENGAGEMENT, DEFAULT-unproven) · `L2` (mid/lead: SUBMIT_LEAD_FORM, SIGNUP, REQUEST_QUOTE, CONTACT, BOOK_APPOINTMENT, PHONE_CALL_LEAD, GET_DIRECTIONS, DOWNLOAD) · `L3` (down-funnel/revenue: PURCHASE, QUALIFIED_LEAD, CONVERTED_LEAD, SUBSCRIBE_PAID, STORE_SALE, STORE_VISIT)
- `depth_source`: `category` (read from the Google category) · `name_inferred` (category was DEFAULT → depth read from the action name)
- `action.state`: `ok` · `flag` · `cut` · `review`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "conversion-tracking-audit",
    "period": { "from": "2026-05-22", "to": "2026-06-21", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "The single biggest setup gap and its fix (the silver line).",
    "diagnosis": "Why it leaks — bidding optimizes a shallow / value-less primary action, so it chases the wrong outcome (funnel identity).",
    "action":    "The highest-leverage fix — where / what / why."
  },

  // Part 1 — Account verdict: one entry per Acme question. Order = offline_import, optimization_depth, conversion_values.
  "questions": [
    {
      "id": "offline_import",
      "question": "Is offline/CRM conversion import set up?",
      "verdict": "broken",                 // enum
      "rule": "R1_offline_missing",        // enum — which objective rule produced this
      "finding": "No enabled action has an UPLOAD/CRM type or source.",
      "recommendation": {
        "where": "account (conversion actions)",
        "what":  "Import down-funnel CRM events (setting: offline conversion import from HubSpot / Salesforce / Pipedrive).",
        "why":   "So Google optimizes on real revenue, not just the lead form."
      }
    }
  ],

  // Part 2 — Active actions detail (ENABLED only, A+B joined). Every controlled value from the enums.
  "actions": [
    {
      "name": "H&D Application Start",
      "category": "SUBMIT_LEAD_FORM",
      "depth": "L2",                       // enum
      "depth_source": "category",          // enum
      "type": "WEBPAGE",
      "source": "Website (Webpage)",
      "primary": true,
      "value": 0,
      "conversions": 134,
      "state": "flag",                     // enum — e.g. primary firing with no value
      "rule": "R3_value_missing",          // enum
      "recommendation": { "where": "H&D Application Start", "what": "Add a conversion value (setting: value on the conversion action).", "why": "It records 134 leads at $0 today, so Google can't tell which leads pay." }
    }
  ],

  // Part 3 — Hygiene (info, not a rule): cleanup counts.
  "hygiene": {
    "removed_or_hidden": 24,               // REMOVED / HIDDEN actions to clean up
    "deprecated_ua": 3,                    // enabled UNIVERSAL_ANALYTICS_GOAL actions (R4)
    "recommendation": { "where": "account (conversion actions)", "what": "Remove legacy actions and migrate off Universal Analytics goals (sunset).", "why": "They clutter the account and UA goals will stop counting." }
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field (`verdict`, `rule`, `depth`, `depth_source`, `state`) uses a value from the
  **Enums** above — never free text.
- Each `recommendation` names the **exact conversion action** (or "account (conversion actions)" when
  account-level) + the **exact change**, in language a non-technical owner can act on
  (`where` / `what` / `why`, the exact setting in parens). See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
- The recommendation is a **kind of fix**, not the specific event/CRM — R1 names "a CRM", R2 names
  "a deeper action"; the human picks the exact target.
- Judge the **ENABLED** actions only; REMOVED/HIDDEN feed `hygiene`, not `actions[]`.
- When `category == DEFAULT`, set `depth_source: "name_inferred"` and read depth from the action
  name — never assert a DEFAULT action's depth from the category.
- `value`/`conversions` use the primary (`google_ads_conversions`) UI semantics — disclose if asked.
