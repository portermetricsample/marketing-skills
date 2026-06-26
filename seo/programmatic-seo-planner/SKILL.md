---
name: programmatic-seo-planner
description: "Programmatic SEO Planner. Finds repeatable keyword patterns ('[topic] for [industry]', '[platform] dashboard template') to build hundreds of templated pages at scale (pSEO). Use when the user says 'pSEO', 'programmatic SEO', 'pages at scale', 'templated content', 'keyword patterns', or wants to scale landing pages by variant. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Programmatic SEO Planner

Finds keyword **patterns** you can turn into hundreds of templated pages. Runs on Porter MCP.

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `pattern · variant_keyword · volume · KD · intent · est_page_count` + a ≤5-sentence synthesis.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Returns |
|---|---|---|
| Expand a seed | `porter-tools.google_keyword_ideas` | category ideas + volume/trend |
| Long tail | `porter-tools.google_keyword_suggestions` | terms CONTAINING the seed |
| Site-relevant terms | `porter-tools.google_keywords_for_site` | keywords relevant to a domain |
| Volume/difficulty | `porter-tools.get_keyword_data`, `porter-tools.bulk_keyword_difficulty` | volume, CPC, difficulty |

## Flow
1. **Define the template:** a fixed head ("looker studio dashboard") + a variable ("[platform]", "[industry]").
   Confirm the axis with the user.
2. **Mine the long tail** with `google_keyword_suggestions` + `google_keyword_ideas`.
   > **Important:** `google_keyword_ideas` drifts off-topic. ALWAYS filter by the head token, e.g.
   > `filters: [["keyword","like","%dashboard%"]]`, and review the list before templating.
3. **Detect the pattern:** group by the variable. A good pattern = the same structure repeats across many
   variants with enough volume.
4. **Size & prioritize:** `bulk_keyword_difficulty` on the cluster. Recommend patterns with enough total
   volume × low-to-medium difficulty × clear intent. Estimate page count.
5. **Deliver** a spec: template title/H1, the real variant list, volume per variant. Flag zero-volume
   variants to exclude (no doorway pages).
