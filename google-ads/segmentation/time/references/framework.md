# Framework: Google Ads — Time Segmentation (movement attribution)

Applies [SUMAS](../../../../_framework/sumas.md) — the **S-step (Segment) made concrete for time**.
First member of the `segmentation/` family: explain a metric's movement by **when** it happened.

## S — Strategy
- **Who cares:** the marketer / analyst running the account.
- **Their question:** "Why did *[metric]* move — and *when*?" (which periods, or which recurring slots).
- **Decision it triggers:** where in time to act — catch the turn early, fix the weak day/hour, schedule budget.

## U — Use case
On-demand, two jobs:
1. **Explain a movement** — attribute the change in a metric to the time buckets that drove it.
2. **Find recurring patterns** — the best / worst day-of-week and hour-of-day.

Runs in **auto-scan** (try every time view, surface the one that explains the most) or on a
**specified** time view.

## M — Method

### Two time families (they answer different questions)
- **Chronological** — day / week / month / quarter / year. Question: *what is the trend, and when did it turn?*
- **Cyclical** — day-of-week, hour-of-day. Question: *what is the recurring pattern?* (the DoW×hour heatmap).

### Contribution to change (the objective core)
For a **count** metric M with total change `ΔM = M(now) − M(prev)`, each time bucket *b* contributes
`ΔM_b`. The buckets ranked by `|ΔM_b|` are the ones that **explain** the move — and they sum back to
ΔM, so it's exact, not a guess. Report the top contributors with their **share of ΔM**.

For a **ratio** (CTR, CPA, ROAS): a ratio's total is **not** the sum of bucket ratios, so we do
**not** sum a ratio's "contributions". Instead — per the reporting **Metric-relationships** rule —
decompose the ratio into its numerator/denominator counts and attribute *those counts'* movements to
the buckets. Example: *"CTR fell; clicks dropped, concentrated in the last 2 weeks, while impressions held."*
Objective, no mix-vs-rate modelling (out of scope for v1).

### Auto-scan
Run the contribution analysis across all time views and rank them by **concentration** — how much of
the movement piles into a few buckets. A drop that is *all in the last 2 weeks*, or *all on weekends*,
is a stronger explanation than one spread evenly. Surface the most-concentrated view; offer the rest.

### Inflection (chronological)
Flag the period where the trend changed direction (the turn), so *"when did it start"* is explicit.

## A — Add context (mandatory)
Every figure carries **vs previous period**. The output is written per the **Analysis narrative** and
**Metric relationships** rules: observation with numbers → dominant driver named → at most one marked
interpretation line. Causes outside the data (seasonality, holidays, mix) are marked as interpretation,
never stated as observation, unless a calendar source is wired.

## S — Segments
This case = the **time** segment. Granularities: day · week · month · quarter · year (chronological);
day-of-week · hour-of-day (cyclical). Campaign, audience, device, geo are **sibling** segmentations
under `segmentation/`, same engine, later.

## Output (feeds reporting)
A structured finding: `{ metric, view, direction + Δ, top buckets + contribution %, inflection
(chronological), best/worst slot (cyclical) }`. Rendered in `porter-reporting` by the **Time matrix**
(chronological) and a **heatmap** (cyclical day-of-week × hour), wrapped in the objective relationship
narrative.

## Interpretation / honesty rules
- **Compute every rate/cost from base counts** — never trust native ratio fields at the aggregate
  (validated wrong elsewhere in this repo).
- **Ratios are never summed across buckets** — attribute via numerator/denominator counts.
- **Thin data → no pattern:** a cyclical slot (a given hour, a given weekday) needs a volume floor
  before a pattern is claimed; below it, say *"insufficient data"*, don't over-read noise.
- **Concentration ≠ cause:** auto-scan finds *where* the movement sits, not *why*. The "why" beyond
  the funnel identity (seasonality, auction, a launch) is a marked interpretation.

## Delivery format
On-demand analysis; the output flows into the monthly report's **Time** section (Time matrix +
day-of-week × hour heatmap), per `porter-reporting`.
