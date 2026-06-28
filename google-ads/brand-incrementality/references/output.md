# Output — Branded vs Non-Branded Incrementality

A JSON object (canonical truth), a specialization of [`output-contract.md`](../../../../_framework/output-contract.md).
Handoff to [`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders
the "Branded vs non-branded search" page (the All / Excluding-branded toggle + donut + scorecards).
**No presentation here.**

The `split` / `leakage` / `mode_a` / `recommendations` are produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). The **LLM** writes `synthesis` (the strong
"incremental value" framing) and confirms ambiguous brand matches.

## Enums
- `mode`: `A_no_brand_campaign` · `B_split`
- `account_type`: `ecommerce` (lead with ROAS) · `lead_gen` (lead with CPA)
- each `split` bucket key: `all` · `branded` · `nonbranded`

## Schema

```jsonc
{
  "meta": {
    "account": "PolicyMe", "connector": "google-ads", "skill": "brand-incrementality",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "account_type": "ecommerce",
    "mode": "B_split", "has_brand_campaign": true, "brand_terms_used": ["policyme", "policy me"]
  },

  // Executive synthesis — exactly three strings (LLM, strong incremental framing).
  "synthesis": {
    "headline":  "One sentence: the real (non-brand) CPA/ROAS to scale on vs the flattering blended number.",
    "diagnosis": "Brand = X% of spend but Y% of value, propping the blended ROAS; the demand-gen engine runs at Z.",
    "action":    "Judge budget/scaling on the non-brand numbers; (Mode A) build a brand campaign / (Mode B) plug the leak."
  },

  // The split — All / Branded / Non-branded, each with KPIs + Δ vs previous.
  "split": {
    "all":        { "spend": 158876, "conversions": 612.9, "value": 298672, "cpa": 259.22, "roas": 1.88, "conv_rate": 0.05, "share_of_conv": 1.0,    "deltas": { "spend": 0.07, "conversions": 0.04, "cpa": 0.01, "roas": -0.02 } },
    "branded":    { "spend": 2546,   "conversions": 65.6,  "value": 95563,  "cpa": 38.79,  "roas": 37.54,"conv_rate": 0.017,"share_of_conv": 0.107,  "deltas": { } },
    "nonbranded": { "spend": 156330, "conversions": 547.3, "value": 203109, "cpa": 285.66, "roas": 1.3,  "conv_rate": 0.04, "share_of_conv": 0.893,  "deltas": { } }
  },
  "brand_campaigns": ["SG_Brand_BOFU_SEM_AO_(BR)"],

  // Mode B only — brand leaking into non-brand campaigns (flatters the non-brand CPA). null if none/Mode A.
  "leakage": {
    "brand_conversions_in_nonbrand": 28, "brand_spend_in_nonbrand": 550,
    "share_of_nonbrand_conv": 0.025, "adjusted_nonbrand_cpa": 31.35,
    "sample_terms": ["policym", "policyne"]
  },

  // Mode A only — uncaptured brand demand running through non-brand (no brand campaign yet). null in Mode B.
  "mode_a": {
    "uncaptured_brand_conversions": 16.5, "uncaptured_brand_spend": 341,
    "sample_terms": ["eastpointe country club", "east point country club"],
    "recommend_create_brand_campaign": true
  },

  "recommendations": [ { "where": "...", "what": "...", "why": "..." } ],
  "incrementality_note": "Excluding-branded is the demand-gen baseline to scale on; the TRUE incremental number needs a brand-holdout / geo experiment."
}
```

## Rules
- `synthesis` is **exactly three strings**. Lead with the **non-brand** (incremental) number as the one
  to scale on — the strong framing — with the holdout caveat as a single supporting line.
- **Baseline on NON-BRAND** ([`brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)) — never
  hold up the brand campaign's CPA/ROAS as a model; its efficiency is *expected*, not exemplary.
- `mode` drives which block is populated: Mode A → `mode_a`; Mode B → `leakage` (may be null if clean).
- A `misspelling` brand match feeding `leakage`/`mode_a` is **provisional** — the LLM confirms before it
  drives a negative recommendation.
- ecommerce → lead with `roas`; lead-gen → lead with `cpa`.
- **Content only** — the toggle / donut / scorecards are a reporting concern.
