# Porter Design vs Porter Reporting — the boundary

These are **two different things on purpose.** Keep them explicitly separate.

- **Porter Design** (repo `porter-design`) = the **visual vocabulary**: color, typography,
  spacing, icons, logos — *plus* purely **presentational atoms** (Button, Card, Badge, Heading)
  that have an appearance but know **nothing about data or document structure**.
- **Porter Reporting** (this repo) = **UX/UI components that know about data or structure**:
  charts that receive data, scorecards, tables, page/document layouts, slides, audit findings —
  everything assembled into a deliverable.

## The one test that splits them

> **Does the thing know about data or about the structure of a document?**
> - **No** (it's pure appearance) → **Porter Design**
> - **Yes** (it takes data, arranges, composes, or defines structure) → **Porter Reporting**

So: a *button's color and radius* live in Design; a *chart that renders a data series* lives in
Reporting. A *Card's styling* is Design; a *KPI scorecard that displays a metric vs a target* is
Reporting.

## Dependency direction

**One-directional: Reporting → Design.** Reporting consumes Design's tokens and atoms.
Design never imports from Reporting and never knows Reporting exists.

If you find yourself writing a hex code or a font name inside a Reporting component, stop —
that value belongs in Design.

## What belongs where (target)

| Belongs in **Porter Design** | Belongs in **Porter Reporting** |
|---|---|
| Tokens: color, type, spacing | Charts (data → visual) |
| Logos, connector icons (`assets/`) | Scorecards, tables, funnels |
| The 4 themes (`data-theme`, default `white`) | Layouts / page & document scaffolds |
| Presentational atoms: Button, Card, Badge, Eyebrow, Heading | Report / dashboard / slide **templates** |
| The CSS *appearance* of charts | Audit findings / checklist blocks |

## ✅ Overlap resolved (2026-06-21)

The **report/dashboard/slide templates** were moved out of `porter-design` into
`~/porter-reporting/templates/` (they are assembly, not appearance). `porter-design` now keeps
only tokens + **empty** components — including `dist/porter-charts.js` as a data-less renderer
and `chart-primitives/`. The deprecated **`report-kit`** style was retired (archived outside the
repos at `~/Downloads/porter-archive/`). See `RULES.md` for the full ownership split.

## Sources to pull from

- **`porter-design` tokens** — the official style: `dist/porter-tokens.css` + the 4 themes
  (`data-theme="cream|white|blue|purple"`, default `white`). Start client *reports* from a
  reference template in `~/porter-reporting/templates/`.
- **`porter-design`** — the broader brand kit: tokens + presentational atoms.
  (Note: the *skill* is still named `porter-design-system`; the *repo/folder* is `porter-design`.)
- **Porter reports v2** — for live dashboards, output must respect the v2 constraints
  (template-derived, `Porter.charts.*` only, no hand-rolled SVG/D3).
