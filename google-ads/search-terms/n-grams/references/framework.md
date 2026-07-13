# Framework: Search Term N-gram Analysis

## Mission (a single job)
Aggregate the search-terms report by **n-gram** (word / phrase), then surface the words/phrases worth
a **list-level negative** (waste) and the ones worth **expanding** (winning). It is the **Brainlabs
search-query-mining** method: a token that is noise on any one term becomes a clear signal across
many.

## The method (deterministic — `process.py`)
1. **Normalize** each search term: lowercase, strip punctuation → words.
2. **Build n-grams** for n = 1, 2, 3: every contiguous run of n words. **Unigrams drop stop words**
   (`the`, `for`, `to`, `my`…) — meaningless alone; **bigrams/trigrams keep them** (`for free`,
   `near me`, `how to`, `is … worth it` carry the signal). Count each n-gram **once per term**.
3. **Attribute** each term's full metrics (impressions, clicks, cost, conversions, value) to **every**
   n-gram it contains. N-grams overlap and totals double-count across n — that is expected and correct
   (a click on "cheap term life" feeds `cheap`, `term`, `life`, `cheap term`, `term life`, …).
4. **Compute** per n-gram: cost, clicks, conversions, value, CPA (`cost/conv`), ROAS (`value/cost`),
   and `term_count` (how many distinct terms carry it).

## ecommerce vs lead-gen (auto-detected)
If conversion **value** is present → **ecommerce**: judge on **ROAS** (waste = ROAS < break-even).
Else → **lead-gen**: judge on **CPA / zero conversions** (waste = 0 conversions). Mirrors
`funnel-metrics`. `target_cpa` / `roas_breakeven` come from the account goal (context); without them,
lead-gen waste = "spent, never converted" and winning = "converted ≥ N times".

## Buckets
- **Brand** (n-gram contains a brand token) → **excluded from waste**. Branded = demand capture /
  defense (see [`brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)); never a negative.
- **Winning** (`expand`): conversions ≥ `win_conv` and good efficiency (ROAS ≥ `win_roas`, or CPA ≤
  `target_cpa`). → build a keyword / ad group around it.
- **Waste** (`add_negative`): non-brand, spends, doesn't pay back. → a phrase (or exact) negative.

## The blast-radius guards (why a 0-conversion n-gram is NOT automatically a negative)
A negative on an n-gram blocks **every** term that contains it — current and future. So before
recommending one, the deterministic pass FLAGS the dangerous cases and the **LLM adjudicates**
(`needs_confirm`; a flagged waste downgrades to `review`):
- **`broad_blast_radius`** — the n-gram rides a large share of all terms (a load-bearing category word
  like `insurance`). Negativing it guts the account.
- **`rides_brand_traffic`** — ≥30% of the n-gram's terms are brand (e.g. `term life` sitting inside
  `acme term life insurance`). Negativing it blocks brand searches.
- **`competitor_conquest`** — a competitor token (e.g. `manulife`): a strategy decision (conquest vs
  block), not a mechanical negative.
- **`has_some_conversions`** — ecommerce, low ROAS but **not zero** conversions: confirm it's truly
  unprofitable before cutting.
Only a non-brand, non-broad, non-conversion n-gram is a **clean** `add_negative`.

> Doctrine (shared with `labeling`): the thresholds (`min_terms`, the 30% brand share, the broad cut)
> are **recall knobs that decide what to SHOW the LLM, never the verdict**. Lean them loose; the LLM
> filters. Clear-cut (a non-brand 0-conversion token) → code; ambiguous (the flags above) → AI.

## Traps the LLM must catch (high-intent ≠ waste)
A 0-conversion n-gram with **high purchase intent** (`buy`, `quote`) is usually a **landing / offer**
problem, not a junk negative — negativing `buy life insurance` would cut bottom-funnel demand. And a
"winning" list dominated by `life insurance` / `insurance` is just the head terms you already own, not
a new theme. The LLM names the *useful* movers, not the obvious ones.

## Coverage (important here)
Unlike the other cluster skills, n-gram value lives in the **long tail** — pull the **whole** report
(high limit), not the top-N by cost. A top-N pull biases toward head terms and hides the aggregated
small-term patterns that are the whole point. Report the term count analyzed.

## Reconcile against existing negatives (the wiring)
Before surfacing any `add_negative`, run the candidate negatives through the
[`negatives`](../../../negatives/) skill (the account's existing-exclusions map). Each is marked
`already_covered` — an existing campaign / ad-group / shared negative already blocks it (by
EXACT/PHRASE/BROAD match) → mark **done**, do NOT re-recommend — vs **net-new** → the only ones to
surface as `add_negative`. This stops recommending work the account already did (live: an account
already negativing `free`/`jobs`/`cheap`). `negatives` is the single source of truth — don't
re-implement the match logic.

## Boundaries (cluster)
Single term↔keyword relevance → `relevance`. Cannibalization → `duplicates`. Per-term keep/cut →
`performance`. Intent/asset ideas → `intent-discovery`. This skill is token/phrase-level aggregate.

## Period
`last_month` or `{date_from, date_to}` of 30–90 days (enough volume for the tail to aggregate).
