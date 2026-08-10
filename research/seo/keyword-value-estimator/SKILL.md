---
name: keyword-value-estimator
description: "Keyword Value Estimator. Puts a dollar figure on your organic traffic — fuses search volume, CPC, ranking position and estimated traffic to show what each keyword/page is worth in PPC-equivalent dollars, and which pages drive the most value. Use when the user asks 'what is my SEO worth', 'value of organic traffic', 'which pages make the most money', 'PPC equivalent', or wants to justify SEO spend in dollars. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Keyword Value Estimator

Answers one decision: **what is your organic traffic worth in dollars, and which pages/keywords drive that
value?** It fuses four metrics — volume, CPC, ranking position, and estimated traffic (ETV) — into a single
$-per-month figure. Great for justifying SEO budget to a CFO. Runs on Porter MCP.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Fields used |
|---|---|---|
| Per-page traffic value | `porter-tools.google_relevant_pages` | `metrics.organic.etv`, page URL (already page-level) |
| Per-keyword detail | `porter-tools.google_ranked_keywords` | `etv`, `keyword_info.cpc`, `search_volume`, `rank_group` |
| CPC fallback / blends | `porter-tools.get_keyword_data` | `cpc`, `search_volume` |

## How the value is computed
**Monthly value ($) = estimated monthly clicks (ETV) × CPC** — the realistic PPC-equivalent cost of buying
that same traffic. ✅ Verified shortcut: **Porter already computes this inline as
`estimated_paid_traffic_cost`** — `google_ranked_keywords` returns it per keyword and `google_relevant_pages`
returns it **per page, already rolled up**. Prefer that field instead of recomputing. (`get_keyword_data` CPC
is in dollars; `google_ranked_keywords` CPC is too — no cents conversion needed here.)

## Flow
1. Pull `google_relevant_pages` (your domain, `order_by metrics.organic.etv desc`) for the page-level view.
2. For the top pages, pull `google_ranked_keywords` to get per-keyword `etv` and `cpc`.
3. Compute `monthly_value = etv × cpc` per keyword; sum per page; sum to a site total.
4. Rank pages/keywords by `monthly_value`. Show each one's share of the total so the 80/20 is obvious.

## Output (declared — drop everything else)
A table: **page (or keyword) · volume · cpc($) · est_clicks(etv) · monthly_value($) · share_of_total%**,
plus a ≤5-sentence synthesis ("$X/mo total; top 3 pages = Y% of it; here's where to defend/expand").
Round dollars to whole numbers. Disclose truncation.
