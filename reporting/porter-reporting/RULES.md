# The Rules — who does what (single source of truth)

> This is the one page that settles ownership across the three Porter repos.
> If any other doc contradicts this, **this page wins** until it is updated.
> Decisions recorded 2026-06-21.

## The three roles

| Repo | Role | Owns | Does NOT own |
|------|------|------|--------------|
| **porter-analysis** | The brain | What to measure, what it means, and **pulling the numbers live** from the Porter MCP at build time. Emits content only (the canonical JSON object). | How it looks. How it's laid out. |
| **porter-reporting** (this repo) | The assembler — **the default builder of every report** | The rules + the generator that turns analysis content into a finished report/dashboard/presentation/audit. | The numbers. The colors/fonts. |
| **porter-design** | The look | **Tokens only** (colors, fonts, spacing) + **empty, data-less components** (chart shells, cards). | Finished reports. Real or sample data. Layout decisions. |

## Hard rules

1. **Reporting assembles.** Analysis decides *which* sections exist; Reporting decides *how* they are put together; Design only supplies the paint and the empty building blocks.
2. **Design is tokens + empty components — nothing else.** No finished report templates, no example reports, no data live in `porter-design`.
3. **No real-account data anywhere in the repos.** Never commit a real client's account id, brand name, campaign names, or real numbers. Examples are allowed, but only with the fictional account **"Acme Insurance"** (`1234567890-1234567890`) and **synthetic** numbers.
4. **Reports are generative, not pegged.** A report is built fresh each time from the rules + live data. Do not copy a stored reference report. Any rendered example committed here is a labeled **fictional demo**, not a template to clone.
5. **Real client reports live OUTSIDE the repos.** A finished client report (with real data) is a *deliverable* — keep it in a client folder (e.g. `~/Downloads/...`), never inside these repos.
6. **Data is pulled live at build time** by analysis (via `query_data` on the Porter MCP), never hardcoded into a file.

## Official style

- The official visual system is **porter-design**, which ships **4 themes**: `cream` (light), `white` (light), `blue` (dark), `purple` (dark).
- **Default for client reports: `white`** (light). Any theme can be chosen per report.
- The separate `report-kit` palette is **deprecated** — see open items.

## Status of the cleanup (2026-06-21)

- ✅ **Real-account data scrubbed** from all three repos (63 files) → fictional "Acme Insurance". Verified 0 remaining.
- ✅ **`report-kit` retired** — archived outside the repos at `~/Downloads/porter-archive/`. Official style is now the 4 `porter-design` themes (default `white`).
- ✅ **Report templates moved** out of `porter-design` → `templates/` here. Design keeps tokens + empty components (incl. `chart-primitives/` and `dist/porter-charts.js`).
- ✅ **`porter-analysis/_orchestrator` trimmed** — format assembly specs moved to `document-types/_assembly-from-analysis/`; analysis now owns only *which* sections + order.
- ✅ **Rendered examples** on the old style archived; new ones are generated fresh (see `examples/README.md`).

### Still to do (next, optional)

1. Fold each moved assembly spec into its matching document type (`report` / `dashboard` / `presentation` / `audit`).
2. Fold any still-needed `report-kit` niceties into the 4 themes, then delete the archive once confirmed unneeded.
3. Build the actual **generator** so reports assemble automatically from live MCP data — the "machine" that does not exist yet (today a human still wires it by hand).
