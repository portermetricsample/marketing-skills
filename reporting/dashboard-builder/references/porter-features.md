# Porter platform features — NATIVE FIRST

Porter's hosted-report runtime ships more capability than any single build
uses. **Before building any control or behavior by hand, check this
inventory: if Porter provides it, wire the native mechanism.** Custom UI may
*style* a native feature; it must never run *parallel* to it (that produces
redundant controls, broken deep links, or regressed UX).

This inventory evolves server-side — the `edit_hints` returned by
`create_report` are the living version and supersede this file on conflict.
Re-read them on every build.

## The inventory

| # | Feature | Porter provides | The report opts in via | Anti-pattern (never do) |
|---|---------|-----------------|------------------------|--------------------------|
| 1 | **Date range + comparison** | Reactive range state, period-over-period second query, URL round-trip | `useDateRange()` + `DateRangeControl` (presets **and custom from/to**) + `ComparisonToggle`; every change through `emitState` so refresh/share restore it | Fixed-date preset chips; dates hardcoded into queries; a range picker that doesn't survive refresh |
| 2 | **Pages & the wrapper page picker** | A floating page-picker chip + prev/next arrows in the report chrome, `?page=` deep links, refresh/share persistence | `announceRoutes(routes, current)` on mount (ALWAYS — even with your own tab bar) · `emitRouteChanged(view, title)` on every change · seed from `porter.initialRoute` · handle `porter.onNavigate` | Custom pagination that never announces (Porter's chip stays empty → redundant duplicated navigation); multi-view report whose URL never gains `?page=` |
| 3 | **Account selector & slots** | View-time account resolution from the report's allowlist, viewer-facing selector, slot labels, duplication onto other accounts | `useAccounts()` (`accounts` / `all` / `allFor(connector)` / `slot(label)`), optional `<AccountSelector>`; labels set in `accounts_used` | Hardcoded account ids in charts (breaks `duplicate_report`); building an account dropdown by hand |
| 4 | **Dimension filters** | Real server-side `dimensionsFilters` that reach the data plane, plus dropdown option values | `useFilter(field)` spread into the query base + `<FilterSelect>` + `useDimensionValues(field)` | Fetching all rows and `.filter()` in JS — bounded by row limit, fights server aggregation, the classic "dropdown returns zero" bug |
| 5 | **Comparison deltas** | The previous-period query fired automatically alongside the current one | `useReportQuery(base, range, compare)` + `KpiValue` for value + delta | Hand-rolling a second query per chart; KPIs without deltas |
| 6 | **Chart states** | Skeleton → error(retry) → empty → data lifecycle | Wrap every chart/table in `ChartFrame` | A blank or broken widget when one sub-fetch fails |
| 7 | **Interactive charts** | Hover tooltips, real time series | `components/charts.tsx` (`LineChart`/`BarChart`) restyled to brand | Static images; tooltip-less charts |
| 8 | **PDF export** | Wrapper-triggered export with native Chrome pagination | `porter.onExportPdf` → build print layout (`@page`/`break-*`) → `emitExportReady` after zero skeletons remain; print mode renders the nav too | No print layout; signaling ready while charts still load |
| 9 | **Theme** | Wrapper pushes light/dark at init and on change | `porter.onTheme` handler; brand-locked theme applied on mount AND in the handler | Trusting a `?? 'light'` fallback; relying on `set_theme` (observed no-op) |
| 10 | **Preview image** | `preview_report` → token-signed `preview.jpg` anyone can open without login | Call it after every clean upload; it's how the user actually sees the result | Sharing the report itself just to show a preview |
| 11 | **Sharing & permissions** | `share_report`: public link, silent role grants (viewer/editor/admin), email delivery with PDF, visibility control | User-initiated only; reports stay PRIVATE until the user says share | Auto-sharing; treating the `create_report` placeholder URL as a deliverable |
| 12 | **Duplication** | `duplicate_report` re-points a whole report to another account set via slots | Design every report to be duplication-safe (feature #3) | One-off builds that can't be templated |
| 13 | **Blends & formula fields** | Cross-connector joins (`create_blend`) and computed fields (`formula_fields` backed by a blend id in `allowed_blends`) | Only when a single connector can't answer the question | Client-side joins of two connectors' rows inside the report |
| 14 | **Creative images** | CSP-allowlisted hosting (Porter media hosts + ad-platform CDNs), automatic absolutization | Render the field value as-is in `<img>` with an `onError` fallback | Rewriting image URLs to hosts you invent (renders blank) |
| 15 | **Validation ladder** | Bundled data simulator, local bridge audit (`npm run audit`), cloud audit gate on upload, advisory design verdict | Climb every rung in order; the cloud audit is the publish gate | Skipping local audit; chasing the design verdict past one polished pass |

## Pre-publish checklist (run before every upload)

For each row above: **used, or consciously N/A with a reason.** The two most
commonly regressed (both caught in live user review — do not repeat):

- [ ] #1 date control is the FULL pattern (presets + custom + comparison,
      `emitState` round-trip) — not fixed chips
- [ ] #2 `announceRoutes` wired — the Porter page-picker chip lists every
      page, `?page=` deep-links work, and the in-report nav is *styling on
      top of* the native route state, not a parallel system
- [ ] #3 no hardcoded accounts · #4 filters server-side · #5 deltas on KPIs
- [ ] #6 every chart in ChartFrame · #8 PDF exports complete · #9 theme
      brand-locked
- [ ] #10 preview verified visually after the clean upload
