# charts/breakdown-matrix

A transposed matrix: **metrics down the side (rows), a breakdown across the top (columns)**, with
a leading **Total** and per-row heat. The breakdown is **pluggable** — that is the whole point:

- **time** → bucketed by day / week / month / quarter (the canonical case, ex-"Time matrix")
- **category** → any dimension: campaign · ad group · campaign type · product · device · landing page · …

> **Behaviour spec (source of truth):** [`_foundation/component-contract.md` → "Breakdown
> matrix"](../../../_foundation/component-contract.md#breakdown-matrix-metrics--any-breakdown).
> Canonical example: the Acme Insurance report "Time" page (`ga_time`) — the time case.

## When to use

The user wants to **watch the same KPIs across a breakdown** — over time ("weekly trend"), or across
campaigns / ad groups / campaign types / products ("how does each campaign compare on the funnel").
One account, one metric set, columns = whatever they're breaking down by.

> **Two things are caller-controlled (nothing hardcoded):** the **metric rows** and the **column
> breakdown**. SUMAS + time are only the defaults.

## What it receives → emits

A **generator**: receives a data series, returns an HTML string. Never fetches; never hardcodes look.

```js
const bm = require("./breakdown-matrix");        // browser: window.PorterReporting.breakdownMatrix

// time (default metrics = SUMAS funnel)
bm.build({ series, breakdown: { type: "time", granularity: "week" } });

// by campaign
bm.build({ series, breakdown: { type: "category", field: "campaign" } });

// by campaign type, with a caller-provided metric set (metrics are NOT hardcoded)
bm.build({
  series,
  breakdown: { type: "category", field: "campaign_type" },
  metrics: [
    { key: "cost",        label: "Cost",        format: "money" },
    { key: "clicks",      label: "Clicks",      format: "int"   },
    { key: "ctr",         label: "CTR",         format: "pct2"  },
    { key: "conversions", label: "Conversions", format: "dec"   },
    { key: "roas",        label: "ROAS",        format: "ratio" },
  ],
});

// self-contained (browser): renders the grid + control bar and rebuilds on change.
// Pass `breakdowns` to get a "Segment by" dropdown; "View by" (granularity) shows
// only while the segment is time. Live switching re-slices ONE granular series (a row
// per finest grain × every dimension), or pass `dataFor(breakdown) -> series` to
// supply / lazy-load a series per dimension for large accounts.
bm.mount("#host", {
  series,
  breakdowns: [
    { id: "time",      label: "Time",      type: "time",     granularity: "week" },
    { id: "campaign",  label: "Campaign",  type: "category", field: "campaign" },
    { id: "objective", label: "Objective", type: "category", field: "objective" },
    { id: "product",   label: "Product",   type: "category", field: "product" },
  ],
});
```

### `breakdown`

| Field | For | Meaning |
|---|---|---|
| `type` | both | `"time"` (default) or `"category"`. |
| `granularity` | time | `"day"` / `"week"` (default) / `"month"` / `"quarter"`. `mount` renders the toggle. |
| `dateField` | time | the row's date column (default `date`). |
| `field` | category | the dimension column to break down by (e.g. `campaign`, `ad_group`, `product`). |
| `bucket(row)` | category | optional — derive the column key yourself (e.g. group campaigns into a product). |
| `orderBy` / `orderDir` | category | metric to order columns by (default: the first metric, biggest first). |
| `limit` | category | optional cap on number of columns. **Default: none — show all, scroll** (Juan's call). |

### `metrics` (rows)

A flat list, optionally `group`-tagged (consecutive same-group rows get a header row). Each entry:
`{ key, label, format, group?, value?(derived, agg) }`.

- `key` selects a built-in derived metric: `cost · impressions · is · cpm · clicks · ctr · cpc ·
  conversions · convValue · roas · cpa` (computed from the base counts — including the
  **impression-weighted** Search IS).
- `format` is one of `money · money2 · int · dec · pct1 · pct2 · ratio`, or your own `fn(value)`.
- `value(derived, agg)` lets you compute a **custom** metric from the period/segment aggregate.
- Omit `metrics` to get the default **SUMAS funnel** (Budget · Visibility · Engagement · Conversion).

The input is a series of **base counts** (`date, cost, impressions, clicks, conversions, conv_value,
impression_share`, renamable via `fields`). The component buckets and **derives the rates itself** —
pass counts, not pre-averaged rates.

## Behaviour

- **Columns:** `KPI · Total · the breakdown`. Time → periods newest→oldest. Category → ordered by the
  primary metric, biggest first; **all values shown** (horizontal scroll when they exceed the width).
- **Per-row heat:** each cell tinted against that row's own min/max across the columns, on the 5-step
  `--cf-1…--cf-5` ramp (low→high = red→green). The **Total** column is never tinted.
- **Formatting** per metric; empty/zero money & rate cells render `—`; empty series → *No data*.
- For **long lists** (every campaign, every ad group) consider the entity-row **SUMAS table** instead
  (component-contract → *Table*) — it's built for high cardinality (10 rows + scroll).

## Appearance is Design's

No colour/font in the JS. Heat ramp (`--cf-*`), fonts, borders all come from **porter-design** via
[`breakdown-matrix.css`](breakdown-matrix.css). Render inside a theme scope (`<div data-theme="white">`).

> **Honest caveat (from the spec):** the ramp tints low→high = green, so a high *cost* row (CPM/CPC/CPA)
> shows green for its biggest column even though rising cost is usually bad. Faithful to the canonical
> example; invert cost rows later if it misleads.

## Files

| File | What |
|---|---|
| [`breakdown-matrix.js`](breakdown-matrix.js) | The generator (`build` + `mount` + helpers). Vanilla JS, no deps; browser + Node. |
| [`breakdown-matrix.css`](breakdown-matrix.css) | Structure only — all colour/type via tokens. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance series (day × campaign) — demo only, not real. |
| [`demo.html`](demo.html) | Labeled fictional demo: the same component broken down 3 ways. Open in a browser. |
