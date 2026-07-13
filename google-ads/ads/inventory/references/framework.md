# Framework — Creative Inventory (the brain)

This skill **structures**, it does not judge. The rubric below is about building one correct,
reusable graph — universal across industries — that the consumer skills then analyze.

## Source of truth: the ad arrays, not the asset view
Build the structure from each ad's `responsive_search_ad.headlines/descriptions` (≤15 H / ≤4 D —
authoritative). **Never** build it from `ad_group_ad_asset_view`: that view over-reports, returning
churned and auto-created assets (a 15-headline ad shows 40+ rows — validated live). The asset view
is used ONLY to attach per-asset metrics, joined by `(ad_id, field, text)`.

## The creative graph: two views
1. **Tree** — the *relationships*. Account → campaign → ad group → **ad** (the parent: id, name,
   type, ad_strength, final_url, suffix, segment) → its **variations**: `headlines[]` and
   `descriptions[]`, each with `text`, `pin`, `char_len`, `limit`, `perf_label`, `approval`,
   `served`, and its own `impr/clicks/conv/cost`. This is "what am I running and how is it organised".
2. **Rollup** — the *unit of copy*. Each unique `(type, text)` aggregated across every ad it
   appears in: summed metrics, `n_ads`, `n_ad_groups`, the set of `perf_labels`, `pinned_somewhere`,
   `char_len`. This is what `performance` ranks and `copy-hygiene` dedups — a headline reused in 5
   ad groups is ONE decision, not five rows.

Emit both. They are derived from the same rows; never make the consumer re-pull.

## Universal (code) vs profile (inferred)
Per [`../../../_framework/account-profile.md`](../../../_framework/account-profile.md):
**code Google's vocabulary; infer the advertiser's.**
- **Universal (always in `process.py`):** the tree/rollup join, char limits per field type
  (HEADLINE 30, DESCRIPTION 90; LONG_HEADLINE 90 / BUSINESS_NAME 25 for PMax), pin parsing,
  performance-label passthrough, DKI detection (`{Keyword:…}`/`{KeyWord:…}`), extension grouping,
  served-only filtering, and the campaign-type coverage routing.
- **Profile-dependent (optional 2nd arg):** the **segment** tag per ad group —
  `brand` (name contains a `brand_terms` token), `competitor_conquest` (contains a `competitors`
  token), else `generic`. Without a profile, `segment = "unknown"` and the model may add a
  best-effort guess marked `inferred`. The segment exists so `performance` can benchmark CTR
  *within a segment* (brand assets out-CTR acquisition assets by 5–10×; an account-wide benchmark
  is wrong).

## Rules
- **List the live ad, tag served.** The inventory shows every asset currently in each live ad
  (from the ad arrays), each tagged `served` (impr > 0) with its metrics. It does NOT drop
  zero-impression assets — an inventory must show the whole ad. The "exclude zero-impression /
  zero-spend from the math" rule is applied downstream by `performance`, on the rollup.
- **Don't judge.** No "weak", "winner", "too repetitive" here — only structure + raw numbers.
  Verdicts are the consumer skills' job.
- **Be honest about coverage.** Non-Search creative is not silently dropped — it goes in
  `coverage.not_mapped` with type, count and reason (see
  [`campaign-types.md`](campaign-types.md)).
- **Metrics are for ranking, not totals.** Per-asset metrics overlap within an ad; never sum the
  rollup back into an ad/account total.
- **Cache + reuse.** The `creative_graph` is cached per account; re-pull only when ads change.
  It is the producer artifact consumed by `performance`, `copy-hygiene`, `rewrite`.

## Synthesis (the only LLM judgment here)
Exactly three strings:
- `headline` — one sentence: how many ads / unique headlines / unique descriptions are running,
  and the coverage (e.g. "100% Search" or "Search mapped; 3 PMax campaigns not covered").
- `diagnosis` — the shape of the inventory: the spread (how concentrated copy is, e.g. one brand
  headline carrying most impressions), and how much copy is reused vs unique.
- `action` — the single most useful next lens given what's here (usually: run `performance` to
  rank, or `copy-hygiene` if reuse is high), plus any coverage gap to close.
