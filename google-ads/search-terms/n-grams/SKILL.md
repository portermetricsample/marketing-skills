---
name: search-term-ngrams
description: N-gram analysis of a Google Ads search-terms report (the Brainlabs search-query-mining method). Breaks every search term into 1/2/3-grams (single words, two- and three-word phrases), adds up the cost / clicks / conversions / value of every term that contains each n-gram, and surfaces (a) WASTE n-grams — words/phrases that spend without paying back → list-level negative-keyword candidates, and (b) WINNING n-grams — strong-converting themes → expand into keywords / ad groups. Use whenever the user wants n-gram or "n gram" analysis, search-term word/phrase mining, bulk/list-level negative keywords, "which words waste my budget", recurring-token waste, theme discovery from search terms, or to find one negative that kills many bad terms. Token/phrase-level aggregate ONLY — single term↔keyword relevance → relevance; per-term keep/cut → performance; cannibalization → term-routing.
---

# Search Term N-gram Analysis (waste + theme mining)

## Goal (job-to-be-done)
Mine the search-terms report at the **word/phrase level**. A single search term rarely has enough
volume to judge ("life insurance jobs", 1 click, $0.40 — noise). But the same token across **many**
terms aggregates into a clear signal: `jobs` across 30 terms = $90, 0 conversions → one negative that
blocks them all. Conversely, a strong-converting token = a theme to build out. The output is two
ranked lists: **negatives to add** and **themes to expand**.

- **Who:** media buyer / PPC manager. **When:** recurring search-terms hygiene + expansion.
- **Decision it drives:** which **list-level negatives** to add (one negative, many bad terms) and
  which **themes** to expand into keywords / ad groups.
- **The differentiator:** it aggregates the **long tail** — patterns invisible at the single-term
  level become the highest-leverage moves in the account.

## Scope
- ✅ **1/2/3-gram aggregation** of cost/clicks/conversions/value across all terms; waste + winning
  n-grams with example terms; brand/non-brand separation; the **blast-radius** safety checks.
- ❌ **Single term↔keyword relevance** → [`relevance`](../relevance/). ❌ **Cannibalization** →
  [`term-routing`](../term-routing/). ❌ **Per-term keep/cut verdict** → `performance`. ❌ **Intent/
  asset ideas** → [`intent-discovery`](../intent-discovery/). ❌ It does **NOT** auto-apply negatives.
- **Edge cases are LLM-adjudicated** (the cluster doctrine): a waste n-gram that is **broad**
  (load-bearing), **rides brand traffic**, is a **competitor** token, or has **some conversions** is
  flagged `needs_confirm` and must be confirmed by the LLM **before** its negative is recommended.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the single full-report query.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — n-gram construction, the waste/winning rules, the blast-radius guards.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) + [`scripts/query.json`](scripts/query.json) — the aggregator. [`scripts/example.json`](scripts/example.json) + [`scripts/example.context.json`](scripts/example.context.json) are a **fictional** fixture.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** the **whole** search-terms report (term + impressions/clicks/cost/conversions/value) — pull
a high limit, the long tail is the point. Plus business context: `brand_terms`, `competitor_terms`,
and (optional) `target_cpa` / `roas_breakeven` to set the waste bar. Auto-detects ecommerce (judge on
ROAS) vs lead-gen (judge on CPA / 0-conversions) from whether conversion value is present.

**Process (deterministic — `process.py`):** normalize each term (lowercase, strip punctuation), split
into 1/2/3-grams (drop stop words for unigrams, keep them inside bigrams/trigrams), attribute each
term's full metrics to each of its n-grams, aggregate, and bucket: **brand** (excluded — defense),
**winning** (expand), **waste** (negative candidate). Each waste candidate gets its blast-radius
flags (`broad_blast_radius` / `rides_brand_traffic` / `competitor_conquest` / `has_some_conversions`)
→ `needs_confirm`.

**LLM step:** write the 3-string `synthesis`; **adjudicate** every `needs_confirm` waste n-gram before
recommending its negative (a flagged one downgrades to `review`); sanity-check that "winning" n-grams
aren't just the brand head terms you already own.

**Emit** the JSON in [`references/output.md`](references/output.md): `synthesis` + `waste[]` +
`winning[]` + `rollup`. A renderer turns it into the human "N-gram Mining — Negatives & Themes".
Emit **pure data** — no emojis/tables.

> **Voice:** write narrative lines per [`_framework/writing.md`](../../../_framework/writing.md).

## Example (illustrative — FICTIONAL Acme Insurance, see [`scripts/example.json`](scripts/example.json); NOT rules)
- **Clean waste:** `cheapest` and `free` across several terms → real spend, 0 conversions, not brand →
  **add_negative** (phrase).
- **Blast-radius (do NOT auto-negative):** `whole life` rides on the brand term `whole life insurance
  acme` → `rides_brand_traffic` → **review**. `insurance` is load-bearing (most terms) → `broad`.
- **Competitor:** `manulife` → 0 conv but a conquest decision, not junk → `competitor_conquest` → review.
- **Winning:** `term life insurance` converts well → a theme to expand (its own ad group / keywords).
