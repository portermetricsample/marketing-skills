# google-ads/campaign-performance-table

**Campaign Performance** — the canonical **SUMAS entity table**: one row per campaign, columns
grouped by SUMAS stage, every number carrying its inline Δ vs the previous period.

```
<campaign>  |  Budget  |  Visibility  |  Engagement  |  Conversion
```

> **Behaviour spec (source of truth):** [`_foundation/component-contract.md` → "Table" +
> "Canonical shape — the SUMAS table"](../../../_foundation/component-contract.md#table). This
> folder **implements** that rule; it does not restate it. Canonical example: the Acme Insurance
> report **"Campaigns"** page (`cmp_table`).

## When to use

The user wants to **compare campaigns side by side across the full funnel** — a report's
*Campaigns* page, "how is each campaign doing", "which campaigns are winning / wasting", an
entity table where each row is one campaign and each column group is a SUMAS stage. The same
component works for any entity grain (ad groups, etc.) by changing the dimension upstream and the
`fields` map.

## What it receives → emits

A **generator**: it receives campaign rows and returns an HTML string. It never fetches data and
never hardcodes appearance.

```js
const C = require("./campaign-performance-table");   // browser: window.PorterReporting.campaignPerformanceTable

// Pure table:
const html = C.build({
  rows,            // [{ google_ads_campaign_name, …, google_ads_cost_micros, … }, …]
  previousRows,    // optional: same shape, previous period — powers the Δ chips (matched by campaign name)
  fields,          // optional: rename the base keys for another connector (see BASE)
  sort,            // "conv" (default) | "cpa" | "budget" | "alpha"
  search,          // optional: campaign-name contains
  campaign,        // optional: exact campaign-name filter
  type,            // optional: exact campaign-type filter
  biddingStrategy, // optional: exact bidding-strategy filter
  periodDays       // optional: # days in the range — enables the "Budget used %" sub-metric
});

// Full module (browser): renders the table AND its own filter / sort / search bar,
// re-rendering client-side on change.
C.mount("#host", { rows, previousRows });
```

- **Input** = a per-campaign set of **base counts** + the campaign's status / type / bidding
  strategy / id / daily budget / impression-share splits (won, lost-to-budget, lost-to-rank). The
  generator **derives** the rates itself — CTR, CPC, CPM, **CVR**, Cost/conv., ROAS, and **Budget
  used %** (when `periodDays` is given). Pass the counts; do not pre-average rates upstream.
- `cost` and `budget` are read **as-is in currency units** — Porter delivers the `*_micros`
  fields already converted, so the component does **not** divide by 1e6.
- **Output** = one `<table class="cpt">` ready to drop into any page scaffold.

## Required fields — a faithful render shows ALL of these (never drop one)

This is the **definition of done** for any render of this table — including a Claude Design card or
any AI that re-draws it from this spec. Every campaign **row** must show, in full:

- **Campaign** — status dot · name (Google Ads deep-link) · **campaign-type badge** · **bidding /
  optimization-strategy badge**
- **Budget** — Cost · Daily budget · Budget used % *(when the period length is known)*
- **Visibility** — Impressions · Search IS · IS lost (budget) · IS lost (rank) · CPM
- **Engagement** — Clicks · CTR · CPC
- **Conversion** — Conversions · CVR · Conv. value · Cost / conv. · ROAS

Plus: **every numeric carries its Δ vs the previous period**, and each stage cell is heat-tinted.
A render that collapses a stage to its headline, hides a sub-metric, or omits a badge is
**INCOMPLETE — that is a bug, not a styling choice.** (A prior Claude Design pass silently dropped
*Daily budget*, *Search IS*, and the *bidding badge* — this contract exists so that can't recur.)

## Behaviour (implemented here)

- **Columns:** `Campaign | Budget | Visibility | Engagement | Conversion`. Each stage cell = a
  **headline metric + stacked sub-metrics**:
  - **Budget** → Cost · *Daily budget · Budget used %* (the last only when `periodDays` is provided)
  - **Visibility** → Impressions · *Search IS · IS lost (budget) · IS lost (rank) · CPM*
  - **Engagement** → Clicks · *CTR · CPC*
  - **Conversion** → Conversions · *CVR · Conv. value · Cost/conv. · ROAS* (ROAS coloured good/bad vs the **account** ROAS)
- **Δ vs previous period, inline in every cell** (value + delta, never a separate column), **coloured
  by meaning**: cost-type metrics are **inverted** (a falling CPC/CPM/CPA is good/green); ROAS up is
  good; raw spend up is neutral-by-direction. Needs `previousRows` (else chips are omitted).
- **Per-stage heat:** each stage cell is tinted by its **headline metric's magnitude across the
  visible campaigns** (Budget→cost, Visibility→impressions, Engagement→clicks, Conversion→conversions),
  mapped to the 5-step ramp `--cf-1…--cf-5`. The campaign column is never tinted. Heat = "how big vs
  peers"; good/bad is carried by the delta, not the tint.
- **Campaign cell:** a **status dot = the campaign's _current_ status** (reads `campaign_status`):
  **green = Enabled, grey = Paused or Removed** (two states). The dot also carries a `title` +
  `aria-label` with the **exact** status word (Enabled / Paused / Removed), so the precise status is
  still readable on hover, by screen readers, and by colour-blind readers · the campaign name as a link
  that **opens that campaign in Google Ads in a new tab** (`target="_blank"`, by `campaign_id`) · a
  **campaign-type** badge · a **bidding-strategy** badge.
- **Controls (full module):** Campaign filter · Campaign-type filter · Bidding-strategy filter · Sort
  (Conversions / Cost-per-conv. / Budget / A–Z) · Search box. All client-side in `mount`.
- **Empty input →** the *No campaigns for this range* state.

## Styling is Design's — styling hooks

This component ships **no CSS** (per the repo split: this repo holds **structure + behaviour**, the
design system holds **all appearance**). It emits the class hooks below; **porter-design** styles
them. Colours must come from tokens — never literal hex.

| Hook | What it is | Design should key it to |
|---|---|---|
| `.cpt-component` / `.cpt-controls` / `.cpt-filter` | wrapper · control bar · one labelled control | layout, spacing |
| `.cpt-campaign` `.cpt-type` `.cpt-bid` `.cpt-sort` | the `<select>` filters | control styling |
| `.cpt-search` | the search `<input>` | pill input |
| `.cpt` | the table | table chrome |
| `.cpt thead th` | column headers | sticky, uppercase label type |
| `.cpt-camp` | campaign (entity) column | wide min-width; **no heat tint** |
| `.cpt-cell` | a SUMAS stage cell | top-aligned; **heat = inline `background:var(--cf-N)`** |
| `.cpt-mv` | the headline value | large/bold number |
| `.cpt-sub` | a sub-metric line | small, muted, block |
| `.cpt-dot` + `--active` / `--inactive` | status dot — **green = Enabled, grey = Paused/Removed**; exact status in `title`/`aria-label` | `--good` (green) / muted grey |
| `.cpt-link` | campaign name link | text + hover |
| `.cpt-badge` + `--type` / `--bid` | campaign-type · bidding-strategy badges | two accent pills |
| `.cpt-delta` + `--good` / `--bad` / `--flat` | the Δ chip | `--good` / `--bad` / muted |
| `.cpt-roas--good` / `--bad` | ROAS value colour | `--good` / `--bad` |
| `.cpt-empty` | empty state | muted message |
| heat ramp `--cf-1 … --cf-5` | the red→green magnitude ramp (a porter-design token, also used by `charts/breakdown-matrix`) | reuse it |

## Files

| File | What |
|---|---|
| [`campaign-performance-table.js`](campaign-performance-table.js) | The generator (`build`) + browser `mount` (control bar + re-render). Vanilla JS, no deps; browser **and** Node. |
| [`campaign-performance-table.html`](campaign-performance-table.html) | Static scaffold (control bar + host) for wiring into a live report. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance campaigns (current + previous period). Synthetic — not real. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Its styles are a clearly-marked demo-only fallback, not the component's.) |

## Wiring into a live Porter report

The live `cmp_table` chart pulls these per campaign — dimensions `campaign_name`, `campaign_id`,
`campaign_status`, `campaign_advertising_channel_type`, `campaign_bidding_strategy_type`; metrics
`cost_micros`, `impressions`, `clicks`, `conversions`, `conversions_value`, `search_impression_share`,
`campaign_budget_amount_micros`; controls `date_range` (**compare ON** — that is what feeds
`previousRows`) + `filters`. In the report page:

```js
// the page provides the scaffold (campaign-performance-table.html); then:
Porter.renderChart("cmp_table", ".cpt-host", function (data, host, ctx) {
  host.innerHTML = PorterReporting.campaignPerformanceTable.build({
    rows: data.rows,
    previousRows: ctx.previous ? ctx.previous.rows : []   // compare ON → deltas
  });
});
```

The Campaign-type / Bidding filters can be bound to **Porter's native `filterPicker`** (which
re-queries) instead of the component's client-side ones, when you want server-side filtering.

## Notes & honest caveats

- **No Python here on purpose.** The metric math and the "why" of a movement live in
  **porter-analysis** (`funnel-metrics`). Reporting renders what analysis named; a second engine
  re-deriving it is the redundancy `RULES.md` warns against. If a server-side (Python) render of
  this table is ever needed, it should consume the analysis output, not recompute it.
- **The two badges are Campaign Type + Bidding Strategy — not "conversion type."** Bidding strategy
  is conversion-*related* (what the campaign optimises toward); there is no conversion-type tag on
  this table. Add one explicitly if a report needs it.
- **Status = two colours, exact label.** The dot is **green = Enabled, grey = Paused/Removed** — what
  matters at a glance is running vs not, and a third (red) colour read as "error" rather than
  "archived". The *exact* status (Enabled / Paused / Removed) still rides in the `title` + `aria-label`,
  so nothing is lost, and green↔grey is far more colour-blind-safe than green↔red. (Google Ads campaign
  status has exactly these three values — ENABLED / PAUSED / REMOVED — there is no fourth.)
- **Heat caveat (inherited from the spec):** the ramp tints low→high = green, so a high *cost* cell
  can read green even though rising cost is usually bad. Mitigated here because **good/bad is carried
  by the delta chip**, not the tint (the tint is pure magnitude vs peers). Kept faithful to the
  canonical example.
- **No real data:** examples use only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
