# Output — Naming Convention

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the **insumo** a
downstream AI consumes — [`porter-reporting`](https://github.com/portermetricsample/porter-reporting)
renders it (a naming guide, a dashboard filter spec, a custom-field definition). **No
presentation here** — emojis/tables/colors are a rendering concern, not the analysis output.

This skill *generates* the standard; it does not decode the current account (that is
`structure-map`) and does not judge it (that is `structure-audit`). The whole payload is a
**prescription**, produced by the LLM per account — there is no `process.py` output to mirror.

## Enums (the only allowed values)
- `level`: `campaign` · `ad_group`.
- `requirement` (is the slot mandatory in a well-formed name): `required` · `optional`.
- `confidence` (how sure the standard is about a slot / value):
  - `confirmed` — the account clearly and consistently uses it, and/or validated against real data.
  - `inferred` — reasonable, from the dominant scheme or site research (mark "from site").
  - `ambiguous` — an internal code the model can't resolve → `needs_dictionary`, never guessed.
- `source` (where the slot came from): `dominant_scheme` (kept from the account) · `gap_filled`
  (added best-practice default) · `renamed_variant` (canonicalized from messy variants).
- `validated` (was the slot's vocabulary cross-checked against real data): `true` · `false`
  (only `type` / `match` / `bidding` can be `true`).

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "account_id": "<customer_id>-<login_customer_id>",
    "connector": "google-ads",
    "skill": "google-ads-naming-convention",
    "period": { "from": "2026-06-01", "to": "2026-06-30" },
    "engine": "llm-inferred",              // explicit: no regex / process.py — inferred fresh per run
    "based_on": "account's dominant scheme",
    "profile_used": true,                  // false → inferred from the raw names alone (no structure-map profile)
    "schemes_seen": { "Acme_": "16 campaigns", "SG_": "4 campaigns" }  // majority = base; minority = a note
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "The convention in one line: the campaign + ad-group grammar the account should follow.",
    "diagnosis": "The dominant scheme it was built from + the single biggest gap the standard fills (e.g. funnel stage made required).",
    "action":    "What the team must confirm before adopting it — usually the ambiguous internal codes to define."
  },

  // ── The generated standard (the insumo) ──────────────────────────────────────
  "convention": {
    "separators": { "primary": "_", "also_seen": ["-", "|", "()", "[]"] },

    // One grammar per level, each with its ordered slots.
    "levels": [
      {
        "level": "campaign",
        "grammar": "Program_Product_Funnel_Type_Bidding_(Code)[_Test]",
        "slots": [
          {
            "slot": "program",
            "requirement": "required",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": false,
            "controlled_values": ["Acme", "SG"],
            "canonicalize": {},                       // seen variant -> canonical value
            "note": "Business/program prefix."
          },
          {
            "slot": "product",
            "requirement": "required",
            "source": "renamed_variant",
            "confidence": "confirmed",
            "validated": false,
            "controlled_values": ["Life", "Health", "Dental", "Auto", "Home", "Bundle", "Brand"],
            "canonicalize": { "LifeBroadMatch": "Life", "bestlife": "Life" },
            "note": "One canonical word per product line."
          },
          {
            "slot": "funnel",
            "requirement": "required",
            "source": "gap_filled",
            "confidence": "inferred",
            "validated": false,
            "controlled_values": ["TOFU", "MOFU", "BOFU"],
            "canonicalize": {},
            "note": "Present on only ~half the campaigns today; the convention makes it required so every campaign declares its stage."
          },
          {
            "slot": "type",
            "requirement": "required",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": true,
            "controlled_values": ["Search", "DemandGen"],
            "canonicalize": { "SEM": "Search" },
            "note": "Validated vs campaign_advertising_channel_type."
          },
          {
            "slot": "bidding",
            "requirement": "optional",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": true,
            "controlled_values": ["MaxConvValue", "MaxConversions", "TargetIS"],
            "canonicalize": { "ROAS": "MaxConvValue" },
            "note": "Validated vs campaign_bidding_strategy_type."
          },
          {
            "slot": "code",
            "requirement": "optional",
            "source": "dominant_scheme",
            "confidence": "ambiguous",
            "validated": false,
            "controlled_values": ["(TL)", "(HD)", "(HA)", "(BR)"],
            "canonicalize": {},
            "note": "Parenthesis product-family code; some meanings need the team dictionary (see needs_dictionary)."
          },
          {
            "slot": "test",
            "requirement": "optional",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": false,
            "controlled_values": ["Test", "Split"],
            "canonicalize": {},
            "note": "Absent = evergreen."
          }
        ]
      },
      {
        "level": "ad_group",
        "grammar": "PersonaOrTheme[ - Match]",
        "slots": [
          {
            "slot": "persona_or_theme",
            "requirement": "required",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": false,
            "controlled_values": ["Seniors", "Families", "Couples", "Self-Employed", "GuaranteedIssue", "..."],
            "canonicalize": { "Ad group 1": "<forbidden — must be thematic>" },
            "note": "The ad group's sub-segment; generic/default names are not allowed."
          },
          {
            "slot": "match",
            "requirement": "optional",
            "source": "dominant_scheme",
            "confidence": "confirmed",
            "validated": true,
            "controlled_values": ["Broad", "Phrase", "Exact"],
            "canonicalize": { "BroadMatch": "Broad" },
            "note": "Include only if the ad group isolates one match type; must equal the real match type."
          }
        ]
      }
    ],

    // The rules that bind the two levels into one logic. Plain language.
    "coherence_rules": [
      "An ad group's persona/theme must sit inside its campaign's product line — no ad group introduces a product its campaign doesn't carry.",
      "The ad group does not restate a dimension the campaign already fixes (if the campaign carries (TL), the ad group omits the product code).",
      "A `- Match` token in the ad-group name must equal the ad group's real match type.",
      "A Type/Bidding token in the campaign name must equal the real channel/bidding strategy."
    ],

    // One well-formed name at each level, per the grammar above.
    "example": {
      "campaign": "Acme_Life_MOFU_Search_MaxConvValue_(TL)",
      "ad_group": "Seniors - Broad"
    },

    // Internal codes / tokens the model could not resolve — the team must define them.
    // They are NEVER baked into a required slot as if their meaning were known.
    "needs_dictionary": [
      { "token": "AO", "seen_in": "several Search campaigns", "possible_meaning": "Audience Optimized?", "resolution": "ask the team — internal code, not on the public site" },
      { "token": "Embedded", "seen_in": "age-segment campaigns", "possible_meaning": null, "resolution": "ask the team" }
    ]
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (the convention in one line),
  `diagnosis` (the dominant scheme it was built from + the biggest gap filled), `action` (what
  the team must confirm before adopting it). No `highlights`.
- `meta.engine` is always `"llm-inferred"` and `meta.based_on` names the source — this skill has
  **no `process.py`**; the payload is the model's, produced fresh per run.
- Every slot carries `requirement`, `source`, `confidence` and `validated` from the enums —
  never free text.
- `validated: true` is allowed ONLY for slots cross-checked against real data
  (`type` / `match` / `bidding`). Everything else is `false`.
- **Canonicalize, don't multiply.** `canonicalize` maps the account's messy variants to the one
  value the convention keeps; the `controlled_values` list holds only the canonical values.
- **Coherence is mandatory output.** Always emit `coherence_rules` — a campaign standard and an
  ad-group standard that don't reference each other is an incomplete deliverable.
- **Never invent a meaning for an internal code.** Unresolved tokens go to `needs_dictionary`
  and are never placed in a `required` slot.
- **No rename map, no consistency verdict.** Do not emit new names for existing entities and do
  not flag current inconsistencies — those are future work / `structure-audit`.
- **Content only** — no HTML/colors/layout here; that's reporting + design-system.
