# Framework: Match-Type Efficiency & Concentration

## 1. Business question
> Is the account's budget **over-concentrated in one keyword match type** (usually Broad), and is any
> match type **untested** ($0)? And — only when it's trustworthy — how does each type compare on
> cost-per-conversion?

## 2. The signals (direct fields — compute the ratios, never trust native ones)
- Match type: `google_ads_keyword_info_match_type` → `BROAD` · `PHRASE` · `EXACT` (no "AI Max" here).
- Per type, **summed** from the keyword rows: `cost_micros` (÷1e6), `clicks`, `conversions`.
- Derived per type: **cost/conv** = cost ÷ conversions · **spend-share** = type cost ÷ total cost.
- Blend probe (separate query): `conversion_action_primary_for_goal` count → is `conversions` a blend?
- Brand context: exclude branded keywords before computing shares + efficiency.

## 3. The judgment (per match type + account roll-up)
1. **Exclude branded terms first** ([`../../../../_framework/brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)).
   Branded keywords (mostly Exact) flatter that type's efficiency and inflate its share.
2. **Compute** per type: cost, conversions, cost/conv, spend-share — from base counts.
3. **Concentration** = the top type's spend-share.
   - one type holds **~≥70% of spend** → 🔴 `concentrated` (Broad is the usual culprit) → `rebalance`.
   - else → spread is healthy → `balanced` → `keep`.
4. **Untested** = a type with **$0 spend** (absent or zero-cost) → 🟡 `untested` → `test_type`.
5. **Rank by spend** — the heaviest type and the largest cost/conv gaps surface first.

## 4. The blend guardrail (mandatory — verified 2026-06-23)
- Porter **cannot split a single qualified action (MQL/Opp) by match type** — the conversion-action
  view will not combine with `keyword_view`, **not even via the per-action custom field**.
- So if the account has **>1 primary conversion action**, per-type `conversions` is a **blend** that
  can **invert** the true qualified ranking. Live proof: Broad looked best on all-conv ($373/conv)
  but **worst** on Cost/MQL ($1,515) once the qualified action was isolated.
- **RULE:** when `conversions` is a blend → set `directional: true` on **every** match type, report
  cost/conv as **directional only**, and **never assert "most/least efficient"**. Concentration and
  untested verdicts are still safe (they're spend-based, not conversion-based).

## 5. Sanity-checks / traps
- **Compute ratios yourself** — native cost/conv is wrong at aggregate.
- **"AI Max" is not a match type** — expect only BROAD/PHRASE/EXACT; don't treat a missing label as one.
- **Branded skew** — leaving brand in makes Exact look artificially efficient and over-weighted.
- **Thin volume** on a type (few conversions) → its cost/conv is noise; report the number, hold the verdict.
- **Concentration ≠ bad on its own** — Broad-heavy can be fine *if* it performs; pair with the
  efficiency read (when trustworthy) and with [`search-terms/performance`](../../../search-terms/performance/)
  to see which terms drive it before recommending a hard rebalance.

## 6. Output contract (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact match type + the move.
1. **Identity** — match type · cost · conversions · cost/conv · spend-share.
2. **Verdict** — ✅ balanced / 🔴 concentrated / 🟡 untested / ⚪ directional (efficiency not trustworthy).
3. **Recommendation** — plain + exact ("almost all the budget is on broad match — shift some toward
   the type that already converts" / "phrase is untested — pilot it on the best ad groups first").

**Roll-up:** `top_type_share` + the untested list + the account `lean` + the highest-$ fixes.

## 7. When it applies / when it does NOT
- **Applies to:** any account with keyword-grain spend across BROAD/PHRASE/EXACT (Search/Shopping
  with keywords).
- **Does NOT:** per-keyword relevance (→ [`search-terms/relevance`](../../../search-terms/relevance/));
  search-term mining / negatives (→ [`search-terms/n-grams`](../../../search-terms/n-grams/));
  PMax / Display / Video with no keyword match types. When `conversions` is a blend, this skill
  judges **concentration + untested** but downgrades efficiency to **directional**.
