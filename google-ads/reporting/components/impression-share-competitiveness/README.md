# google-ads/impression-share-competitiveness

**Search Impression Share — auction competitiveness (your account)** — one row per **campaign**:
how much of the top-of-page Search auction you win, and where you lose the rest (rank vs budget).

```
Campaign | Spend | Top IS | Abs. top | Lost·rank | Lost·budget | coverage bar | Limited by
                                                                         ↳ Top + Lost·rank + Lost·budget = 100%
```

> **Behaviour spec (source of truth):** [`_foundation/component-contract.md`](../../../_foundation/component-contract.md)
> → *Report section* (eyebrow → finding → visualization) + *Data-component states*.

## Why this exists — the honest substitute for Auction Insights

The Google Ads **Auction Insights** report (named competitor domains, with overlap rate / outranking
share / position-above rate / top-of-page rate **per rival**) **cannot be built** on the Porter
google-ads connector. Verified live on a connected Google Ads account (2026-06-23):

- The catalog exposes the six `auction_insight_*` **metrics** but **no competitor/domain dimension**
  to attribute them — so they collapse to one dimensionless aggregate per campaign.
- Those metric queries fail with `reauth_required` on a connected account (control queries on the same
  token succeed) — so they don't even return.

Full write-up: `~/porter-mcp-feedback/05-google-ads-auction-insights-no-competitor-dimension.md`
(repo `portermetricsample/porter-mcp-feedback`).

This component is the **best IS-based view Porter can support**: your **own** auction competitiveness,
from the impression-share fields that *do* work. It is labelled as such and **never invents rivals** —
it renders a standing honesty note saying it is not competitor data.

## What it consumes

A **generator**: it receives campaign-grain Impression Share and returns an HTML string. Public name
**`PorterReporting.impressionShare`** (`build` / `mount`). Pass **one** of:

| Input | Shape |
|---|---|
| `metrics` | the [`keyword-ad-landing-metrics`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/keyword-ad-landing/metrics) output — its `journeys[]` are **deduped to one row per campaign** (campaign-grain IS lives in `campaign_context`, identical across a campaign's ad groups; spend sums). This is how it composes with the **alignment journey** use case. |
| `rows` | explicit campaign rows: `{ campaign, spend, search_top_impression_share, search_absolute_top_impression_share, rank_lost_top_impression_share, budget_lost_top_impression_share, is_lost_to }` |

```js
const IS = require("./impression-share-competitiveness"); // browser: window.PorterReporting.impressionShare

const html = IS.build({
  metrics,            // keyword-ad-landing-metrics output …
  // rows,            // … OR explicit campaign IS rows
  sort,               // "spend" (default) | "exposure" (lowest top IS first) | "budget" | "rank" | "alpha"
  emptyMessage
});

// Self-contained (browser): renders the table AND its own sort control.
PorterReporting.impressionShare.mount("#host", { metrics });
```

## What it shows

- **Honesty note** — this is your own competitiveness, not competitor Auction Insights (see above).
- **Summary** — N campaigns · total Search spend · **spend-weighted top IS** · the **spend sitting
  behind rank-limited** and **budget-limited** campaigns (where money is capped).
- **Per-campaign row** — Top IS · Abs. top IS · Lost-to-rank · Lost-to-budget · a **coverage bar**
  (Top + Lost·rank + Lost·budget = 100% of the top-eligible auctions) · a **"Limited by"** chip.
- **Limited-by** = the budget-vs-rank diagnosis from the metrics skill's framework: **Strong top
  coverage** (top IS ≥ 80%) · **Rank-limited** · **Budget-limited** · **Rank + budget limited** (both
  losses ≥ 20%). It reads the skill's numbers — it does not invent a score.

## Grain & units

- **Campaign grain.** Impression Share is campaign-grain in the metrics skill's contract
  (`campaign_context`). (Porter *will* return finer-grain IS if asked, but it's bucketed/estimated —
  see the alignment component's README note. This view stays at the clean campaign grain.)
- **IS values are fractions (0–1)** — the metrics skill normalizes Porter's 0–100 percent scale to a
  fraction; this component renders them via `pct()`. Feed fractions, not percents.

## Styling is Design's — styling hooks

Ships **no CSS**. Emits the hooks below; **porter-design** styles them from tokens — never literal hex.

| Hook | What it is | Design should key it to |
|---|---|---|
| `.pis-component` / `.pis-controls` / `.pis-filter` / `.pis-sort` | wrapper · control bar · labelled control · the `<select>` | layout · control styling |
| `.pis-note` | the "not competitor Auction Insights" honesty note | muted callout |
| `.pis-summary` / `.pis-sum-stats` | the roll-up banner | sunken card |
| `.pis-sum-stat` + `--spend` / `--weighted-is` / `--rank` / `--budget` | a roll-up stat | strong; `--rank` warn · `--budget` budget tone |
| `.pis-table` / `.pis-head` | the table · its header row | table chrome · eyebrow header |
| `.pis-row` + `--strong` / `--rank` / `--budget` / `--both` | one campaign row, keyed by its limiter | row accent by limiter |
| `.pis-camp` / `.pis-spend` | campaign name · spend | title · body |
| `.pis-is` + `--top` / `--abs` | the two impression-share values | `--top` strong · `--abs` muted |
| `.pis-lost` + `--rank` / `--budget` | the two lost-IS values | warn · budget tone |
| `.pis-coverage` / `.pis-bar` (+ `--empty`) | the coverage cell · the bar track | fixed-width cell · track |
| `.pis-bar-seg` + `--top` / `--lost-rank` / `--lost-budget` | the three bar segments | `--good` · warn · budget tone |
| `.pis-limiter` + `--strong` / `--rank` / `--budget` / `--both` | the "Limited by" chip | four meaning tones (`--good` … `--bad`) |
| `.pis-empty` / `.pis-skeleton` | empty state · loading skeleton | muted · skeleton |

## Files

| File | What |
|---|---|
| [`impression-share-competitiveness.js`](impression-share-competitiveness.js) | The generator (`build`) + browser `mount` (sort) + `skeleton`. Vanilla JS, no deps; browser **and** Node. |
| [`impression-share-competitiveness.html`](impression-share-competitiveness.html) | Static scaffold (sort control + host). Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance metrics output. Four campaigns across the four limiter states. Synthetic. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Demo-only fallback styling, not the component's.) |

## Notes & honest caveats

- **Not competitor data — by design.** This is your own IS. The competitor table can't be built (see
  "Why this exists"); when the connector gains an `auction_insight_domain` dimension *and* the
  `reauth_required` is fixed, a separate true-Auction-Insights component becomes possible. This one
  stays honest about what it is.
- **No deltas vs previous period (yet).** The metrics skill emits a single-period snapshot; add Δ chips
  when it carries a previous-period block.
- **Search campaigns only.** IS only measures the Search auction (it returns 0 / nothing on
  Demand Gen / Display / Video / App). PMax IS reflects only its Search slice — out of scope here.
- **No real data:** the example uses only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
