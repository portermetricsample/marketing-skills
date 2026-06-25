# Metric relationships — the canonical "why" (the funnel identity)

The **arithmetic spine** of the repo. When a metric moves, the cause is **arithmetic from the funnel
identity** — so the explanation stays objective. This is **analysis's job, not reporting's**:
analysis computes the driver; reporting only re-states it (it does not re-derive it).

> Used by everything that explains a movement: `funnel-metrics` (computes it), `segmentation/*`
> (decomposes it by segment), the executive-report **driver tree**, and rule #6 of
> [`writing.md`](writing.md) ("one story, decomposed"). It lives here so no use case owns the spine.

## The identity (the relationship graph)

```
Impressions ──(×CTR)──▶ Clicks ──(×CVR)──▶ Conversions ──(×AOV)──▶ Conv. value
Cost = Clicks × CPC   (= Impressions × CPM ÷ 1000)

Ratios:  CTR  = clicks / impressions      CPC  = cost / clicks      CPM = cost / impressions
         CVR  = conversions / clicks       CPA  = cost / conversions
         ROAS = value / cost               AOV  = value / conversions
```

Read it as a cascade: *impressions ↑ → cost ↑ (at constant CPM) → clicks ↑ (at constant CTR) → …*.
Every metric is the product/ratio of its neighbours, so any movement has a nameable driver.

## The rule — what the output carries

- **Whenever a metric moves, name its dominant driver from the identity.** A **rate** → its
  numerator/denominator (*"CTR fell because clicks dropped while impressions rose"*); a **volume** →
  its volume × rate factors (*"conversions = clicks × CVR"*). One concise clause **with figures**,
  not a full equation.
- **Stays objective** — it's the identity's arithmetic, never a causal guess. A cause that lives
  **outside** the identity (seasonality, mix shift, auction pressure) is flagged as an
  **interpretation**, never stated as the observed driver.
- **Driver = lever, but not a blind template.** The dominant driver tells you *where* to act
  (*"CTR fell on rising impressions → targeting/relevance"*); the specific `recommendation` is
  written with judgment, since a driver can have an off-identity cause.

## Where it lands in the output

This fills `synthesis.diagnosis` and each finding's `recommendation.why` in the
[output contract](output-contract.md). The driver is **computed here**; the prose that carries it
follows [`writing.md`](writing.md).
