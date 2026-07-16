---
name: meta-ads-campaign-setup
description: Create and configure a Meta (Facebook/Instagram) Ads campaign object on any Porter-connected ad account — objective, budget strategy (CBO), bid strategy, special ad categories, naming — always created PAUSED for safety. Use this skill whenever the user wants to launch, create, set up, or spin up a Meta/Facebook/Instagram campaign, or says "crea una campaña", "arma una campaña en Meta", "set up a campaign", "launch a new campaign", even if they don't say "Porter". Scope: builds ONLY the campaign shell + its budget/objective settings; the ad set (targeting, schedule, adset budget) and the ad/creative belong to the complementary meta-ads-adset-setup and meta-ads-ad-setup skills.
---

# Meta Ads — Campaign Setup

Create the **campaign object** on a Meta ad account and configure the settings that
live at the campaign level: objective, budget model (campaign budget optimization vs
ad-set budgets), bid strategy, buying type, and the mandatory special-ad-category
declaration. Everything is created **PAUSED** so nothing spends until a human turns it on.

This skill is **account-agnostic**: it never hardcodes an ad account. It always resolves
the target account from `list_accounts` using the name or id the user gives, and passes
that account's `native_account_id` (the `act_…` id) to the action. The same skill works
for any user on any of their connected Meta accounts.

## Goal (job-to-be-done)
Turn a plain-language brief ("a sales campaign for the summer promo, $30/day, CBO") into a
correctly configured, compliant, PAUSED Meta campaign — with the objective and budget model
chosen deliberately, not by accident.

- **Who:** a media buyer / marketer launching or restructuring Meta campaigns. **When:** at
  campaign launch, or when scripting bulk launches.
- **Decision it drives:** the campaign is created ready for an ad set + ad to be attached, with
  the right objective (which is **frozen at create time** and cannot be changed later) and the
  right budget model.
- **The differentiator:** it makes the two irreversible choices — **objective** and **buying
  type** — on purpose, sets `special_ad_categories` every time (a compliance requirement people
  forget), and never launches hot: status is PAUSED by default.

## Scope
- ✅ **Create/configure the campaign object**: name, objective, CBO on/off, daily/lifetime
  campaign budget, bid strategy, buying type, special ad categories, PAUSED status.
- ✅ **Update an existing campaign** (name, status, budget, bid strategy) via `campaign_update`.
- ✅ **Verify** the result by reading it back, and **tear down** a test campaign (`campaign_delete`).
- ❌ **Ad set** (targeting, placements, schedule, ad-set budget, optimization goal) → belongs to
  `meta-ads-adset-setup`.
- ❌ **Ad / creative** (image, video, copy, CTA, lead form) → belongs to `meta-ads-ad-setup`.
- ❌ **Performance optimization** (pause by CPA, shift budget to winners) → a future rules skill.

## Components (read these references as needed)
- **Tools / action plan:** [`references/tools.md`](references/tools.md) — the exact MCP calls,
  action ids, and how to resolve the account.
- **Framework / decision rubric:** [`references/framework.md`](references/framework.md) — how to
  choose objective, budget model, bid strategy, and the compliance + safety rules.
- **Output schema:** [`references/output.md`](references/output.md) — what the skill reports back
  after creating.

## Operate
**Input:** a brief in natural language + the target account (name or `act_…` id). Required before
any write: the **objective**, the **budget** (amount + daily/lifetime), and the **special ad
category** (or explicit "none" → `[]`). If any is missing, ask — do not guess the objective or
default a budget silently.

**Process:**
1. **Resolve the account** (`list_accounts` → pick the object; never invent the id). Read the
   account's currency and timezone once so budgets and schedules are unambiguous.
2. **Choose the settings** with [`references/framework.md`](references/framework.md): map the
   business goal → `objective`; decide CBO vs ad-set budgets; pick `bid_strategy`; set
   `special_ad_categories`.
3. **Confirm the plan** with the user in plain language BEFORE writing (objective is irreversible).
4. **Create** with `facebook_ads.campaign_create` — always `status: PAUSED`. Pass
   `confirm_large_budget: true` only after the user has confirmed a large number.
5. **Verify** by reading the campaign back (`campaign_list` / `object_read`) and report the
   `campaign_id` and settings.

**Emit** the summary in [`references/output.md`](references/output.md): the created campaign's id,
name, objective, budget model, status, the Ads Manager link, and the explicit next step (attach an
ad set). Plain language for a non-technical owner — no jargon dump.

## Safety rules (non-negotiable)
- **Always PAUSED.** Never create or flip a campaign to `ACTIVE` in the same breath as creating it.
  Turning it on is a separate, explicit human decision.
- **Objective and buying type are frozen at create time.** Confirm them before writing.
- **`special_ad_categories` is required every time** — pass `[]` for "none", or the correct
  category (`HOUSING`, `EMPLOYMENT`, `CREDIT`, `ISSUES_ELECTIONS_POLITICS`). Getting this wrong is a
  policy violation, not a cosmetic error.
- **Account-agnostic:** resolve the account from `list_accounts`; never hardcode an `act_…` id in
  the skill. (For your own testing, use the empty sandbox account — see tools.md — so no real
  campaign is ever touched.)
- **Large budgets** require `confirm_large_budget: true` AND a human "yes" first.

## Example (illustrative — NOT rules)
> Brief: "Sales campaign for the Q3 promo, $50/day, let Meta optimize the budget, e-commerce so no
> special category." → Create `[Q3 Promo] Sales · CBO · $50/day` with `objective:
> OUTCOME_SALES`, `is_campaign_budget_optimization: true`, `daily_budget_amount: 50`,
> `special_ad_categories: []`, `status: PAUSED`. Report the id + "next: attach an ad set with
> targeting and an ad."
