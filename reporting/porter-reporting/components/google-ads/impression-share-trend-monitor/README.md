# google-ads/impression-share-trend-monitor

**Search Impression Share — spend-ranked monitor, over time.** One row per **Search campaign**,
ordered by spend, each measured **against itself**: its own-scale IS sparkline, the **4-week-vs-prior-4-week
change**, and a **"limited by"** bar (where the remaining reach is lost — rank vs budget). Click a row to
expand its **week-by-week breakdown** (got / lost-to-rank / lost-to-budget, summing to 100%).

```
Campaign · spend │ IS sparkline (own scale) │ change · 4w │ where reach is lost (bar) → limited by
        click ▸ ─────────────── weekly breakdown: got + rank + budget = 100% per week ──────────────
```

> **Behaviour spec (source of truth):** [`_foundation/component-contract.md`](../../../_foundation/component-contract.md)
> → *Report section* (overview → detail), *Chart highlight / sparkline*, *Tooltip*, *Data-component states*.

## Analysis ↔ component split

This is the **render half**. The **analysis half** — the query plan, the trend classification
(`decay_core`), and the budget-vs-rank driver — lives in **`porter-analysis`**:
[`google-ads/impression-share`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/impression-share).
This component **receives** that output and renders it; it never fetches, classifies, or re-derives the
driver. (The fully-styled, single-file "public" version that bundles analysis + render with literal
Porter colors is a separate prototype — this component is the clean, token-driven split.)

## What it consumes

A **generator**: receives campaign-grain trend rows and returns an HTML string. Public name
**`PorterReporting.impressionShareTrendMonitor`** (`build` / `mount` / `skeleton`). Pass **one** of:

| Input | Shape |
|---|---|
| `rows` | explicit campaign rows (below) |
| `analysis` | the [`impression-share`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/impression-share) output — its `campaigns[]` map 1:1 to `rows` |

**Row shape** (all weekly arrays are **0–100, aligned, and sum to 100** per week):

```js
{
  campaign: "Acme_Auto_SEM_(TL)",
  spend: 184200,                      // 90-day spend, the ranking key
  weeks: ["W18", … "W29"],            // week labels (trimmed of partial edge weeks upstream)
  got:    [25, 27, …],                // weekly impression share (= the "got" segment)
  rank:   [55, 52, …],                // weekly reach lost to rank (auction: bid / Quality)
  budget: [20, 21, …],                // weekly reach lost to budget (money)
  driver: "rank",                     // "rank" | "budget" | "mixed" — from the analysis, NOT recomputed
  prior_is: 30.8, recent_is: 34.8,    // 4-wk-vs-prior-4-wk averages (the change column)
  short: false                        // < 8 weeks of history → narrower window, flagged
}
```

```js
const M = require("./impression-share-trend-monitor"); // browser: window.PorterReporting.impressionShareTrendMonitor

const html = M.build({ rows, sort });   // sort: "spend" (default) | "change" (most-declining first) | "alpha"
M.mount("#host", { rows });             // browser: renders + wires the chips + drill-down
M.skeleton();                           // loading state
```

## What it shows

- **Driver filter chips** — `All · Rank · Budget · Mixed`, filtering rows to that limiter (counts shown).
- **Per-campaign row** — campaign + spend · an **own-scale sparkline** of its IS over time (so a flat
  brand at 82% and a climbing campaign at 30% read as *trajectories*, not as a cross-campaign level
  contest) · the **4-week change** (`prior 4-wk avg → recent 4-wk avg`, colored by direction) · a
  **"limited by" bar** (got / rank / budget of the latest window) + the driver label.
- **Drill-down** — click a row to expand its **weekly stacked breakdown**: one column per week, where
  the **got height IS the impression share** and rank/budget show where the rest of the reach was lost.

## Grain, units & defaults

- **Campaign grain, Search only.** IS only measures the Search auction (≈0 on Demand Gen / Display /
  Video; PMax reflects only its Search slice — out of scope).
- **Weekly arrays are 0–100 and sum to 100** per week (`got + rank + budget`). Aggregation,
  partial-edge-week trimming, and the 4-wk window are done **upstream** in the analysis — this component
  renders what it receives.
- **Default sort = spend** (biggest bets first — the priority). The cross-campaign IS *line chart* is
  deliberately NOT offered: comparing absolute IS across campaigns is misleading (brand always wins);
  each campaign is judged against itself instead.
- **Change = 4-wk vs prior 4-wk** (comparable across campaigns), not first-vs-last week. `short` marks
  under-8-week campaigns where the window narrows.

## Styling is Design's — styling hooks

Ships **no CSS**. Emits the hooks below; **porter-design** styles them from tokens — never literal hex.

| Hook | What it is | Design should key it to |
|---|---|---|
| `.pist-component` | wrapper | layout |
| `.pist-controls` / `.pist-chips` / `.pist-chip` (+`--on` / `--rank` / `--budget` / `--mixed`) / `.pist-dot`(+driver) | control bar · driver filter chips · chip dot | control styling; `--on` = active; dots key to driver tones |
| `.pist-legend` / `.pist-lg` / `.pist-lg-label` / `.pist-sw`(+`--got`/`--rank`/`--budget`) | the got/rank/budget legend | muted; swatches = `--good` · warn · budget tone |
| `.pist-head` | column-header row | eyebrow header |
| `.pist-row`(+`--rank`/`--budget`/`--mixed`) | one campaign row, keyed by its limiter | optional row accent by driver |
| `.pist-rowhead` / `.pist-chev` | the clickable header `<button>` · expand caret | reset button chrome; caret muted |
| `.pist-id` / `.pist-camp` / `.pist-spend` | name + spend block | title · body-muted |
| `.pist-spark` / `.pist-spark-svg` / `.pist-spark-line` / `.pist-spark-dot` | the own-scale sparkline | line = series color · dot = strong |
| `.pist-window` | `prior% → recent%` label | muted mono |
| `.pist-change`(+`--up`/`--down`/`--flat`) / `.pist-short` | the 4-wk change · short-history flag | `--good`/`--bad`/neutral by direction; flag muted |
| `.pist-why` / `.pist-whybar` / `.pist-seg`(+`--got`/`--rank`/`--budget`) | recent "why" bar | `--good` · warn · budget tone |
| `.pist-limiter`(+`--rank`/`--budget`/`--mixed`) | the "limited by" label | meaning tones |
| `.pist-detail` / `.pist-detail-note` | expanded breakdown · its caption | sunken panel · muted |
| `.pist-wkgrid` / `.pist-wkcol` / `.pist-wkbar` / `.pist-wkseg`(+`--got`/`--rank`/`--budget`) / `.pist-wklabel` | weekly stacked columns | column chart; segs = `--good` · warn · budget tone |
| `.pist-empty` | empty state | muted |
| `.pist-skeleton` / `.pist-skel-controls` / `.pist-skel-row` | loading skeleton | skeleton tones |

> Hover **titles** ship on the bar segments and weekly cells as a baseline; the full
> `.pds-tooltip` is Design's (component-contract → *Tooltip*).

## Files

| File | What |
|---|---|
| [`impression-share-trend-monitor.js`](impression-share-trend-monitor.js) | The generator (`build`) + browser `mount` (chips + drill-down) + `skeleton`. Vanilla JS, no deps; browser **and** Node. ZERO CSS. |
| [`impression-share-trend-monitor.html`](impression-share-trend-monitor.html) | Static scaffold (host element). Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance trend rows — 7 campaigns across the driver states (incl. a short-history one). Synthetic. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Demo-only fallback styling, not the component's.) |

## Notes & honest caveats

- **Not competitor data.** This is your own account's IS over time. Competitor Auction Insights cannot
  be built on the connector — see the sibling [`impression-share-competitiveness`](../impression-share-competitiveness/)
  component and `porter-mcp-feedback/05-…`.
- **No real data:** the example uses only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
- **Sparkline charting** is inline SVG (no chart lib) — own-scale, no axes, by design (component-contract
  → sparklines are the axis exception). The drill-down uses CSS-stacked columns, not a chart lib.
