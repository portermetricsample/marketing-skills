# Google Ads — Universal reporting template

A white-label, **account-agnostic** Google Ads reporting template that any client
can use, in two formats so far:

- **`dashboard.html`** — multi-page, widget-style board (8 SUMAS pages: Overview ·
  Funnel · Campaigns · Keywords & terms · Audience & geo · Conversions · Account
  audit · Next steps). Dark Porter sidebar + light content.
- **`deck.html`** — 16:9 executive presentation (15 slides), same story compressed
  to one idea per slide.

> ⚠️ **Fictional demo.** Everything here uses the fictional advertiser **"Acme
> Insurance"** (`1234567890-1234567890`) and **synthetic numbers** — per
> [`RULES.md`](../../RULES.md) #3/#4, no real client data lives in this repo. A
> real client report (real data) is a deliverable that lives OUTSIDE the repos.

## What it's built on

- **Logic = SUMAS** (porter-analysis): the funnel is outcome-first (Conversion →
  Engagement → Visibility), each level with volume + efficiency (cost) +
  effectiveness (rate), always vs the previous period.
- **Audit = the porter-analysis Google Ads `account-audit` cluster** (8 checks).
- **Look = porter-design** tokens + `.pds-*` primitives + `porter-charts.js`,
  theme `white` by default. Charts carry labeled axes + hover tooltips by default.

## Adaptive (the "universal" part)

The account is a **lead-gen hybrid** (Life tracks conversion value → ROAS; Health
& Dental are leads-only → CPA). The template leads with **CPA** and keeps ROAS as a
secondary, coverage-flagged metric. For a pure e-commerce account you'd surface
ROAS/AOV instead — same skeleton, different headline KPI (auto-detect on whether
`conversions_value > 0`).

## How to use

1. **Mock / design reference** — open the HTML directly (it links the design
   system from the sibling `../../../porter-design` repo). Swap the numbers,
   labels, campaign names, currency and the connector logo for the real account.
2. **Live Porter report** — these HTML files are the *faithful wireframe*; the
   live version is built with `porter-reports.create_report` (Porter v2), which
   pulls the data live at view time. Use this layout as the structure spec.

## Notes baked into the demo (real Google Ads gotchas worth keeping)

- **CPA is computed** (`sum(cost)/sum(conversions)`) — the native
  `cost_per_conversion` aggregate is unreliable.
- **Quality Score** is shown as "pending": Google Ads QS aggregates out of range
  over multi-day windows; show the latest snapshot once available.
- **Impression share** can come back on a 0–1 scale while lost-IS is 0–100 —
  normalize before charting.
- **Geography** uses breakdown bars (geo-agnostic); the design system ships a
  US-tile map only.
