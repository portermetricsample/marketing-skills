# Brand vs non-brand — separate it BEFORE you judge performance

A cross-cutting rule for every Google Ads performance read (orchestrator baseline, exec synthesis,
`spend-allocation`, `value-based-bidding`, `bid-strategy`, `audience-demographics`, `search-terms`).
This is a deliberate analytical step, not a footnote.

## Why (the principle)
Branded searches are **demand capture, not demand generation**. The searcher already knew the brand
and typed it; the ad mostly **intercepts a click that would have gone to the organic result anyway**.
So branded conversions are **largely non-incremental** — they were very likely to happen with or
without the ad. Because brand clicks are cheap and ultra-high-intent, branded campaigns post
**artificially great CPA/ROAS**, and when you blend them into the account totals they **flatter the
whole account** and make the *paid demand-gen* effort look better than it is. Crediting that
performance to "the ads" is self-attribution.

Brand PPC is **not worthless** — it defends the SERP against competitors bidding on your name
(competitors commonly bid on your brand name), controls the message, and
captures *some* incremental clicks. The rule is: **treat it as defense, don't count it as
demand-gen performance.**

## The rule (what every check must do)
1. **Classify** brand vs non-brand. Brand = the query/keyword/campaign contains a brand token from the
   account's **brand-term list** (configurable; default = the company + product names). Apply it at
   **search-term, keyword, and campaign** level (a dedicated "Brand" campaign counts as brand).
2. **Report the split.** Show brand vs non-brand vs blended for the headline KPIs (spend, conv, value,
   CPA, ROAS) — never a single blended number alone.
3. **Baseline on NON-BRAND.** Every "is this efficient?" judgement (spend-allocation baseline,
   bid-strategy actual-vs-target, audience over/under, the exec "how's the account doing") compares to
   the **non-brand** baseline. Brand must never flatter the baseline other campaigns are judged against.
4. **Treat brand campaigns as defensive.** Note their role (protect the SERP, own the message); do
   **NOT** hold up their 40×+ ROAS as a model to emulate or a target for other campaigns.
5. **Flag the incrementality caveat.** State plainly that branded conversions were likely to happen
   anyway. The honest way to size brand's *true* contribution is a **brand-holdout / geo-incrementality
   test** (pause brand in a subset of geos, measure how much converts organically) — out of scope for a
   data-only audit, but the recommended next step if brand is a large share of results.

## Worked example (illustrative — "Acme Insurance", synthetic numbers)
| Segment | Spend | Value | CPA | ROAS |
|---|---|---|---|---|
| **Brand** (the advertiser's own name) | ~2% of spend | ~45% of value | very low | 40×+ |
| **Non-brand** (the real demand-gen engine) | ~98% of spend | ~55% of value | well above account avg | ~1.2× |
| Blended (what the account "looks like") | 100% | 100% | flattered low | ~1.9× |

Read: a brand line that is **~2% of spend can carry ~45% of conversion value**, so the flattering
blended ROAS (~1.9×) is propped up by brand while the **paid demand-gen work runs materially worse
(~1.2×)**. Always show the split and baseline on non-brand. *(Numbers illustrative — no real account.)*

> **Honesty caveat on whatever real numbers you compute:** the cleanest brand split is at **search-term
> grain** (brand = terms containing the brand token), which is directional — it excludes non-search-term
> spend, and offline-import value can straddle the brand/non-brand line. Report it as "brand carries ~X%
> of value; non-brand baseline ≈ Y," not as a precise reallocation, and cross-check against the account
> total minus brand.

> **Account-agnostic:** the brand-term list is **per-account input**, never hardcoded; this skill carries
> no client names, numbers, or vertical assumptions. Keep it that way.

## Where it plugs in
- **Orchestrator / exec synthesis** — open with the non-brand read; call brand out separately as defense.
- **spend-allocation** — exclude the Brand campaign from the baseline (or baseline on non-brand); never
  flag a brand campaign as a "raise/scale model." Its high ROAS is expected, not exemplary.
- **value-based-bidding / bid-strategy** — judge targets vs the **non-brand** actuals.
- **search-terms** — already classifies brand; reuse its brand-term list as the single source of truth.
