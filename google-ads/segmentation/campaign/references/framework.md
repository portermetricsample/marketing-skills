# Framework: Google Ads — Campaign Segmentation (movement attribution)

Applies [SUMAS](../../../../_framework/sumas.md) — the **S-step (Segment) for campaign**. Sibling of
[`segmentation/time/`](../../time/references/framework.md); same engine (contribution to change), campaign dimension.

## S — Strategy
- **Who cares:** the marketer / analyst running the account.
- **Their question:** "Which campaign drove *[metric]*'s up/down — and where is spend/return concentrated?"
- **Decision it triggers:** where to shift budget; which campaign to fix or cut.

## U — Use case
On-demand:
1. **Explain a movement** — attribute a metric's change to the campaigns that drove it.
2. **Concentration** — which campaigns carry most of the spend / conversions / value.
3. **Entry / exit** — new or paused campaigns that mechanically explain a change.

Cross-cut by **campaign type** (Search · PMax · Shopping · Demand Gen · Display · Video) — the
fingerprint that gates what's reportable.

## M — Method

### Contribution to change (the objective core)
For a **count** metric M with total `ΔM = M(now) − M(prev)`, each campaign *c* contributes `ΔM_c`;
campaigns ranked by `|ΔM_c|` are the ones that **explain** the move, and they sum back to ΔM.
Report the top contributors with their **share of ΔM**.

For a **ratio** (CTR, CPA, ROAS): not summed across campaigns — decompose into numerator/denominator
counts and attribute *those* to campaigns (per the reporting **Metric-relationships** rule). No
mix-vs-rate modelling in v1.

### Concentration
Cumulative share — e.g. "top 3 campaigns = 70% of spend". Flags over-reliance on a few campaigns.

### Entry / exit (structural vs like-for-like)
A campaign present in only ONE period (newly launched, or paused) **mechanically** moves the total.
Separate this **entry/exit effect** from the change of campaigns running in BOTH periods — otherwise
"Generic fell" gets confused with "a new campaign turned on".

## A — Add context (mandatory)
Every figure carries **vs previous period**. Output is written per the **Analysis narrative** and
**Metric relationships** rules: observation with numbers → dominant campaign named → at most one
marked interpretation. Causes beyond the data (a launch, a budget change, seasonality) are marked
interpretation, not observation.

## S — Segments
This case = the **campaign** segment (+ **campaign type** as a grouping). Siblings under
`segmentation/`: time (built), audience (planned). Same contribution engine.

## Output (feeds reporting)
A structured finding: `{ metric, direction + Δ, top contributing campaigns + contribution %,
concentration (top-N share), entrants/exits, by campaign type }`. Rendered in `porter-reporting`
by the **SUMAS table** (rows = campaigns × SUMAS columns), the **breakdown bar** (e.g. cost by
campaign), and the **contribution view** (which campaign explains the Δ).

## Interpretation / honesty rules
- **Compute every rate/cost from base counts** — native ratio fields are wrong at the aggregate.
- **Ratios are never summed across campaigns** — attribute via numerator/denominator.
- **Entry/exit ≠ performance change** — a campaign turning on/off is structural; report it apart
  from like-for-like movement.
- **Campaign type gates metrics** — PMax / Shopping don't expose keywords/search terms; don't
  compare type-incomparable sets as if equal.
- **Contribution ≠ cause** — it locates *which* campaign, not *why*; the "why" is a marked interpretation.

## Delivery format
On-demand analysis; flows into the report's campaign section (SUMAS table + breakdown + contribution).
