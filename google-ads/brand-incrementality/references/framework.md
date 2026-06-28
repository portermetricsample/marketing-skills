# Framework: Branded vs Non-Branded Incrementality

## Mission
Split performance into **branded** vs **non-branded** so the advertiser judges budget and scaling on
the **non-brand (incremental)** numbers. Branded = **demand capture, not demand generation**: cheap,
ultra-high-intent, and very likely to convert with or without the ad. Blending it in **flatters** the
whole account (artificially low CPA / high ROAS) and overstates the paid demand-gen effort.

## Brand detection (two grains)

### 1. Campaign-level — the clean split (markers, NOT the brand word)
A campaign is a **brand campaign** when its name carries a **marker** (`brand`, `(br)`, `_br_`, … —
configurable `brand_campaign_markers`) or matches an explicit `brand_campaign_names` entry. **Do NOT**
classify by "the campaign name contains the brand term" — most accounts prefix **every** campaign with
the company name (`Northwind_Search_Generic`), which would mis-flag the whole account as brand. The
clean campaign split drives the headline KPIs (matches the report slide).

### 2. Search-term-level — typo-aware, to catch what naming misses
Reuse the [`labeling`](../../search-terms/labeling/) brand matcher: exact brand-token match, else a
**misspelling** of a distinctive brand token (`policym`→`policyme`, Levenshtein sim ≥ 0.80). This finds
brand demand wherever it actually served — the layer that catches what campaign naming alone misses.
Keep the matcher in sync with `labeling`.

## The split (deterministic — `process.py`)
Aggregate three buckets — **All**, **Branded** (brand campaigns), **Non-branded** (the rest) — for
spend · conversions · value, then derive **CPA** (`spend/conv`), **ROAS** (`value/spend`), conv-rate,
and conversion **share**. Compare each bucket **vs the previous period** (deltas). Auto-detect
**ecommerce** (conversion value present → lead with ROAS) vs **lead-gen** (CPA / 0-conv).

> **Excluding-branded = the demand-gen baseline to scale on** ("the incremental value Google Ads
> created"). It is the right number to judge budget on — far better than the blended total.

## The two modes
- **Mode A — no brand campaign** (`has_brand_campaign == false`). Size the **uncaptured brand demand**
  (brand search terms × their conv/spend, all currently in non-brand campaigns) and recommend a
  dedicated brand campaign — to capture it cheaply, defend the SERP, **and** remove it from the
  non-brand baseline so the demand-gen CPA is honest.
- **Mode B — brand campaign(s) exist.** Produce the split, then **reconcile leakage**: brand search
  terms (incl. typos) served by **non-brand** campaigns. Their cheap conversions sit in the non-brand
  bucket and **flatter** its CPA. Report the leaked conv/spend, the `adjusted_nonbrand_cpa` (what the
  non-brand CPA would be without them), and recommend brand negatives in the non-brand campaigns.

## The incrementality caveat (honest, but doesn't undercut the framing)
Excluding-branded is a strong **proxy**, not literal incrementality: some brand clicks *are* incremental
(competitors bid on your name), and some non-brand was going to convert anyway. The **true** incremental
number needs a **brand-holdout / geo experiment** (pause brand in some regions, measure organic pickup).
Surface this as the recommended next step — one line, the way a good slide does ("useful, but it flatters
this blended CPA") — without burying the headline.

## Edge cases → LLM-adjudicated (cluster doctrine)
A **misspelling** brand match or a **common-word competitor** is provisional — the LLM confirms before
the number drives a negative/recommendation. The thresholds are recall knobs, not verdicts.

## Reconcile against existing negatives (the wiring)
Before recommending brand negatives in non-brand campaigns (or "build a brand campaign + negative brand
elsewhere"), reconcile against the [`negatives`](../../negatives/) skill. If the account **already
negatives its brand terms** in those campaigns (live: Eastpointe already blocks `eastpointe` / `east
point country club`), the "add brand negatives" advice is **redundant** — refine to where brand is
still leaking (e.g. a conquesting campaign with no brand negative) instead of re-recommending done work.

## Boundaries
Per-term routing/relevance → the `search-terms` cluster. Full funnel KPIs → `funnel-metrics`. This skill
owns the **brand split + incrementality** read; it is the dedicated implementation of the cross-cutting
[`brand-vs-nonbrand.md`](../../../_framework/brand-vs-nonbrand.md) rule.

## Period
`last_month` (current) + the prior month for deltas, or `{date_from,date_to}` pairs of 30–90 days.
