---
name: ranking-effort-estimator
description: "Ranking Effort Estimator. Tells you how hard it is to actually rank for a keyword and what it would take — fuses Keyword Difficulty, the average referring domains of the pages currently in the top 10, and your current position. Use when the user asks 'can I rank for X', 'how hard is this keyword', 'what would it take to rank', 'is this keyword realistic', or wants to prioritize keywords by feasibility. Runs on the Porter Metrics MCP. Applies the rules in seo-base-rules."
user_invocable: true
---

# Ranking Effort Estimator

Answers one decision: **can you realistically rank for a keyword, and what would it take?** It fuses three
metrics — Keyword Difficulty, the **average referring domains of the pages already ranking top-10**, and your
current position — into an easy/moderate/hard verdict plus the concrete gap to close. Runs on Porter MCP.

> Why this is special: the per-keyword `avg_backlinks_info` (referring domains of the ranking pages) comes
> **inline in `google_ranked_keywords`** — so this backlink-based effort signal works **even though the
> dedicated Backlinks subscription is off.**

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

## Data it uses (Porter, via `fetch`)
| Step | Tool | Fields used |
|---|---|---|
| Difficulty | `porter-tools.bulk_keyword_difficulty` | `keyword_difficulty` (0–100) |
| Backlink bar of top results | `porter-tools.google_ranked_keywords` / `google_serp_competitors` | `avg_backlinks_info.referring_domains`, `rank_group` |
| Your current position | `porter-tools.google_ranked_keywords` (your domain) | your `rank_group` for the keyword |

## Flow
1. For the target keywords, pull `bulk_keyword_difficulty` (real KD).
2. Pull the per-keyword `avg_backlinks_info.referring_domains` — the typical link bar of pages already ranking.
3. Pull your current rank (if any) for each keyword.
4. **Verdict:** combine KD + ref-domain bar + your gap → `easy` (KD<20, low ref-domains, you're already 4–15),
   `moderate`, or `hard` (KD>50 or ref-domains in the hundreds and you're unranked).
5. State the **gap to close**: e.g. "needs ~120 more referring domains and a deeper page."

## Output (declared — drop everything else)
A table: **keyword · your_rank · KD · avg_ref_domains_top10 · gap_to_close · verdict**, plus a ≤5-sentence
synthesis ranking the keywords from most-winnable to least. Disclose truncation.
