---
name: funnel-metrics
description: >
  Map a Google Ads account's marketing-metrics funnel with the SUMAS framework:
  Visibility → Engagement → Conversion, each level with its volume + efficiency (cost) +
  effectiveness (rate), and EVERYTHING compared vs the previous period. Pulls live from the
  Porter Metrics MCP only the base counts of the google-ads connector (impressions, clicks,
  cost, conversions, value, impression share) and a deterministic script computes the
  rates/costs (CTR, CPC, CPM, CPA, ROAS, conversion rate, AOV) — because the native rate
  fields are broken at the account-total aggregate. Auto-detects whether the account is
  ecommerce (shows ROAS/AOV) or lead-gen (CPA only). Use it when the user asks "show me the
  funnel", the metrics funnel, where it leaks (visibility/engagement/conversion), or a
  performance summary with a vs-previous-period comparison. One account at a time, Google Ads only.
---

# Funnel Metrics (SUMAS)

Read a Google Ads account's full funnel the way **SUMAS** orders it —
Visibility → Engagement → Conversion, each level with **volume + efficiency (cost) +
effectiveness (rate)** — and every number **vs the previous period**. It answers: where does
the funnel leak — am I not being SEEN, not getting CLICKED, or not CONVERTING?

Sibling of `financial-overview` (that one is the bottom-funnel, finance-only money view; this
is the full funnel for the marketer). The judgment is arithmetic → `process.py` computes
everything and the AI narrates.

## When to use
- "Show me the funnel / metrics funnel of this account."
- "Where is it leaking: visibility, engagement, or conversion?"
- "Performance summary with a vs previous month/period comparison."

## Scope (important)
**Google Ads only.** Everything comes from the `google-ads` connector. No CRM, no GA4, no
custom metrics. One account at a time.

## Flow (3 steps)

### 1) Resolve the account (Porter MCP)
`fetch tool:porter-accounts:list_accounts` with `component_name="google-ads"`. Keep the
**complete object** (`query_data` requires it, not just the id).

### 2) Pull the funnel — the SAME query TWICE (current + previous)
`execute tool:porter-reporting:query_data` (goes through **execute**). Request **only the base
counts** (rates are computed in step 3):
```
fields: [impressions, clicks, cost_micros, conversions, conversions_value, all_conversions,
         search_top_impression_share, search_absolute_top_impression_share,
         search_rank_lost_top_impression_share, search_budget_lost_top_impression_share]
```
- **Run twice:** current period (`date_range`) and the **equal-length window immediately
  before it**. E.g. current `2026-05-01..05-31` → previous `2026-04-01..04-30`.
- No dimension = account totals (1 row). Dump each result to `data/raw/current.json` and
  `data/raw/previous.json`.
- **Search only** has Impression Share; if the account runs PMax/Shopping, say so (IS covers Search).

### 3) Process (Python — pure function) and narrate
```bash
cd scripts && python3 process.py --current ../data/raw/current.json --previous ../data/raw/previous.json --out ../data/findings.json
```
`findings.json` holds the funnel in 3 blocks, each metric with `current / previous / delta_pct /
better`, plus the auto-detected `business_model`. **The AI narrates** against
`reference/framework.md`: headline (where is the worst drop vs previous?) → 3 blocks
(Visibility / Engagement / Conversion) → the leak callout, with the visibility diagnostic
(lost-to-rank vs budget).

## Why we compute the rates (instead of querying them)
The native rate/cost fields (`ctr`, `average_cpc`, `conversions_from_interactions_rate`,
`value_per_conversion`, `cost_per_conversion`) are **broken at the account-total aggregate**.
Validated live: native conversion rate = **0.0** with 100 conversions; native CTR 11.5% vs
real 6.2%; native avg CPC $371 vs real $2.61. Only the **base counts** aggregate correctly →
we derive CTR, CPC, CPM, CPA, ROAS, conversion rate and AOV from them.

## Rules (in `reference/framework.md`)
- **Auto-detect the business:** if `conversions_value > 0` → ecommerce (show ROAS/AOV); else →
  lead-gen (CPA + conversion rate only). It does not assume.
- **Never a cost without its rate next to it** (CPA next to conversion rate; CPC next to CTR).
- **Direction matters:** for costs (CPM/CPC/CPA) up is bad; for volume/rates/ROAS up is good.
  The script already marks ✅/🔴 correctly.
- **Impression Share is approximate at account total** (it doesn't partition cleanly; it's
  per-campaign). For accuracy, pull it per campaign and weight by impressions.
- **Conversions = primary** (= Google UI); `all_conversions` is context only.

## Files
- `scripts/process.py` — deterministic core (2 periods → funnel with deltas).
- `reference/framework.md` — the SUMAS rubric (the mapping + interpretation).
- `data/raw/current.json` · `previous.json` — raw MCP dumps (real sample: Eastpointe).
- `data/findings.json` — processed output.

## Requirements
Python 3 (stdlib). Access to the Porter Metrics MCP with a connected Google Ads account.
