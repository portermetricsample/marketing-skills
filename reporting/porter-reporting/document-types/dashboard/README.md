# Document type: Dashboard

A **live, interactive, multi-page widget surface**. Built to be *monitored* over time, not
read once. The reader explores; the document doesn't tell a single linear story.

## When to use
- "I want to keep an eye on this week over week."
- The reader wants to filter, change the period, and drill in themselves.

## Shape
- Multi-page, widget-based (scorecards, charts, tables, controls).
- Live data binding (period selector, filters) rather than a frozen snapshot.

## Built from
- Look + engine: **Porter reports v2** (template-derived, `Porter.charts.*` only — no hand-rolled
  SVG/D3, no regex literals). Legacy dashboards are EOL for management.
- Components: `components/charts`, `components/layouts`.

> Stub — fill in the v2 build recipe and page patterns as we build the first dashboard generator.
