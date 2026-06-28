---
name: time-cyclical
description: Surface recurring day-of-week and hour-of-day performance patterns in a Google Ads account — best and worst slots by CPA/ROAS/CVR, above the volume floor. Use this skill when the user asks about scheduling patterns, best or worst day/hour, day-of-week performance, hourly trends, or time-of-day patterns. This is the cyclical reporting lens — it shows WHAT RECURS. For bid-adjustment recommendations based on this data use campaigns/ad-schedule instead.
---

# Time — Cyclical patterns (day-of-week × hour-of-day)

## Goal (job-to-be-done)
Surface **recurring performance patterns** across days of the week and hours of the day —
the best and worst slots by efficiency metric, above the data-volume floor.

- **Who:** marketer / analyst building a performance picture.
- **Decision it drives:** understand the recurring shape of the account's performance. For
  translating that into bid adjustments, hand off to `campaigns/ad-schedule/`.

## Scope
- ✅ **Day-of-week**: 7-slot pattern, ranked by CPA / ROAS / CVR vs account average.
- ✅ **Hour-of-day**: 24-slot pattern, same ranking. Combined DoW × hour heatmap when volume allows.
- ❌ **Bid recommendations** → `campaigns/ad-schedule/` (that skill takes this data and produces specific positive/negative adjustment sizes).
- ❌ **Trend over time** → `time/trend/` (chronological, not cyclical).

## Data fields
| Dimension | Field |
|---|---|
| Day of week | `google_ads_segments_day_of_week` |
| Hour of day | `google_ads_segments_hour` |

Pull as two separate queries — day-of-week and hour-of-day cannot be combined reliably in a single query.

## Volume floor
A slot with fewer than **~5 conversions** over the period carries no reliable signal. Mark it "insufficient data" — do not rank or pattern-match thin slots. Mention the floor explicitly so the user knows why a slot is excluded.

## Output
- **Day-of-week table**: 7 rows, each with spend / conversions / CPA or ROAS / delta vs account avg / verdict (above / on par / below).
- **Hour-of-day table**: same shape, 24 rows, thin slots marked.
- **Best slot** and **worst slot** (above the floor, with material spend share ≥ 5%).
- **Heatmap summary** (DoW × hour) when volume supports it — flag when it doesn't.
- Note at the end: *"To turn this into bid adjustments, use campaigns/ad-schedule."*

## Hard rules
- Ratios (CTR, CPA, ROAS) are not summed across slots — derive from counts.
- Pattern ≠ cause. A bad Sunday is a fact; why Sunday is bad is interpretation.
- Campaign-type caveat: Demand Gen / Display / Video mix differently than Search — note when the account mixes types.
