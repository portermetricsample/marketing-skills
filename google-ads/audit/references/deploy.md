# Deploy — turn the audit HTML into a hosted Porter report

The audit is authored as a standalone HTML file from [`../pages/main.html`](../pages/main.html)
(Porter Design System template). This file is the **bridge** from that standalone file to a hosted
Porter report. Without it every run improvised its own deploy — which is how the codebase ended up
with divergent forks. Follow this exactly so every audit deploys the same way and **looks identical**.

> Portal mechanics (the 7 meta-tools, fetch vs execute): [`../../../_framework/porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).

## The consistency contract (read first)
1. **One template, one design.** Always render from `pages/main.html` (the design-system template).
   The visual standard IS that template + the Porter Design System tokens — **not** a hand-written
   stylesheet. Never invent CSS per account.
2. **One theme per deliverable.** Pick exactly one `data-theme` — `cream` (default) · `white` ·
   `blue` · `purple`. Set it once on the `#audit` wrapper (see below).
3. **Self-contained bundle.** A hosted report is 3 files; it cannot reach `~/porter-design/…`. The
   tokens CSS is **inlined** at deploy time.
4. **Scoped to `#audit`.** Porter injects the bundle into its own chrome, so every audit style must
   live under `#audit` or it bleeds into the Porter UI. The design-system tokens already use
   `[data-theme="…"]` selectors (verified) → they resolve correctly on a `<div id="audit"
   data-theme="…">` wrapper, so scoping is just a wrapper + a selector prefix, no value-hardcoding.

## Step 1 — make the standalone file deploy-safe
In the rendered standalone HTML:
- **Wrap the content** in `<div id="audit" data-theme="cream"> … </div>` (move `data-theme` off
  `<html>`/`<body>` onto this wrapper). Put the audit body (`.doc` and everything in it) inside it.
- **Strip the dev theme switcher** — the `.theme-switch` block and its `<script>` are dev-only and
  must NOT ship.
- The audit `<style>` block's bare element selectors (`body`, `*`, `h1`, `h2`, `h3`, `p`, `.doc`,
  etc.) must be **prefixed with `#audit`** (e.g. `body{…}` → `#audit{…}`, `p{…}` → `#audit p{…}`).
  Class selectors that are already unique to the audit can stay, but prefixing them with `#audit` is
  safest. This is the one transform that makes the design-system template Porter-chrome-safe.

## Step 2 — build the 3-file bundle
Run [`../../scripts/to_porter_bundle.py`](../../scripts/to_porter_bundle.py) `<audit.html> <out-dir>`.
It produces the reports-v2 bundle:
- **`style.css`** = `porter-tokens.css` (inlined verbatim — its `[data-theme]` rules drive the theme)
  **+** the audit `<style>` block (scoped under `#audit`).
- **`pages/main.html`** = font links + `<link rel="stylesheet" href="style.css">` + the
  `<div id="audit" data-theme="…">…</div>` body + the SDK + `report.js`.
- **`report.js`** = `/* porter:no-compare */` (the audit is static — every number is fixed for the
  window, there is nothing to render from a connector and no date controls).

## Step 3 — deploy
| # | Tool | Meta-tool | Args |
|---|------|-----------|------|
| 1 | `tool:porter-reports:get_report_template` | `fetch` | `{}` then `{variant:"blank"}` — capture the current `template_version` (validated server-side; do not hardcode an old one) |
| 2 | `tool:porter-reports:create_report` | `execute` | `name`, `template_version`, `variant:"blank"`, `files:[…3 bundle files…]`, `pages:[{id:"main",title:"Account Audit",file:"pages/main.html"}]`, `default_page_id:"main"`, `config:{charts:{}}`, `visibility:"PRIVATE"` |
| 3 | `tool:porter-reports:get_report_diagnostics` | `fetch` | `{report_id}` — only if `charts_health` is non-empty |

Reply with **both** the local file path and the `report_url`. Default `visibility:"PRIVATE"` — never
share without the user asking.

## Verified facts (Jun 2026)
- `porter-tokens.css` defines themes via `[data-theme="cream|white|blue|purple"]` selectors (not only
  `:root`), so a `#audit data-theme` wrapper themes correctly. Tokens file ≈ 31 KB.
- Deploy bundle for the design-system template = inlined tokens + scoped audit style; the older
  teal/navy reports shipped a pre-scoped hand-written `audit.css` instead (deprecated approach — do
  not reintroduce; it's why the look drifted).
- A full bundle's `pages/main.html` runs ~40 KB; deploy via `create_report` with the files inline.
