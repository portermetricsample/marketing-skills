# Output — Search Term N-gram Analysis

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). Handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders the
"N-gram Mining — Negatives & Themes". **No presentation here.**

The `waste`/`winning` bodies + `rollup` are produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). The **LLM** adds `synthesis`, adjudicates each
`needs_confirm`, and may downgrade a flagged waste n-gram to `review`.

> Values below are from the **fictional** `../scripts/example.json` fixture — no real account data.

## Enums (the only allowed values)
- `class`: `generic` · `competitor` (brand n-grams are excluded from the lists — they're defense)
- `recommended`: `add_negative` · `review` · `expand`
- `negative_match`: `phrase` · `exact`
- `confirm_reasons[]`: `broad_blast_radius` · `rides_brand_traffic` · `competitor_conquest` ·
  `has_some_conversions` — the blast-radius flag(s); present when `needs_confirm: true`.
- `account_type`: `ecommerce` · `lead_gen`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance", "connector": "google-ads", "skill": "search-term-ngrams",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "account_type": "lead_gen",            // ecommerce -> ROAS mode, lead_gen -> CPA/0-conv mode
    "total_terms": 19, "total_cost": 1073, "broad_cut_terms": 20
  },

  // Executive synthesis — exactly three strings (LLM-written).
  "synthesis": {
    "headline":  "One sentence: the biggest clean negative to add + the spend it reclaims.",
    "diagnosis": "Where waste concentrates (the recurring token + its cost across N terms), and the one theme worth expanding.",
    "action":    "The one negative to add now — the n-gram, the match type, the blast-radius note."
  },

  // WASTE — negative candidates, sorted by cost desc. From process.py.
  "waste": [
    {
      "ngram": "cheapest", "n": 1, "class": "generic",
      "cost": 125, "clicks": 65, "impressions": 800, "conversions": 0, "value": 0,
      "cpa": null, "roas": 0.0, "term_count": 3,
      "broad": false, "sample_terms": ["cheapest life insurance", "cheapest life insurance online", "cheapest life insurance canada"],
      "needs_confirm": false, "confirm_reasons": [],
      "recommended": "add_negative", "negative_match": "phrase"
    },
    {
      "ngram": "whole life", "n": 2, "class": "generic",
      "cost": 52, "clicks": 38, "impressions": 400, "conversions": 2, "value": 0,
      "cpa": 26, "roas": 0.0, "term_count": 2,
      "broad": false, "sample_terms": ["whole life insurance acme", "whole life insurance cost"],
      "needs_confirm": true, "confirm_reasons": ["rides_brand_traffic"],  // rides the brand term -> LLM confirms, downgraded to review
      "recommended": "review", "negative_match": "phrase"
    },
    {
      "ngram": "manulife", "n": 1, "class": "competitor",
      "cost": 35, "clicks": 22, "impressions": 300, "conversions": 0, "value": 0,
      "cpa": null, "roas": 0.0, "term_count": 2,
      "broad": false, "sample_terms": ["manulife life insurance"],
      "needs_confirm": true, "confirm_reasons": ["competitor_conquest"],
      "recommended": "review", "negative_match": "phrase"
    }
  ],

  // WINNING — themes to expand, sorted by conversions then efficiency.
  "winning": [
    {
      "ngram": "term life insurance", "n": 3, "class": "generic",
      "cost": 290, "clicks": 130, "impressions": 1700, "conversions": 9, "value": 0,
      "cpa": 32, "roas": 0.0, "term_count": 2,
      "sample_terms": ["term life insurance", "term life insurance quote"],
      "recommended": "expand"
    }
  ],

  "rollup": {
    "ngrams_considered": 40, "waste_count": 8, "winning_count": 3,
    "brand_ngrams": 4, "competitor_ngrams": 2,
    "waste_cost": 480, "needs_confirm_count": 2
  }
}
```

## Rules
- `synthesis` is **exactly three strings** (`headline` / `diagnosis` / `action`). No `highlights`.
- **`needs_confirm: true` is a hard gate** — a waste n-gram flagged `broad_blast_radius` /
  `rides_brand_traffic` / `competitor_conquest` / `has_some_conversions` MUST be adjudicated by the LLM
  **before** any negative; if unresolved it stays `review`, never `add_negative`.
- **Brand n-grams are never waste** — excluded from both lists; counted in `rollup.brand_ngrams`.
- `cost` / `conversions` are the aggregate across all terms carrying the n-gram (overlap across n is
  expected — do not dedupe).
- The LLM names the **useful** winning movers, not the obvious head terms (`life insurance` is not a
  "theme to expand" — you already own it).
- **Content only** — the human layout (the negatives table, the chips) is a reporting concern.
