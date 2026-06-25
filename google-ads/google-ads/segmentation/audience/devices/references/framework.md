# Framework: Google Ads — Devices Segmentation (movement attribution)

Applies [SUMAS](../../../../../_framework/sumas.md) — the **S-step (Segment) made concrete for device
type**. Sub-segment of the `audience/` umbrella.

## S — Strategy
- **Who cares:** the marketer / analyst running the account.
- **Their question:** "Does one device convert so differently that bids or the landing should change
  — and did a device drive *[metric]*'s move?"
- **Decision it triggers:** device bid adjustments, and making sure the device carrying most spend
  has a landing / checkout that holds up.

## U — Use case
On-demand, two jobs:
1. **Explain a movement** — attribute a metric's change to device types.
2. **Find the pattern** — device efficiency and where spend concentrates.

## M — Method

### Availability
Device is fully exposed and ~100% covered — no Undetermined bucket. Confirm `google_ads_device` via
`list_fields`.

### Contribution to change + spread
For a **count** metric, each device's `ΔM_dev` sums to ΔM → rank by `|ΔM_dev|`. For a **ratio**
(ROAS, CPA), attribute via numerator/denominator counts, never summed across devices.
**Then check the spread:** if ROAS sits in a tight band across devices, there is **no bid lever** —
pivot to "which device carries the spend, and is its UX solid?". Only a genuine gap (e.g. mobile ROAS
half of desktop) justifies a bid-down + a UX investigation.

## A — Add context (mandatory)
Every figure carries **vs previous period**. Output written per the **Analysis narrative** + **Metric
-relationships** rules.

## S — Segments
This case = the **devices** sub-segment. Demographics and geography are siblings under `audience/`.

## Validated finding (Acme Golf, 13 weeks) — the proof
- **Full coverage (~$32.7k, 100% of spend)** — no Undetermined bucket.
- **Mobile carries 71% of spend** (ROAS ≈ 6.25); desktop slightly better (≈6.6); tablet ≈6.0;
  connected-TV negligible (≈$10, 0 conv).
- **Honest read: device is a WEAK lever here** — ROAS even (6.0–6.6), no segment worth a big bid
  swing. The takeaway is "mobile-first": 71% of spend rides on mobile, so the mobile landing /
  checkout must be flawless.
- **A "no strong signal" result is valid** — say so, don't manufacture a recommendation.

## Output (feeds reporting)
A structured finding: `{ metric, direction + Δ, device contributions + share of ΔM, ROAS spread
(lever or no-lever), dominant-spend device }`. Rendered in `porter-reporting` as a small bar chart or
table (≤4 categories). Naming the viz is analysis; building it is reporting's job.

## Interpretation / honesty rules
- **Even ROAS = no lever** — don't over-read tiny differences into a recommendation.
- **Connected-TV / tablet are often negligible** — fold into the read, don't weight a near-zero row
  equally.
- **Compute every rate/cost from base counts**; **ratios don't sum across devices**.
- Aggregate flattens trend — cross-check a flagged device over time (the `time/` case).

## Delivery format
On-demand analysis; output flows into the monthly report's **Audience / Devices** section, per
`porter-reporting`.
