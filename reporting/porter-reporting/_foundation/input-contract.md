# Input contract

The whole point of this repo: **the same inputs can become any document type.**
That only works if every generator agrees on the shape of "the inputs that arrive."

## The two halves of the input

A deliverable is built from exactly two things:

1. **`intent`** — who it's for, which document type, the period, the brand. **This repo owns it.**
2. **`analysis`** — the content (numbers + findings + verdicts + the executive synthesis),
   produced upstream by **[`porter-analysis`](https://github.com/portermetricsample/porter-analysis)**.
   Generators do **NOT** fetch or judge — they **receive** this object and render it. Its source of
   truth is `porter-analysis/_framework/output-contract.md`; **this section mirrors it — keep them in sync.**

```
{ intent } + { analysis }  →  [ generator ]  →  report | dashboard | presentation | audit
                                  └─ pulls styling from the design system
```

## The shape

```jsonc
{
  "intent": {                              // ← reporting decides this
    "audience": "marketing-manager | executive | agency-reviewer | ...",
    "documentType": "report | dashboard | presentation | audit",
    "brand": { "name": "...", "logo": "...", "palette": "..." }
  },

  "analysis": {                            // ← VERBATIM from porter-analysis output-contract
    "meta": { "account": "...", "connector": "google-ads",
              "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
              "currency": "CAD" },

    "synthesis": {                         // the executive opener (insight-first, 3 lines)
      "headline": "...", "diagnosis": "...", "action": "..." },

    "checks": [                            // one per analysis skill / audit section
      {
        "id": "value-based-bidding", "title": "...", "question": "...",
        "verdict": "ok | review | broken | n/a",
        "scorecards": [ { "label": "Spend", "value": 150000, "unit": "currency", "delta": 0.12 } ],
        "findings": [ {
          "entity": { "level": "campaign|ad_group|keyword|ad|conversion_action|segment|account", "name": "..." },
          "state": "ok | flag | raise | cut | review | broken",
          "spend": 14332,
          "evidence": { /* the signals */ },
          "recommendation": { "where": "...", "what": "...", "why": "..." }   // exact entity + plain language
        } ],
        "rollup": { "byState": { }, "topFixes": [ ] }
      }
    ]
  }
}
```

## How each document type uses it
- **audit** → `synthesis` as the opener; one section per `check` (verdict chip + scorecards +
  `findings` table with the `where/what/why` recommendation). See [`document-types/audit`](../document-types/audit/).
- **report** → `synthesis` + `checks[].scorecards` as the narrative; charts from the data.
- **dashboard** → `checks[].scorecards` + tables as widgets (+ a live `source` ref instead of a snapshot).
- **presentation** → `synthesis` → one slide per `check`.

## Resolved
- **Audit severity/verdict lives in `porter-analysis`** (each framework produces `verdict` / `state`);
  this repo **renders** the state, it never re-judges. (Was an open question.)
- **Recommendations arrive as `{where, what, why}`** — exact entity + plain language — so the audit
  is executable without the reader thinking.

## Still open
- Dashboards likely need a live `source` binding instead of a snapshot — add to `intent` when we build one.
- How much of `synthesis` a dashboard carries vs a report.
