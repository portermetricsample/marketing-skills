# Google Ads — Reporting

How the Google Ads analysis skills become **deliverables**. Each folder is a builder that
sits *on top of* the analysis skills (`../funnel-metrics`, `../search-terms`, …) and turns
their findings into something a user can hand off.

| Folder | What it builds | Status |
|--------|----------------|--------|
| [`audit/`](audit/) | Single-page HTML audit report (orchestrates all GA analysis skills) | ✅ Built |
| [`dashboard/`](dashboard/) | Live multi-page Porter dashboard | 🟡 Orchestrator only — components pending |
| [`slides/`](slides/) | Slide deck / presentation | 🔴 Planned |
| [`components/`](components/) | Reusable graphic components the builders draw on | 🔴 To be populated |
| [`examples/`](examples/) | Ready-made dashboards/reports to duplicate via the Porter MCP (fictional data only) | 🔴 To be populated |

**Design system:** all visual styling comes from the public
[`portermetricsample/porter-design`](https://github.com/portermetricsample/porter-design)
repo — referenced, never copied.

> **No real client data here.** Examples use fictional accounts (e.g. Acme Insurance).
