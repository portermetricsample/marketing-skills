# Tools — Meta Ads Campaign Setup

The ordered plan of MCP calls this skill makes. It is a **write** skill: reads to resolve the
account and verify, one `execute_action` to create/update.

> 🔌 Portal mechanics: the Porter MCP is a portal. Action ids and schemas are **dynamic** — always
> confirm the current id + `params_schema` with `list_actions` before writing. The ids below are
> validated as of **Jul 2026** against the `facebook-ads` connector. If a call fails on a schema
> mismatch, `execute_action` returns the full schema — read it and retry.

## Tool plan (ordered)

| # | Tool | Kind | Args | Why |
|---|------|------|------|-----|
| 1 | `list_accounts` | read | `connector="facebook-ads"`, `query="<account name>"` | Resolve the target account **object**. Pass the returned **signed `account_id` blob VERBATIM** as the `account_id` arg (see ⚠️ below) — NOT the raw `act_…`. Never invent or edit it. |
| 2 | `list_actions` | read | `task="create a Meta campaign"`, `connector="facebook-ads"` | Confirm the current `facebook_ads.campaign_create` action id + `params_schema`. Skip only if you just confirmed it this session. |
| 3 | `execute_action` | **write** | `action="facebook_ads.campaign_create"`, `account_id=<act_…>`, `params={…}` | Create the campaign. Always `status:"PAUSED"`. |
| 4 | `execute_action` | read | `action="facebook_ads.campaign_list"`, `account_id=<act_…>`, `params={"fields":"id,name,objective,status,daily_budget,lifetime_budget,special_ad_category"}` | Verify the campaign exists with the settings you intended. |

Related actions this skill also uses:
- **Update:** `facebook_ads.campaign_update` — `params.campaign_id` + any of `name`, `status`,
  `daily_budget_amount`, `lifetime_budget_amount`, `bid_strategy`. (Objective and buying_type are
  NOT updatable — Meta fixes them at create.)
- **Read one object:** `facebook_ads.object_read` — `params.object_id=<campaign_id>`, `fields=…`.
- **Tear down a test:** `facebook_ads.campaign_delete` — `params.campaign_id`. **Destructive.** Only
  on a campaign you created for testing.

## `campaign_create` params (the important ones)

| Param | Required | Notes |
|-------|----------|-------|
| `name` | ✅ | The name shown in Ads Manager. Use a readable convention (see framework.md). |
| `objective` | ✅ | One of `OUTCOME_AWARENESS`, `OUTCOME_TRAFFIC`, `OUTCOME_ENGAGEMENT`, `OUTCOME_LEADS`, `OUTCOME_APP_PROMOTION`, `OUTCOME_SALES`. **Frozen after create.** |
| `special_ad_categories` | ✅ | Array. `[]` = none. Else `["HOUSING"]`, `["EMPLOYMENT"]`, `["CREDIT"]`, `["ISSUES_ELECTIONS_POLITICS"]`. Compliance-critical. |
| `status` | — | **Always pass `"PAUSED"`.** Default is PAUSED but set it explicitly. |
| `daily_budget_amount` | — | Set here only for CBO (campaign-level budget). Otherwise the budget lives on the ad set. |
| `lifetime_budget_amount` | — | Campaign-level lifetime budget (needs a schedule on the ad set). Mutually exclusive with daily. |
| `is_campaign_budget_optimization` | — | `true` = CBO (Meta splits one campaign budget across ad sets). `false`/omit = each ad set carries its own budget. |
| `bid_strategy` | — | e.g. `LOWEST_COST_WITHOUT_CAP` (default), `LOWEST_COST_WITH_BID_CAP`, `COST_CAP`. Bid caps require a value on the ad set. |
| `buying_type` | — | `AUCTION` (default) or `RESERVED`. **Frozen after create.** |
| `confirm_large_budget` | — | `true` to acknowledge a large budget — pass only after the human confirms. |

## ⚠️ Budget units — use the shared helper
**All budget math goes through [`../../_budget/budget.md`](../../_budget/budget.md)** (currency +
offset + per-action convention + self-check). Do not hand-roll it here. Summary below.

For **`campaign_create` (this skill)**, `daily_budget_amount` is passed and stored in the account
currency's **minor units** — NOT whole currency. Test: sent `20000` on a COP account → read back
`daily_budget: "20000"` (= 200.00 COP/day; COP offset is 100). So `5000` = $50.00 on a USD account.

> 🚨 **INCONSISTENCY with the ad-set skill (feedback gap 35):** `adset_create` does the OPPOSITE —
> its `daily_budget_amount` is in the **MAJOR** unit (the connector converts; you pass `300000` for
> 300,000 COP, do NOT ×100). So: **campaign budget = minor units (×offset yourself); ad-set budget =
> major units (connector converts).** Do not carry one convention into the other skill.
- **There is a per-account MINIMUM the API enforces and reports.** Sending `50` on the COP sandbox
  returned: `"daily budget 50 COP is below the account minimum (3319 COP in minor units); raise it"`.
  Read the minimum from that error (or from the account) and never send below it.
- **Convert for the user:** a non-technical user thinks in real money ("$50/day"). The skill must
  read the **account currency** (from `list_accounts` / the account object), multiply by the offset
  (usually 100), and enforce the minimum — never make the user think in cents.

## Account resolution (account-agnostic contract)
- The skill takes the account from the **user**, resolved through `list_accounts`. It must work for
  any user's account.
- ⚠️ **`account_id` for `execute_action` = the SIGNED blob from `list_accounts`, passed verbatim** —
  NOT the raw `act_…` id. Validated 2026-07-15: passing `act_343160423837197` returned
  `invalid_account: account_ref is malformed`; passing the signed blob succeeded. Do not truncate or
  hand-edit the blob (any change → `account_ref signature is invalid (tampered or forged)`). The
  action's own description saying "account_id must include the act_ prefix" is misleading for this
  wrapper — trust the signed blob.
- **Testing sandbox:** the empty Porter-owned account **"Porter Metrics" (`act_343160423837197`,
  COP)** has zero spend/history — ideal for end-to-end create→verify→delete tests without touching a
  real campaign. This is a *testing convenience only*; NEVER bake it into the skill's logic.

## Tools NOT needed here
- `query_data` / `list_fields` — those are for performance reporting, not campaign creation.
- `adset_*`, `ad_*`, `image_upload`, `video_upload` — separate skills (adset-setup, ad-setup).

## Gotchas
- **Objective irreversibility:** if the user picked the wrong objective, the fix is delete + recreate.
- **CBO vs ad-set budget:** set the budget in exactly one place. If `is_campaign_budget_optimization`
  is true, put the budget on the campaign; if false, leave it off the campaign and put it on the ad set.
- **A campaign alone does nothing** — it needs an ad set + an ad to be launchable. Always tell the
  user the next step.
- Action ids can change between MCP releases → reconfirm via `list_actions` if a write fails.
