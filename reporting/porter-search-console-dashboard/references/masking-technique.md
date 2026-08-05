# How the mask works — invariants to preserve

This report is a normal Porter Search Console dashboard whose data layer was replaced so it
renders **fully synthetic, fictional** data and touches no real account. Understand these
before editing `lib/mask.ts` / `lib/porter.ts`, or you will break the audit or leak
structure.

## 1. One chokepoint: `porter.query()`
Every chart's data flows through the single `query(spec)` method in `lib/porter.ts`. The
mask wires in there:

```ts
import { maskResult, isMaskedSpec } from './mask';
// inside query(spec):
if (isMaskedSpec(spec)) return maskResult(spec, { columns: spec.fields ?? [], rows: [] });
return maskResult(spec, await this.queryRaw(spec));   // (old body renamed to queryRaw)
```

## 2. SHORT-CIRCUIT — no RPC is ever sent for masked queries
For Search Console specs, `query()` returns synthetic data **without calling `queryRaw`**, so
no request reaches the Porter data plane. This is deliberate and load-bearing:
- The cloud/local audit only records a chart when the report *sends* a query RPC, and only
  fails it when that RPC errors. With zero RPCs there is nothing to fail → the report audits
  clean (`charts: 0 queried, errors: 0`) with **no live account**.
- Pointing it at a real (or wrong) account instead produces `account_not_allowed` /
  `rate_limited` on every chart → `422 audit_failed`. The short-circuit is what removes that
  dependency. **Do not remove it.**

## 3. `maskResult` / `isMaskedSpec` (`lib/mask.ts`)
- `isMaskedSpec(spec)` → true when the spec targets the `google-search-console` connector or
  any `google_search_console_*` field.
- `maskResult(spec, raw)` → for masked specs, returns SYNTHETIC `ChartData` shaped to
  `spec.fields`, honoring `spec.sort` and `spec.limit`, and DISCARDS `raw`. Anything else
  passes through untouched.

## 4. One coherent universe (so every view reconciles)
`synth()` builds a single canonical universe per range — ~480 queries (Zipf distribution) and
~140 pages normalized to the SAME totals — then derives the daily series, countries, devices
and the query×page cannibalization rows from it. Result: Overview totals ≈ sum of the daily
series ≈ the breakdowns. CTR = clicks/impressions; average position is impression-weighted.

## 5. CRITICAL — every dimension STRING must be UNIQUE
Views key their previous-period lookup by the dimension string (e.g. Keywords maps
prev-period rows by query text). If two rows share a string, one high-traffic row gets matched
to a tiny namesake and the delta explodes (observed: **321600%**). So query/page strings are
drawn from **deduped pools via sequential cursors**, never by hashing into a pool. Keep it
that way if you expand the vocabulary.

## 6. Realism knobs
- CTR falls with position (`ctrForPosition`): ~30% at position 1, decaying.
- ~15% of queries are "branded" — they contain `MASK_TOKEN` — so the Branded vs non-branded
  split is meaningful. `BRAND_TOKENS` in `lib/gsc.ts` must equal `[MASK_TOKEN]`.
- `rangeFactor` (per-range) × a per-query `trend` make period-over-period deltas VARY per row
  (a believable mix of up/down) instead of one identical % everywhere.
- Determinism: seeded from string hashes, no `Date.now` / `Math.random`, so re-renders and the
  current-vs-comparison fetch stay stable.

## 7. The fictional identity
`MASK_BRAND` / `MASK_TOKEN` / `MASK_DOMAIN` (top of `lib/mask.ts`) drive the fake brand,
branded-query token and fake page URLs. The visible header/footer/subtitle strings live in
`components/gsc.tsx`, `pages/index.tsx` and `components/views/*`. Change all of them together
(and `BRAND_TOKENS`) when re-branding, or the branded split and the labels disagree.
