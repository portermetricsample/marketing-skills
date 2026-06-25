# Framework: Bid Strategy Health Audit (target vs actual)

## 1. Business question
> Per campaign on a target strategy: does the **target CPA / ROAS** track the **actual** CPA / ROAS
> of the last 30 days, or is it too tight (throttling) or too loose?

## 2. The signals (direct fields — read the target that matches the strategy)
- Strategy: `google_ads_campaign_bidding_strategy_type`.
- **Target CPA** (micros → ÷1e6): `google_ads_campaign_target_cpa_target_cpa_micros` (for
  `TARGET_CPA`) or `google_ads_campaign_maximize_conversions_target_cpa_micros` (for Max-Conv + tCPA).
- **Target ROAS** (ratio): `google_ads_campaign_target_roas_target_roas` (for `TARGET_ROAS`) or
  `google_ads_campaign_maximize_conversion_value_target_roas` (for Max-Conv-Value + tROAS).
- **Actual:** ROAS = `google_ads_conversion_value_per_cost`; CPA = compute `cost_micros / conversions`.
- Spend, conversions for context + ranking.

## 3. The comparison (per campaign)
1. Read the target from the field that matches the strategy (0 / null = no target set → skip, or note "no target").
2. **tCPA:** actual CPA = cost/conv. Gap = actual − target.
   - actual **≥ ~1.2× target** → 🔴 too tight (Google can't hit it → throttles spend).
   - actual **≤ ~0.8× target** → 🟡 too loose (room to tighten).
   - else → ✅ aligned.
3. **tROAS:** actual ROAS = `conversion_value_per_cost`.
   - actual **≤ ~0.8× target** → 🔴 too tight (throttling).
   - actual **≥ ~1.2× target** → 🟡 too loose.
   - else → ✅ aligned.
4. **Rank by spend** — the most-off targets on the biggest spenders first.

## 4. Sanity-check the target's source + unit + realism (mandatory)
- **Source first — targets come from the `campaign.list` connector action, NOT `query_data`.** The
  query_data target/budget fields are **fan-out corrupted** (the same field returns different values
  by query shape; a "tROAS 36 / 3,600%" against a ~1.2× actual is the artifact). Pull the true target
  via the connector action (see [`tools.md`](tools.md) / the framework
  [`porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md)).
- **tCPA is in MICROS** — divide by 1e6 before comparing to a dollar CPA.
- **tROAS is a ratio** (`4.0` = 400%). A value like `37.2` against a real ROAS of `1.55` (a 24× gap)
  is almost always the fan-out bug — re-pull via the connector action first. Only if the connector
  value is ALSO far off do you weigh a portfolio-shared target / internal value scale / misconfig;
  surface both numbers, don't assume.
- **No conversions / thin volume** → "actual" is noise; flag, don't recommend a target change.

## 5. Output contract (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact campaign.
1. **Identity** — campaign · strategy (tCPA/tROAS) · spend · conversions.
2. **Target vs Actual** — `{ target, actual, gap }`.
3. **Verdict** — ✅ aligned / 🔴 too tight / 🟡 too loose.
4. **Recommendation** — plain + exact ("lower the target ROAS on `<campaign>` from X toward Y — it
   only hits Y, so the target is starving its spend").

**Roll-up:** most-off targets by spend + direction.

## 6. When it applies / when it does NOT
- **Applies to:** campaigns on `TARGET_CPA` / `TARGET_ROAS`, or Max-Conv(-Value) **with** a target set.
- **Does NOT:** Manual CPC / Max-Conv(-Value) with **no** target (nothing to compare → say "no target");
  Target Impression Share (different goal); thin-volume campaigns. Pairs with `value-based-bidding`
  (strategy fitness) and `spend-allocation` (budget) — keep the boundary.
