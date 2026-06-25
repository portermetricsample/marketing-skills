# Output — <Use case name>

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../_framework/output-contract.md`](../../_framework/output-contract.md). This is the handoff
to the **orchestrator**, which renders it (document / dashboard / slides / audit). **No presentation
here** — no emojis, tables, markdown, or colors; rendering is the orchestrator's `formats/*`.

## Enums (the only allowed values)
> List every controlled value the schema uses. Free text is only allowed in `synthesis` and notes.
- `<field>`: `<value>` · `<value>` · `<value>`
- `<verdict>`: `<value>` · `<value>`
- `<action>`: `<value>` · `<value>`

## Schema

```jsonc
{
  "meta": {
    "account": "<name>",
    "connector": "<connector>",
    "skill": "<skill-id>",
    "period": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "comparison": "previous-period" },
    "currency": "<ISO>"
  },

  // Canonical synthesis — EXACTLY three strings (no highlights[]). The orchestrator renders this
  // as the opener, before any section. See _framework/skill-anatomy.md "Shared contracts".
  "synthesis": {
    "headline":  "The one-line insight (the silver line).",
    "diagnosis": "Where it leaks — via the funnel identity (metric-relationships).",
    "action":    "The highest-$ fix — where / what / why."
  },

  // The skill's main finding array(s). Every controlled value comes from the enums above.
  "<entities>": [
    {
      "<id>": "<...>",
      "<verdict>": "<enum>",
      "<action>": "<enum>",
      "recommendation": { "where": "<exact entity>", "what": "<plain words (technical in parens)>", "why": "<one plain sentence>" }
    }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every controlled field uses a value from the **Enums** above — never free text.
- Each `recommendation` names the **exact entity** + the **exact change**, in language a
  non-technical owner can act on (`where` / `what` / `why`). See [`../../_framework/writing.md`](../../_framework/writing.md).
- <skill-specific output rules, e.g. flags, modes, what to do when a dimension is missing>.
