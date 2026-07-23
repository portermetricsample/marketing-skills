# Reporting — cross-channel deliverable builders

Skills that turn analysis into **deliverables** across any connector. Where a
channel folder (e.g. `google-ads/reporting/`) builds deliverables for one
platform, the builders here are connector-agnostic.

| Skill | What it builds | Status |
|---|---|---|
| [`dashboard-builder/`](dashboard-builder/) | A complete hosted Porter dashboard, end-to-end: SUMAS planning → brand-approved design kit (Porter or white-label extracted from any client website) → live published report URL with real data | ✅ Built (stress-tested live) |

Planned future builders reusing the same planning + design phases: audit
report, executive report, slide deck.

**Requirements:** the Porter Metrics MCP. Deployment additionally needs a
code-execution environment (Claude Code or equivalent). No API keys; no real
client data — examples use fictional **Acme Insurance**.
