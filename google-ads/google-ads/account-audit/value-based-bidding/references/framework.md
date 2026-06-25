# Framework: Value-Based Bidding Audit

## 1. Business question
> Per campaign: is it bidding on **value** (not just volume), does the **target ROAS track the
> real ROAS**, and does the account have the **conversion value + volume** to support it?

## 2. The signals (all direct fields)
| Signal | Field | Use |
|--------|-------|-----|
| Bidding strategy | `google_ads_campaign_bidding_strategy_type` | is it a value strategy? |
| Set target ROAS | `google_ads_campaign_target_roas_target_roas` (or `..._maximize_conversion_value_target_roas`) | what the team aimed for |
| Real ROAS (30d) | `google_ads_conversion_value_per_cost` | what actually happened |
| Conversion value | `google_ads_conversions_value` | is value tracked at all? |
| Conversions | `google_ads_conversions` | enough volume? (15-30 rule) |
| Spend | `google_ads_cost_micros` | rank by dollars |

**Value strategies** = `MAXIMIZE_CONVERSION_VALUE`, `TARGET_ROAS`.
**Non-value strategies** = `MAXIMIZE_CONVERSIONS`, `TARGET_CPA`, `MANUAL_CPC`, `TARGET_SPEND`,
`MAXIMIZE_CLICKS`, `TARGET_IMPRESSION_SHARE`, `PERCENT_CPC`, …

## 3. The decision logic (how each state is reached)
Read per campaign over the last 30 days:

1. **Does the account track conversion value?** `conversions_value > 0`.
2. **Enough volume?** `conversions ≥ 15` (Acme's 15-30; 15-30 = borderline, flag it).
3. Then assign the **status**:
   - **⛔ Not eligible** — `conversions_value ≈ 0` OR `conversions < 15`. Value bidding can't work
     without value/volume. (For a no-value lead-gen account this is the *correct* state, not a
     failure — say so; the fix is Section 2, not the bid strategy.)
   - **✅ On value bidding** — strategy ∈ {MAXIMIZE_CONVERSION_VALUE, TARGET_ROAS}. Then run the
     target-vs-actual check (step 4).
   - **🟡 Eligible, not using it** — tracks value + has volume, but strategy ∉ value (e.g. on
     Maximize Conversions / tCPA). This is the **opportunity**: it's optimizing to count, not dollars.

## 4. Target vs Actual (only when on tROAS)
Compare the **set** target ROAS to the **real** 30d ROAS (`conversion_value_per_cost`):
- **Actual ≪ target** → the algorithm can't reach the target; it **throttles spend** to protect
  ROAS. The target is too aggressive → loosen it, or accept lower volume on purpose.
- **Actual ≫ target** → the target is too loose; there may be room to **tighten** for efficiency
  (or it's fine if the goal is volume).
- **Actual ≈ target** → healthy; keep.
Report the two numbers + the gap; let the reader decide the trade-off (this skill states it, the
human picks volume vs efficiency).

## 5. Output contract — what each campaign emits (content only)
> **Executable + plain ([cluster rule](../../README.md)).** Name the **exact campaign** and the
> **exact change**, for a non-technical owner as **Where · What to do (plain + the exact setting in
> parens) · Why** — no bare jargon. e.g. *"In `Acme_Health_SEM_(HD)`, tell Google to bid for the
> value of sales, not just the number of leads (setting: Maximize Conversion Value) — but first add
> conversion values (Section 2), or the switch will fail."*
> Design/layout is `porter-reporting` + the design system, NOT here. Emit these fields:

1. **Identity** — campaign · spend · conversions · conversion value (30d) · `tracks_value` (yes/no).
2. **Current strategy** — plain words (resolve the enum + append the target, e.g. "Target ROAS 400%").
3. **Status** — ✅ on value bidding / 🟡 eligible, not using it / ⛔ not eligible.
4. **Target vs Actual** — when on tROAS: `{ target_roas, actual_roas, gap }` + which way it leans.
5. **Volume** — `{ conversions, value }` vs the 15-30 floor; annotate "thin" when < 15-30.
6. **Recommendation** — one plain action (switch to value bidding · adjust target up/down · fix
   value tracking first → Section 2 · keep).

**Roll-up:** count + spend per status; the 🟡 opportunities ranked by spend (where switching to
value bidding moves the most money).

## When it applies / when it does NOT
- **Applies to:** any campaign that **can** optimize to value — Search, Shopping, Performance Max
  — i.e. where the business tracks conversion **value**. PMax/Shopping are where value bidding shines.
- **Does NOT apply / answer differently:**
  - **No conversion value** (pure lead-gen) → value bidding is N/A. The correct answer is "you'd
    need conversion values first (Section 2)", NOT "switch strategies". A no-value campaign on tCPA
    is ✅ correct.
  - **< 15 conversions / 30d** → not enough signal for value bidding; flag thin volume, don't push the switch.
  - **Brand campaigns on Target Impression Share** → often intentional (own the SERP); note it, don't
    auto-flag as "should be value bidding".
- **Scope:** pull all campaign types (the bidding fields exist for all); the channel only changes how
  you phrase the recommendation, not whether you read the field.

## 6. Interpretation rules / gotchas
- **Business-model branch is mandatory.** No conversion value → value bidding is N/A; don't
  recommend switching, recommend fixing value tracking (Section 2). A no-value account on tCPA is
  *correct*, not broken.
- **Don't judge thin volume — flag it.** A target-vs-actual gap on < 15 conversions is noise;
  annotate the count.
- **Read at campaign grain** (group by `campaign_name`); the target ROAS is a per-campaign config
  value and ad-group overrides exist (`ad_group_target_roas` / `..._effective_target_roas`) — note
  them only if an ad group differs from its campaign.
- **Sanity-check the target ROAS unit** when building: confirm whether Porter returns it as a ratio
  (`4.0`), a percent (`400`), or micros — normalize against the real ROAS before comparing.
- **`conversions`, not `all_conversions`** (matches the UI); disclose the choice.
