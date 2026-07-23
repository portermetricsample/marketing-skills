# design-kit — frozen snapshot provenance

These three files are a frozen copy of the Porter Metrics design system's
distributable build, bundled so this skill is fully self-contained:

| File | Provides |
|---|---|
| `porter-tokens.css` | Brand tokens, flattened standalone (4 themes via `data-theme`: cream / white / blue / purple) |
| `porter.css` | Component classes (cards, chips, `.pds-*` primitives) |
| `porter-charts.js` | Dependency-free chart primitives: `PorterCharts.sparkline` / `PorterCharts.timeseries` (paint only from theme CSS vars) |

- **Source of truth:** the `porter-design` repo (`dist/` build). Update by
  re-copying `dist/porter-tokens.css`, `dist/porter.css`,
  `dist/porter-charts.js` and bumping the date below.
- **Snapshot date:** 2026-07-23.
- Note: the CSS `@import`s Google Fonts (Inter, Bricolage Grotesque, Hanken
  Grotesk, IBM Plex Mono) — the kit page needs internet for fonts. The
  deployed report does NOT use these files at runtime; it vendors its own
  fonts and consumes only the 8 approved token VALUES (see
  `../../references/design-recipe.md`).
