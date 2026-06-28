---
name: financial-overview
description: >
  Executive financial summary for a Google Ads account: Conversions, Conversion Value,
  Spend, CPA, and ROAS — each vs the previous period — plus a flat breakdown table by
  conversion action. Written for whoever puts up the money (manager, finance, owner), not
  the marketer. No impressions, no CTR, no keywords. Auto-detects ecommerce (shows ROAS/AOV)
  vs lead-gen (shows CPA only). CPA is computed from raw fields — never from the native
  cost_per_conversion aggregate (verified broken at account-level). Use it when someone asks
  "how is Google Ads doing financially?", "what did we spend and what did we get?", or wants
  a monthly executive summary. One account at a time, Google Ads only.
---

# Financial Overview (executive)

A **single-screen** executive summary for someone who is NOT in marketing — manager, finance,
owner. Only the metrics that matter to whoever puts up the money, each compared vs the prior
period. Answers the one question that counts: *"Is Google Ads giving us a return, and are we
doing better or worse than before?"*

Sibling of `funnel-metrics` (that one covers the full marketer funnel — Visibility →
Engagement → Conversion; this one is the bottom-funnel, money-only view for leadership).

## When to use
- "How is Google Ads doing financially this month?"
- "What did we spend and what did we get back?"
- "Give me a monthly executive summary / client-ready report."
- "What's our ROAS / CPA vs last month?"

## Scope
**Google Ads only.** One account at a time. No impressions, CTR, or keywords — those belong
in `funnel-metrics`. No cross-channel blending.

## Flow (4 MCP calls total)

### 1) Resolve the account
`fetch tool:porter-accounts:list_accounts` with `component_name="google-ads"`. Keep the
**complete account object** — `query_data` requires the full object, not just the id.

### 2) Total KPIs — run TWICE (current + previous period)
`execute tool:porter-reporting:query_data`. No dimension = account totals (1 row).

```
fields: [
  google_ads_conversions,
  google_ads_conversions_value,
  google_ads_cost_micros,
  google_ads_conversion_value_per_cost   ← ROAS (aggregates correctly at account level)
]
date_range: {"preset": "last_month"}     ← then repeat with prior month for the "vs"
```

> **Do NOT request `google_ads_cost_per_conversion`** — verified broken at account-level
> aggregate (returned ~$9,200 when true CPA was ~$250). Compute CPA yourself:
> `CPA = cost_micros / conversions`.

### 3) Conversion breakdown — run TWICE (same periods)
`execute tool:porter-reporting:query_data`.

```
fields: [
  google_ads_conversion_action_name,
  google_ads_conversion_action_category,
  google_ads_conversions,
  google_ads_conversions_value,
  google_ads_value_per_conversion,
  google_ads_all_conversions             ← only to derive primary/secondary flag
]
```

> **Do NOT add `cost_micros` or `cost_per_conversion` here.** Spend is not attributable
> per conversion action — Google doesn't split it that way. Spend/CPA live in the totals
> only, never in the breakdown rows.

### 4) Compute and render

**Auto-detect the business model first:**
- If `conversions_value > 0` across the account → **ecommerce**: show ROAS and AOV.
- If `conversions_value ≈ 0` → **lead-gen**: hide ROAS and AOV, lead with CPA.

**Calculations:**
- `CPA = cost_micros / conversions` (guard divide-by-zero → null, not 0)
- `AOV = conversions_value / conversions` (ecommerce only; same guard)
- `% of value = row value / sum of all rows' value`
- **Primary/secondary flag per row:** if `google_ads_conversions > 0` → primary (counted
  in the KPI); if `conversions = 0` but `google_ads_all_conversions > 0` → secondary.
- **% change vs previous:** `(current − previous) / previous × 100`. Direction: ↑ green
  for Conversions/Value/AOV/ROAS; ↑ red for CPA and Spend (more spent is not always good).

## Output structure

**1 — Headline sentence**
"Google Ads generated X conversions for $Y spend, at a CPA of $Z — [better/worse] than
[previous period] ([±%])."
Ecommerce variant adds: "ROAS was X.Xx (vs X.Xx prior)."

**2 — KPI row (totals)**

| Metric | Value | vs previous |
|--------|-------|-------------|
| Conversions | — | ↑/↓ X% |
| Conversion Value *(ecommerce only)* | — | ↑/↓ X% |
| AOV *(ecommerce only)* | — | ↑/↓ X% |
| Spend | — | ↑/↓ X% |
| CPA | — | ↑/↓ X% |
| ROAS *(ecommerce only)* | — | ↑/↓ X% |

**3 — Conversion breakdown table**
Flat, no subtotals. Column order:

| Conversion name | Type | Flag | Conversions | Value | Value/conv | % of value |
|---|---|---|---|---|---|---|

Add a note below the table: *"The breakdown includes secondary conversions
(e.g. calls, micro-events); the Conversions KPI above counts only primary actions."*

**4 — 1–3 sentence interpretation**
Plain language for a non-marketer. What the numbers mean for the business. If CPA rose
alongside conversions → good news, not bad. If ROAS fell → explain the trade-off. No jargon.

## Honesty rules
- **Never put Spend or CPA in the breakdown rows** — Google doesn't attribute spend by
  conversion action. Fabricating it would mislead.
- **The breakdown table can sum to more conversions than the KPI** — because the table
  includes secondary actions. Always add the explanatory note.
- **CPA direction is contextual:** rising CPA on rising conversions may be fine (growth).
  Rising CPA on flat conversions is a problem. State both the number and the context.
- **`google_ads_value_per_conversion` ≠ ROAS.** Value per conversion is per row (value ÷
  conversions for that action). ROAS is account-level (`conversion_value_per_cost`).

## Period
Default: `last_month` for current, same prior calendar month for comparison.
For quarterly: use explicit `{date_from, date_to}` — there is no quarter preset.

## Files
- `framework.md` — the full SUMAS design spec for this skill.
- `datos.md` — exact Porter MCP fields, verified queries, and copy-paste MCP calls.

## Requirements
Access to the Porter Metrics MCP with a connected Google Ads account.
