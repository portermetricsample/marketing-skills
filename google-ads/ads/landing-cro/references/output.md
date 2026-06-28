# Output — Landing Page CRO Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, the
> per-link `reason` (a quote from the page), and `recommendation`.
- `cro_link`: `value_prop` · `primary_cta` · `differentiation_pain` · `proof_trust` · `form_friction`
- `link_grade` (the grade of each C1-C5 link): `pass` · `partial` · `fail` · `unknown`
- `verdict` (the page-level CRO state): `converts_well` · `review` · `weak`
- `entity.level`: `landing` (always — the unit is the page)

> Mapping to the rubric in [`framework.md`](framework.md): C1 = `value_prop`, C2 = `primary_cta`,
> C3 = `differentiation_pain`, C4 = `proof_trust`, C5 = `form_friction`. `unknown` is used for every
> link when the page couldn't be scraped → page `verdict` = `review`.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "landing-page-cro-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD",
    "scrape_status": "ok"               // "ok" | "blocked" (page couldn't be scraped even after proxy:stealth retry)
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "The one-line insight: the weakest high-spend page + the single fix (the silver line).",
    "diagnosis": "Where it leaks — the CRO link most pages fail on, via the funnel identity (metric-relationships).",
    "action":    "The highest-$ fix — where / what / why."
  },

  // The skill's main finding array — one entry per landing page, ranked by spend.
  "pages": [
    {
      "url": "https://acme.com/life-insurance",
      "spend": 14332,                   // summed across the ads pointing to this URL (for ranking)
      "verdict": "weak",                // enum: converts_well | review | weak
      "cro_read": [                     // C1-C5, each with a grade + a one-line reason quoted from the page
        { "link": "value_prop",           "grade": "fail",    "reason": "H1 reads 'Get a Quote' — no differentiator." },
        { "link": "primary_cta",          "grade": "pass",    "reason": "One 'Start my application' button above the fold." },
        { "link": "differentiation_pain", "grade": "partial", "reason": "Generic 'affordable coverage'; no specific searcher pain." },
        { "link": "proof_trust",          "grade": "fail",    "reason": "No reviews, badges, or named customers on the page." },
        { "link": "form_friction",        "grade": "pass",    "reason": "Form starts with email only." }
      ],
      "recommendation": {               // the single highest-leverage fix — ALWAYS executable + plain
        "where": "https://acme.com/life-insurance",
        "what":  "Lead the headline with the specific offer the searcher wanted (plain: say what it is + why it's better in one line, not 'Get a Quote'), and add credible proof near it (named customers / review count).",
        "why":   "The page sends the most spend but gives a visitor no reason to trust it or pick it over a competitor."
      }
    }
  ],

  // Pages ranked by the biggest spend + weakest CRO (the highest-$ fixes first).
  "rollup": {
    "byVerdict": { "weak": 1, "review": 0, "converts_well": 0 },
    "topFixes": [ /* the highest-$ recommendations, ordered by spend */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field (`link`, `grade`, `verdict`) uses a value from the **Enums** above —
  never free text. `reason` is a short quote/paraphrase grounded in the page; `recommendation` is
  plain prose.
- `verdict` reflects the page's **own conversion quality only** — never message-match to the ad
  (that's `keyword-ad-landing-alignment`).
- Each `recommendation` names the **exact page URL** + the **exact change**, in language a
  non-technical owner can act on (`where` / `what` / `why`). See [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
- **Empty / failed scrape:** set every `cro_read` link `grade` to `unknown`, the page `verdict` to
  `review`, and say why in the recommendation — **never guess page content**. Set
  `meta.scrape_status` to `blocked` whenever the page couldn't be scraped even after
  `proxy:"stealth"` retry.
