---
name: google-ads-time-segmentation
description: Explain WHY a Google Ads metric moved — and WHEN — by attributing the change to time buckets (day/week/month/quarter/year), and surface recurring day-of-week / hour-of-day patterns. Use this skill whenever the user asks why a metric went up or down over time, when a trend turned or inflected, what the best/worst day or hour is, dayparting / ad-schedule / scheduling patterns, time-of-day or day-of-week performance, a week-over-week / month-over-month movement attribution, or "when did this start" — even if they don't say "segmentation". Attributes movement in TIME only; campaign / audience / device / geo splits belong to the sibling segmentation skills.
---

# Google Ads Time Segmentation (movement attribution)

## Goal (job-to-be-done)
Explain **why a metric moved — and when** — by attributing the change to **time buckets**, and
surface recurring **day-of-week / hour-of-day** patterns. This is the **S-step (Segment) of
[SUMAS](../../../_framework/sumas.md) made concrete for time** — the first member of the
`segmentation/` family.

- **Who:** the marketer / analyst watching a Google Ads account.
- **When:** a metric moved and you need to know *when* it happened, or you want scheduling
  patterns (best / worst days and hours).
- **Decision it drives:** where *in time* to act — catch the turn early, fix the weak day/hour,
  or shift budget by schedule.

## Scope
- ✅ **Time segment only** — attribute a metric's movement to time buckets (chronological) and
  find recurring cyclical patterns (day-of-week, hour-of-day).
- ✅ Two jobs: (1) **explain a movement**, (2) **find recurring patterns** (best/worst slot).
- ❌ **Other segments** (campaign, audience, device, geo) → sibling skills under
  `segmentation/`, same engine, later.
- ❌ **Why beyond the funnel identity** (seasonality, holidays, auction, a launch) is a *marked
  interpretation*, never an observation — unless a calendar source is wired.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the two pulls (daily +
  cyclical), exact fields, gotchas.
- **Framework / method:** [`references/framework.md`](references/framework.md) — the brain:
  contribution-to-change, auto-scan, inflection, the ratio rule, honesty rules.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** the metric(s) in question + the **report period and its comparison period** (e.g.
this month vs last) — the whole method is a vs-previous-period attribution. Optionally a
**specified time view** (e.g. "by week"); otherwise run **auto-scan**.

**Process:**
1. **Two time families, two questions.**
   - **Chronological** (day / week / month / quarter / year): *what is the trend, and when did
     it turn?* Pull **daily** and bucket up in code.
   - **Cyclical** (day-of-week, hour-of-day): *what is the recurring pattern?* (the DoW×hour
     heatmap). Pull with a **separate** segmented query.
2. **Contribution to change (the objective core).** For a **count** metric M, the total change
   `ΔM = M(now) − M(prev)`; each bucket *b* contributes `ΔM_b`, ranked by `|ΔM_b|`. They **sum
   back to ΔM** (exact, not a guess). Report top contributors with their **share of ΔM**.
3. **Ratios are never summed.** For CTR / CPC / CPM / CPA / ROAS / conversion-rate, a ratio's
   total is **not** the sum of bucket ratios. Decompose into numerator/denominator **counts**
   and attribute *those counts'* movements to the buckets (Metric-relationships rule). E.g.
   *"CTR fell; clicks dropped, concentrated in the last 2 weeks, while impressions held."*
4. **Auto-scan.** Run the contribution analysis across all time views and rank by
   **concentration** — how much of the move piles into a few buckets. Surface the
   most-concentrated view; offer the rest.
5. **Inflection (chronological).** Flag the period where the trend changed direction (the turn),
   so *"when did it start"* is explicit.

**Hard rules (carry through):**
- **Compute every rate/cost from the base counts** — native ratio fields are wrong at the
  aggregate.
- **Ratios don't sum across buckets** — attribute via numerator/denominator counts.
- **Thin data → no pattern:** a cyclical slot below the **volume floor** → "insufficient data",
  don't over-read noise.
- **Concentration ≠ cause:** auto-scan finds *where*, not *why*. The "why" beyond the funnel
  identity is a marked interpretation, never an observation.

**Emit** the JSON in [`references/output.md`](references/output.md): per-view findings with
direction + Δ, top buckets + contribution %, inflection (chronological), best/worst slot
(cyclical), and an executive synthesis. A renderer (porter-reporting: **Time matrix** for
chronological, **heatmap** for cyclical) turns it into the human view. Do not bake
emojis/layout into the analysis output.

## Example (illustrative — NOT rules)
- **Concentrated drop:** clicks fell, and ~80% of `ΔClicks` lands in the **last 2 weeks** →
  auto-scan surfaces the *weekly* view, flags the inflection at that week. Catch the turn early.
- **Ratio move:** CTR down — don't sum bucket CTRs; clicks dropped (concentrated late) while
  impressions held → the drag is clicks, not reach.
- **Cyclical pattern:** weekends are the **worst** day-of-week slot above the floor → shift
  budget by schedule. A single thin hour stays "insufficient data".
