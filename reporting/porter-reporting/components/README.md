# Components (generators)

The reusable parts that turn **inputs** (see [`_foundation/input-contract.md`](../_foundation/input-contract.md))
into pieces of a finished document. A document type is assembled from these.

A generator:
- **receives** data + narrative + intent (it does not fetch data itself),
- **pulls styling** from the design system (it does not hardcode the look),
- **emits** a piece of output (a chart, a slide, a page/scaffold).

## Folders

| Folder | Builds | Used by |
|--------|--------|---------|
| [`charts/`](charts/) | Individual charts from a data series/table | every document type |
| [`slides/`](slides/) | Single slides from an idea + visual | presentation |
| [`layouts/`](layouts/) | Page / document scaffolds that arrange the parts | report, dashboard, audit |
| [`google-ads/`](google-ads/) | **Connector-specific** components that depend on Google Ads fields / affordances (status, bidding, deep-links) — e.g. the campaign table | every document type |

> The first three folders group by **output type** and stay connector-agnostic (the principle below).
> A folder named after a **connector** (e.g. `google-ads/`) is the deliberate exception: it holds
> components that genuinely depend on one platform's fields or links. They still receive data, pull
> styling from tokens, and emit a piece — they just aren't reusable across connectors.

## Principle

Same input → any output. The reason a chart, a slide, and a report section can be generated
from one dataset is that they all read the **same input contract**. Keep generators dumb about
*where* data came from and *what it looks like* — those are someone else's job.

> Stub — folders are placeholders. Each gets its own README + builder as we implement it.
