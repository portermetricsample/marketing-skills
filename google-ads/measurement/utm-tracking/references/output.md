# Output — UTM Tagging Hygiene

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, `recommendation`, `scheme_note`, and notes.
- `has_utms`: `true` · `false` (are the core UTM params populated at all on this campaign)
- `verdict`: `tagged` · `inconsistent` · `untagged`
- `action`: `keep` · `add_utms` · `standardize` · `enable_autotagging`

> Semantics: `tagged` (present + uniform + dynamic term) → `keep`. `inconsistent` (present but ad-hoc
> scheme, or a static `utm_term`) → `standardize`. `untagged` (all params blank) → `add_utms`, and
> pair it with `enable_autotagging` (GCLID) whenever auto-tagging is off. `enable_autotagging` may
> also stand alone as a top fix at the account level even when some manual UTMs exist.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "utm-tracking-hygiene",
    "period": { "from": "2026-05-24", "to": "2026-06-22", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: the biggest tagging gap on the highest spender + the fix to make.",
    "diagnosis": "Where attribution leaks — untagged/ad-hoc clicks GA4 and the CRM can't trace to a campaign or keyword.",
    "action":    "The one fix to make now — where / what / why."
  },

  // The main finding array: one entry per campaign. Ranked by spend.
  "campaigns": [
    {
      "campaign": "Acme_Brand_SEM",
      "spend": 14332,                              // ÷1e6 from cost_micros; for ranking by dollars
      "has_utms": false,                           // enum: are the core UTM params populated at all
      "final_url_sample": "https://acme.example/life",  // a representative raw final URL (evidence)
      "scheme_note": "All five utm_* params blank — bare final URLs across the campaign.",
      "verdict": "untagged",                       // enum
      "action":  "enable_autotagging",             // enum
      "recommendation": {
        "where": "Acme_Brand_SEM",
        "what":  "Turn on auto-tagging (GCLID) and add a consistent utm_* scheme with a dynamic keyword tag (utm_term={keyword}).",
        "why":   "The links carry no source, so GA4 and the CRM can't see which campaign or keyword sent each lead."
      }
    }
  ],

  // Account-level roll-up → the section summary.
  "rollup": {
    "coverage": 0.42,                              // share of SPEND on `tagged` campaigns (0–1)
    "verdict": "untagged",                         // enum: the dominant account-level verdict by spend
    "byVerdict": { "tagged": 2, "inconsistent": 3, "untagged": 4 },
    "topFixes": [ /* the highest-$ recommendations, ordered by spend */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `has_utms` / `verdict` / `action` uses a value from the **Enums** above — never free text.
- `verdict` reflects **tagging hygiene only** — presence + consistency + dynamic term of the UTM
  params on the ad URLs. Never derive it from conversion-action setup (that's `conversion-tracking`)
  or page content (that's `landing-cro` / alignment).
- **`untagged` always pairs the fix with auto-tagging** — recommend `enable_autotagging` (GCLID)
  alongside `add_utms`; GCLID and manual UTMs are complementary, never either/or.
- **A populated `utm_term` is not automatically `tagged`** — if it's a static literal repeated on
  every ad, the keyword is lost → `inconsistent` / `standardize` toward a dynamic `{keyword}` value.
- `rollup.coverage` is the share of **spend** (not campaign count) on `tagged` campaigns, so the
  number reflects where the money actually flows.
- Each `recommendation` names the **exact campaign** + the **exact scheme move**, in language a
  non-technical owner can act on (`where` / `what` / `why`), the technical setting (auto-tagging /
  GCLID / `{keyword}`) in parentheses. See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
