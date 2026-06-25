# Google Ads — Search Term Performance

> **Mission:** of the account's search terms, separate the ones that are **WINNING**
> (converting, worth keeping or promoting to exact) from the ones that are **WASTING**
> (spending with no/low conversions → negative or fix) — prioritized by spend. It judges
> the **money**, not the matching.

A **defensive** skill in the cluster. The other defensive skills judge whether a term
*should* match (`relevance`) or *who should serve it* (`term-routing`); this one judges
whether the term is **paying off**. Same search terms report, a separate axis.

- **Who is it for?** Media buyer / PPC manager.
- **When is it used?** Recurring, over the search terms report — wherever spend is at stake.
- **What decision does it help make?** Which terms to promote to an exact keyword, which to
  add as negatives, and which to leave — ranked by the dollars at risk.

## The discipline (state it)
**Irrelevant ≠ poor performance.** A term can be perfectly relevant to its keyword and still
waste money, or be loosely matched and still convert. Relevance and performance are
**separate axes**. This skill does not re-judge the match — it reads the spend and the
conversions and asks: is this term earning its budget?

## How it composes with the cluster
1. `relevance` (defensive) runs first: a verdict per term↔keyword pair. No metrics.
2. **`performance`** (this) takes the terms + metrics + structure → computes cost / clicks /
   conversions / value / CPA / conv-rate, ranks by spend, classifies Winning / Watch / Waste
   against the account's own benchmark, and sets a destination per term.
3. `term-routing` (defensive) handles terms that have a better owner already in the account.

Where they meet: a term can be `relevance=Justified` (good match) but `performance=Waste`
(no conversions on real spend) — that is not a contradiction, it is the two axes doing their
job. The destination is performance's call.

## Files
- [`framework.md`](framework.md) — the classification rubric (the brain).
- [`datos.md`](datos.md) — fields + MCP paths, verified against the `google-ads` connector.

> Cluster architecture in the [cluster README](../README.md).
