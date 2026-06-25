# Output — Value-Based Bidding Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis`, plain
> strategy labels, and `recommendation` prose.
- `status`: `on_value_bidding` · `eligible_not_using` · `not_eligible`
- `target_lean` (only when on tROAS): `too_high` · `too_low` · `healthy` · `verify_target`
- `volume_flag`: `sufficient` · `thin`
- `tracks_value`: `yes` · `no`
- `recommendation.action`: `switch_to_value_bidding` · `adjust_target_up` · `adjust_target_down` · `fix_value_tracking_first` · `verify_target` · `keep`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "value-based-bidding-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: the value-bidding gap and the single action (e.g. the biggest spender chases lead count, not dollars).",
    "diagnosis": "Where the money leaks — campaigns optimizing to count not value, or a target ROAS throttling spend — via the funnel identity.",
    "action":    "The highest-$ fix — where / what / why."
  },

  // One entry per campaign (the unit of reading), ranked by spend.
  "campaigns": [
    {
      "campaign": "Acme_Life_SEM_(TL)",
      "spend": 77400,
      "conversions": 230,
      "conversion_value": 119707,
      "tracks_value": "yes",                         // enum
      "strategy": "Maximize Conversion Value (target 37.2)", // plain words: resolved enum + the set target appended
      "status": "on_value_bidding",                  // enum
      "target_vs_actual": {                          // present ONLY when on a value strategy with a set target; null otherwise
        "target_roas": 37.2,
        "actual_roas": 1.55,
        "gap": "24x",
        "lean": "verify_target"                      // enum — too_high | too_low | healthy | verify_target
      },
      "volume": { "conversions": 230, "flag": "sufficient" },  // flag enum vs the 15-30 floor
      "recommendation": {                            // ALWAYS executable + plain (cluster rule)
        "action": "verify_target",                   // enum
        "where": "Acme_Life_SEM_(TL)",
        "what":  "Check the target return setting (Target ROAS 37.2 ≈ 3720%) against the real return of 1.55 — they're 24x apart, so confirm whether the target is on the wrong scale or a shared portfolio value before changing the bid.",
        "why":   "A target this far above reality usually throttles spend or signals a misconfiguration."
      }
    },
    {
      "campaign": "Acme_Health_SEM_(HD)",
      "spend": 14332,
      "conversions": 63,
      "conversion_value": 0,
      "tracks_value": "no",
      "strategy": "Maximize Conversions",
      "status": "not_eligible",
      "target_vs_actual": null,
      "volume": { "conversions": 63, "flag": "sufficient" },
      "recommendation": {
        "action": "fix_value_tracking_first",
        "where": "Acme_Health_SEM_(HD)",
        "what":  "First give its conversions a value (see Conversion Tracking, Section 2), then switch bidding to value-based (setting: Maximize Conversion Value).",
        "why":   "Today it chases the number of leads, not the leads that actually pay — and value bidding can't run without values."
      }
    }
  ],

  // Account roll-up.
  "rollup": {
    "by_status": { "on_value_bidding": 1, "eligible_not_using": 1, "not_eligible": 2 },
    "spend_by_status": { "on_value_bidding": 77400, "eligible_not_using": 2500, "not_eligible": 28632 },
    "switch_opportunities": [   // the eligible_not_using campaigns ranked by spend (where switching moves the most money)
      { "campaign": "Acme_Brand_BOFU_SEM_AO_(BR)", "spend": 2500 }
    ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field uses a value from the **Enums** above — never free text. `strategy` is the
  one allowed plain label (resolved enum + appended target).
- Each `recommendation` names the **exact campaign** + the **exact change**, in language a
  non-technical owner can act on (`where` / `what` / `why`, with the technical setting in parens).
  See [`../../../../_framework/writing.md`](../../../../_framework/writing.md) and the
  [cluster executable-finding rule](../../README.md).
- `status` reflects **bid-strategy fitness only**: `not_eligible` when `conversion_value ≈ 0` OR
  `conversions < 15`; `on_value_bidding` when strategy ∈ {`MAXIMIZE_CONVERSION_VALUE`, `TARGET_ROAS`};
  `eligible_not_using` when it tracks value + has volume but is on a non-value strategy.
- `target_vs_actual` is present **only** when the campaign is on a value strategy with a set target;
  otherwise `null`. Surface both numbers + the gap; use `verify_target` when the gap is implausible
  (unit/scale doubt) rather than asserting `too_high`/`too_low`.
- `volume.flag = thin` when `conversions < 15-30` — flag it, don't judge the target on thin volume.
- A `not_eligible` campaign with no conversion value is **correct** for a lead-gen account — the
  recommendation is `fix_value_tracking_first`, never `switch_to_value_bidding`.
