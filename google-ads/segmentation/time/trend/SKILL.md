---
name: time-trend
description: Attribute a Google Ads metric movement to specific time buckets (day / week / month / quarter / year) and find the inflection point where the trend turned. Use this skill when the user asks why a metric went up or down over a period, when a trend started or reversed, week-over-week or month-over-month attribution, or "when did this start." This is the chronological lens — it explains WHAT happened WHEN. For recurring day-of-week or hour-of-day patterns use time-cyclical instead.
---

# Time — Trend (chronological attribution)

## Goal (job-to-be-done)
Explain **why a metric moved** by attributing the change to **chronological time buckets**
and finding the **inflection point** where the trend turned.

- **Who:** marketer / analyst watching a metric move.
- **Decision it drives:** catch the turn early, identify the week/month where something changed.

## The two questions
1. **What is the trend?** — metric direction over the chosen period.
2. **When did it turn?** — the inflection: the specific bucket where direction changed.

## Granularities (in order of usefulness)
| Granularity | Field | Use when |
|---|---|---|
| Day | `google_ads_segments_date` | short periods (≤ 30d), volatile metrics |
| Week | derived from date (ISO week) | standard reporting period |
| Month | derived from date | MoM comparisons, longer windows |
| Quarter | derived from date | QoQ, seasonal views |
| Year | derived from date | YoY |

Run **auto-scan**: compute contribution to change at each granularity, surface the most concentrated one. Offer the rest.

## Contribution-to-change (the objective core)
For a **count metric** M: `ΔM = M(now) − M(prev)`. Each bucket *b* contributes `ΔM_b` — they sum exactly back to `ΔM`. Rank by `|ΔM_b|`, report share of ΔM.

**Ratios (CTR, CPA, ROAS) are never summed across buckets.** Decompose into numerator/denominator counts, attribute those movements, then derive the ratio consequence. E.g. *"CTR fell because clicks dropped in weeks 3–4 while impressions held."*

## Hard rules
- Compute every rate/cost from base counts — native ratio fields aggregate incorrectly.
- Thin buckets (< volume floor) → mark "insufficient data", don't over-read.
- Concentration ≠ cause. The inflection point is WHERE; the WHY beyond the funnel identity is a marked interpretation, never an observation.
