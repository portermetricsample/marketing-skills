# charts/

Chart generators: each turns a **data series/table** into one rendered chart, pulling all
appearance from porter-design tokens (it never fetches data, never hardcodes colour). See
[`../README.md`](../README.md) for the generator principle and
[`../../_foundation/component-contract.md`](../../_foundation/component-contract.md) for the
per-chart behaviour rules.

## Implemented

| Component | What it renders | Spec |
|---|---|---|
| [`breakdown-matrix/`](breakdown-matrix/) | Metrics (rows) × any breakdown — time periods, campaign, ad group, campaign type, product. A grid, not a line chart. | component-contract → *Breakdown matrix* |
| [`driver-tree/`](driver-tree/) | A decomposition / hierarchy tree: a root fans out left→right into columns of metric cards joined by curved connectors, with efficiency colour, Δ chips and expand/collapse. **Connector-agnostic engine** + a Google Ads use case ([`driver-tree/google-ads/`](driver-tree/google-ads/) — *Account Structure*). | (its own README) |
| [`contribution-sankey/`](contribution-sankey/) | A contribution **sankey**: a total fans out left→right into columns joined by **ribbons whose width = the chosen metric** (Flow by spend / conversions / value), with a depth cap, trajectory highlight and a hover card. **Connector-agnostic engine** + a Google Ads use case ([`contribution-sankey/google-ads/`](contribution-sankey/google-ads/) — *Account contribution*, type → campaign → ad group → keyword → search term). Sibling of `driver-tree` (proportion vs per-node numbers). | (its own README) |

> Each chart lives in its own folder: `README.md` (the use case) + the generator + a labeled
> fictional demo. Add the next one as a sibling.
> A folder may nest a **connector-specific use case** inside a general engine — e.g.
> `driver-tree/google-ads/` is the Google Ads instance of the generic `driver-tree/` framework.
