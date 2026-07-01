# Google Ads — Reporting Components

Reusable graphic components the `dashboard/`, `slides/` and `audit/` builders draw on. Each is a
self-contained **skill** (its own `SKILL.md`) with a live `demo.html` and fictional `example.data.js`.

Because the source (`porter-reporting`) is private, the components a public user needs live **here**,
declared in this public repo. Styling comes from the public
[`portermetricsample/porter-design`](https://github.com/portermetricsample/porter-design) repo —
components carry structure/logic, not brand CSS.

| Component | What it renders |
|-----------|-----------------|
| [`campaign-performance-table/`](campaign-performance-table/) | Canonical SUMAS per-campaign table |
| [`keyword-ad-landing-alignment/`](keyword-ad-landing-alignment/) | Alignment journey: keyword → ad → landing per ad group |
| [`search-terms-page/`](search-terms-page/) | Search Terms page — keyword cards with per-term flags |
| [`search-term-ngrams/`](search-term-ngrams/) | Search-term n-gram mining (Brainlabs method) |
| [`impression-share-competitiveness/`](impression-share-competitiveness/) | Auction competitiveness: IS lost to rank vs budget |
| [`impression-share-trend-monitor/`](impression-share-trend-monitor/) | Spend-ranked impression-share trend over time |
| [`brand-incrementality/`](brand-incrementality/) | Branded vs non-branded incrementality |
| [`creative-ad-preview/`](creative-ad-preview/) | Responsive Search Ad rendered as it appears in Google |
| [`driver-tree/`](driver-tree/) | Account structure + performance drivers as a driver tree |
| [`contribution-sankey/`](contribution-sankey/) | Account spend/conversion contribution as a sankey |

> **No real client data.** All examples use fictional accounts (Acme Insurance).
