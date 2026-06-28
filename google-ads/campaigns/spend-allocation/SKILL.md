---
name: spend-allocation-audit
description: Answer the advertiser's two budget questions on a Google Ads account — which campaigns/ad groups should get MORE spend but aren't (proven demand it can't capture), and are the biggest spenders actually delivering? Returns a per-campaign verdict (raise / cut / fix-first / fine) from a 2×2 of efficiency vs the account baseline × impression share lost to budget. Use this skill whenever the user asks about budget allocation, spend breakdown, where to add or cut budget, budget lost impression share, reallocating money across campaigns, or whether the top spenders are worth it — even if they don't say "spend allocation". Judges budget allocation ONLY; bid-strategy targets and landing CRO belong to the complementary skills.
---

# Spend Allocation Audit

## Goal (job-to-be-done)
Answer the two questions the client emailed Acme directly: **which campaigns/ad groups should
get more spend but aren't, and are the campaigns spending the most actually delivering good KPIs?**
"Should get more spend" sounds subjective, but Google hands you the objective signal: a campaign
that performs well **and** is losing impressions to budget has proven demand it can't capture. The
unit of analysis is the **campaign** (then ad group within it); the output is a budget verdict
(raise / cut / fix-first / fine) per campaign, plus the net reallocation move.

- **Who:** media buyer / PPC manager. **When:** auditing or inheriting an account; the "spend
  breakdown" item of the account-audit checklist.
- **Decision it drives:** which campaign budget to raise, which to cut or reallocate, and where to
  move the freed money — without throwing budget at a campaign whose loss is rank, not budget.
- **The differentiator:** the "deserves more" call is **objective, not a hunch** — it reads
  Google's own `budget_lost_impression_share` against efficiency vs the account baseline, and
  separates a budget cap from a rank cap (more budget won't fix a rank loss).

## Scope
- ✅ **Budget allocation only** — efficiency (CPA / ROAS vs baseline) × impression share lost to budget, Search campaigns.
- ❌ **Bid-strategy targets** (is the target CPA/ROAS aligned with actuals?) → complementary `bid-strategy` skill.
- ❌ **Landing CRO / relevance / value tracking fixes** → `landing-cro`, `keyword-ad-landing-*`, `conversion-tracking`. (This skill flags a value gap as "fix first" but does not fix it.)

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one campaign-grain query + fields.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the 2×2, the baseline, budget-vs-rank cap.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign (then optionally per ad group) — `cost`, `conversions`, `conversions_value`,
ROAS (`conversion_value_per_cost`), `search_budget_lost_impression_share`, `search_rank_lost_impression_share` (overall, not `_top_`);
CPA computed as `cost / conversions`. Plus the account baseline (account-weighted ROAS/CPA across
the compared campaigns) and whether the account tracks value at all.

**Process:** apply the 2×2 in [`references/framework.md`](references/framework.md): efficiency vs
baseline (use ROAS where value is tracked, CPA where value ≈ 0) × budget-capped or not. A campaign
that loses impressions to **rank** (not budget) is not a budget raise — distinguish the two. Gate on
volume; annotate thin campaigns, don't act on noise. Budget is **campaign-level** — an ad-group
"more spend" is a bids/targets shift inside its campaign, not a separate budget.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the money story — top spender efficiency + the clearest
  budget move), `diagnosis` (where the money leaks vs where it's capped, via the funnel identity),
  `action` (the net reallocation — cut whom, fund whom, where / what / why).
- `campaigns[]` — one per campaign (ad groups nested), each with `verdict` + the executable
  `recommendation {where, what, why}`.
- `rollup` — top raises and top cuts by dollars, and the from-losers-to-capped-winners move.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver; one bridge line to the next section. Plain language
> for a non-technical owner — "raise the daily budget on X", not "increase the campaign budget cap".

## Example (illustrative — NOT rules)
- **Raise:** `Acme_LifeBroadMatch_ROAS` — best ROAS in the account (2.87) and losing ~19% of
  impressions to budget → 🟢 raise its daily budget (proven demand it can't capture).
- **Fine, not a raise:** `Acme_Life_SEM_(TL)` is the biggest spender, healthy ROAS, but its loss
  is ~17% to **rank** and only ~6% to budget → ✅ leave the budget; the fix is bids/QS, not money.
- **Cut / reallocate:** `Acme_Auto/Bundle/Home` spends real money at ~0.01 ROAS → 🔴 cut and move
  that budget to the capped winner above.
- **Fix first:** a budget-capped campaign with ROAS 0 because `conversions_value = 0` → ⚠️ it isn't
  "bad ROAS", it's not tracking value (a conversion-tracking problem); fix that before raising budget.
