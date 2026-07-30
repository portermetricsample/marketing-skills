# google-ads/

Connector-specific component generators for **Google Ads** — they read Google Ads fields and encode
Google-Ads-only affordances (campaign status, bidding strategy, campaign type, deep-links into the
Google Ads UI). Generic, connector-agnostic charts live under [`../charts/`](../charts/); a component
lives **here** only when it genuinely depends on one platform. Each still obeys the generator
principle — it never fetches data, never hardcodes colour, and pulls all appearance from
porter-design tokens. See [`../README.md`](../README.md) for that principle and
[`../../_foundation/component-contract.md`](../../_foundation/component-contract.md) for the
behaviour rules.

## Implemented

| Component | What it renders | Spec |
|---|---|---|
| [`campaign-performance-table/`](campaign-performance-table/) | One row per campaign, columns grouped by SUMAS stage (Budget · Visibility · Engagement · Conversion) — headline + sub-metrics, inline Δ vs previous period, per-stage heat, status dot, campaign-type + bidding-strategy badges, deep-link into Google Ads. | component-contract → *Table* / *SUMAS table* |
| [`keyword-ad-landing-alignment/`](keyword-ad-landing-alignment/) | One card per ad group: the paid journey **Intent (keyword → search terms) → Message (ad) → Destination (page)** with a three-state verdict (Aligned / Needs review / Broken), the L1–L4 relevance links, the Google relevance grades (Quality Score gated to 1–10) + CVR/CPA, and the one fix. Joins the `keyword-ad-landing-alignment` + `keyword-ad-landing-metrics` analysis skills; public name **`addAlignment`**. | component-contract → *Report section* / *Data-component states* |
| [`brand-incrementality/`](brand-incrementality/) | The **Branded vs non-branded** incrementality slide — an *All searches / Excluding-branded* toggle over a conversion-split donut + three scorecards (Conversions · Spend · CPA-or-ROAS, each Δ vs previous). The Excluding-branded view is the incremental demand-gen number to judge budget on; classifies brand vs non-brand by campaign naming marker. Analysis twin: `porter-analysis/google-ads/brand-incrementality`; public name **`brandIncrementality`**. | component-contract → *Report section* / *Data-component states* |
| [`search-term-ngrams/`](search-term-ngrams/) | **Search-term N-gram mining** (Brainlabs method) as a sortable/filterable live table: one row per 1/2/3-gram with aggregated metrics, a bucket chip (waste / winning / brand / competitor / neutral), and blast-radius flags on waste rows. Analysis twin: `porter-analysis/google-ads/search-terms/n-grams`. | component-contract → *Table* |
| [`impression-share-competitiveness/`](impression-share-competitiveness/) | One row per **campaign**: Top IS · Abs. top IS · the lost-to-rank / lost-to-budget split · a coverage bar (Top + Lost·rank + Lost·budget = 100%) · the budget-vs-rank **limiter**. Your own auction competitiveness — the **honest substitute for Auction Insights** (the connector has no competitor-domain dimension). Reads `keyword-ad-landing-metrics` `campaign_context`; public name **`impressionShare`**. | component-contract → *Table* |
| [`creative-ad-preview/`](creative-ad-preview/) | One responsive search ad as it appears in Google search (the ad frame), then its full pool of headlines & descriptions annotated (pin · char usage · served · impressions) + a **high-impact fixes** panel (broken URL · disapproved). Reads `porter-analysis/google-ads/creative/inventory`'s `creative_graph`; class hooks only (look = porter-design `CreativeAdPreview`). | component-contract → *Report section* / *Data-component states* |
| [`search-terms-page/`](search-terms-page/) | The Google Ads **"Search terms" page**: a grid of **keyword cards** (terms + 0+ of five tags — Branded / Duplicate / Competitor / Irrelevant / Opportunity — tagged only when off) + a criterion **filter bar** + a dollar **insights card** (the recommended-action lanes, led by a total, with a measured-vs-estimated split). Joins `labeling` + `performance` + `insights`; `adapter.js` does the term→keyword pivot; public name **`searchTermsPage`**. | component-contract → *Report section* / *Data-component states* |

> Each component lives in its own folder: `README.md` (the use case) + the generator + a labeled
> fictional demo. Add the next Google Ads component as a sibling.

## Related (Google Ads, but housed under a general engine)

| Component | What it renders | Lives at |
|---|---|---|
| **account-structure-tree** | The account as a **driver tree** (Account → grouping → Campaign → Ad group → Ad) with a Group-by switcher + a SUMAS breakdown. | [`../charts/driver-tree/google-ads/`](../charts/driver-tree/google-ads/) |
| **performance-drivers** | A **diagnostic** driver tree — *why a metric moved*: formula levers (LMDI) + segment contribution, click a node to recompute the levers. | [`../charts/driver-tree/google-ads/`](../charts/driver-tree/google-ads/performance-drivers.README.md) |

> It's a Google Ads use case, but it sits **inside** the connector-agnostic `charts/driver-tree/`
> engine (general framework → Google Ads as the particular use case), rather than here — the tree
> mechanics are reusable across connectors, only the fields/lenses/deep-links are Google-Ads-specific.
