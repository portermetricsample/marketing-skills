---
name: seo-base-rules
description: "SEO Toolkit — Base Rules, Output Contract & Index. The shared guide every SEO 'finder/checker/estimator' skill inherits. Holds the data-cleaning rules for Porter data, the Output Contract (which metrics each skill keeps vs drops, to stay clean but complete), and the index of the 10 SEO & AI-visibility skills that run on the Porter Metrics MCP. Use as a reference when running any of those skills, or when the user asks what the SEO skill set does."
user_invocable: true
---

# SEO Toolkit — Base Rules, Output Contract & Index

The shared guide for a set of organic-growth skills that run on the **Porter Metrics MCP** (`porter-tools.*`,
backed by DataForSEO + Porter's AI-mentions suite). Every skill applies these rules so the output stays
clean (low-noise) yet complete (every metric the decision needs).

> Every data read uses `fetch` on the Porter portal: `whoami` → `search` → `get_tool_schema` → `fetch`.

## The 10 skills

| Skill (slash) | Decision it makes |
|---|---|
| `/content-gap-finder` | What content to create (competitor keywords you don't rank for) |
| `/keyword-overlap-finder` | Which of your pages compete with each other (cannibalization) |
| `/programmatic-seo-planner` | Which keyword patterns to scale into templated pages (pSEO) |
| `/trending-keywords-finder` | Which rising keywords to publish on now |
| `/featured-snippet-finder` | Which snippets / AI Overviews to capture |
| `/ai-visibility-checker` | Where AI cites competitors but not you |
| `/ai-keyword-finder` | Which AI prompts to win, and who's mentioned |
| `/traffic-drop-detector` | Which pages are decaying and why |
| `/keyword-value-estimator` | What your organic traffic is worth in $, and which pages drive it |
| `/ranking-effort-estimator` | How hard it is to rank for a keyword, and what it would take |

---

## Data-cleaning rules (every skill applies these)

Learned from a live Porter-vs-Ahrefs comparison (2026-06-07).

1. **Dedupe & roll up by page.** Porter returns each synonym as its own row, often all pointing to one URL.
   Group by `relative_url`, keep the best position per page, report distinct topics. (Or use
   `google_relevant_pages`, which is already page-level.)
2. **Filter by intent.** Use `search_intent_info.main_intent` inline to drop intent that doesn't fit the goal.
3. **`competition` is NOT difficulty.** It's Google **Ads** competition. For real Keyword Difficulty (0–100)
   call `bulk_keyword_difficulty`.
4. **Volumes are directional (±2–3×).** Prioritize with them, don't treat as exact. Cross-check the customer's
   real **Search Console** when precision matters (Porter has the connector).
5. **Normalize numbers.** Round volumes to clean buckets, convert CPC cents→dollars, drop false precision.
6. **Filter rank + sort by traffic** (`rank_group <= 10/20`, `order_by etv desc`) for "top by traffic" views.
7. **Drop vanity/ambiguous head terms** where you rank > 10 and intent doesn't fit.

---

## OUTPUT CONTRACT (the clean-but-complete rule)

The goal: each skill fuses **all metrics its decision needs** and shows **nothing else**. A skill is a
*decision*, not a metric — but it is also not a data dump. Discipline:

- **Reduce before you reason.** Project the raw API response to the skill's declared fields *in a script*;
  never let the full Porter/DataForSEO JSON enter the reasoning context (a single ranked-keyword row is ~30
  noisy fields — that noise is what makes agents hallucinate and waste tokens).
- **Two layers, separated:** (1) a compact **Markdown table** with only the declared columns; (2) a **≤5-sentence
  synthesis** grounded only in that table. Emit strict **JSON** instead of the table only when the output feeds
  another agent/automation.
- **Disclose truncation:** cap rows (top 15–20) and say "top 15 of N".
- **One provenance line:** `Source: porter-tools.<endpoint> · US · <date> · N rows`.

### Declared columns per skill (keep these; drop everything else)

| Skill | KEEP (the fused metric set) |
|---|---|
| content-gap-finder | keyword · volume · KD · intent · competitor · competitor_rank · suggested_page |
| keyword-overlap-finder | keyword · volume · competing_urls[] · each_url_rank · recommended_action |
| programmatic-seo-planner | pattern · variant_keyword · volume · KD · intent · est_page_count |
| trending-keywords-finder | keyword · volume · yearly_trend% · last3_vs_prior3 · cluster |
| featured-snippet-finder | keyword · your_rank · feature_type · current_owner · on_page_fix |
| ai-visibility-checker | query/brand · your_mentions · competitor_mentions · top_cited_3rd_party_domains · action |
| ai-keyword-finder | source_keyword · conversational_variants · ai_search_volume · brands_mentioned · action |
| traffic-drop-detector | page · trend_label · etv_at_risk · likely_cause · action |
| keyword-value-estimator | keyword/page · volume · cpc($) · est_clicks(etv) · monthly_value($) · share_of_total% |
| ranking-effort-estimator | keyword · your_rank · KD · avg_ref_domains_top10 · gap_to_close · verdict |

### Global drop-list (never surface unless it's THIS skill's headline)
`check_url` · `se_results_count` · `breadcrumb` · `highlighted` · sitelinks/`links` · `rank_absolute`
(use `rank_group`) · full 12-month `monthly_searches` array (use the trend %, except trending-keywords) ·
`categories` codes · `detected_language` · request `id` · `last_updated_time` · `keyword_properties` internals ·
`estimated_paid_traffic_cost` (except keyword-value-estimator) · `avg_backlinks_info` (except
ranking-effort-estimator) · `rating`/`votes_count` (except featured-snippet-finder).

---

## Coverage status (June 2026)
- ✅ All 10 skills' endpoints verified live (keyword/ranking/AI-mention subscriptions active in Porter).
- 🔴 Dedicated **backlinks** skills (e.g. link gap, broken links) need the **DataForSEO Backlinks subscription**
  activated. Note: per-keyword `avg_backlinks_info` is available *inline* (no subscription needed) — that's what
  powers `ranking-effort-estimator`.
