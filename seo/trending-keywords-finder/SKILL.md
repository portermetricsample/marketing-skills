---
name: trending-keywords-finder
description: "Trending Keywords Finder. Discovers keywords that are GROWING in search demand so you publish before the wave peaks. Use when the user says 'trending keywords', 'rising searches', 'hot topics', 'what's growing', or wants a content roadmap by momentum. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Trending Keywords Finder

Finds keywords whose search demand is **rising**, so you publish on time. Runs on Porter MCP.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `keyword · volume · yearly_trend% · last3_vs_prior3 · cluster` + a ≤5-sentence synthesis. (Trending is the one skill that may show the monthly curve, since momentum IS its decision.)

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Expand a seed | `porter-tools.google_keyword_ideas` | ideas + 12-month `search_volume_trend` |
| Adjacent terms | `porter-tools.google_related_keywords` | related searches |
| Confirm the trend | `porter-tools.get_keyword_data` | `monthly_searches` + `search_volume_trend` (monthly/quarterly/yearly %) |

## Flow
1. **Seed & expand:** `google_keyword_ideas` + `google_related_keywords` from 1–3 seeds. Pool of 300–500.
2. **Score growth, not just volume:** it's a real trend when the yearly % is strongly positive (> +50%) **AND**
   the last 3 months are above the prior 3 (sustained momentum, not a one-month spike).
   > **Important:** monthly volumes are volatile — require a sustained multi-month rise, not a single jump.
3. **Cluster** survivors by topic/intent. A rising cluster beats a lone rising keyword.
4. **Roadmap:** rank clusters by momentum × volume × relevance. Deliver: cluster → pieces → target keywords →
   why NOW. Flag the most time-sensitive one.
