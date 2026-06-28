# Framework: Google Ads — Geography Segmentation (movement attribution)

Applies [SUMAS](../../../../../_framework/sumas.md) — the **S-step (Segment) made concrete for
geography**. Sub-segment of the `audience/` umbrella.

## S — Strategy
- **Who cares:** the marketer / analyst running the account.
- **Their question:** "Which locations convert — and did a location drive *[metric]*'s move?"
- **Decision it triggers:** push the efficient locations, trim the wasteful, find expansion /
  exclusion candidates.

## U — Use case
On-demand, two jobs:
1. **Explain a movement** — attribute a metric's change to the locations that drove it.
2. **Find the pattern** — the efficient (and wasteful) locations to bid on.

Runs on the **granularity** that matches the account's footprint: country (multi-country), region
(national default), metro (local media-buying), city (store-radius).

## M — Method

### Availability (quick check)
Geo is richly exposed and ~fully covered (unlike demographics) — but confirm the dimension name with
`list_fields`. Coverage is typically ~100%, so read it as the account.

### Contribution to change (the objective core)
For a **count** metric, each location's `ΔM_loc` sums to ΔM → rank by `|ΔM_loc|` to find what
explains the move. For a **ratio** (ROAS, CPA), attribute via numerator/denominator counts, never
summed across locations (per the reporting **Metric-relationships** rule).

### Efficiency over volume + the long tail
The biggest-spend location is usually just the biggest market, not the best-paying — rank by
ROAS / CPA, then weight by volume. Geo has a **long tail**: sort by value, cap the list, roll up
"all others"; don't render 200 cities.

### Mind `location_type`
"Physical presence" vs "presence OR interest" changes the meaning (someone *in* Texas vs someone
*interested in* Texas). State which the account targets.

## A — Add context (mandatory)
Every figure carries **vs previous period**. Output written per the **Analysis narrative** + **Metric
-relationships** rules: observation with numbers → dominant location named → at most one marked
interpretation line.

## S — Segments
This case = the **geography** sub-segment. Demographics and devices are siblings under `audience/`.
Granularities: country · region · metro · city · most-specific (the parameter).

## Validated finding (Acme Golf, region, 13 weeks) — the proof
- Geo covers ~all spend — read as the account.
- **California leads volume AND efficiency (ROAS ≈ 9.5)**; **Iowa a hidden gem (ROAS ≈ 10.7 on low
  spend)**; **Virginia strong (≈8.4)**.
- **Texas & Florida big spenders but mediocre (ROAS ≈ 5.6)** — the scrutiny list.
- Decision out: bid up CA / Iowa / Virginia, audit TX / FL, test expansion in high-ROAS low-spend states.

## Output (feeds reporting)
A structured finding: `{ metric, granularity, direction + Δ, top contributing locations + share of
ΔM, efficient vs wasteful list, expansion candidates }`. Rendered in `porter-reporting` as a
**choropleth map when an atlas exists, else a ranked bar** (naming the viz is analysis; building it
is reporting's job).

## Interpretation / honesty rules
- **Efficiency over volume** — rank by ROAS/CPA before weighting by spend.
- **Low-spend high-ROAS = expansion; high-spend low-ROAS = bid-down / exclude.**
- **No map atlas for every geography** — Porter's render layer lacks some country atlases (e.g. no
  Canada provinces); there the viz falls back to ranked bars. The analysis is unchanged; only the
  chart shape is.
- **Long tail** — cap the list, roll up "all others".
- **Compute every rate/cost from base counts**; **ratios don't sum across locations**.
- Aggregate flattens trend — cross-check a flagged location over time (the `time/` case).

## Delivery format
On-demand analysis; output flows into the monthly report's **Audience / Geography** section, per
`porter-reporting`.
