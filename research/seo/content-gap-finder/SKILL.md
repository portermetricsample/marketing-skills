---
name: content-gap-finder
description: "Content Gap Finder. Finds the topics and keywords your competitors rank for on Google but you don't — your prioritized list of content to create. Use when the user asks for 'content gaps', 'competitor keywords', 'topics I'm missing', 'what should I write', or wants to compare their site against a competitor. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Content Gap Finder

Finds the topics where competitors capture organic traffic and you don't appear. Output: a prioritized
"what to create first" list. Runs on Porter MCP (`porter-tools.*`).

**Before you start:** read the data-cleaning rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `keyword · volume · KD · intent · competitor · competitor_rank · suggested_page` + a ≤5-sentence synthesis. Markdown table by default; JSON only if feeding an automation.

## Data it uses (Porter, via `fetch`)
| Step | Porter tool | Returns |
|---|---|---|
| Real competitors | `porter-tools.google_competitors_domain` | domains competing on your SERPs |
| The gap | `porter-tools.google_domain_intersection` (`intersections:false`) | keywords the competitor ranks for and you don't |
| Enrichment | `porter-tools.get_keyword_data` + `porter-tools.bulk_keyword_difficulty` | volume, CPC, real difficulty |

## Flow
1. **Identify competitors** with `google_competitors_domain` (don't ask the user to guess — this endpoint
   gives the real ones by shared SERP). Confirm 2–4 with the user.
2. **Get the gap in ONE call** with `google_domain_intersection` using `intersections: false`
   (`target1` = competitor, `target2` = you) → keywords the competitor ranks for and you don't.
3. **FILTER THE COMPETITOR'S RANK — critical.** Without this you get junk: a competitor "ranks" #68 for
   "clockify"/"e-conomic" via a connector-list page, which is NOT a real opportunity. Require:
   ```
   "filters": [["first_domain_serp_element.rank_group","<=",20],"and",
               ["keyword_data.keyword_info.search_volume",">",150]],
   "order_by": ["keyword_data.keyword_info.search_volume,desc"]
   ```
4. **Clean up:** filter by commercial/transactional intent (rule 2) — drop navigational brand terms
   ("clockify log in") and generics (rule 8). For real difficulty use `bulk_keyword_difficulty`, never
   `competition` (rule 3).
5. **Prioritize** by: business relevance > volume > traffic potential (sum of `etv`) > low difficulty.
6. **Deliver** a table: keyword · volume · difficulty · which competitor ranks for it · suggested page type.
   Group by topic cluster and flag the highest-leverage one.
