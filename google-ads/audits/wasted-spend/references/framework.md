# Framework: Wasted Spend

## Mission
Turn cost + conversions at every grain into **one honest wasted-spend number** and a ranked list of
the biggest leaks. Two things make this hard, and both are the skill's job: (1) deciding *how much*
of an entity's spend is wasted (not just flagging it), and (2) rolling the leaks up **without
double-counting** — because a wasted search term lives inside a wasted keyword lives inside a wasted
ad group lives inside a campaign.

## The leak test (per entity, above the spend floor)

For each entity, over the window, compute:

- **`cpa`** = `cost / conversions` (undefined when `conversions ≈ 0` → treat as "infinite", a leak).
- **`target_cpa`** = the user-supplied target, else the **account baseline** = `account_cost /
  account_conversions` (from the campaign query totals).

An entity is a **leak** if **either**:
- **Zero-conversion:** `conversions < near_zero` (default `< 0.5`) and `cost ≥ floor` → `leak_type =
  zero_conversion`. The whole cost returned nothing.
- **Above-target CPA:** `conversions ≥ near_zero` and `cpa ≥ 3 × target_cpa` → `leak_type =
  above_target_cpa`. It converts, but at a price so far above target the overspend is waste.

For a **value-tracking** account (`conversions_value > 0` account-wide), run the parallel ROAS branch
instead of CPA: `roas = conversions_value / cost`; leak if `roas ≤ ⅓ × target_roas` (or ~0 value on
real spend) → `leak_type = below_target_roas`, `basis = roas`. Otherwise `basis = cpa`.

## The wasted-dollars formula (how much, not just whether)

The dollars wasted by one entity:

```
wasted_amount = clamp( cost − conversions × target_cpa , 0 , cost )
```

- **Zero-conversion** entity → `conversions × target_cpa ≈ 0` → `wasted_amount ≈ cost` (100% wasted).
- **Above-target CPA** entity → only the **overspend beyond target** is waste. A keyword at $2,300 for
  3 conversions with a $120 target: `2300 − 3×120 = 2300 − 360 = 1,940` wasted (not the full $2,300 —
  it did buy 3 conversions worth ~$360 at target).
- The clamp floors at 0 (an at-or-below-target entity wastes nothing) and caps at cost (can't waste
  more than you spent).
- **Value branch:** `wasted_amount = clamp( cost − conversions_value / target_roas , 0 , cost )` — the
  spend that didn't earn its target return.

## The count-once rule (the total the account owner can trust)

The scopes are **nested, not additive**: search term ⊂ keyword ⊂ ad group ⊂ campaign. Summing "wasted"
across all four inflates the number 3–4×. Count each wasted dollar at **exactly one grain**:

```
total_wasted =
    Σ wasted_amount over KEYWORDS   in SEARCH + SHOPPING campaigns        (canonical)
  + Σ wasted_amount over CAMPAIGNS  in PERFORMANCE_MAX / DISPLAY /
                                       VIDEO / DEMAND_GEN campaigns         (canonical)
```

Every dollar of account cost belongs to exactly one of these buckets (Search/Shopping spend maps to a
keyword; the other channels have no keyword breakdown, so their finest honest grain is the campaign) —
so the sum counts each dollar once. Then:

- **`wasted_pct_of_spend`** = `total_wasted / account_cost`.
- **Search terms and ad groups are diagnostic lenses**, `role = diagnostic_lens`: they tell you
  *where inside* a wasted keyword or campaign the leak concentrates (which term drove it, whether a
  whole ad group is rotten), so the recommendation lands at the actionable level. Their wasted totals
  are reported in `by_scope` but **never added to `total_wasted`**.

`leaks[]` lists the biggest individual leaks at whatever grain is most actionable, **de-duplicated**:
don't list a search term *and* its parent keyword *and* its ad group as three separate leaks for the
same dollars — pick the grain where the fix happens (a single bad term → `search_term`; a broadly bad
ad group → `ad_group`) and note the others as its drivers.

## Volume, recency & confidence gates

- **Spend floor.** Ignore entities below a floor (default: the greater of a small absolute figure and
  ~0.1–0.5% of account spend). A $4 zero-conversion term is noise, not a leak — it won't move the
  account number and there are thousands of them.
- **Conversion-lag → provisional.** A leak whose spend sits inside the account's conversion-lag window
  (default ~7 days) is `confidence = provisional`: real-looking waste that may still convert. Firm
  leaks (spend older than the lag) are `confidence = firm`. **`total_wasted` sums firm leaks;** report
  provisional dollars separately so the headline number isn't inflated by conversions that haven't
  landed yet.
- **New entity.** A keyword/campaign live only a few days can't be judged on conversions yet — treat
  like the lag gate (provisional), don't call it dead.

## What this skill deliberately does NOT do

- It does **not write the negative keywords** — it flags the wasted term and its parent keyword and
  hands the match-type/level decision to `negative-keywords`. Its `recommendation.what` names the move
  ("add as a negative") and the hand-off, not the negative list itself.
- It does **not decide where the freed budget goes** — recovering $11K of waste is not the same as
  knowing where to redeploy it; that's `spend-allocation`.
- It does **not classify WHY** a term is irrelevant (wrong intent, wrong geo, competitor) — that's
  `search-term-classifier`. This skill answers *how much* and *where*, and feeds those skills.
