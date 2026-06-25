# Output — Campaign Settings Audit (Location + Networks)

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../../_framework/output-contract.md`](../../../../_framework/output-contract.md). This is
the handoff to the **orchestrator**, which renders it (document / dashboard / slides / audit).
**No presentation here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's
`formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis` and notes.
- `channel_type`: `SEARCH` · `DEMAND_GEN` · `DISPLAY` · `SHOPPING` · `PERFORMANCE_MAX` · `VIDEO` · `other`
- `location_setting`: `PRESENCE` · `PRESENCE_OR_INTEREST`
- `network_flag`: `on` · `off` · `n/a`  (`n/a` = not applicable, i.e. §7 on a non-SEARCH campaign)
- `verdict` (per campaign): `ok` · `flagged`
- `flagged_toggle` (which checks failed, 0-many): `location_presence_or_interest` · `search_partners_on` · `display_on_search`
- `action`: `set_location_presence` · `turn_off_search_partners` · `turn_off_display` · `none`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "campaign-settings-audit",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD",
    "target_market": "Canada"          // supplied (account profile / user); null if not provided → §6 leak unsized
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "One sentence: how many campaigns are set wrong and the spend exposed.",
    "diagnosis": "Which toggle leaks most + where — via the wasted-spend identity (out-of-market or off-network spend).",
    "action":    "The one fix to take now — where / what / why."
  },

  // One finding per campaign. Every controlled value comes from the enums above.
  "findings": [
    {
      "entity": { "level": "campaign", "name": "Acme_Health_SEM_(HD)", "channel_type": "SEARCH" },
      "settings": {
        "location": "PRESENCE_OR_INTEREST",   // location_setting enum
        "search_partners": "on",              // network_flag enum
        "display": "on"                       // network_flag enum (n/a if channel != SEARCH)
      },
      "verdict": "flagged",                    // ok | flagged
      "flagged_toggles": ["location_presence_or_interest", "display_on_search"],  // [] when ok
      "spend": 14332,                          // 30d spend = money exposed to the misconfig
      "out_of_market_spend": 2100,             // §6 only, when the geo query ran + target_market known; else null
      "recommendation": {
        "where": "Acme_Health_SEM_(HD)",
        "what":  "Set location to only people IN your area, not people interested in it (Location options → Presence); and turn off the Display Network on this Search campaign (setting: Networks → uncheck Display).",
        "why":   "So you stop paying for clicks outside your market and keep this budget on search."
      }
    }
  ],

  // Section roll-up → the orchestrator's section summary.
  "rollup": {
    "byToggle": {                              // # campaigns flagged per toggle
      "location_presence_or_interest": 1,
      "search_partners_on": 0,
      "display_on_search": 1
    },
    "flaggedSpend": 14332,                      // total 30d spend on flagged campaigns
    "topFixes": [ /* the highest-$ recommendations, ordered by spend */ ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field uses a value from the **Enums** above — never free text. Compare the raw
  Google values **as strings** (`"PRESENCE"`, `"True"`) before mapping to the enum.
- `verdict == "ok"` only when **every applicable** check passes; `flagged_toggles` is `[]` then.
- **Scope §7 to SEARCH:** on a non-SEARCH campaign set `search_partners` / `display` to `"n/a"`
  and never add `search_partners_on` / `display_on_search` to `flagged_toggles`. §6 (location)
  applies to every channel type.
- `out_of_market_spend` is filled **only** when the §6 geo query ran **and** `meta.target_market`
  is known; otherwise `null` (the flag stands, the dollar leak is just unsized).
- Each `recommendation` names the **exact campaign** + the **exact change**, in language a
  non-technical owner can act on (`where` / `what` plain + setting in parens / `why`). See
  [`../../../../_framework/writing.md`](../../../../_framework/writing.md).
- A clean account (0 flags) is a valid result — emit it with empty `flagged_toggles` and a
  `synthesis` that states the pass.
