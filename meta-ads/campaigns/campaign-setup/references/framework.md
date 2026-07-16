# Framework — Meta Ads Campaign Setup (the brain)

Three deliberate choices, two of them irreversible. Get these right before writing.

## 1. Objective (FROZEN at create — choose on purpose)
Map the business goal to Meta's outcome objective. Ask "what does a win look like?" not "what button".

| Business goal | Objective | Notes |
|---|---|---|
| Sell products / online purchases / ROAS | `OUTCOME_SALES` | Needs a pixel + conversion event on the ad set. The default for e-commerce. |
| Collect leads (forms, sign-ups, calls) | `OUTCOME_LEADS` | Instant forms (lead_gen) or website leads. |
| Drive clicks / site visits | `OUTCOME_TRAFFIC` | Cheapest clicks, weakest intent. Rarely the right goal on its own. |
| Reach / brand / impressions | `OUTCOME_AWARENESS` | Top-of-funnel; measured in reach/CPM, not conversions. |
| Likes, comments, video views, messages | `OUTCOME_ENGAGEMENT` | Social proof, video views, Messenger conversations. |
| App installs / in-app events | `OUTCOME_APP_PROMOTION` | Requires an app + SDK. |

If the user's goal is ambiguous ("get more customers"), ask one clarifying question — do NOT default
to TRAFFIC because it's easy. The wrong objective wastes the whole campaign and can't be edited.

## 2. Budget model — CBO vs ad-set budgets
- **CBO** (`is_campaign_budget_optimization: true`): one budget on the campaign, Meta distributes it
  across ad sets in real time. Best when ad sets are comparable and you want Meta to chase the winner.
  Put `daily_budget_amount` (or `lifetime_budget_amount`) on the **campaign**.
- **Ad-set budgets** (`false`/omit): each ad set gets its own budget. Best when you need guaranteed
  spend per audience/segment. Leave budget **off** the campaign; it goes on the ad set (adset-setup).
- **Daily vs lifetime:** daily = steady pacing, can pause anytime. Lifetime = a fixed total over a
  scheduled window (requires start/end on the ad set), lets Meta dayparting. Default to **daily**
  unless the user names a fixed total and end date.

## 3. Bid strategy — ⚠️ ALWAYS set it explicitly
`LOWEST_COST_WITHOUT_CAP` (a.k.a. Highest Volume) is what you want by default: Meta spends the
budget for max results, no bid value needed.

**⚠️ bid_strategy lives WHERE the budget lives (validated 2026-07-16):**
- **CBO campaign** (budget on the campaign): pass `bid_strategy` **on the campaign**. Do it explicitly —
  omitting it can default to `LOWEST_COST_WITH_BID_CAP`, which needs a bid cap and can't launch.
- **Non-CBO campaign** (budget on the ad set): do **NOT** pass `bid_strategy` on the campaign. Meta
  rejects it with `subcode 1885737 "This campaign doesn't have a budget. Add a budget to edit the bid
  strategy."` The bid strategy goes on the **ad set** instead (see adset-setup).

So: only set `bid_strategy` at this (campaign) level when this campaign is CBO. Default is
`LOWEST_COST_WITHOUT_CAP` unless the user asked for a cap.
- `COST_CAP` — target an average cost per result (set the cap on the ad set).
- `LOWEST_COST_WITH_BID_CAP` — hard ceiling per auction bid (advanced; needs a bid value on the ad
  set — do NOT use without one).
Only move off `LOWEST_COST_WITHOUT_CAP` when the user has a real CPA/ROAS constraint AND accepts
slower delivery.

## 4. Special ad categories (COMPLIANCE — required every time)
Meta legally restricts targeting for certain topics. You MUST declare one:
- `[]` — none (most e-commerce, SaaS, local services, general brands).
- `["HOUSING"]` — real estate, rentals, mortgages.
- `["EMPLOYMENT"]` — job ads, recruiting.
- `["CREDIT"]` — loans, credit cards, financial credit offers.
- `["ISSUES_ELECTIONS_POLITICS"]` — political / social-issue advocacy.
When in doubt whether the advertiser is in a restricted category, **ask** — a wrong declaration gets
ads rejected or the account flagged. This is not optional and not cosmetic.

## 5. Naming convention (readable, sortable)
Give campaigns a name a human can scan in Ads Manager. A workable pattern:
`[<Brand/Promo>] <Objective-short> · <Budget model> · <Budget>` →
`[Q3 Promo] Sales · CBO · $50/day`. Match the account's existing convention if one exists (read a
couple of current campaign names with `campaign_list` first). Never ship a name like "New Campaign".

## 6. Safety gate (before any write)
1. Objective chosen and confirmed (irreversible)?
2. Budget amount + model confirmed? Large number → `confirm_large_budget: true` + explicit human yes?
3. `special_ad_categories` set correctly?
4. `status: "PAUSED"` set?
5. Account resolved from `list_accounts` (not hardcoded)?
If any answer is no, stop and resolve it — don't write a half-specified campaign to a real account.

## What this skill deliberately does NOT decide
- Targeting, placements, schedule, optimization goal, ad-set budget → **adset-setup**.
- Creative, copy, CTA, lead form → **ad-setup**.
- When to turn the campaign ON, and when to pause/scale by performance → human + future rules skill.
