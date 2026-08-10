---
name: traffic-drop-detector
description: "Traffic Drop Detector. Finds pages that are LOSING organic traffic before it becomes a crisis, and diagnoses why (stale content / lost links / SERP change). Use when the user says 'traffic drop', 'content decay', 'pages losing traffic', 'what to refresh', or wants early warnings on SEO traffic. Runs on the Porter Metrics MCP + Search Console. Builds on the performance_decay skill. Applies the rules in seo-base-rules."
user_invocable: true
---

# Traffic Drop Detector (content decay)

Finds pages whose organic traffic is **eroding** before it's a crisis, and diagnoses the cause. Runs on
Porter MCP + GSC. **Builds on the `performance_decay` skill**, which classifies trends the way a human eye
reads them (Winning / Losing / Crashing / etc.).

**Before you start:** apply the rules + Output Contract in `seo-base-rules`.

**Output (keep these columns, drop everything else):** `page · trend_label · etv_at_risk · likely_cause · action` + a ≤5-sentence synthesis.

## Data it uses (Porter + GSC)
| Step | Tool / skill | Returns |
|---|---|---|
| Domain history | `porter-tools.google_historical_rank_overview` | monthly position buckets, ETV, is_up/is_down/is_lost counts |
| Per-page rankings | `porter-tools.google_relevant_pages`, `porter-tools.google_ranked_keywords` | traffic & rankings per page |
| Real click history | Google Search Console connector | clicks/impressions per page over time |
| Trend classification | `performance_decay` skill | labels each page Winning/Losing/Crashing/Crashed |

## Flow
1. **Pull the history** with `google_historical_rank_overview` — monthly position buckets, `etv`, and
   `is_up`/`is_down`/`is_lost` counts. The macro picture of the site.
2. **Per-page traffic over time:** GSC (clicks/impressions, **3–6 month window with weekly breakdown** — long
   ranges + weekly dimension time out). Feed entity+period+metric into `performance_decay`.
   > Tip (verified): `google_relevant_pages` already returns results **rolled up per page** (one row per URL
   > with `etv`, position buckets, and `is_up`/`is_down` counts) — use it for the page-level view instead of
   > deduping `google_ranked_keywords` by hand.
3. **Classify** with `performance_decay` — by the SHAPE of the curve. Focus on Losing + Crashing (salvageable);
   Crashed may need a rebuild or redirect.
4. **Diagnose the cause:** stale (old date + fresher competitors), SERP shift (a new AI Overview ate the clicks
   → check `serp_item_types`). (Lost links needs the Backlinks subscription, currently queued.)
5. **Recommend** per page: decline shape, likely cause, and action. Prioritize by traffic-at-risk
   (ETV × steepness of the drop).
