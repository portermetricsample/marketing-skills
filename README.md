# marketing-skills

Account-agnostic marketing skills and frameworks built on the [Porter Metrics MCP](https://portermetrics.com). Each folder is a self-contained channel — drop any of them into a Claude Code session and run it against your own accounts.

No API keys. No client data. Only reusable recipes.

> **This is the canonical public distribution of Porter Metrics skills.** The former `porter-metrics-google-ads` repo has been archived; all its skills are included here and kept up to date.

## Channels

| Folder | What's inside |
|--------|--------------|
| [`google-ads/`](google-ads/) | Analysis frameworks — financial overview, funnel metrics, search terms, account audit, keyword↔ad↔landing alignment, impression share, brand incrementality, negatives, change history, and more |
| [`meta-ads/`](meta-ads/) | Paid social — campaign research, creative performance scoring (Unicorn/Winning/Losing), and a full multi-page Meta Ads dashboard |
| [`seo/`](seo/) | 12 organic search skills — content gaps, keyword value, AI visibility, traffic drop detection, featured snippets, and more |
| [`creative/`](creative/) | Hook writing and ad diagnostics |
| [`analytics/`](analytics/) | Cross-channel performance decay — labels pages and ads by their real trend at scale |
| [`strategy/`](strategy/) | Strategy → copy stack: STP (segmentation, targeting, positioning), positioning → narrative → messaging, and landing-page structure + copy. Company- and industry-agnostic thinking frameworks — no MCP required |

## Reference

| Folder | What's inside |
|--------|--------------|
| [`_framework/`](_framework/) | Shared concepts: skill anatomy, SUMAS output contract, metric relationships, ad rank and impression share, brand vs non-brand, Porter MCP call patterns |
| [`_orchestrator/`](_orchestrator/) | Analysis tree — how the skills connect and when to use each one |

## Requirements

Most skills require the Porter Metrics MCP connected to Claude Code (the `strategy/` frameworks are the exception — they need no data connection). See [porter-setup](https://portermetrics.com/en/tutorial/claude/) to get started.
