# Output — Structure Map

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(the account-structure map, dashboard filters, a doc). **No presentation here** —
emojis/tables are a rendering concern, not the analysis output.

This skill is special: besides the human-facing **structure map**, it emits the
**`account_profile`** — the cached, per-account config that every OTHER Google Ads skill's
`process.py` consumes as its optional profile argument. **structure-map is the producer.** See
[`../../../../_framework/account-profile.md`](../../../../_framework/account-profile.md) for the
profile contract.

## Enums (the only allowed values)
- `confidence`: `confirmed` · `inferred` · `ambiguous`
  - `confirmed` — clear parse, validated against the real dimension, OR resolved by the ad
    groups/keywords below it.
  - `inferred` — reasonable, validated via site research (mark "from site").
  - `ambiguous` — undecidable after checking lower levels (e.g. `AO`, `Embedded`) → team dictionary.
- `dimension` (the segmentation-parameter keys): `program` · `product_line` · `product_code` ·
  `type` · `funnel` · `match` · `bidding` · `audience` · `geo` · `test`
- `campaign_type` (validated vs `advertising_channel_type`): `search` · `demand_gen` ·
  `performance_max` · `shopping` · `video` · `other`
- `match_type`: `EXACT` · `PHRASE` · `BROAD` · `mixed` (an ad group/campaign that mixes them)
- `validated` (was the token cross-checked against real data): `true` · `false` (only
  type / match / bidding can be `true`)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "account_id": "<customer_id>-<login_customer_id>",
    "connector": "google-ads",
    "skill": "google-ads-structure-map",
    "period": { "from": "2026-05-01", "to": "2026-05-31" }
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: the account's grammar + the main segmentation axes it exposes.",
    "diagnosis": "The inferred grammar in one line (the token pattern) + the richest / most useful segmentation axis to slice by.",
    "action":    "What stayed ambiguous and needs the team dictionary — where / what / why."
  },

  // ── 1) The human-facing structure map ───────────────────────────────────────
  "structure_map": {
    // The inferred grammar (process.py.grammar enriched by the LLM into a one-line pattern).
    "grammar": {
      "pattern": "<Program>_<Product>[mods]_[Funnel]_<Type>_[Strategy]_(<Code>)_[Test]",
      "separators": ["_", "-", "|"],   // process.py.grammar.separators
      "has_code_parens": true          // process.py.grammar.has_code_parens
    },

    // Dimension -> distinct values (process.py.segmentation_params, LLM-labeled & validated).
    "segmentation_params": [
      { "dimension": "program",      "values": ["Acme", "SG"], "validated": false },
      { "dimension": "product_line", "values": ["Life", "BestLife", "Health", "Dental", "Auto", "Home", "Bundle", "Brand"], "validated": false },
      { "dimension": "product_code", "values": ["TL", "HD", "HA", "BR"], "validated": false },
      { "dimension": "type",         "values": ["Search", "Demand Gen"], "validated": true },
      { "dimension": "funnel",       "values": ["MOFU", "BOFU", "TOFU"], "validated": false },
      { "dimension": "match",        "values": ["Broad", "Phrase", "Exact"], "validated": true },
      { "dimension": "bidding",      "values": ["MaxConvValue", "MaxConversions", "TargetImpressionShare"], "validated": true },
      { "dimension": "audience",     "values": ["45-54", "55-64", "65+", "Embedded"], "validated": false },
      { "dimension": "test",         "values": ["evergreen", "Test", "ROAS Bidding Test", "Split"], "validated": false }
    ],

    // Per-campaign decode: each campaign -> its dimensions, each token carrying a confidence.
    "campaigns": [
      {
        "name": "Acme_LifeBroadMatch_MOFU_SEM_ROAS_(TL)_Test",
        "tokens": {
          "program":      { "value": "Acme", "confidence": "confirmed", "validated": false },
          "product_line": { "value": "LifeBroadMatch -> Life", "confidence": "confirmed", "validated": false },
          "product_code": { "value": "TL", "confidence": "inferred", "validated": false, "note": "Term Life — from site" },
          "type":         { "value": "Search", "confidence": "confirmed", "validated": true },
          "funnel":       { "value": "MOFU", "confidence": "confirmed", "validated": false },
          "match":        { "value": "BROAD", "confidence": "confirmed", "validated": true },
          "bidding":      { "value": "MaxConvValue", "confidence": "confirmed", "validated": true },
          "test":         { "value": "Test", "confidence": "confirmed", "validated": false }
        }
      }
    ],

    // Ad-group sub-segment dimension (process.py.ad_group_subsegments: label -> count).
    "ad_group_subsegments": [
      { "label": "Seniors", "count": 9 },
      { "label": "GuaranteedIssue", "count": 4 }
    ],

    // Tokens with no clear meaning + granularity notes (process.py.ambiguous_tokens, triaged).
    "ambiguous": [
      {
        "token": "AO",
        "seen_in": ["several SEM campaigns"],   // process.py count -> the LLM names where
        "possible_meanings": ["Audience Optimized?"],
        "confidence": "ambiguous",
        "resolution": "ask the team — internal code, not on the public site"
      }
    ]
  },

  // ── 2) The account_profile (THIS skill is the producer) ──────────────────────
  // Cached per account; downstream skills load it as their optional process.py argument.
  // Schema mirrors _framework/account-profile.md exactly.
  "account_profile": {
    "account_id": "<customer_id>-<login_customer_id>",
    "naming": {
      "separators": ["_", "-", "|", "()", "[]"],
      "grammar": "<one-line description of the inferred token pattern>",
      "schemes": { "Acme_": "16 campaigns", "SG_": "4 campaigns" }
    },
    "products": {
      "code_of_line":    { "life": "TL", "health": "HD", "dental": "HD", "auto": "HA" },
      "line_of_word":    { "life": "life", "bestlife": "life", "lifebroadmatch": "life", "dental": "dental" },
      "keyword_lexicon": { "health": "health", "car": "auto", "dental": "dental" }
    },
    "brand_terms": ["acme"],
    "competitors": ["<competitor>"],
    "intentional_variant_rule": "same base name + a varying segment suffix (audience/age/geo/test)",
    "ambiguous_tokens": ["AO", "Embedded"]
  }
}
```

## How the schema maps to `process.py` output
The deterministic core ([`../scripts/process.py`](../scripts/process.py)) returns these keys;
the LLM enriches them into the structure above — it does NOT re-decode:

| `process.py` key | Lands in |
|------------------|----------|
| `grammar` (`separators`, `has_code_parens`) | `structure_map.grammar` (+ LLM `pattern`) |
| `segmentation_params` (dimension → set) | `structure_map.segmentation_params` (+ LLM `validated` flags) |
| `code_to_lines` (family → lines) | `account_profile.products.code_of_line` / `line_of_word` |
| `ad_group_subsegments` (label → count) | `structure_map.ad_group_subsegments` |
| `ambiguous_tokens` (token → count) | `structure_map.ambiguous` (LLM triages) + `account_profile.ambiguous_tokens` |
| `note_for_llm` | instruction only (not emitted) |

The LLM additionally fills, from judgment/research (NOT from `process.py`):
`account_profile.products.keyword_lexicon`, `account_profile.brand_terms`,
`account_profile.competitors`, and resolves the resolvable `ambiguous_tokens`.

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (the inferred
  grammar + richest segmentation axis), `action` (what stayed ambiguous and needs the team
  dictionary). No `highlights`.
- Every decoded token in `structure_map.campaigns[].tokens` carries a `confidence` from the
  enum — never free text for severity.
- `validated: true` is allowed ONLY for tokens cross-checked against real data
  (type / match / bidding). Everything else is `false`.
- **Never invent a meaning for an internal code.** Undecidable tokens stay `ambiguous` with a
  `resolution` of "ask the team" and appear in `account_profile.ambiguous_tokens`.
- The parentheses **code → product word** is modeled as a 2-level **family→line hierarchy**
  (`code_to_lines` / `code_of_line`), NOT as "inconsistent granularity".
- This skill is the **producer** of `account_profile`; emit it complete and self-consistent so
  downstream `process.py` scripts can load it as their optional profile argument. Without it,
  those scripts run in degraded generic mode — so a partial-but-honest profile beats a
  wrong-but-complete one.
- **Content only** — no HTML/colors/layout here; that's reporting + design-system.
