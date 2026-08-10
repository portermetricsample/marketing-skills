# marketing-skills

Account-agnostic marketing skills and frameworks built on the [Porter Metrics MCP](https://portermetrics.com). Each folder is a self-contained area — drop any of them into a Claude Code session and run it against your own accounts.

No API keys. No client data. Only reusable recipes.

> **This is the canonical public distribution of Porter Metrics skills.** The former `porter-metrics-google-ads` repo has been archived; all its skills are included here and kept up to date.

## Areas

| Folder | What's inside |
|--------|--------------|
| [`research/`](research/) | **Competitor & search intelligence** — the layer that feeds decisions and content. [`channels/`](research/channels/) holds full competitor teardowns per surface (Meta Ads, TikTok Ads, Instagram public, LinkedIn posts, and a competitor's whole website via `website-changes-monitor`) → self-contained Porter report; [`seo/`](research/seo/) holds 14 organic-search skills — content gaps, keyword value, AI visibility, traffic drop detection, featured snippets, and more |
| [`google-ads/`](google-ads/) | Analysis frameworks — financial overview, funnel metrics, search terms, account audit, keyword↔ad↔landing alignment, impression share, brand incrementality, negatives, change history, and more |
| [`meta-ads/`](meta-ads/) | Paid social execution — campaign setup and optimization, account safety, creative performance scoring (Unicorn/Winning/Losing), and a full multi-page Meta Ads dashboard |
| [`creative/`](creative/) | Creative production and diagnostics — hook writing, ad diagnostics, LinkedIn infographic visuals (`porter-ai-systems`), and branded Remotion animations (`porter-remotion-animation`) |
| [`core/`](core/) | Product/onboarding — `porter-setup`, the wizard to install and connect the Porter Metrics MCP in any AI assistant |
| [`analytics/`](analytics/) | Cross-channel performance decay — labels pages and ads by their real trend at scale |
| [`strategy/`](strategy/) | Strategy → copy stack: STP (segmentation, targeting, positioning), positioning → narrative → messaging, landing-page structure + copy, and `page-teardown` (reverse-engineer any competitor page into positioning/messaging/sections + a value read). The build frameworks need no MCP; `page-teardown` uses the Porter MCP scraper to fetch the page |
| [`reporting/`](reporting/) | Cross-channel deliverable builders + the SUMAS analysis framework (`sumas`) that underpins them — `dashboard-builder` creates a complete hosted Porter dashboard end-to-end: SUMAS planning → brand-approved design kit (Porter or white-label) → live published report URL. `porter-instagram-dashboard` ships a ready-made 4-page Instagram Insights dashboard that can also be cloned onto any account in a single MCP call |

## Reference

| Folder | What's inside |
|--------|--------------|
| [`_framework/`](_framework/) | Shared concepts: skill anatomy, SUMAS output contract, metric relationships, ad rank and impression share, brand vs non-brand, Porter MCP call patterns |
| [`_orchestrator/`](_orchestrator/) | Analysis tree — how the skills connect and when to use each one |

## Requirements

Most skills require the Porter Metrics MCP connected to Claude Code (the `strategy/` frameworks are the exception — they need no data connection). See [porter-setup](https://portermetrics.com/en/tutorial/claude/) to get started.
