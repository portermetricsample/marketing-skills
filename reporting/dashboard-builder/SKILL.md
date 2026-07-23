---
name: dashboard-builder
description: >-
  Build a complete, hosted marketing dashboard on Porter Metrics end-to-end —
  from intake interview and SUMAS planning, through a brand-approved design kit
  (Porter brand or white-label extracted from any client website), to a live
  published report URL with real data. Use when a user with the Porter MCP asks
  for "a dashboard", "a client report I can share", "a live report for account
  X", or wants to white-label a report with a client's brand. Connector-
  agnostic (Google Ads, Meta, GA4, ...) and framework-agnostic (Next.js
  template is the default path, any static-site stack meeting the Porter
  contract works).
---

# Porter Dashboard Builder (0→100)

Turns "I want a dashboard" into a **published Porter report URL with real
data**, through three phases with two hard approval stops. You are the
orchestrator: the sequence below is fixed; the detailed rules live in
`references/` and are loaded when each phase starts.

**Rigor rule (non-negotiable):** every step ends in a verifiable check —
field names verified against `list_fields`, local audit clean, cloud audit
200, visual preview confirmed. Never advance past a failed check; never
deliver an unverified URL.

## Prerequisites — check these FIRST

1. **Porter MCP connected** (`whoami` answers). If not: stop and set that up
   first (see the `porter-setup` skill or portermetrics.com/en/tutorial/claude/).
   If tools error transiently ("Not Found" / 5xx on EVERY call), the server is
   momentarily down, not misconfigured: retry with backoff and meanwhile
   continue the offline steps (interview, brand extraction via plain HTTP).
2. **At least one data-source account connected** (`list_accounts` for the
   connector returns rows). If empty, run `connect_account` and wait for the
   user to finish OAuth.
3. **Surface gate — say this up front, not at deploy time:** Phases P and D
   work on any Claude surface. **Phase B (deploy) requires a code-execution
   environment** (Claude Code or equivalent: npm, zip, HTTP POST). On
   claude.ai-only, deliver through the end of Phase D and hand the user a
   "finish from Claude Code" package.

## Phase P — Plan (SUMAS)

Framework: [`_framework/sumas.md`](../../_framework/sumas.md) is the brain of
this phase — fewer, better-chosen metrics; funnel-ordered; always with context.

- **P1 Interview (2–4 questions, ask before proposing anything):** who reads
  this dashboard and what decision does it support? · which connector(s) and
  account(s)? · date range + comparison period? · **brand: Porter look,
  client-brand (white-label), or client website to extract from? light or dark?**
- **P2 Data audit (ground truth):** resolve the account (`list_accounts` —
  read `references/engineering-notes.md` §Account rows first), then probe with
  small `query_data` calls: available date range, key dimensions, business
  model (ecommerce → ROAS/AOV; lead-gen → CPA). Promise only what the data
  supports.
- **P3–P5 Brief → KPIs → page map:** one short planning doc — audience + the
  3–5 business questions, SUMAS KPIs per funnel level (volume + efficiency +
  effectiveness, each vs previous period, rates always derived from base
  counts), and the page list (each page = one purpose, one connector).
- **HARD STOP #1:** user approves the planning doc before any design work.

## Phase D — Design

Detailed rules: `references/design-recipe.md`.

- **D1 Client design system.** Porter mode → bundled kit as-is
  (`assets/design-kit/`). White-label mode → five sub-steps (W1–W5 in the
  reference): company research (identity brief via a web-search action) →
  site exploration (homepage + 2–3 revealing pages: pricing/product, where
  structured information lives) → rigorous multi-page extraction (branding
  format + rawHtml; keep what repeats, discard one-offs) → the **design
  system doc** with its **derivation layer** (chart-series palette, heat
  ramp, semantic up/down — semantics are ALWAYS universal green/red on a
  visibly different scale than any brand color) → projection to the report
  tokens. Discover action ids via `list_actions` (ids can evolve).
- **D2 Report Design Kit — HARD STOP #2.** Generate the approval page from
  `assets/kit-template.html`: brand tokens, the derived data palettes
  (series/heat/semantics shown side by side with brand swatches for the
  collision check), and sample charts/tables with sample data. The user
  gives a visual OK (iterate HERE — never propagate an unapproved brand).
  The kit is the **visual reference contract**: Phase B copies its token
  block (8 vars + derived layer) into the report verbatim, and every real
  chart uses those palettes — no per-chart color improvisation. Theme choice
  (light/dark) is **brand-locked in code**.
- **D3 Mockup path choice.** Default: go straight to Phase B and use the
  template's local dev build as the living mockup. Alternative when the user
  wants richer visual iteration: Claude Design handoff
  (`references/claude-design-handoff.md`).

## Phase B — Build & deploy (the hosted report)

Detailed pipeline: `references/report-recipe.md` — read it BEFORE calling
`create_report`. Summary:

1. `create_report(name, connectors_used, accounts_used)` → READ the returned
   `edit_hints` (Porter's live authoring manual — it evolves server-side and
   **supersedes this skill on any conflict**) → download + unzip the template.
2. Adopt the closest certified gallery (`examples/performance-overview/` or
   `examples/cost-analysis/`), map the approved pages onto routes: **one page
   = one section file + one ROUTES entry**.
3. **Field truth step (the #1 failure source):** verify EVERY field against
   live `list_fields`; hand-patch `simulator/schemas/<connector>.json` to
   match. Never trust the template's field maps or shipped schemas.
4. Apply the approved kit tokens to `styles/globals.css`; brand-lock the theme.
5. Build → local audit → fix until clean → upload zip → **cloud audit is the
   publish gate** (422 = fix and repeat; 200 = published).
6. Verify the returned preview visually, triage the design verdict, iterate
   page by page (~3 min per cycle).
7. Deliver `report_url` + preview. Keep the report PRIVATE; sharing
   (`share_report`) is the user's explicit call.

## What this skill never does

- Ship a chart whose field names weren't verified against `list_fields`.
- Render data as a chat table and call it the deliverable — the deliverable
  is the hosted URL.
- Hardcode account ids in charts (always `useAccounts()` / the allowlist).
- Put real client data in this repo — examples here use **Acme Insurance**.
- Hand over the `create_report` placeholder URL before a clean upload.

## Bundled assets

- `assets/design-kit/` — frozen Porter design tokens + component CSS + chart
  primitives (see `SYNC.md` for provenance/update source).
- `assets/kit-template.html` — the D2 approval page skeleton (Acme sample data).
- `assets/fixtures/acme-google-ads.json` — fictional rows for kit/mockup previews.
