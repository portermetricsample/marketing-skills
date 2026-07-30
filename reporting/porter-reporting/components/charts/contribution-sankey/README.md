# charts/contribution-sankey

A **contribution sankey**: a left → right flow diagram where a total fans out through
columns of nodes joined by **ribbons whose width = the chosen metric** flowing through them.
It answers *"where does my spend / conversions / value actually go"*, level by level — the
proportions are the message.

```
[ root ] ═╦═ [ A ] ═╦═ [ A1 ] ─ …
          ║         ╚═ [ A2 ] ─ …
          ╚═ [ B ] ═══ [ B1 ] ─ …
```

This folder is the **general framework** — a **connector-agnostic engine** that draws *any*
layered weighted flow (nodes + links, each carrying a value per metric). It knows nothing about
Google Ads, Meta or GA4. The platform-specific knowledge (which fields, how to bucket rows into
levels, the honest "remainder" buckets that keep each column reconciled) lives in a **use case**
next to it:

> **Use cases implemented here** ([`google-ads/`](google-ads/)):
> - **[Account contribution](google-ads/README.md)** — a Google Ads account as a flow:
>   Campaign type → Campaign → Ad group → Keyword → Search term, **flow by** spend / conversions /
>   conv. value, with a **depth** toggle (stop at Keyword, or extend to Search term).

**Sibling of [`charts/driver-tree`](../driver-tree/):** same hierarchy, different shape. The
tree draws each node as a **card of metrics** joined by thin connectors (read the numbers); this
draws **ribbons whose thickness is the metric** (read the proportion / where volume concentrates).

## Job to be done

> *"As an advertiser/analyst, I want to see what is driving my account's activity — where spend
> concentrates and what it returns — so I can decide where to push, trim, or investigate."*

**One-liner:** *Where does my budget actually go, and what does each branch return?* In one picture:
where the budget goes, what each branch returns (switch the metric), where volume concentrates vs.
spreads thin, and how much is unaccounted for (the grey "other / unreported" buckets — the honest gap).

**The three metrics it flows by** — the "Flow by" control re-weights every ribbon, dropping paths that are 0 for it:

| Flow by | Reads | Answers |
|---|---|---|
| **Spend** (`cost`) | `cost_micros` | Where is the money going? (reconciles exactly) |
| **Conversions** (`conv`) | `conversions` | Which branches actually convert? |
| **Conv. value** (`value`) | `conversions_value` | Where does the revenue come from? |

Hover any node for its card: **Ad spend · Conversions · Conv. value · CPA** (CPA = `cost / conversions`).

**Plain-language caption** (reuse on a slide/report):

> *"This traces what's driving the account: every dollar of spend fanning out from campaign to ad
> group to keyword, with ribbon width = the metric flowing through each split. Switch Flow-by to
> Conversions or Conv. value to see which branches actually pay back; grey ribbons are the honest
> 'other / unreported' buckets that keep each column reconciled."*

## When to use

The reader wants to see **how a total splits as it flows through a hierarchy** and **where the
volume concentrates** — "where does the budget actually go", "which branch eats the spend", a
contribution / flow view. One root, any depth, one metric at a time (switchable). For each node's
exact numbers + Δ use [`driver-tree/`](../driver-tree/); for a flat side-by-side grid use
[`breakdown-matrix/`](../breakdown-matrix/).

## What it receives → emits

A **generator**: it RECEIVES nodes + links (it never fetches) and EMITS an HTML+SVG string.
`mount` adds the browser interactivity (flow-by switch, hover highlight + tooltip, resize).

```js
const sk = require("./contribution-sankey");   // browser: window.PorterReporting.contributionSankey

sk.mount("#host", {
  columns,            // ["Campaign type","Campaign","Ad group","Keyword"] — header per level
  metrics,            // the switchable "flow by" metrics — NOTHING hardcoded
  nodes, links,       // the weighted flow — see the shapes below
  metric: "cost",     // initial active metric (default = metrics[0])
  maxLevel,           // optional: cap the columns shown (the depth control sets this)
  tooltipRows,        // optional: which rows the hover card shows (default = one per metric)
  height: 560,        // optional plot height
  metricToggle: true, // optional: render the built-in Flow-by control (a use case can own it instead → false)
  emptyMessage
});

// static string (Node / SSR / a live Porter report page):
host.innerHTML = sk.build({ columns, metrics, nodes, links, metric: "cost", width: 900 });
```

### The node + link shapes (what the caller builds)

```js
// node: one box in a column. `values` carries every switchable metric.
{ id, level, label, full?, branch?, link?, values: { cost: 1250, conv: 26, value: 3550 } }
// link: a ribbon. its value = the flow INTO target (child's own value).
{ source: <id>, target: <id>, values: { cost: 1018, conv: 25, value: 3350 } }
```

- **`level`** = the column (0 = root, left). **`branch`** keys the colour — every node sharing a
  branch gets the same categorical colour (e.g. one colour per campaign). `branch: "__other__"`
  marks a **remainder / "other" bucket** (drawn neutral grey) — that's how a use case keeps a
  column reconciled (e.g. "other / unreported searches").
- It's drawn as a **tree** (each node reached by one parent link). Node heights and ribbon widths
  are proportional to `values[metric]`; switching the metric re-lays-out and **drops nodes/links
  that are 0 for the new metric** (so "flow by value" shows only the value-producing paths).

### The metrics config + tooltip

```js
metrics:    [ { key:"cost", label:"Spend", format:"money" }, { key:"conv", label:"Conversions", format:"dec" }, … ]
tooltipRows:[ { label:"Ad spend", key:"cost", format:"money" },
              { label:"CPA", derive: v => v.conv ? v.cost / v.conv : 0, format:"money", skipZero:true } ]
```

`format` ∈ `money · int · dec · pct · pct2 · share · ratio · raw` (built in — **zero deps**). A
tooltip row reads `key` off the node's `values`, or computes a `derive(values)` (e.g. CPA, ROAS).
Default tooltip = one row per metric.

## Behaviour (implemented here)

- **Columns by level, left → right**, each with a header from `columns`, vertically centred.
- **Proportional layout** — node height & ribbon width = `values[metric]` on one uniform scale,
  so a parent's ribbon exactly tiles into its children (conservation). Children are laid out
  contiguously under their parent (value-desc) → a tidy, low-crossing flow.
- **Flow by metric** — the built-in segmented control (or a use case's) switches the metric and
  re-lays-out. Nodes/links that are 0 for the active metric drop out.
- **Depth cap** — `maxLevel` hides deeper columns (the use case's depth toggle drives it).
- **Trajectory highlight** — hovering a node (or ribbon) lights its **whole path** (ancestors +
  descendants) and dims the rest. The defining "follow the route" interaction.
- **Hover tooltip card** — the hovered node's metrics (+ derived rows like CPA), via `.pds-tooltip`.
- **Empty input →** the `emptyMessage` state.

## Styling is Design's — styling hooks

Ships **no CSS** (repo split: this repo holds **structure + behaviour**, porter-design holds **all
appearance**). It emits the hooks below; colours come from tokens — never literal hex. The only
colour values in the JS are CSS-var references (`var(--cat-N, <neutral fallback>)`) so it still
draws untokened; Design overrides every one.

| Hook | What it is | Design keys it to |
|---|---|---|
| `.sk-component` / `.sk-controls` / `.sk-host` | wrapper · optional control row · render host (`position:relative` — holds the tooltip) | layout, spacing |
| `.sk-seg` / `.sk-seg-lab` / `.sk-seg-btn` `.is-active` | the Flow-by segmented control | the segmented-control look |
| `.sk-svg` | the sankey SVG | block; `overflow-x` lives on `.sk-host` |
| `.sk-ribbon` | a flow ribbon (`fill` = branch colour) | `fill-opacity: var(--sk-ribbon-opacity)`; `.is-hot` brighter, `.is-dim` faded |
| `.sk-node` | a node bar (`fill` = branch colour) | `.is-dim` faded on highlight |
| `.sk-colhdr` | a column header label | uppercase muted label type (`fill`) |
| `.sk-label` | a node's text label | small label type (`fill`) |
| `.pds-tooltip` / `.sk-tip-h` / `.sk-tip-grid` / `.sk-tip-k` / `.sk-tip-v` | the hover card | reuse Design's tooltip (`--tip-bg` / `--tip-text` / `--tip-border`) |
| `.sk-empty` | the empty state | muted message |
| `--cat-1..8` / `--sk-other` | branch colours · remainder grey | the categorical palette (shared with the charts series tokens) |
| `--sk-ribbon-opacity` | base ribbon translucency | a single opacity token |

## Data-component states

- **Empty** — handled here (`emptyMessage` / `No data for this selection`).
- **Loading / Error** — owned by the host page (render a skeleton before data, an error box on a
  failed fetch); this generator only renders what it's given. See
  [`_foundation/component-contract.md` → Data-component states](../../../_foundation/component-contract.md).

## Files

| File | What |
|---|---|
| [`contribution-sankey.js`](contribution-sankey.js) | The engine (`build` + `mount` + `layout`). Vanilla JS, no deps; browser **and** Node. |
| [`contribution-sankey.html`](contribution-sankey.html) | Static scaffold (control row + host) for wiring into a live report. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | A **fictional**, platform-neutral flow (Acme Insurance). Synthetic — proves the engine isn't ad-specific. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Its styles are a clearly-marked demo-only fallback.) |
| [`google-ads/`](google-ads/) | The **Google Ads use case** — *Account contribution* (type → campaign → ad group → keyword → search term). |

## Notes & honest caveats

- **It's a tree, not a general DAG.** Each node is reached by one parent link (a contribution
  flow). A node with two parents would double-count — keep the input a tree (use remainder buckets
  to reconcile, don't cross-link).
- **Conservation needs the remainder buckets.** Ribbons tile a parent's edge only because the
  children's values sum to the parent's. When a real source under-reports (Google hides low-volume
  search terms; ad-group spend not attributed to a keyword), the **use case** adds an `"__other__"`
  node to absorb the gap — without it the columns wouldn't add up. Flowing **spend** reconciles
  exactly; conversions / value carry attribution slack, so the remainder matters more there.
- **No Python here.** Like every Reporting component, it renders what it's given; the metric math
  and the "why" of a movement live in **porter-analysis**.
- **No real data:** examples use only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
