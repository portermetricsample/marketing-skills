# Porter report — base template

This is a **static front-end project** that Porter hosts as a report. You build
it locally into a static site (`out/`), then upload the project as a zip through
the Porter MCP (`edit_report`). Porter serves it inside a secure wrapper iframe
that holds authentication and the data tokens — **your report never sees a
token**; it asks for data and issues commands through a small bridge.

The default stack is **Next.js (Pages Router, static export)**, but any framework
works as long as the build produces `out/index.html` with **relative** asset
paths (see "Hard constraints").

---

## What lives where

```
pages/index.tsx          ← YOUR report. A WORKING REFERENCE of the correct patterns (real fields, date-range
                            control, comparison, skeleton loaders, interactive charts, PDF). Keep the LOGIC;
                            RESTYLE EVERYTHING to a modern, professional dashboard for this client.
lib/porter.ts            ← the Porter bridge client (data + navigation + PDF + theme). DO NOT rewrite its protocol.
lib/useReport.ts         ← reactive data hook (date range + period comparison + retry) + date/number helpers.
components/ui.tsx        ← ChartFrame (loading/skeleton/error/empty), Skeleton, KpiValue (value + delta %).
components/controls.tsx  ← DateRangeControl (presets + custom) + ComparisonToggle. Users expect these — keep them.
components/charts.tsx    ← interactive LineChart / BarChart (SVG + hover tooltip). Swap for a vendored lib if you want.
components/examples/**   ← LOGIC/WIRING reference ONLY (3D/animation). The STYLE is a placeholder — don't copy the look.
simulator/               ← the local data simulator (mocks Porter's /internal/v1/query)
styles/globals.css       ← design tokens + neutral primitive styles (RESTYLE) + print rules
next.config.js           ← output:'export' + assetPrefix:'.' (relative). Do not remove these.
```

## Design & defaults (build these in — don't wait to be asked)

A Porter report should look like a **modern, professional analytics dashboard** out of the box:

- **Real field names only.** Use the `fields_catalog` that `create_report` returned; validate every field against
  the simulator (`npm run dev`) — an `unknown_field` error means fix the name. Ratios like CTR/CPC/CPM are usually
  **derived** (compute them client-side from spend/clicks/impressions), not queried.
- **Date-range control + period comparison** (`DateRangeControl` + `ComparisonToggle`, wired via `useDateRange` +
  `useReportQuery(..., compare)`). These are standard; include them.
- **Skeleton loaders** while data loads — always wrap a chart/table in `ChartFrame` (it renders skeleton → error
  (with retry) → empty → data for you).
- **Interactive charts** with hover tooltips; a real time-series where it helps.
- **No emoji as decoration**, no "AI-slop". Restyle the placeholder look (layout, type, color) to the brand.

## Develop locally

```bash
npm install
npm run dev          # Next dev (http://localhost:3000) + the data simulator (http://localhost:8787)
```

`npm run dev` runs the **data simulator** alongside Next. `lib/porter.ts` detects
dev mode and sends every `porter.query(spec)` to the simulator, which returns
deterministic demo rows — and the **real `unknown_field` error** when you ask for
a field a connector doesn't have. That is the point: catch bad field names
locally, before you deploy. Field names are the real Porter ones (e.g.
`amount_spent`, `ads_impressions` for Facebook Ads — not `spend`/`impressions`).
Regenerate the authoritative schemas with `node simulator/refresh-schemas.mjs`.

## Get data

```ts
import { porter } from '../lib/porter';

const data = await porter.query({
  connector: 'facebook-ads',
  accounts: [{ id: 'act_123' }],           // must be in the report's accounts_used (see below)
  fields: ['date', 'amount_spent', 'clicks'],
  date_range: { start: '2026-05-31', end: '2026-06-29' },
  limit: 30,
});
// → { columns, rows: [{date, amount_spent, clicks}, ...], meta }  |  { error: { code, message } }
```

**Data allowlist (security).** A report can only query the accounts, connectors
and blends it was created with. Those are declared as metadata on the report
(`accounts_used`, `connectors_used`, `allowed_blends`) via `create_report` /
`edit_report`. If you query an account that isn't declared, the runtime returns
`account_not_allowed`. **Custom/formula fields require a blend** — create one and
pass its `blend_query_destination_id`.

## Source-account selector (optional)

When the user wants the report to let the viewer pick WHICH source accounts the
queries run against (e.g. "of my 100 Google Ads accounts, this report uses these
10, and I can toggle among them"), add a **source-account selector**. It is NOT a
filter — it scopes the queries to the chosen accounts (bounded by `accounts_used`).

```tsx
import { useAccounts, useDateRange, useReportQuery } from '../lib/useReport';
import { AccountSelector, DateRangeControl } from '../components/controls';

function Page() {
  const { range, ...dr } = useDateRange();
  const { accounts, universe, selectedIds, setSelectedIds } = useAccounts();
  // Spread `accounts` into the query base → charts re-run when the selection changes.
  const q = useReportQuery({ connector: 'google-ads', accounts, fields: ['date', 'clicks'] }, range);
  return (
    <>
      <DateRangeControl {...dr} />
      <AccountSelector universe={universe} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
      {/* render q.data ... */}
    </>
  );
}
```

`porter.getAccounts()` returns the report's account universe (`accounts_used`),
grouped by data source. `<AccountSelector>` defaults to ALL accounts selected. The
account set the report was created with is the option universe — set it (or change
it) with `create_report` / `edit_report`'s `accounts_used`.

**Multi-source** report (e.g. Google Ads + Meta): render one selector per source
AND pass per-connector accounts with `accountsFor(connector)` so a chart only ever
queries its own source's accounts (a flat `accounts` would send Google ids to a
Facebook chart):

```tsx
const { accountsFor, universe, selectedIds, setSelectedIds } = useAccounts();
const fb = useReportQuery({ connector: 'facebook-ads', accounts: accountsFor('facebook-ads'), fields }, range);
const ga = useReportQuery({ connector: 'google-ads',   accounts: accountsFor('google-ads'),   fields }, range);
// <AccountSelector connectors={['facebook-ads']} universe={universe} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
// <AccountSelector connectors={['google-ads']}   universe={universe} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
```

**Empty selection is not an error.** When nothing is selected (cold load before the
universe resolves, or the viewer unchecks everything), `useReportQuery` SKIPS the
query and returns `{ empty: true }` — no failing round-trip. Render an empty /
"select an account" state on `q.empty` if you like.

**Blend-backed charts are not scoped by the selector.** A chart driven by a
`blend_query_destination_id` (BigQuery-materialized) ignores `accounts` — the
selector only narrows connector/`accounts` queries. Don't pair a selector with a
blend-only report expecting it to filter.

## Filter by a dimension (e.g. campaign, ad, country)

When the user wants a dropdown to **filter the report by a dimension value** (e.g.
"only show campaign X"), use the turnkey filter — it applies a **real server-side
filter** that reaches `GetData` as `dimensionsFilters`.

> ⚠️ **Do NOT filter client-side.** Never fetch all rows and `.filter()` them in JS
> to fake a dropdown. That silently breaks: it's bounded by the query row `limit`,
> it fights the server's aggregation/sort/limit, and the filter never reaches the
> data plane. Always drive filtering through `useFilter`'s `filters` (below).

```tsx
import { useAccounts, useDateRange, useReportQuery, useFilter, useDimensionValues } from '../lib/useReport';
import { AccountSelector, DateRangeControl, FilterSelect } from '../components/controls';

function Page() {
  const { range, ...dr } = useDateRange();
  const { accounts } = useAccounts();
  // 1) filter STATE → produces `filters` you spread into the query base
  const { value, setValue, filters } = useFilter('campaign_name'); // 'equals' (single)
  // 2) OPTIONS for the dropdown — one lightweight query for the dimension, de-duped
  const campaigns = useDimensionValues('campaign_name', { accounts, range });
  // 3) every chart's query carries `filters` → server-side dimensionsFilters
  const q = useReportQuery({ connector: 'facebook-ads', accounts, fields: ['campaign_name', 'clicks'], filters }, range);
  return (
    <>
      <DateRangeControl {...dr} />
      <FilterSelect label="Campaign" value={value} setValue={setValue} options={campaigns.values} />
      {/* render q.data ... */}
    </>
  );
}
```

- **"All" clears the filter** (`value = null`) → `filters` is `undefined` → the server
  returns all rows. (An empty/mis-wired filter is what made the old dropdown "return
  zero" — the turnkey control avoids that.)
- **Multi-select** filter: `useFilter('campaign_name', 'in')` with a `string[]` value,
  and render checkboxes (mirror `<AccountSelector>`) instead of a `<select>`.
- **Options** come from `useDimensionValues` (a single dimension query, capped at
  `limit`, de-duped) — this only populates the dropdown; the actual filtering is
  server-side. Same shape works for any dimension (`ad_name`, `country`, …).
- Full write-up: `docs/CE-6003-dimension-filter.md`.

## Pages / navigation

Navigation is **client-side**, and a multi-view report MUST keep the external URL
in sync so `?page=<id>` deep-links, refresh, and shareable links work. Two things
are **decoupled** — pick the pattern that fits your design:

- **`emitRouteChanged(route, title)` drives the URL.** The wrapper writes
  `?page=<route>` whenever you emit this. Seed the initial view from
  `porter.initialRoute` on mount. This is all you need for `?page=`.
- **`announceRoutes(routes, current)` adds the wrapper's OWN nav chrome** — a
  floating top-center pill with one button per route (only when you announce ≥2).
  Announce **only if you want that pill to be your navigation**.

**Pattern A — your design ships its OWN nav (sidebar/tabs):** do NOT
`announceRoutes` (it would paint a duplicate pill on top of your nav). Still keep
the URL in sync — you get `?page=` deep-linking with zero wrapper chrome:

```ts
const start = porter.initialRoute || 'overview';   // deep-link seed from ?page=
setRoute(start);
porter.onNavigate((route) => setRoute(route));      // wrapper→SPA (harmless if no pill)
// on every view change:
porter.emitRouteChanged(route, title);              // SPA→wrapper: writes ?page=<route>
```

**Pattern B — let the wrapper own the nav (no custom nav in your SPA):**

```ts
porter.announceRoutes([{ path: 'overview', title: 'Overview' }, { path: 'campaigns', title: 'Campaigns' }], 'overview');
porter.onNavigate((route) => setRoute(route));   // the wrapper's pill asks you to switch
porter.emitRouteChanged(route, title);           // keeps ?page= in sync
```

> A multi-view report that never calls `emitRouteChanged` has **no `?page=`**,
> no deep-linking and no refresh-persistence — wire it in both patterns.

## PDF export (keep this working)

The wrapper's Export-to-PDF button triggers **your** export logic — the report
owns its print layout, so the PDF always looks the way you designed it. On
`porter.onExportPdf(...)`, render **every page stacked** (each in a
`.report-page`, which page-breaks under `@media print`), report your height with
`porter.emitResize(...)`, then call `porter.emitExportReady(pageCount)`. The
provided `pages/index.tsx` already does this — **keep PDF export implemented and
tested in every report** unless you explicitly don't need it.

## Build & upload

```bash
npm run build         # → out/  (static site; verify:relative runs to catch absolute paths)
```

Then upload the whole project (zipped) with the Porter MCP `edit_report` tool.
The zip must contain `out/index.html`; exclude `node_modules/`. The tool
validates and returns a report URL or descriptive errors to fix.

## Hard constraints (why the report runs in a sandbox)

- **Relative asset paths** — `next.config.js` sets `assetPrefix:'.'`. Absolute
  `/_next/...` would break (the report is served under a per-report path).
- **Client-side routing, single bundle** — no server, no late-loaded chunks.
- **No runtime network** — the report can't `fetch` anything; all data comes
  through `porter.query()`. Bundle every library (no third-party CDNs) — that's
  also why the report never goes down because someone else's CDN did.
- **No `localStorage`/`IndexedDB`** — the sandbox blocks them; use
  `porter.storage` (an in-memory shim) if you need scratch state.

No Vercel, no external deploy — Porter hosts the built `out/`.
