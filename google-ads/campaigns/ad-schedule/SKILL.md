---
name: campaign-ad-schedule
description: Day-of-week and hour-of-day performance breakdown for Google Ads campaigns — surfaces which days/hours produce the best CPA/ROAS and which leak spend, and recommends specific bid adjustments or dayparting. Use this skill when the user asks about ad scheduling, dayparting, day-of-week performance, hourly bidding, or why performance varies across the week/day.
---

# Campaign Ad Schedule (day-of-week + hour-of-day audit)

## Goal (job-to-be-done)
Identify which time segments over- or under-perform vs the account average, and produce
**specific, dollar-grounded bid-adjustment recommendations** — not just a table.

- **Who:** media buyer / PPC manager.
- **Decision it drives:** whether to apply positive or negative bid adjustments by day/hour, or
  exclude a time window entirely.
- **What it is NOT:** a general performance trend over time (that is `segmentation/time/`). This
  skill is a *scheduling QA* — it judges time segments against an account baseline for bid-setting.

## The two lenses

| Lens | Question | Segmentation field |
|------|----------|--------------------|
| **Day-of-week** | Which days perform better or worse than the account average? | `google_ads_segments_day_of_week` |
| **Hour-of-day** | Which hours of the day perform better or worse? | `google_ads_segments_hour` |

Run both unless the account spends too little per hour to yield actionable data (< ~10 conv/day
→ collapse to day-of-week only and note it).

## Verdicts per segment
Compare each segment's CPA (lead-gen) or ROAS (ecommerce) to the **account average**:

| Verdict | Threshold | Recommendation |
|---------|-----------|---------------|
| `Bid up` | CPA ≤ 80% of avg **or** ROAS ≥ 125% of avg | positive bid adjustment |
| `On par` | within ±20% of avg | no change |
| `Watch` | CPA 120–150% of avg **or** ROAS 70–80% of avg | monitor; revisit next 30d |
| `Bid down` | CPA > 150% of avg **or** ROAS < 70% of avg | negative bid adjustment (not exclusion) |
| `Exclude` | CPA > 200% of avg **and** volume > 5% of spend | exclude (dayparting off) |

Always include **spend share** — a 25% CPA premium on Sunday (20% of spend) is a different
decision than the same premium on a day that's 2% of spend.

## Output
Emit two tables (day-of-week, hour-of-day), each row:
`{ segment, spend, conversions, cpa, roas, delta_vs_avg_pct, verdict, recommendation }`.

Then a **summary card**:
- Best window (day/hour with the best efficiency and material spend share).
- Worst window (highest CPA or lowest ROAS with ≥ 5% of spend).
- Total spend in `Bid down` + `Exclude` segments — the waste headline.
- Recommended bid adjustments as a list: `{ segment, direction, magnitude }`.

Magnitude guideline: align the bid-adjustment size to the delta — a 30% CPA premium → −20%
to −30% adjustment (not −5%). Name the adjustment exactly; don't say "consider adjusting."

## Data gaps
- `google_ads_segments_hour` is exposed in Porter's `google-ads` connector but availability
  depends on the account's date range and campaign type. If no rows are returned, fall back to
  day-of-week only and log the gap.
- Campaign-type caveat: Demand Gen / Display / Video may show very different hourly patterns
  than Search — note when the account mixes types, since blended hour data can mislead.
