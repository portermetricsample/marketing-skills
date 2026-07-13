# Tools — Search Term N-gram Analysis

The ordered plan of MCP tool calls this skill makes. The "query" is the **arguments of `query_data`**,
nested in step 2; its saved form is [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics: [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query=<ACCOUNT_HINT>` | Discover the account **object**. Use the FULL object. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the **whole** search-terms report + metrics. |

## Step 2 — `query_data` args (this is "the query")
N-gram mining is **term-level + metrics only** — it does NOT need the keyword (unlike relevance /
routing). Six fields:

- `google_ads_search_term` — the unit that gets split into n-grams.
- `google_ads_impressions` — demand context (no `> 0` auto-filter, unlike cost).
- `google_ads_clicks` — volume.
- `google_ads_cost_micros` — the waste signal / sort key.
- `google_ads_conversions` — the payback signal (lead-gen waste = 0 here).
- `google_ads_conversions_value` — ecommerce payback (its presence auto-selects ROAS mode).

**Pull the whole report:** `limit: 5000`, sort by `cost_micros` desc. The **long tail is the signal**
— a top-N pull biases to head terms and hides the aggregated small-term patterns. If the account has
more terms than one page, paginate / raise the limit; don't settle for the top slice here.

## Required business context (per-account input — never hardcoded)
A small `context.json` (see [`../scripts/example.context.json`](../scripts/example.context.json)):
- `brand_terms` — separate brand n-grams (excluded from waste) + power the `rides_brand_traffic` guard.
- `competitor_terms` — tag competitor n-grams (conquest decision, not auto-negative).
- `target_cpa` / `roas_breakeven` *(optional)* — the waste/winning bar; from the account goal.
- `min_terms` / `min_cost_waste` / `win_conv` / `win_roas` / `stop_words` *(optional)* — recall knobs.

## Where the data goes next
Raw `query_data` JSON + `context.json` → [`../scripts/process.py`](../scripts/process.py) → `{meta,
waste[], winning[], rollup}`. The LLM then writes `synthesis` and adjudicates `needs_confirm` (see
[`framework.md`](framework.md) + [`output.md`](output.md)).

## Tools NOT needed
- `keyword_info_text` — not used; n-grams are term-level.
- `scrape` — landing pages are the `keyword-ad-landing` cluster's job.

## Gotchas
- **`cost_micros > 0` auto-filter** hides 0-spend terms — harmless (a negative candidate has spend),
  but it means impression-only terms are absent; that's fine for waste mining.
- **Currency:** waste dollars are in the account currency; don't compare n-gram cost across accounts.
- **Overlap is expected:** the same spend feeds a unigram and the bigrams/trigrams that contain it.
  Don't "dedupe" across n — a unigram negative and a trigram negative are different blast radii.
