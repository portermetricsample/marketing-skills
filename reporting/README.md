# Reporting — cross-channel deliverable builders

Skills that turn analysis into **deliverables** across any connector. Where a
channel folder (e.g. `google-ads/reporting/`) builds deliverables for one
platform, the builders here are connector-agnostic.

| Skill | What it builds | Status |
|---|---|---|
| [`porter-reporting/`](porter-reporting/) | The **assembly layer** underneath every deliverable: document types (report/dashboard/presentation/audit), the component contract (table, tooltip, scorecard, states, SUMAS render), reference templates and the design↔reporting boundary. Read this to decide how any data component should behave | ✅ Foundation library |
| [`dashboard-builder/`](dashboard-builder/) | A complete hosted Porter dashboard, end-to-end: SUMAS planning → brand-approved design kit (Porter or white-label extracted from any client website) → live published report URL with real data | ✅ Built (stress-tested live) |
| [`porter-instagram-dashboard/`](porter-instagram-dashboard/) | A specific, ready-made 4-page Instagram Insights dashboard (Overview · Posts · Stories · Audience), shipped as bundled report source so every run lands on the same design. Clone path reproduces it in one MCP call — no build tools, works in plain chat | ✅ Built (published + clone verified) |
| [`porter-linkedin-dashboard/`](porter-linkedin-dashboard/) | A specific, ready-made 4-page LinkedIn Company Page dashboard (Overview · Posts · Audience · Discovery), shipped as bundled report source so every run lands on the same design. Runtime-resolved account, so the clone path reproduces it in one MCP call — no build tools, works in plain chat | ✅ Built (published + clone verified) |

Planned future builders reusing the same planning + design phases: audit
report, executive report, slide deck.

**Requirements:** the Porter Metrics MCP. Deployment additionally needs a
code-execution environment (Claude Code or equivalent) — except
`porter-instagram-dashboard/`'s clone path, which needs only the MCP. No API keys; no
real client data — examples use fictional **Acme Insurance**.
