# Framework: Per-Conversion-Action CPA (fully-loaded, honest)

## 1. Business question
> What does **one specific conversion action** cost — cost per phone call, per form submit, per
> booking — when Google Ads only reports a single blended `cost / conversion`?

## 2. The signals (two queries, joined by campaign — see tools.md)
- Counts: `conversion_action_name` × `campaign_name` → `conversions` + `all_conversions` (query 2a).
- Spend: `campaign_name` → `cost_micros` + total `conversions` (query 2b).
- Single-goal: `campaign_selective_optimization_conversion_actions` (query 2c).

Cost is campaign-level and never splits by action, so the CPA is built by division after the join.

## 3. The math
- **Fully-loaded CPA (campaign):** `campaign_cost ÷ action_count_in_that_campaign`.
- **Fully-loaded CPA (account):** `Σ campaign_cost ÷ Σ that action's count`.
- **Global CPA:** `total_cost ÷ total_conversions` — the **only additive** figure (cost per "a
  conversion, any type").
- Use `conversions` for counted actions; for an action that appears only in `all_conversions`, use
  `all_conversions` and mark it driven-but-not-counted.

## 4. The honesty rules (mandatory — this is the whole point)
- **Fully-loaded ≠ additive.** The same spend produces several actions at once, so
  `cost_per_call + cost_per_form + …` would far exceed real spend. **Never sum per-action CPAs**, and
  say so on the output (`nonAdditiveWarning`).
- **Don't "allocate" spend by share** to force additivity — that just returns the global CPA for every
  action (`spend × share ÷ count = spend ÷ total`), telling you nothing per-action. The fully-loaded
  number is the honest one.
- **True CPA only when single-goal.** If a campaign optimizes to exactly one action (selective
  optimization = that action, or only one action has `conversions > 0` in it), then
  `campaign_cost ÷ that_count` **is** a real CPA → label `cpa_type: true`. Otherwise → `fully_loaded`.
- **Thin-volume floor.** Don't quote a CPA off 1–2 conversions; mark `thin_volume`.

## 5. The two flags this skill also raises
- **Driver mismatch:** a campaign's biggest action by count ≠ the action its name/goal implies (e.g.
  "Form Submits" drives mostly phone clicks). Surface the real driver — the name is lying.
- **Driven but not optimized:** `all_conversions > 0` and `conversions = 0` → the action happens but
  bidding doesn't count it. Decide whether to promote it (a `conversion-tracking` fix) or leave it.

## 6. Output contract (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact action + campaign + the number's KIND.
1. **Per action (account):** action · counted? · fully-loaded CPA · driven-but-not-optimized?
2. **Per campaign:** spend · global CPA · single-goal? · real top driver vs name · per-action CPAs (true/fully-loaded).
3. **Always carry the label** (`true` / `fully_loaded` / `global`) and the **non-additive** warning.

**Roll-up:** cheapest vs most expensive action (fully-loaded), the mismatches, the driven-not-optimized list.

## 7. When it applies / when it does NOT
- **Applies to:** any account with ≥1 conversion action carrying conversions; most useful on lead-gen
  with several action types (calls vs forms vs bookings).
- **Does NOT:** single-action accounts (per-action CPA = global CPA, trivial); per-keyword / per-segment
  CPA (counts don't split by those views — that's the blend guardrail in `conversion-tracking`); the
  setup-correctness verdict (→ `conversion-tracking`). Pairs with `spend-allocation` (budget) and
  `conversion-tracking` (setup) — keep the boundary.
