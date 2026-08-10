---
name: featured-snippet-finder
description: "Featured Snippet & AI Overview Finder. Finds keywords where you ALREADY rank but don't own the high-visibility SERP element (featured snippet, AI Overview, People-Also-Ask, image/video pack). Winning it is fast incremental traffic. Use when the user says 'featured snippet', 'position zero', 'AI Overview', 'SERP features', 'people also ask'. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Featured Snippet & AI Overview Finder

Finds keywords where you **already rank** but a competitor owns the high-visibility SERP element. Capturing
it = fast traffic. Runs on Porter MCP — which detects SERP features **inline**.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `keyword · your_rank · feature_type · current_owner · on_page_fix` + a ≤5-sentence synthesis.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Your rankings + features | `porter-tools.google_ranked_keywords` | `serp_item_types`, rank per keyword |
| Who owns the element | `porter-tools.google_serp_competitors` | domains owning elements for a keyword set |

## Flow
1. **Pull your ranked keywords with SERP types:** `google_ranked_keywords`,
   `filters: [["...rank_group","<=",10]]`, `item_types: ["organic","featured_snippet","ai_overview_reference"]`.
   The response carries `serp_item_types` per keyword.
2. **Find the gaps:** the SERP **has** a feature and your result is plain `organic`, not the owner — especially
   if you rank positions 2–8.
3. **Identify owner & format** with `google_serp_competitors` (definition, list, table, image).
4. **Recommend the capture play:** keyword, feature type, current owner, your rank, and the exact on-page
   change to win it (definition block for snippets, list for PAA, schema for rich results).

## Edge
**AI Overview** opportunities (`ai_overview_reference`) are the newest, highest-upside slice — Porter detects
them inline and cheaply. Prioritize them.
