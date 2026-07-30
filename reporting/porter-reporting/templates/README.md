# templates/ — report / dashboard / slide reference layouts

Moved here from `porter-design` on 2026-06-21 (assembly is Reporting's job — see `../RULES.md`).
Each report family ships one folder **per theme** (`-type`=cream, `-white`=white, `-azul`=blue,
`-morado`=purple) and loads `porter-design`'s tokens at runtime via its local `ds-base.js`
(which points at `../../../porter-design`). They paint **only** from those tokens — no literal hexes.
(For a NEW standalone report, the simpler path is to link `porter-design/dist/porter-tokens.css`
and set `data-theme`; the moved templates predate that and use `ds-base.js` instead.)

- `executive-report-*` — vertical narrative report
- `marketing-dashboard-*` — widget dashboard
- `report-slides-*` — 16:9 deck
- `report-blocks-*` / `report-text-blocks-*` — composable sections
- `stress-google-ads*` — a fuller Google Ads example

Theme suffixes: `-type` = cream, `-white` = white, `-type-dark`/`-azul` = blue, `-morado*` = purple.

**Data rule:** these are *layout* references — any numbers are illustrative sample data. Never paste
a real client's data into a template here. Real reports are generated from live Porter MCP data at
build time, and finished client reports live outside the repos.
