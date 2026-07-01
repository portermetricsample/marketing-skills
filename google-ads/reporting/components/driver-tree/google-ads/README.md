# charts/driver-tree/google-ads/account-structure-tree

**Account Structure** — a Google Ads account drawn as a **driver tree**, the reusable,
account-agnostic version of the live report's "Account Structure" page:

```
Account ─ Grouping ─ Campaign ─ Ad group ─ Ad
```

with a **Group by** switcher that re-buckets the second column, a **SUMAS breakdown table** under
the tree, and a **coverage** line. It is a **use case** on top of the general framework
([`../`](../)) — it owns the Google-Ads knowledge (fields, lenses, deep-links, the SUMAS metric
set) and turns Google Ads rows into the generic node tree the engine draws.

> **Sibling use case:** [`performance-drivers`](performance-drivers.README.md) — the **diagnostic**
> driver tree (why a metric moved): formula levers (LMDI) + segment contribution. This component
> shows the account's *structure*; that one explains its *movement*.

> **Engine (the tree mechanics):** [`../driver-tree.js`](../driver-tree.js) — columns, curved
> connectors, expand/collapse, efficiency colour, Δ chips. This folder does **not** restate them.

## When to use

The reader wants the **whole account as one picture** and to **trace where spend and efficiency
sit** down the hierarchy — "show me the account structure", a driver / decomposition tree, "which
branch is wasting", "group my campaigns by type / brand / stage and drill in". One Google Ads
account at a time.

## The four lenses (Group by)

The original report grouped column 2 by a golf-club "product line" taxonomy guessed from campaign
names — that was **pure client data and is intentionally NOT shipped**. These four are
account-agnostic:

| Lens (`lens` / button) | Buckets column 2 by | Source rows | Tree shape |
|---|---|---|---|
| `campaign_type` *(default)* | Channel: Search / Performance Max / Demand Gen / Video / Shopping / … | campaigns | Account → Type → Campaign → Ad group → Ad |
| `brand` | **Branded vs Non-branded** — you pass `brandTerm` (no hardcoded brand) | searchTerms | Account → Brand intent → Search term |
| `funnel_stage` | TOFU / MOFU / BOFU, from a naming convention (`[TOFU]`…) | campaigns | Account → Stage → Campaign → Ad group → Ad |
| `match_type` | Broad / Phrase-Exact / Brand / Dynamic, from ad-group naming | adGroups | Account → Match type → Ad group |

`funnel_stage` and `match_type` only carry signal if the account actually names things that way
(they fall back to *Unstaged* / *Untagged*, surfaced in the coverage line). `campaign_type` and
`brand` work on every account.

## What it receives → emits

A **generator**: it RECEIVES Google Ads rows (it never fetches) and renders into a host.

```js
const ast = require("./account-structure-tree");   // browser: window.PorterReporting.accountStructureTree

ast.mount("#host", {
  account:     { name: "Acme Insurance" },   // root label + the appbar
  brandTerm:   "acme",                        // for the brand lens (replaces the hardcoded brand)
  campaigns,                                   // [{ google_ads_campaign_name, …, cost_micros, … }, …]
  adGroups,                                    // joined to campaigns by campaign name
  ads,                                         // joined by campaign + ad-group name
  searchTerms,                                 // for the brand lens
  previous:    { campaigns, adGroups, ads, searchTerms },  // optional → powers the Δ chips
  lens:        "campaign_type",               // default group-by
  lenses:      ["campaign_type","brand","funnel_stage","match_type"],  // which buttons to show (default: all)
  compare:     true,                           // Δ vs previous period
  showBreakdown: true                          // the SUMAS table under the tree (default true)
});

// just the generic { tree, columns } for a lens (custom wiring):
const { tree, columns, accountCpa } = ast.buildTree({ lens, campaigns, adGroups, ads, searchTerms, previous, brandTerm });
```

- **Input** = per-row **base counts** in the Google Ads field names. `cost` / `budget` arrive
  **already in currency units** (Porter delivers the `*_micros` fields pre-converted) — not re-scaled.
- The component **derives** every rate itself: per node Cost/conv (the efficiency metric), and in the
  breakdown table CTR · CPC · CPM · CVR · Cost/conv · ROAS + impression-weighted Search IS. Pass the
  counts; do not pre-average rates upstream.
- **Output** = the Group-by bar + the driver tree + the SUMAS breakdown table, rendered into `#host`.

## Required parts — a faithful render shows ALL of these

The **definition of done** for any render (including a Claude Design card or an AI re-drawing it):

- **Each node card:** name (Campaign / Ad-group / Ad nodes deep-link into Google Ads ↗) · **Spend ·
  Conversions · Cost/conv · Conv. value**, every number with its **Δ vs previous period** ·
  **efficiency colour** (cost-per-conv vs the account average: green ≤0.8× · amber ≤1.2× · red >1.2×).
- **Curved connectors** between every parent and its visible children.
- **Group-by bar** with the lens buttons + the **coverage** line ("X% of spend classified · N
  campaigns").
- **SUMAS breakdown table** under the tree: one row per group, columns `Budget · Visibility ·
  Engagement · Conversion`, headline + sub-metrics, inline Δ, per-column heat (same SUMAS grouping as
  [`../../google-ads/campaign-performance-table`](../../google-ads/campaign-performance-table/)).

A render that drops a metric, the colour, the connectors, or the breakdown is **INCOMPLETE — a bug,
not a styling choice.**

## Styling is Design's — styling hooks

Ships **no CSS**. It emits the engine's `.dt-*` hooks (see [`../README.md`](../README.md#styling-is-designs--styling-hooks))
plus the use-case-specific ones below; colours come from tokens — never literal hex.

| Hook | What it is | Design keys it to |
|---|---|---|
| `.as-component` | the whole Account-Structure block | layout |
| `.as-controls` / `.as-seg` / `.as-seg-lab` | the Group-by bar · the button group · its label | control-bar layout |
| `.as-seg-btn` + `.is-active` | a lens button · the selected one | pill button + active state (`--accent`) |
| `.as-cov` | the coverage badge | muted pill |
| `.as-tree` | the driver-tree host | — (the engine draws inside) |
| `.as-breakdown` / `.as-title` | the breakdown section · its title | spacing, heading type |
| `.as-tablewrap` / `.as-sumas` | the SUMAS table wrapper · table | table chrome (reuse the table rule) |
| `.as-grp-col` | the group (entity) column | wide; no heat |
| `.as-cell` | a SUMAS stage cell | heat = inline `background:var(--cf-N)` |
| `.as-mv` / `.as-sub` | headline value · sub-metric line | large value / small muted |
| `.as-dot` / `.as-badge` | group dot · "N items" badge | accent dot · muted pill |
| `.as-roas--good` / `--bad` | ROAS colour vs the account ROAS | `--good` / `--bad` |
| heat ramp `--cf-1 … --cf-5` | the red→green magnitude ramp (shared design token) | reuse it |

## Files

| File | What |
|---|---|
| [`account-structure-tree.js`](account-structure-tree.js) | The use case (`buildTree` + `mount` + `breakdownTable` + `coverage`). Vanilla JS; depends on `../driver-tree.js`; browser **and** Node. |
| [`account-structure-tree.html`](account-structure-tree.html) | Static scaffold (Group-by bar + hosts) for a live report. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance rows (campaigns / ad groups / ads / search terms × current + previous). Synthetic. |
| [`demo.html`](demo.html) | Labeled fictional demo — the full Account Structure view. (Demo-only fallback styles, not the component's.) |

> **Claude Design card:** [`cards/components/AccountStructureTree/`](../../../cards/components/AccountStructureTree/AccountStructureTree.card.html)
> is the self-contained version that syncs to cloud design (engine + use case + Acme data inlined).

## Wiring into a live Porter report

The report's "Account Structure" page pulls these per level (dimensions / metrics), with
`date_range` **compare ON** (that feeds the Δ chips) + `filters`:

- **campaigns** — dims `campaign_name`, `campaign_id`, `campaign_advertising_channel_type`; metrics
  `cost_micros`, `impressions`, `clicks`, `conversions`, `conversions_value`,
  `search_impression_share`, `campaign_budget_amount_micros`.
- **ad groups** — dims `campaign_name`, `ad_group_name`, `campaign_id`; the same metrics (minus IS/budget).
- **ads** — dims `campaign_name`, `ad_group_name`, `ad_group_ad_ad_id`, `ad_group_ad_ad_final_urls`;
  metrics `cost_micros`, `conversions`, `conversions_value`.
- **search terms** (brand lens) — dims `search_term`, `campaign_name`; the base metrics.

```js
// page provides the scaffold (account-structure-tree.html). Each level is its own chart:
const data = {};
function ready() {
  if (!data.campaigns) return;                    // tree needs at least campaigns
  PorterReporting.accountStructureTree.mount(".as-component", {
    account: { name: "Acme Insurance" }, brandTerm: "acme",
    campaigns: data.campaigns.rows, adGroups: (data.adGroups||{}).rows || [],
    ads: (data.ads||{}).rows || [], searchTerms: (data.searchTerms||{}).rows || [],
    previous: {
      campaigns: data.campaignsPrev || [], adGroups: data.adGroupsPrev || [],
      ads: data.adsPrev || [], searchTerms: data.searchTermsPrev || []
    }
  });
}
Porter.renderChart("as_campaigns", "#as-campaigns-sink", function (d, h, ctx) { data.campaigns = d; data.campaignsPrev = ctx.previous ? ctx.previous.rows : []; ready(); });
Porter.renderChart("as_adgroups",  "#as-adgroups-sink",  function (d, h, ctx) { data.adGroups = d;  data.adGroupsPrev  = ctx.previous ? ctx.previous.rows : []; ready(); });
// …same for as_ads and as_searchterms.
```

For very large accounts, leave `ads` / `adGroups` empty and lazy-load a branch via the engine's
`onExpand` (a node with `children: null`) instead of shipping every ad up front.

> **Regex caveat for live reports:** the Porter report validator rejects some regex literals in
> page JS. This component's `.js` uses regex literals (fine in the repo / a browser), so when you
> wire it into a v2 report, inline the parts you need without regex literals (use `new RegExp(...)`
> or string ops) — see the live page's pattern.

## Notes & honest caveats

- **The dropped "product line" lens.** The original report's main grouping was Acme-specific
  (Snowbird / Conquesting / …) detected by sniffing campaign names — real client taxonomy, so it is
  not in the repo (RULES.md #3). To reproduce a *custom* grouping, add a lens to `LENSES` with your
  own `groupOf(row)` classifier; everything else (tree, breakdown, coverage) works unchanged.
- **Match-type "Brand" bucket.** `matchOf` checks Phrase/Exact before Brand, so an ad group named
  "Brand Exact" lands in *Phrase / Exact*. Adjust the order in `matchOf` if you want Brand to win.
- **No Python here.** Like every Reporting component, it renders what it's given; the "why" of a
  movement lives in **porter-analysis**.
- **No real data:** examples use only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
