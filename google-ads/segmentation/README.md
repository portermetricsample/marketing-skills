# Segmentation (movement attribution)

A family of analyses that explain a metric's movement by **where it concentrates** — which
segment drove the up or down — using **contribution to change**. It pairs with the reporting
**Metric-relationships** rule (which *sub-metric* moved) to answer **what + where** together.

> The easy part is slicing the data. The value is **explaining the ups/downs**: ranking the
> segments that account for the change, objectively (arithmetic, not opinion).

## Members

| Segment | Folder | Status |
|---|---|---|
| **Time** (day / week / month / quarter / year + day-of-week / hour) | [`time/`](time/) | built |
| **Campaign** (+ campaign type) | [`campaign/`](campaign/) | built |
| **Audience** (umbrella: demographics · geography · devices) | [`audience/`](audience/) | built |

> **Audience is an umbrella**, not a single member — it holds demographics (age + gender),
> geography (country › region › metro › city) and devices, because each has its own availability,
> chart and decision. It also carries the audience-only **availability + coverage** pre-check (some
> criteria aren't exposed; some cover only part of spend). See [`audience/README.md`](audience/README.md).

## Shared method (all members)

- **Contribution to change** — for a **count** metric, each segment's Δ sums to the total Δ; rank
  by |Δ| → the top segments *explain* the move.
- **Ratios are not summed across segments** — a ratio's total isn't the sum of segment ratios.
  Attribute a ratio's move via its **numerator/denominator counts** (per the reporting Metric-
  relationships rule). No mix-vs-rate modelling in v1.
- **Auto-scan or specified** — run across all segmentations and surface the one that *most
  concentrates* the movement, or analyse a dimension you name.
- Output is written per the **Analysis narrative** rules: observation with figures, dominant
  driver named, off-data causes (seasonality, mix) marked as interpretation.
