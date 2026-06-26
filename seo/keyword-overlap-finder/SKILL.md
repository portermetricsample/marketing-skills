---
name: keyword-overlap-finder
description: "Keyword Overlap Finder. Detects when two or more of your own pages compete for the same keyword (cannibalization), splitting clicks and capping each other's ranking. Use when the user says 'cannibalization', 'duplicate rankings', 'two pages competing', 'which page ranks for X', or suspects their content overlaps itself. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Keyword Overlap Finder (cannibalization)

Finds keywords where **two or more of your pages compete with each other** — Google hesitates, clicks split,
and they cap each other. Runs on Porter MCP.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `keyword · volume · competing_urls · each_url_rank · recommended_action` + a ≤5-sentence synthesis. If no keyword has 2+ of your URLs, say so plainly — "no significant cannibalization" is a valid result.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Your rankings + URLs | `porter-tools.google_ranked_keywords` (your domain) | each keyword × the URL ranking for it |
| Cross-check with real data | Google Search Console connector | clicks/impressions per query × page |

## Flow
1. **Pull your ranked keywords with URLs:** `google_ranked_keywords`, `filters: [["...rank_group","<=",30]]`,
   `item_types:["organic"]`. The URL is in `ranked_serp_element.serp_item.relative_url`.
2. **Group by keyword** (in a script). Any keyword with **2+ distinct URLs of yours** is a candidate. Keep
   keywords with meaningful volume.
3. **Confirm it's real** (not intended): same intent + at least one in the top 20. If you have GSC, check
   whether Google flips between the two URLs week to week for that query → clear signal.
4. **Recommend the fix** per cluster: pick ONE canonical page and suggest consolidate/merge, redirect the
   weaker one, differentiate intent, or internal-link + canonical to the winner. Pick the keeper by:
   **traffic > backlinks > URL authority**.
