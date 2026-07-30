# cards/ — the scannable component catalog

This folder is a **self-contained catalog of Porter deliverables** (components, reports,
dashboards, slides) built to be **scanned by Claude Design** (claude.ai design-system
projects) and read by any AI with zero setup.

Every card here renders on its own — no machine paths, no sibling-repo paths, no build step.
That is the whole point: drop this folder into a Claude Design project (or open any file in a
browser) and it Just Works.

## How the scan works (the one contract)

Claude Design builds its catalog **automatically** from a one-line marker on the **first line
of every card file**:

```html
<!-- @dsCard group="Reports" viewport="900x1500" name="Executive report — White" subtitle="…" -->
```

The app reads every `@dsCard` line and compiles them into `_ds_manifest.json` — **that file is
the machine-readable catalog.** You never write it by hand; it is generated from the markers.

- `group` — which shelf it appears on (see Groups below).
- `viewport` — `WIDTHxHEIGHT` the preview tile renders at.
- `name` / `subtitle` — what the card is called and a one-line description.

## Folder convention

```
cards/
├── README.md            ← this file (the entry point)
├── _card-template.html  ← copy this to start a new card
├── styles.css           ← the ONE shared style dep (Porter design tokens + .pds-* classes)
├── porter-charts.js     ← the ONE shared chart dep (sparklines / time-series; auto-inits)
├── assets/              ← brand mark + connector logos (the ONE shared asset folder)
├── components/<Name>/<Name>.card.html
├── reports/<Name>/<Name>.card.html
├── dashboards/<Name>/<Name>.card.html
└── slides/<Name>/<Name>.card.html
```

Each card sits two levels under this root, so from inside a card the shared deps are always:
`../../styles.css` · `../../porter-charts.js` · `../../assets/…`

## Groups

| `group=` | What goes here |
|---|---|
| **Components** | reusable parts — scorecards, financial cards, tables, charts, tooltips |
| **Reports** | vertical narrative report layouts |
| **Dashboards** | multi-widget dashboard layouts |
| **Slides** | 16:9 decks |
| **Foundations** | the *rules* rendered as cards (always-compare, tooltip, etc.) — see `_foundation/` |

## The self-containment rules (what makes a card scannable)

A card is correct only if **all** of these hold:

1. **First line is the `@dsCard` marker.** Nothing above it.
2. **Only project-local relative paths** — `../../styles.css`, `../../porter-charts.js`,
   `../../assets/…`. **Never** a machine path (`~/…`), a sibling-repo path (`../../../porter-design`),
   `ds-base.js`, or any `support.js`.
3. **`<body data-theme="white">`** and `body { background: var(--surface-bg); }` — paint from
   tokens, never hard-code a theme hex. (Any of the 4 themes works: `white` `cream` `blue` `purple`.)
4. **Charts via `porter-charts.js`** (`data-spark="…"` / `data-series="…"`), not hand-rolled.
5. **No real client data.** Fictional only (e.g. "Acme", "Northwind").

Verify a card with this gate (must print nothing):

```sh
grep -nE "~/|\.\./\.\./\.\./|ds-base|support\.js|<x-dc|<helmet|@template" path/to/Whatever.card.html
```

## How to add a new card

1. Copy `_card-template.html` to `cards/<group>/<PascalName>/<PascalName>.card.html`.
2. Set the `@dsCard` marker on line 1 (group, viewport, name, subtitle).
3. Build the markup; pull styling from tokens + `.pds-*` classes in `styles.css`.
4. Run the grep gate above (must be clean), then open it in a browser to confirm it renders.

## How it syncs to Claude Design

Use the **DesignSync** tool / `design-sync` skill — one card at a time, never a wholesale
replace. The catalog (`_ds_manifest.json`) rebuilds itself from the `@dsCard` markers on sync.

## Worked examples already here

| Card | Group | Status |
|---|---|---|
| `components/FinancialOverview` | Components | ✅ built fresh from the financial-overview spec |
| `components/BreakdownMatrix` | Components | ✅ from `components/charts/breakdown-matrix` — **Segment by** time/campaign/objective/product + **View by** granularity |
| `components/AccountStructureTree` | Components | ✅ from `components/charts/driver-tree/google-ads` — Google Ads account as a **driver tree**, **Group by** campaign type/brand/funnel stage/match type, click to expand Campaign → Ad group → Ad |
| `components/PerformanceDriverTree` | Components | ✅ from `components/charts/driver-tree/google-ads/performance-drivers` — **diagnostic** driver tree (why a metric moved): LMDI lever strip + segment contribution tree, click a node to recompute its levers |
| `components/ContributionSankey` | Components | ✅ from `components/charts/contribution-sankey/google-ads` — Google Ads account as a **contribution sankey**, **Flow by** spend / conversions / conv. value, **Depth** to Keyword or Search term, hover lights the whole path |
| `reports/ExecutiveReportWhite` | Reports | ✅ converted from `templates/executive-report-white` |
| `dashboards/MarketingDashboardWhite` | Dashboards | ✅ converted from `templates/marketing-dashboard-white` |
| `slides/ReportSlidesWhite` | Slides | ✅ converted from `templates/report-slides-white` |

All four verified: tokens resolve, assets load, charts draw, zero console errors, zero
forbidden dependencies. The remaining `templates/` are converted the same way.
