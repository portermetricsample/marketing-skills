# Porter Metrics — Google Ads

A library of **Google Ads report & analysis frameworks** built on top of the Porter Metrics MCP.
Each folder is a self-contained **use case**: the recipe for building a type of
report or audit (what business question it answers, what metrics it uses, how it's structured, and
which Porter data it feeds on).

> This does NOT store client data. Only the reusable recipes.

## How it's organized

- Each use case lives in its own folder under [`google-ads/`](google-ads/).
- All skill folders follow the **same skeleton** (see [`_template/`](_template/)).
- To create a new case: copy `_template/` with a new name and fill it in.
- Shared method and contracts live in [`_framework/`](_framework/) and are referenced by every skill.

```
porter-metrics-google-ads/
├── README.md          ← this index
├── _framework/        ← the shared method every skill builds on
│   ├── sumas.md       ← the global method used by all cases
│   ├── writing.md     ← the voice: how every analysis writes its text
│   ├── metric-relationships.md ← the funnel identity: how every movement names its driver
│   └── output-contract.md ← the canonical object every use case emits
├── _orchestrator/     ← the brain: request → which use cases to run, by output format
│   ├── README.md      ← the planning algorithm (goal → format → outline)
│   └── analysis-tree.md ← the complete analysis hierarchy (what/order/metrics), format-independent
├── _template/         ← template to copy for each new case
└── google-ads/        ← the Google Ads use cases (see table below)
```

## Use cases

<!-- One line per folder. Updated as each new case is created. -->

| Connector | Use case | What it answers | Folder |
|----------|-------------|--------------|---------|
| Google Ads | Financial overview (management) | Is it returning, and are we doing better than before? (non-marketing view) | [google-ads/financial-overview](google-ads/financial-overview/) |
| Google Ads | Funnel metrics (SUMAS map) | Where does the funnel leak — visibility, engagement, or conversion? (each with cost + rate) | [google-ads/funnel-metrics](google-ads/funnel-metrics/) |
| Google Ads | Keyword↔ad↔landing (cluster) | The journey term→keyword→ad→landing: **alignment** (does it tell one story? where it breaks) + **metrics** (QS/IS/CTR/CVR + Google grades) | [google-ads/keyword-ad-landing](google-ads/keyword-ad-landing/) |
| Google Ads | Search terms (cluster) | Defensive: relevance (✅) + term-routing (✅) + performance (⬜); Offensive: intent-discovery (✅) | [google-ads/search-terms](google-ads/search-terms/) |
| Google Ads | Account structure (cluster) | structure-map (✅) decodes naming→dimensions; structure-audit (✅) validates alignment; naming-convention (⬜) | [google-ads/account-structure](google-ads/account-structure/) |
| Google Ads | Account audit (cluster) | QA health-check vs best practice (Acme DIY checklist): bid-strategy, spend-allocation, conversion-tracking, settings, ad-assets, landing-cro (⬜) | [google-ads/account-audit](google-ads/account-audit/) |
