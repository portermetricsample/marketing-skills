---
name: porter-reporting
description: Porter Metrics UX/UI assembly layer — how to build any deliverable (report, dashboard, presentation, audit) from data. Defines document types, the component contract (table, tooltip, scorecard, states, SUMAS funnel render), and the boundary with the design system. Use it whenever you build a Porter report/dashboard/deck/audit, render the output of the funnel-metrics or financial-overview skills, or decide how a data component should behave. Pairs with porter-design-system (appearance) and porter-analysis (what to measure).
user-invocable: true
---

# Porter Reporting — router

This is the **assembly layer**: how Porter interfaces get built. It owns **behavior, structure
and data**; the **appearance is owned by `porter-design`**. The rules below are NOT duplicated
here on purpose — read them live from this skill's own files (bundled alongside this router, under
`_foundation/`, `document-types/` and `templates/`) so they're always current.

## The one boundary rule

> **Does the thing know about data or document structure?**
> No (pure appearance) → **Porter Design** (`porter-design` / `porter-design-system` skill).
> Yes (takes data, arranges, composes, has behavior) → **Porter Reporting** (here).

Reporting **consumes** Design's tokens; never invents colors or fonts. A hex or font name inside
a component is wrong — pull it from `~/porter-design/dist/porter-tokens.css` and set
`data-theme` on `<body>` (the 4 official themes; default `white`).

## Start here

- **Building a full report?** Start at the **Report outline** in `component-contract.md` — the
  skeleton (header → exec summary → body sections → next steps → footer) and heading hierarchy.
  Then fill each body section by mapping one `porter-analysis` use case → one section.
- **Need one component?** Jump straight to its rule in `component-contract.md` (table, tooltip,
  scorecard, chart, callout…).

## Read SOLO the file your task needs (these are the source of truth)

| Task | Read this |
|---|---|
| **Full report skeleton + heading hierarchy** (start here) | `_foundation/component-contract.md` → "Report outline" |
| **Component behavior defaults** (table, tooltip, scorecard, states, number format, SUMAS render) | `_foundation/component-contract.md` |
| Foundation principles (audience, hierarchy, always-compare, …) | `_foundation/principles.md` |
| Design ↔ Reporting boundary (full) | `_foundation/design-system.md` |
| Shape of the inputs | `_foundation/input-contract.md` |
| A document type | `document-types/{report,dashboard,presentation,audit}/README.md` |
| A reference template (start any report from one) | `templates/executive-report-white/` (all 4 themes live in `templates/`) |

## How to deliver

- Disposable mock / proof → static HTML linking `~/porter-design/dist/porter-tokens.css` with
  `data-theme="white"`. Start from a reference template in `templates/`.
- Production → components that consume the design system; sparklines/charts from Design's
  `porter-charts.js`, never hand-rolled.

> Keep this file a thin router. New rules go in `_foundation/`, never inline here — that's what
> keeps the skill and the repo from drifting apart.
