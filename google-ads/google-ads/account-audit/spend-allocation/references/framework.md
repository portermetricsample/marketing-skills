# Framework: Spend Allocation Audit

## 1. Business question
> Which campaigns/ad groups **should get more spend but aren't** (proven + budget-capped), and are
> the **top spenders delivering** good KPIs?

## 2. The signals (all direct, one campaign-grain query)
`campaign_name` · `cost_micros` · `conversions` · `conversions_value` ·
`conversion_value_per_cost` (ROAS) · `search_budget_lost_impression_share` (budget cap) ·
`search_rank_lost_impression_share` (rank cap). CPA = compute `cost/conversions`. Use the **overall**
lost-IS fields, not the `_top_` variants — see
[`_framework/ad-rank-and-impression-share.md`](../../../../_framework/ad-rank-and-impression-share.md)
for the budget-vs-rank diagnosis.

## 3. The objective 2×2 (efficiency × budget-cap)
1. **Baseline** = account-weighted ROAS (and CPA) across the **non-brand** campaigns being compared —
   **exclude the Brand campaign**, whose 40×+ ROAS would flatter the bar everyone else is judged against
   (see [`_framework/brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)).
2. **Efficiency** per campaign vs baseline → "better" / "worse" (≈ ≥1.3× gap), volume-gated.
   - Value tracked → use ROAS. Value ≈ 0 → use CPA (don't ROAS-judge a no-value campaign).
3. **Budget cap** = `search_budget_lost_impression_share` (overall) high → capped.
4. Assign:
   - 🟢 **Raise** — better efficiency **and** budget-capped → raise the campaign budget.
   - 🔴 **Cut / reallocate** — high spend **and** worse efficiency → cut or move the money.
   - ⚠️ **Fix first** — budget-capped **but** worse efficiency → the cap isn't the problem; fix
     tracking/relevance/strategy first (often a §2 value gap).
   - ✅ **Fine** — good efficiency, not capped (already capturing its demand).
5. **Rank by dollars** — the raise/cut list is ordered by spend (and by the size of the lost-IS for raises).

> **`rank_lost_IS` vs `budget_lost_IS`:** if a campaign loses impressions to **rank** (not budget),
> more budget won't help — that's a bid/QS/relevance fix, not a budget raise. Distinguish them.

## 4. Output contract — what each unit emits (content only)
> Executable + plain ([cluster rule](../../README.md)). Budget = **campaign**; ad-group reallocation
> = bids/targets within the campaign. Name the exact entity.
1. **Identity** — campaign (or ad group) · spend · conversions · value.
2. **Efficiency** — CPA / ROAS vs baseline (delta).
3. **Budget signal** — budget-lost-IS / rank-lost-IS.
4. **Verdict** — 🟢 raise / 🔴 cut / ⚠️ fix-first / ✅ fine.
5. **Recommendation** — plain + exact, Where·What·Why.

**Roll-up:** top raises + top cuts by $, and the reallocation move (from losers → capped winners).

## 5. When it applies / when it does NOT
- **Applies to:** Search campaigns (impression share is Search-only).
- **Does NOT / caveat:** no-value accounts → judge on CPA, not ROAS. Rank-capped (not budget) →
  not a budget raise. Thin volume → annotate, don't act on noise. **Brand campaigns** (huge ROAS, low
  spend, not capped) → **defensive, not a model**: leave them, **exclude from the baseline**, and never
  flag them as a "raise/scale" winner ([brand-vs-nonbrand](../../../../_framework/brand-vs-nonbrand.md)).

## 6. Dogfood (Acme Insurance, last month — validated, real)
```
Acme_LifeBroadMatch_..._ROAS  $18,242  ROAS 2.87 (best)  budget-lost 18.8%  → 🟢 RAISE budget (proven + capped)
Acme_Life_SEM_(TL)            $77,438  ROAS 1.55          budget-lost 5.9% · rank-lost 17.4%  → ✅ fine (loss is rank, not budget)
Acme_Health_SEM_(HD)          $14,332  ROAS 0 (no value)  budget-lost 18.3%  → ⚠️ fix first (value tracking §2, then revisit)
Acme_Dental_SEM_(HD)          $17,202  ROAS 0 (no value)  budget-lost 1.0% · rank-lost 23.5%  → ⚠️ fix value + rank, not budget
Acme_Auto_SEM_Test_(HA)       $3,876   ROAS 0.01          low budget-lost   → 🔴 CUT / reallocate (≈$0 back)
Acme_Bundle_(HA) / Home_(HA)  $1,779 / $1,536  ROAS 0.01  → 🔴 CUT
```
Net move: shift budget from Auto/Bundle/Home → the capped winner `Acme_LifeBroadMatch_ROAS`.
