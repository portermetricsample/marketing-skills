# charts/driver-tree/google-ads/performance-drivers

**Performance drivers** — a **diagnostic** driver tree that answers *why a metric moved* by
decomposing the **change** two ways at once. The sibling of
[`account-structure-tree`](README.md) (which shows the account's *structure*); this one explains
its *movement*.

```
┌ Lever strip (formula) ─ Why Conversions ▲66:  Impressions +63 · CTR +3 · CVR −0
│
└ Segment tree (drill)  ─ Account +66
                          ├ Search       +41  (62% of move)
                          │   ├ Brand        +21
                          │   └ Competitor   −6   ← hurt (red)
                          ├ Demand Gen   +13
                          └ Performance Max +12
```

## Why it exists (the problem with a plain delta tree)

The structural tree shows each node's **own** % change. For diagnosis that **mis-ranks the
drivers**: a tiny segment down 60% looks scarier than a huge one down 6% that actually caused the
move. This component ranks by **contribution to the change** — "Search = 62% of the conversion
gain", "Competitor was the only segment that *hurt*" — which is the real answer to "why".

## Two decompositions, combined

1. **Lever strip (formula / LMDI).** Splits the focus metric's change into its math levers using
   the **logarithmic mean Divisia index** — an exact, **order-independent** decomposition whose
   parts **sum to the total change**:
   - `Conversions = Impressions × CTR × CVR`
   - `Cost = Impressions × CTR × CPC`
   - `Conv. value = Conversions × AOV`
   - `Clicks = Impressions × CTR`
   - ratios split numerator vs denominator: `CPA = Cost ÷ Conversions`, `ROAS = Value ÷ Cost`,
     `CTR = Clicks ÷ Impressions`, `CVR = Conversions ÷ Clicks`.
2. **Segment tree (contribution).** Splits the **same change** across Campaign type → Campaign →
   Ad group. Each node = its **contribution to the parent's move** + its **share**, ranked by
   impact, colored **helped (green) / hurt (red)**. Contributions are **exactly additive** at every
   depth (verified): a parent's move = the sum of its children's contributions.
3. **Combined.** **Click any node** → the lever strip recomputes for that node. "The drop is in
   Search (tree); inside Search, CVR is the lever (strip)."

## What it receives → emits

```js
const pd = require("./performance-drivers");   // browser: window.PorterReporting.performanceDrivers

pd.mount("#host", {
  account:   { name: "Acme Insurance" },
  campaigns,                                   // current period (carry the channel/type)
  adGroups,                                    // current period (joined to campaigns by name)
  previous:  { campaigns, adGroups },          // previous period → the whole thing is change-based
  focusMetric: "conversions",                  // conversions|value|cost|clicks|cpa|roas|ctr|cvr
  dimension:   "campaign_type"                 // campaign_type|campaign|ad_group (the drill chain)
});
```

- **Input** = the base counts per ad group + each campaign's channel/type (to bucket by campaign
  type). Ad-group rows must **roll up** to their campaign (the demo data is consistent this way).
  `cost` is read as-is in currency units (Porter pre-converts the `*_micros` fields).
- The component **derives** every rate (CTR/CVR/CPC/CPM/AOV) and **all** the decomposition math
  itself — pass counts, not rates.
- **Output** = the Explain + Break-down controls, the lever strip, and the contribution tree,
  rendered into `#host`.

## Behaviour

- **8 focus metrics** (count + ratio). The lever strip + tree rebuild on switch.
- **3 drill dimensions** (campaign type → campaign → ad group, or shorter chains).
- **Node color = helped / hurt** the focus metric (direction), via the engine's `colorBy:
  "direction"` mode — not efficiency.
- **Headline per node** = its signed contribution + "% of move"; the actual metric value + its own
  Δ sit underneath as context.
- **Top-N + "Others"** rollup keeps wide levels readable while preserving the exact sum.
- **Click-to-select** recomputes the lever strip for the chosen node (the engine emits
  `onSelect`).

## Built on the engine — the `contribution` mode it added

This use case drove two **engine** additions (in [`../driver-tree.js`](../driver-tree.js), back-
compatible): `colorBy: "direction"` (color nodes helped/hurt from `node.direction`), a prominent
`node.headline` block, and `selectable` + `onSelect` + `dt-sel` for click-to-select. Structural
mode is unchanged.

## Styling hooks (Design owns appearance)

Engine `.dt-*` hooks (see [`../README.md`](../README.md)) plus, new here: `.dt-headline` +
`--good`/`--bad`/`--flat` · `.dt-h-val` · `.dt-h-sub` · `.dt-sel` (selected outline). Plus the
use-case `.pd-*` set: `.pd-controls` · `.pd-seg` / `.pd-seg-lab` / `.pd-seg-btn`(+`.is-active`) ·
`.pd-levers` · `.pd-levers-head` / `.pd-h-delta`(+`--good`/`--bad`) / `.pd-h-node` / `.pd-h-vals` ·
`.pd-lever`(+`--good`/`--bad`/`--flat`) / `.pd-lever-lab` / `.pd-lever-track` / `.pd-lever-fill` /
`.pd-lever-val` / `.pd-lever-sh`. Colors from tokens (`--good`/`--bad`/`--cf-*`) — no hex here.

## Files

| File | What |
|---|---|
| [`performance-drivers.js`](performance-drivers.js) | The use case — LMDI levers + exact contribution tree + `mount`. Depends on `../driver-tree.js`; browser **and** Node. |
| [`performance-drivers.html`](performance-drivers.html) | Static scaffold (controls + lever host + tree host). Class hooks only. |
| [`performance-drivers-demo.html`](performance-drivers-demo.html) | Labeled fictional demo (reuses the Acme [`example.data.js`](example.data.js)). |

> **Claude Design card:** [`cards/components/PerformanceDriverTree/`](../../../cards/components/PerformanceDriverTree/PerformanceDriverTree.card.html).

## Notes & honest caveats

- **Contribution vs own change (ratios).** A node's tree headline is its contribution to the
  **account's** ratio move; the lever strip explains that node's **own** ratio change. For ratio
  metrics these differ on purpose (e.g. Search *contributed* +$1.44 to account CPA, but its *own*
  CPA rose $2.71). For count metrics they coincide.
- **Ratio lever shares can exceed ±100%.** When a numerator and denominator both move a lot but
  nearly cancel (e.g. CPA: cost +$10.4, conversions −$8.65, net +$1.75), each lever's *share of the
  net* is large/offsetting. That's mathematically honest — read the **absolute** values, not just
  the %.
- **LMDI guards.** When a factor is zero in either period the log is undefined; that factor's
  contribution is dropped to zero and any residual is reassigned to the largest lever so the parts
  still sum to the total exactly.
- **The "why" boundary.** Per `RULES.md` the funnel-identity interpretation is porter-analysis's to
  own; the deterministic decomposition lives here for now (Juan's call) so the component + card work
  standalone. Wire it to the analysis output later for the narrative layer.
- **No real data:** fictional **Acme Insurance** only (`RULES.md` #3).

## Wiring into a live Porter report

Pull campaigns (with `campaign_advertising_channel_type`) and ad groups, both with `date_range`
**compare ON** (current + previous), and pass `ctx.previous.rows` as `previous`. Same regex caveat
as the sibling component when inlining into a v2 report page.
