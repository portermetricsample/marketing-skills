# Output — Search Term Labeling

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(the "Search Term Label Matrix" table, slide, doc). **No presentation here** — emojis/tables are a
rendering concern, not the analysis output.

The per-term `tags` (brand, intent, cannibalization, the relevance **pairs**), the metrics, and
`disposition_hint` are produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). The **LLM** then fills each pair's `relevance`
verdict, resolves any `intent: null`, sets the final `recommended_action`, writes `action_detail`,
and writes `synthesis`. The wrapping `meta` is added by the assembler.

> All values below come from the **fictional** `../scripts/example.json` fixture (Acme Insurance) —
> no real account data.

## Enums (the only allowed values — REUSED from the owner skills, do not invent)
- `brand_class`: `brand` · `competitor` · `generic`  (from `brand-vs-nonbrand.md`)
- `brand_match_kind`: `exact` · `misspelling` · `null`  (how the brand/competitor token matched;
  `misspelling` = a fuzzy brand-typo match → LLM should confirm)
- `brand_contained`: `true` · `false` · `null` (null = not a brand term). `false` = a brand search
  served by a non-brand campaign → see `brand_leak[]` + the `contain_brand` action
- `confirm_reasons[]`: `brand_misspelling` · `competitor_common_word` · `maybe_geo_isolated` — the
  deterministic **edge case(s)** the LLM must adjudicate before a destructive action. Present whenever
  `needs_confirm: true`. The regex only flags these; it never decides them. (Resolving `intent: null`
  is a separate, non-destructive LLM step — not a confirm-gate.)
- `intent`: `cost` · `comparison` · `informational` · `persona` · `geo` · `transactional` · `null`
  (null = deterministic pass couldn't tell → LLM resolves)  (from `intent-discovery`)
- `relevance` (per pair): `justified` · `loose` · `leak` · `misplaced` · `brand` · `competitor` ·
  `review`  (from `relevance`)
- `pattern` (cannibalization): `same_campaign_cross_adgroup` · `cross_campaign_same_line` ·
  `cross_product`  (from `duplicates`)
- `match` / `match_type`: `EXACT` · `PHRASE` · `BROAD`
- `recommended_action`: `add_negative` · `contain_brand` · `route_to_owner` · `add_as_exact_keyword` ·
  `hand_to_content` · `brand_policy` · `keep` · `review`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "search-term-labeling",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "brand_terms_used": ["acme"],
    "competitor_terms_used": ["rival"],
    "cannibalization_engine": "ok"        // "ok" | "unavailable" (then `cannibalized` is unknown, say so)
  },

  // Executive synthesis — insight-first, rendered before any section. Exactly three strings.
  "synthesis": {
    "headline":  "One sentence: the dominant disposition + the single highest-$ action now.",
    "diagnosis": "Where the spend concentrates by tag (e.g. most $ sits on cannibalized generic terms, plus an informational cluster spending with 0 conversions).",
    "action":    "The one fix to take now — where / what / why."
  },

  // ONE card per term, sorted by cost desc. tags = the full label vector at the right grain.
  "terms": [
    {
      "term": "life insurance",
      "cost": 1730, "impressions": 10900, "clicks": 450, "conversions": 20,   // context, NOT a verdict
      "tags": {
        "brand_class": "generic",
        "brand_match_kind": null,              // exact | misspelling | null
        "brand_contained": null,               // true | false | null (only set for brand terms)
        "brand_leak": [],                      // non-brand campaigns/keywords catching a brand term (drives contain_brand)
        "intent": "transactional",            // LLM resolved this head term (was null deterministically)
        "intent_matched": [],                  // every modifier matched (nothing lost on multi-intent terms)
        "cannibalized": true,                  // TERM-level
        "intentional_segmentation": false,
        "cannibalization": {                   // null when not cannibalized
          "pattern": "same_campaign_cross_adgroup",
          "owner": { "campaign": "Acme_Life_SEM", "ad_group": "Life - Exact", "match": "EXACT", "keyword": "life insurance online" },
          "competing_keywords": ["best life insurance", "cheap life insurance", "life insurance online"],
          "negatives": [ { "campaign": "Acme_Life_SEM", "ad_group": "Best Life", "match": "PHRASE", "keyword": "best life insurance" } ],
          "review_segment": [],                // negatives that would hit a test/segment campaign → human review
          "needs_own_keyword": true            // no keyword text == the term → handoff to intent-discovery
        },
        "relevance": [                         // NESTED — one verdict per triggering keyword ((term × keyword) grain)
          { "keyword": "life insurance online", "match_type": "EXACT",  "relevance": "justified" },
          { "keyword": "best life insurance",   "match_type": "PHRASE", "relevance": "loose" },
          { "keyword": "cheap life insurance",  "match_type": "PHRASE", "relevance": "loose" }
        ]
      },
      "recommended_action": "route_to_owner",  // LLM-finalized on the framework ladder
      "action_detail": {                       // ALWAYS executable + plain (cluster rule: where/what/why)
        "where": "Acme_Life_SEM — ad groups 'Best Life' and 'Cheap Life'",
        "what":  "Add `life insurance` as an exact negative in both, so the exact keyword 'life insurance online' owns it. (Also consider adding it as its own exact keyword.)",
        "why":   "Three keywords compete for this one query; the looser two split the click/conversion signal and can show the weaker ad."
      }
    },
    {
      "term": "how much is life insurance",
      "cost": 260, "impressions": 3400, "clicks": 140, "conversions": 0,
      "tags": {
        "brand_class": "generic", "intent": "cost", "intent_matched": ["cost"],
        "cannibalized": false, "intentional_segmentation": false, "cannibalization": null,
        "relevance": [ { "keyword": "life insurance cost", "match_type": "PHRASE", "relevance": "loose" } ]
      },
      "recommended_action": "hand_to_content",
      "action_detail": {
        "where": "Content / intent-discovery",
        "what":  "Build a premium calculator landing; point an ad variation at it.",
        "why":   "3,400 impressions, 0 conversions — they want a price, not a quote form."
      }
    },
    {
      "term": "acmelfe",                       // a brand MISSPELLING leaking out of the brand campaign
      "cost": 51, "impressions": 8, "clicks": 4, "conversions": 0,
      "tags": {
        "brand_class": "brand", "brand_match_kind": "misspelling", "brand_contained": false,
        "brand_leak": [
          { "campaign": "Acme_Dental_SEM", "ad_group": "Dental Insurance - Broad", "keyword": "best dental insurance plan", "match": "BROAD" },
          { "campaign": "Acme_LifeBroadMatch_MOFU_SEM_ROAS", "ad_group": "Guaranteed", "keyword": "cheapest guaranteed life insurance", "match": "BROAD" }
        ],
        "competitor_ambiguous": false, "maybe_geo_isolated": false,
        "intent": null, "intent_matched": [], "cannibalized": false,
        "intentional_segmentation": false, "cannibalization": null,
        "relevance": [ { "keyword": "best dental insurance plan", "match_type": "BROAD", "relevance": "leak" } ]
      },
      "needs_confirm": true,                   // a misspelling candidate — the LLM confirms it IS the brand before negativing
      "confirm_reasons": ["brand_misspelling"],
      "recommended_action": "contain_brand",
      "action_detail": {
        "where": "Acme_Dental_SEM + Acme_LifeBroadMatch_…_ROAS",
        "what":  "Add `acmelfe` (and the brand token) as a phrase negative in these non-brand campaigns / a shared brand negative list, so the brand campaign owns it.",
        "why":   "A misspelling of the brand is being scooped up by broad non-brand keywords — wrong ad, and it inflates the non-brand baseline."
      }
    }
  ],

  // Section summary for reporting.
  "rollup": {
    "terms_count": 9,
    "cannibalized_count": 3,
    "byBrandClass": { "generic": 7, "competitor": 1, "brand": 1 },
    "byIntent": { "transactional": 3, "cost": 2, "comparison": 1, "persona": 1, "geo": 1, "informational": 1 },
    "byAction": { "route_to_owner": 3, "keep": 3, "hand_to_content": 1, "brand_policy": 1, "add_negative": 1 }
  }
}
```

## Rules
- `synthesis` is **exactly three strings** (`headline` / `diagnosis` / `action`). No `highlights`.
- **Respect the grain:** `brand_class` / `intent` / `cannibalized` are one value per term; `relevance`
  is a **list**, one verdict per triggering keyword. Never collapse the relevance list to one tag.
- **Reuse the enums** above verbatim — they are owned by the sibling skills. Do not invent values; if
  a sibling's enum changes, update it there and mirror here.
- `relevance` verdicts reflect **relevance only** — never derived from cost / conversions.
- `cost` / `conversions` are **context for sizing**, never a keep/cut verdict (that's `performance`).
- `recommended_action` is the LLM's roll-up on the [`framework.md`](framework.md) ladder (a `leak`
  relevance verdict overrides everything → `add_negative`).
- **`needs_confirm: true` is a hard gate.** Every flagged term is a deterministic *candidate*, not a
  verdict — the LLM MUST adjudicate each `confirm_reasons[]` (is it really the brand vs a real word;
  Canada-Life-the-brand vs generic; do the cross-geo campaigns actually compete) **before** any
  `add_negative` / `contain_brand` / `route_to_owner` is recommended. If the LLM can't resolve it,
  downgrade the action to `review` — never auto-negative an unconfirmed edge case.
- `action_detail` is always `{where, what, why}` — exact entity + plain language, no bare jargon.
- If `meta.cannibalization_engine == "unavailable"`, `cannibalized` is **unknown** (not false) — say
  so in the synthesis instead of claiming the account has no cannibalization.
- **Content only** — the human-facing layout (the matrix, the chips, the date range) is a reporting
  concern, not baked into this JSON.
- **Dashboard tags are derived, not stored.** The Search Terms page's five tags map from the rich
  fields above: `Irrelevant` = a relevance pair `== leak` (never `misplaced`/`loose`); `Branded` /
  `Competitor` from `brand_class`; `Duplicate` from `cannibalized`; `Opportunity` from
  `needs_own_keyword` / `hand_to_content`. The derivation table lives in
  [`framework.md`](framework.md) → "Dashboard tag mapping (the Search Terms page)".
