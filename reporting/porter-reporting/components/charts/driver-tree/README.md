# charts/driver-tree

A **driver tree** (a.k.a. decomposition / hierarchy tree): a root node fans out **left → right**
into columns of child nodes, joined by curved connectors, where **each node is a small card of
metrics** carrying its inline Δ vs the previous period and an **efficiency colour**. Click a node to
**expand / collapse** its children.

```
[ Root ] ─┬─ [ Group A ] ─┬─ [ Item A1 ] ─ …
          │               └─ [ Item A2 ] ─ …
          └─ [ Group B ] ─── [ Item B1 ] ─ …
```

This folder is the **general framework** — a **connector-agnostic engine** that draws *any* nested
node tree. It knows nothing about Google Ads, Meta or GA4. The platform-specific knowledge (which
fields, which deep-links, how to bucket data into the tree) lives in a **use case** next to it:

> **Use cases implemented here** ([`google-ads/`](google-ads/)):
> - **[Account Structure](google-ads/README.md)** *(structure)* — the account as a tree (Account →
>   grouping → Campaign → Ad group → Ad) with a "Group by" switcher (campaign type · brand · funnel
>   stage · match type). The reusable version of the live report's "Account Structure" page.
> - **[Performance drivers](google-ads/performance-drivers.README.md)** *(diagnosis — why a metric
>   moved)* — decomposes a metric's **change** by formula levers (LMDI) **and** by segment
>   contribution; click a node to recompute the levers for it.

The engine supports two colouring modes: `efficiency` (a node vs a baseline — the structural use
case) and `colorBy: "direction"` (a node helped/hurt the focus metric — the diagnostic use case),
plus an optional `node.headline` and `selectable` + `onSelect` for click-to-select.

## When to use

The reader wants to **see how a total breaks down through a hierarchy** and **where the efficiency
sits** at each level — "show me the account as a tree", a driver / decomposition view, "which branch
is wasting / winning". One root, any depth. For a flat side-by-side comparison use
[`breakdown-matrix/`](../breakdown-matrix/) or the entity
[`../google-ads/campaign-performance-table/`](../google-ads/campaign-performance-table/) instead.

## What it receives → emits

A **generator**: it RECEIVES a node tree (it never fetches) and EMITS an HTML string. `mount` adds
the browser interactivity (expand / collapse, lazy children, connector drawing, redraw on resize).

```js
const dt = require("./driver-tree");   // browser: window.PorterReporting.driverTree

dt.mount("#host", {
  tree,                 // the ROOT node (nested) — see "The node shape" below
  columns,              // ["Account", "Group", "Campaign", …] — header per depth, left→right
  metrics,              // which metrics each node shows (see below) — NOTHING hardcoded
  efficiency,           // optional: colours each node vs a baseline
  compare: true,        // render Δ chips from each node's `prev`
  onExpand,             // optional: lazy-load children when children === null
  emptyMessage          // optional
});

// static string (Node / SSR / a live Porter report page); draw connectors after it is in the DOM:
const html = dt.build({ tree, columns, metrics, efficiency, compare: true });
host.innerHTML = html;
dt.drawConnectors(host);   // browser only — measures rects, draws the curves
```

### The node shape (what the caller builds)

```js
{
  id, name,            // name = the card title
  full,                // optional: full text for the hover title (when name is truncated)
  link,                // optional: a deep-link (opens in a new tab via the ↗ icon)
  metrics: { … },      // values keyed however you like (your `metrics` config names them)
  prev:    { … },      // optional: previous-period values, same keys → powers the Δ chips
  children             // [nodes] = loaded · null = expandable-but-not-loaded (lazy) · omitted/[] = leaf
}
```

- **`children: null`** marks a node that is expandable but whose children aren't loaded — the engine
  shows a `Loading…` placeholder and calls `onExpand(node)`; resolve it with the children array (or
  set `node.children` yourself) and the tree re-renders. This is how a live report lazy-loads the
  ad-group / ad levels only when a branch is opened.

### The metrics config (what each card shows — caller-provided, not fixed)

```js
metrics: [
  { key: "spend", label: "Spend",       format: "money" },
  { key: "conv",  label: "Conversions", format: "dec"   },
  { key: "cpa",   label: "Cost/conv",   format: "money", invert: true },  // cost → falling is good
  { key: "value", label: "Conv. value", format: "money" }
]
```

`format` ∈ `money · int · dec · pct · pct2 · share · ratio · raw` (built in — the engine has **zero
deps**). `invert: true` flips the Δ colour for **cost-type** metrics (a falling cost is good/green).

### The efficiency colour (optional — what tints each node)

```js
efficiency: { metricKey: "cpa", baseline: accountAvgCpa, good: 0.8, bad: 1.2 }
// or a derived value: efficiency: { derive: n => n.metrics.spend / n.metrics.conv, baseline, … }
```

Each non-root node is classed `dt-good` / `dt-mid` / `dt-bad` from `value / baseline`. **Lower is
better by default** (a cost metric); pass `higherIsBetter: true` to flip (e.g. ROAS). The root is
always `dt-root`. No baseline → `dt-na` (neutral).

## Behaviour (implemented here)

- **Columns by depth, left → right**, each with a header from `columns`. The root is column 0 and
  always open.
- **Expand / collapse** on click or Enter/Space (keyboard-accessible; expandable nodes are
  `role="button" tabindex="0"`). A node is expandable when it has children or `children === null`.
- **Curved SVG connectors** drawn from measured DOM rects (parent right edge → child left edge),
  re-drawn on resize. The stroke is `var(--dt-link)` (Design owns it; neutral-grey fallback baked in
  so it still draws with no tokens).
- **Δ vs previous period inline** in every metric row (value + chip), from each node's `prev`,
  **coloured by meaning** (cost metrics inverted). Needs `compare: true` + `prev` on the nodes.
- **Efficiency tint** per node (see above) — magnitude/quality of the node vs the baseline.
- **Lazy children** via `onExpand` for `children === null` branches.
- **Empty input →** the `emptyMessage` state.

## Styling is Design's — styling hooks

Ships **no CSS** (repo split: this repo holds **structure + behaviour**, porter-design holds **all
appearance**). It emits the hooks below; colours must come from tokens — never literal hex. A few
hooks are **structural** (the flex columns + the absolute SVG link layer) and are load-bearing for
the connector maths — Design must preserve their *layout intent*.

| Hook | What it is | Design keys it to |
|---|---|---|
| `.dt-component` / `.dt-controls` / `.dt-host` | wrapper · optional control row · render host | layout, spacing |
| `.dt-wrap` | scroll container (position: relative) | **structural** — holds the SVG layer |
| `.dt-links` | the absolute SVG connector layer | **structural** — `position:absolute; z-index:0; pointer-events:none` |
| `.dt-hdrs` / `.dt-colhdr` | column header row · one header | flex row; uppercase label type |
| `.dt-cols` / `.dt-col` | the columns row · one column | **structural** — flex, gap = the horizontal run of the connectors |
| `.dt-node` | a node card | card chrome; fixed width = the connector anchor |
| `.dt-node.dt-root` | the root node | `--dt-root-bg` / `--dt-root-border` |
| `.dt-node.dt-good/.dt-mid/.dt-bad/.dt-na` | efficiency tint | `--dt-good` / `--dt-mid` / `--dt-bad` / neutral |
| `.dt-node.dt-exp` | expandable (clickable) | cursor + hover border |
| `.dt-node.dt-ph` | a `Loading…` / placeholder node | muted, dashed |
| `.dt-top` / `.dt-caret` / `.dt-name` / `.dt-ext` | node header · caret · title · deep-link icon | type + the link colour |
| `.dt-krows` / `.dt-krow` / `.dt-k` / `.dt-v` | metric rows · label · value | small label / value type |
| `.dt-delta` + `--good`/`--bad`/`--flat` | the Δ chip | `--good` / `--bad` / muted |
| `--dt-link` | the connector stroke colour | a muted line token |

## Files

| File | What |
|---|---|
| [`driver-tree.js`](driver-tree.js) | The engine (`build` + `mount` + `drawConnectors`). Vanilla JS, no deps; browser **and** Node. |
| [`driver-tree.html`](driver-tree.html) | Static scaffold (control row + host) for wiring into a live report. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | A **fictional**, platform-neutral hierarchy (Acme Insurance). Synthetic — proves the engine isn't ad-specific. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Its styles are a clearly-marked demo-only fallback, not the component's.) |
| [`google-ads/`](google-ads/) | The **Google Ads use case** — *Account Structure*, the reusable version of the report's driver-tree page. |

## Notes & honest caveats

- **Connectors need a real DOM.** `build()` returns the columns + an empty SVG layer; the curves are
  drawn by `drawConnectors(host)` (or automatically by `mount`) once the markup is measured in a
  browser. A pure server-side string therefore has nodes but no lines until it hydrates.
- **No Python here.** Like every Reporting component, this renders what it's given; the metric math
  and the "why" of a movement live in **porter-analysis**.
- **No real data:** examples use only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
