# Ad Rank & Impression Share — how to read "why aren't we showing?"

Shared primer for any check that reasons about *reach* and *why an account isn't showing more*
(consumed by `account-audit/spend-allocation` and `keyword-ad-landing-metrics`). Written so a
non-technical reader gets the **why**, not just the verdict.

## What Ad Rank is
Every search triggers a split-second **auction**. **Ad Rank** is the score that decides whether your
ad shows, in what position, and what you pay. It is recomputed **for every single search** — it is
not a number you set or that persists. Roughly:

> **Ad Rank ≈ your bid × Quality (ad relevance + expected CTR + landing-page experience) × context
> (device, location, time, query) × expected impact of assets/extensions**, and it must clear a
> minimum **Ad Rank threshold** to show at all.

Consequence the audit cares about: a **strong Quality Score wins better positions at a lower bid**;
a weak one means you pay more for worse spots — or don't show.

## You cannot see Ad Rank as a number
Google never exposes the Ad Rank value (computed per-auction, discarded). So neither the Google Ads
API nor Porter has an "Ad Rank" field. **You measure the *consequence* via Impression Share (IS):**
how often you failed to show, and why.

## The Impression Share family in Porter (Google Ads connector)
Two naming families are exposed — **don't mix them**:

| Concept | Overall (use THIS for the budget-vs-rank diagnosis) | Top-of-page | Absolute top |
|---|---|---|---|
| Got it | `search_impression_share` | `search_top_impression_share` | `search_absolute_top_impression_share` |
| Missed → **budget** | `search_budget_lost_impression_share` | `search_budget_lost_top_impression_share` | `search_budget_lost_absolute_top_impression_share` |
| Missed → **rank** | `search_rank_lost_impression_share` | `search_rank_lost_top_impression_share` | `search_rank_lost_absolute_top_impression_share` |

- **Overall** = share of *all* impressions you were eligible for. This is the canonical "Search IS /
  Search Lost IS (budget|rank)" from the Google Ads UI — **the audit's default.**
- **Top** = share of *top-of-page* (above the organic results); **Absolute top** = the very first slot.
  Use these only when the question is specifically about winning *premium positions*, and say so.
- For each family, `IS + budget_lost + rank_lost ≈ 100%` of eligible reach — so the two "lost"
  fields split your **missed** impressions into **money** (budget) vs **quality/bid** (rank).

> **Canonical choice:** for "are we missing reach, and why?", use the **overall** trio
> (`search_impression_share`, `search_budget_lost_impression_share`, `search_rank_lost_impression_share`).
> Report `_top_` / `_absolute_top_` only as supplementary "are we winning premium positions?" detail.

## How to analyze it (the whole trick)
| What you see | Diagnosis | Fix |
|---|---|---|
| High **rank**-lost, low budget-lost | Quality/bid problem | Improve Quality Score (ad relevance, expected CTR, landing) and/or raise bid — **NOT** budget |
| High **budget**-lost, low rank-lost | Money problem | Raise daily budget — proven demand you can't afford |
| **Both** high | Mixed | Fix rank first (cheaper clicks), *then* feed budget |

This is the engine behind `spend-allocation`'s 2×2 (efficiency × budget-cap) and its hard rule:
**`rank_lost_IS` never justifies a budget raise — it's a bid/Quality fix.**

## Caveats
- **Search-only.** These IS fields read ~0 on Display / Demand Gen / Video (no Search auction) — don't
  report them there. Filter `campaign_advertising_channel_type = SEARCH`.
- **Estimates, not exact counts** (Google models eligible impressions).
- **Quality Score numeric value is unreliable** at keyword-text grain in this connector (it sums across
  ad groups, >10) — grade on the 3 categorical pillars instead. See `porter-mcp-feedback` issue 08.
