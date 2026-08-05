# How the GA4 masking works — the two tricks baked into the bundled code

This report is a **fully-masked** copy of a real GA4 dashboard. It shows a fictional brand
(**Acme Analytics / acmeanalytics.io**) and never touches the data plane. Two design
choices make that work and still pass Porter's upload audit. Read this before editing the
code so you don't undo them (which would either leak real data or break the numbers).

## Trick 1 — short-circuit `porter.query()` (no RPC ever leaves the report)

Every chart in a Porter report funnels through the single chokepoint
`porter.query(spec)` in `lib/porter.ts`. Here it is rewritten to:

```ts
async query(spec: QuerySpec): Promise<QueryResult> {
  return maskResult(spec);   // synthetic data — NO bridge RPC
}
```

Consequences:

- **No real data can ever appear** — there is no code path to the data plane. Even if the
  report is embedded in the live wrapper, `query()` returns the synthetic universe.
- **The audit passes with no live account.** Porter's audit (local `npm run audit` and the
  cloud audit on upload) only *records* a chart when it observes a `query` RPC, and only
  *fails* one when that RPC errors. Zero RPCs → `charts: 0, errors: 0` → green. The bridge
  still handshakes normally (`porter.init` is untouched), so it reports `bridge: connected`.
- Therefore the report is created **self-contained**: `create_report` with **no**
  `accounts_used` / `connectors_used`. `get_report` shows `connectors_used: []`,
  `account_ids: []`. This is what lets Path A clone it verbatim with no account and lets it
  be made public with zero leakage.

`charts: 0` is the EXPECTED audit result for this report. On a normal (live) Porter report
`charts: 0` would mean the queries aren't firing — here it means the masking is working.

Do not "fix" this back into a real query. The whole point is that it never queries.

## Trick 2 — one canonical daily universe (so every page reconciles)

All synthetic data comes from `lib/mask.ts`. It builds **one** deterministic daily series
and derives everything from it, so a KPI computed on one page equals the same metric
aggregated on another (total sessions on Conversions == sessions summed on Time matrix).

- `dayStat(iso)` seeds each day by its own date (a string hash → mulberry PRNG — **no
  `Math.random`**, so audit renders are reproducible). Base ~1,180 sessions/day, ×0.62 on
  weekends, a gentle yearly uptrend, small per-day jitter.
- Every other metric is a fixed ratio of sessions (activeUsers 0.80×, totalUsers 0.86×,
  newUsers 0.58×active, engagedSessions 0.63×, views 2.4×, eventCount 6.2×, keyEvents
  0.072×, engagement duration 82s×). Rates (engagement rate, key-event rate) are DERIVED
  client-side from these base counts, never stored as a metric.
- `maskResult(spec)` routes by the requested fields:
  - contains `date` → one row per day in the range (date series);
  - contains `dayOfWeekName` + `hour` → a 7×24 heatmap grid (business-hours peak);
  - any other dimension → a breakdown: distribute the range total across the catalog's
    values by fixed shares. Key events use a **separate** `conv` share vector so channels /
    pages / events convert at different rates than they receive traffic;
  - no dimension → a single totals row (range sums), respecting `limit`.
  - It honors `spec.sort` and `spec.limit` so "top N" tables match the real report.

Rules to preserve if you edit the fiction:

- **Deterministic + internally consistent** — totals must reconcile across the 4 pages.
- **Every label unique** within a catalog (duplicate dimension values collide when the
  period-over-period join keys by label → absurd deltas).
- **Coherent ratios** — don't hand-set a metric that contradicts its base (e.g. active
  users > sessions).
- **No real photos/logos/URLs** — this is a masked sample; keep the brand fictional.

## Brand strings — where the fiction is named
- `lib/ga4.ts` — `ACCOUNTS` (id/name/source_user_id/company_id, all zeroed placeholders)
  and `PROPERTY_LABEL` (`"Acme Analytics — GA4 (sample)"`, shown in the header).
- `pages/index.tsx` — the header subline (`GA4 property · masked sample data`) and the
  footer disclaimer.

Change the brand in exactly those spots; the rest of the app reads from them.
