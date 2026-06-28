# Output — Spend Allocation Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is the
handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No
presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis` and `recommendation`.
- `verdict`: `raise` · `cut` · `fix_first` · `fine`
- `efficiency`: `better` · `worse` · `on_par` · `no_value`
- `cap`: `budget` · `rank` · `none`
- `efficiency_basis`: `roas` · `cpa`
- `entity_level`: `campaign` · `ad_group`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "spend-allocation-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: are the top spenders delivering + the single clearest budget move.",
    "diagnosis": "Where the money leaks vs where it's capped — via the funnel identity (metric-relationships).",
    "action":    "The net reallocation — cut whom, fund whom — where / what / why."
  },

  // The baseline the 2×2 compares each campaign against (account-weighted).
  "baseline": {
    "efficiency_basis": "roas",        // roas | cpa — the account-level branch
    "roas": 1.88,                      // present when efficiency_basis = roas
    "cpa": null,                       // present when efficiency_basis = cpa
    "tracks_value": true               // false → whole account judged on CPA
  },

  // One entry per campaign (the unit of allocation). Ad groups nested only when a within-campaign shift is named.
  "campaigns": [
    {
      "entity_level": "campaign",
      "campaign": "Acme_LifeBroadMatch_ROAS",
      "spend": 18242,                  // for ranking the raise/cut list by dollars
      "conversions": 96,
      "conversions_value": 52354,
      "efficiency_basis": "roas",      // roas | cpa — which branch judged THIS campaign
      "roas": 2.87,
      "cpa": null,
      "efficiency": "better",          // vs baseline (enum)
      "budget_lost_is": 0.188,         // search_budget_lost_impression_share (overall)
      "rank_lost_is": 0.04,            // search_rank_lost_impression_share (overall)
      "cap": "budget",                 // which cap dominates (enum) → budget justifies a raise; rank does not
      "verdict": "raise",              // enum
      "recommendation": {              // ALWAYS executable + plain (cluster rule)
        "where": "Acme_LifeBroadMatch_ROAS",
        "what":  "Raise the daily budget (best return in the account, and it's losing ~19% of impressions because budget runs out).",
        "why":   "There's proven demand it can't capture today — more budget buys more of your most profitable traffic."
      },
      "ad_groups": []                  // optional — only when the fix is a within-campaign shift
    },
    {
      "entity_level": "campaign",
      "campaign": "Acme_Health_SEM_(HD)",
      "spend": 14332,
      "conversions": 63,
      "conversions_value": 0,
      "efficiency_basis": "cpa",       // value ≈ 0 → judged on CPA, not ROAS
      "roas": null,
      "cpa": 227.5,
      "efficiency": "no_value",        // can't ROAS-judge — value not tracked
      "budget_lost_is": 0.183,
      "rank_lost_is": 0.02,
      "cap": "budget",
      "verdict": "fix_first",          // capped, but the real problem is value tracking
      "recommendation": {
        "where": "Acme_Health_SEM_(HD)",
        "what":  "Before adding budget, give its conversions a value so we can see real return (this is a Conversion Tracking fix).",
        "why":   "It looks like it earns $0 only because value isn't tracked — raising budget would just scale a number we can't read."
      },
      "ad_groups": []
    }
  ],

  // The money roll-up the synthesis is built from.
  "rollup": {
    "top_raises":  [ /* campaigns with verdict raise, ordered by budget_lost_is × spend */ ],
    "top_cuts":    [ /* campaigns with verdict cut, ordered by wasted spend */ ],
    "reallocation_move": "Shift budget from Auto/Bundle/Home (~$7k at ~0 ROAS) to Acme_LifeBroadMatch_ROAS (best ROAS, budget-capped)."
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field (`verdict`, `efficiency`, `cap`, `efficiency_basis`, `entity_level`) uses a
  value from the **Enums** above — never free text.
- `verdict` follows the 2×2: `raise` = `better` efficiency **and** `cap: budget`; `cut` = high spend
  **and** `worse`; `fix_first` = `cap: budget` **but** `worse`/`no_value`; `fine` = `better` and not
  budget-capped (or loss is rank).
- **A `rank` cap is never a `raise`.** When `cap: rank`, more budget won't help — verdict is `fine`
  (or fix-first), and the recommendation points at bids/QS, not budget.
- **No-value branch:** when the account (or a campaign) has `conversions_value ≈ 0`, set
  `efficiency_basis: cpa` and judge on CPA; never label a no-value campaign `worse` on ROAS.
- Each `recommendation` names the **exact entity** + the **exact change**, in language a
  non-technical owner can act on (`where` / `what` / `why`). Budget changes are **campaign-level**;
  an ad-group fix is a bids/targets shift inside its campaign — say so. See
  [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
- **Thin volume:** annotate (e.g. a `note`) and do not act on noise — don't raise/cut on a handful of conversions.
