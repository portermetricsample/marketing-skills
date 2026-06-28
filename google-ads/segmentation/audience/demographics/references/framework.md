# Framework: Google Ads — Demographics Segmentation (movement attribution)

Applies [SUMAS](../../../../../_framework/sumas.md) — the **S-step (Segment) made concrete for
demographics** (age + gender). Sub-segment of the `audience/` umbrella.

## S — Strategy
- **Who cares:** the marketer / analyst running the account.
- **Their question:** "Among the people Google *could* identify, which age / gender converts — and
  did a demographic drive *[metric]*'s move?"
- **Decision it triggers:** bid up the efficient segments, down the wasteful; brief creative to the
  segment that actually buys.

## U — Use case
On-demand, two jobs:
1. **Explain a movement** — attribute a metric's change to the age / gender buckets that drove it.
2. **Find the pattern** — the best / worst-converting age range and gender.

Run age and gender as **two separate analyses** — crossing them (age × gender) shreds the already
thin demographic sample into noise.

## M — Method

### Mandatory pre-check — availability + coverage (audience-specific)
Before anything, two checks (see [`../README.md`](../../README.md)):
1. **Availability** — `list_fields` confirms `google_ads_age` / `google_ads_gender` exist.
2. **Coverage** — sum the demographic spend and compare to the account total. Google Ads reports
   demographics only for some campaign types, so the split can cover a small slice. **State the
   coverage %.** If low, every sentence is "within demographic-eligible campaigns…", never an
   account-level claim.

### Contribution to change (the objective core)
For a **count** metric M with total change `ΔM = M(now) − M(prev)`, each segment *s* contributes
`ΔM_s`; rank by `|ΔM_s|` → the segments that **explain** the move (they sum back to ΔM, exact).
For a **ratio** (CPA, ROAS, conv-rate): not summed across segments — attribute via its
numerator/denominator counts (per the reporting **Metric-relationships** rule).

### Keep UNDETERMINED visible
The `AGE_RANGE_UNDETERMINED` / `UNDETERMINED` gender bucket is often the **single largest** — report
it, never drop it (hiding it overstates the known segments), and never optimize on it.

### Efficiency over volume
Judge segments on ROAS / CPA, not spend share — the biggest-spend segment is usually just where the
platform aimed, not where it pays off.

## A — Add context (mandatory)
Every figure carries **vs previous period**. Output written per the **Analysis narrative** + **Metric
-relationships** rules: observation with numbers → dominant driver named → at most one marked
interpretation line. **The coverage % is stated up front**, not buried.

## S — Segments
This case = the **demographics** sub-segment (age · gender). Geography and devices are siblings under
`audience/`; campaign and time are siblings under `segmentation/`.

## Validated finding (Acme Golf, 13 weeks) — the proof
- **Coverage ≈ 13%** of spend ($4.1k of $32.7k); the `UNDETERMINED` bucket was the largest.
- Within the demo'd slice: **age 55–64 was the goldmine — ROAS ≈ 11.8 at the lowest CPA (~$17)**;
  35–44 strong (≈7.0); **65+ worst (≈2.7)**.
- **Gender: male ≈ female ROAS (~6.3)**, but male took ~94% of demo'd spend — a volume skew (golf
  audience), not an efficiency gap. No real gender lever.
- Decision out: in demographic-eligible campaigns, bid up 55–64 / 35–44, trim 65+; leave gender.

## Output (feeds reporting)
A structured finding: `{ metric, dimension (age|gender), coverage %, direction + Δ, top contributing
buckets + share of ΔM, best/worst segment by ROAS/CPA, UNDETERMINED reported }`. Rendered in
`porter-reporting` as a bar chart (segment vs spend) with the coverage % as caption. Naming the viz
is analysis; building it is reporting's job.

## Interpretation / honesty rules
- **Lead with coverage** — a 13%-coverage split is directional, never "the account's best age is…".
- **Never drop UNDETERMINED**; never optimize on it.
- **Don't cross age × gender** — sample too thin.
- **Compute every rate/cost from base counts** — native ratio fields are wrong at the aggregate.
- **Values are enum strings** (`AGE_RANGE_55_64`, `MALE`) — relabel for humans, sort age manually.
- Aggregate flattens trend — cross-check a flagged segment over time (the `time/` case) before acting.

## Delivery format
On-demand analysis; output flows into the monthly report's **Audience** section, per `porter-reporting`.
