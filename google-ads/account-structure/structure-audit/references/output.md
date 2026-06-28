# Output — Structure Audit

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(table, slide, doc, audit section). **No presentation here** — emojis/severity-colors/tables
are a rendering concern, not the analysis output.

The shape is **derived from what [`../scripts/process.py`](../scripts/process.py) actually
produces** (`convention` + `findings` + `theme_suspects`) plus the LLM's confirmed theme
verdicts, folded into the common envelope. `process.py` raw keys map as follows:
`convention` → `meta.convention` + `synthesis`; each `findings[]` item (`check`/`severity`/
`where`/`detail`/`fix`) → a `findings[]` entry under the matching `checks[]` group; each
confirmed `theme_suspects[]` item → a finding under the `theme_alignment` check; the
discarded suspects → `skipped`.

## Enums (the only allowed values)
- `check` (the section id — one per the 4 checks + the deterministic sub-checks process.py emits):
  - `theme_alignment` — check 1 (the LLM-judged, from confirmed `theme_suspects`).
  - `match_type_in_name` — check 2 (ad-group name says Broad/Phrase/Exact vs real match type).
  - `name_vs_config` — check 2 (campaign name says ROAS/Demandgen/SEM vs real bidding/channel).
  - `naming_schemes` — check 3 (multiple naming schemes coexist).
  - `generic_ad_group_names` — check 3 (generic/default ad-group names like `Ad group 1`).
  - `redundancy_within_campaign` — check 4 (same keyword across ad groups of one campaign).
  - `redundancy_cross_product` — check 4 (same keyword across campaigns of different product code).
- `severity`: `high` · `medium` · `low` *(process.py's `sev_rank` order — sorted High→Low)*.
- `verdict` (section-level roll-up of severity): `ok` · `review` · `broken` · `n/a`.
- `state` (per-finding): `ok` · `flag` · `move` · `rename` · `consolidate` · `split` · `review`.
- `match_type`: `EXACT` · `PHRASE` · `BROAD`.
- `channel_type`: `SEARCH` · `PMAX` · `SHOPPING` · `DEMAND_GEN` · `DISPLAY` · `VIDEO` · `other`.

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "structure-audit",
    "period": { "from": "2026-03-23", "to": "2026-06-21" },
    "profile_used": true,            // false → cross-product theme check ran in degraded generic mode
    "coverage": "paginated",         // "top-by-impressions" (single 5000-row query) | "paginated" (per-campaign, 100%)

    // Phase-1 inferred convention (from process.py "convention"). Confirms the skill read the structure.
    "convention": {
      "campaigns": 20,
      "ad_groups": 139,
      "naming_schemes": { "Acme": 11, "SG": 7, "KSM": 2 },   // scheme prefix -> count
      "channels": ["SEARCH", "DEMAND_GEN"],
      "biddings": ["MAXIMIZE_CONVERSIONS", "MAXIMIZE_CONVERSION_VALUE", "TARGET_CPA"],
      "product_codes": ["TL", "HD", "HA"]                        // parenthesis codes seen in names
    }
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: how the account is organized + the single biggest structural break.",
    "diagnosis": "How many naming schemes coexist / which checks apply (the inferred-convention summary), plus the worst structural break (e.g. a 'Broad' ad group that is mostly phrase, or a campaign with default names + mass duplication).",
    "action":    "The one specific fix to take now — where / what / why."
  },

  // One entry per check that produced findings. Ordered by the worst severity inside it.
  "checks": [
    {
      "check": "match_type_in_name",
      "title": "Match type in the ad-group name",
      "question": "Do the ad group's keywords match the match type its name promises?",
      "verdict": "broken",                 // section roll-up: ok | review | broken | n/a
      "findings": [
        {
          "entity": { "level": "ad_group", "name": "Acme_Life_MOFU / Converting KW Broad" },
          "check": "match_type_in_name",
          "severity": "high",              // from process.py
          "state": "split",
          "detail": "75/143 keywords (52%) are not [BROAD]",   // process.py "detail"
          "recommendation": {              // ALWAYS {where, what, why} — executable + plain
            "where": "Acme_Life_MOFU / Converting KW Broad",
            "what":  "Split out the keywords of the correct match, or rename the ad group.",
            "why":   "The name says Broad but most keywords are phrase — the name lies about the contents."
          }
        }
      ],
      "rollup": { "byState": { "split": 1 } }
    },
    {
      "check": "theme_alignment",
      "title": "Theme alignment (keyword ↔ ad group ↔ campaign)",
      "question": "Does each keyword's product/theme belong to its ad group and campaign?",
      "verdict": "review",
      "findings": [
        {
          "entity": { "level": "keyword", "name": "health insurance" },
          "check": "theme_alignment",
          "severity": "low",
          "state": "move",
          "detail": "Keyword of family 'health(HA)' inside campaign of family 'dental(HD)'.",
          "recommendation": {
            "where": "Acme_Dental_SEM_(HD) / <ad group>",
            "what":  "Move the keyword to the correct product ad group/campaign.",
            "why":   "A health keyword in the dental campaign splits intent and muddies the theme."
          }
        }
      ],
      "rollup": { "byState": { "move": 1 } }
    }
  ],

  // Redundancies that are intentional BY DESIGN (same base name + a varying segment suffix).
  // Reported so the reader sees they were considered and deliberately NOT flagged.
  "skipped": [
    {
      "reason": "intentional",
      "detail": "'life insurance canada' across Embedded 45-54 / 55-64 / 65+ — same base name + age suffix, by design."
    }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (the
  inferred-convention summary + the worst structural break), `action` (the one fix to take now).
  No `highlights`. The inferred-convention summary (Phase 1) lives in `meta.convention` and is
  echoed in `diagnosis`.
- Every `findings[]` item carries a `severity` (from `process.py`) and a `state` from the enum
  — never free text. `recommendation` is always `{where, what, why}` (exact entity + plain
  language — no bare jargon).
- **Severity is structural impact only** — keywords + ad groups touched, whether it breaks the
  account's own convention. Never from bids / budgets / copy / Quality Score (out of scope).
- **Group similar findings** — "campaign X: N keywords duplicated across M ad groups" is ONE
  finding, not N. Redundancy is reported **concentrated by hotspot**, never per pair.
- **Intentional redundancy → `skipped`**, not a finding. Detected by pattern (common base +
  variable segment suffix: audience/age/geo/test/landing-split), NOT a fixed token list.
- The `theme_alignment` check carries **only the LLM-confirmed** `theme_suspects`; discarded
  suspects are dropped (or noted in `skipped`). All other checks come pre-resolved from
  `process.py`.
- `checks[]` is **sorted by severity** (High → Medium → Low across the merged findings), per the
  fixed output order.
