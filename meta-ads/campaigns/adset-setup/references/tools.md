# Tools — Meta Ads Ad Set Setup

Write skill: read the parent campaign + resolve targeting keys, then one `execute_action` to create.

> 🔌 Action ids/schemas are dynamic — confirm with `list_actions` before writing. Validated against
> `facebook-ads`, **2026-07-15**. On schema mismatch, `execute_action` echoes the full schema.

## Tool plan (ordered)

| # | Tool | Kind | Args | Why |
|---|------|------|------|-----|
| 1 | `list_accounts` | read | `connector="facebook-ads"`, `query=<name>` | Resolve the account; pass the **signed blob** as `account_id` (NOT `act_…` — feedback gap 31). |
| 2 | `execute_action` `facebook_ads.object_read` | read | `object_id=<campaign_id>`, `fields="objective,bid_strategy,daily_budget,special_ad_category"` | Learn objective + CBO + campaign bid_strategy — they drive every choice below. |
| 3 | `execute_action` `facebook_ads.geolocation_search` / `interest_search` / `customaudience_list` | read | as needed | Resolve city/region keys, interest ids, audience ids. |
| 4 | `execute_action` `facebook_ads.adset_create` | **write** | see params below | Create the ad set, `status:"PAUSED"`. |
| 5 | `execute_action` `facebook_ads.object_read` | read | `object_id=<adset_id>`, `fields="name,status,optimization_goal,billing_event,targeting,daily_budget"` | Verify. |

## `adset_create` params (the map)

**Required:** `name`, `campaign_id`, `billing_event`, `optimization_goal` (+ the account/identity,
injected from the signed blob).

| Param | Notes |
|-------|-------|
| `optimization_goal` | Must fit the objective: `LEAD_GENERATION` (LEADS), `LINK_CLICKS`/`LANDING_PAGE_VIEWS` (TRAFFIC), `REACH`/`IMPRESSIONS` (AWARENESS), `POST_ENGAGEMENT`/`THRUPLAY`/`PAGE_LIKES` (ENGAGEMENT), `OFFSITE_CONVERSIONS` (SALES). |
| `billing_event` | Default `IMPRESSIONS` (works with all objectives). |
| `destination_type` | `ON_AD` for LEADS, `WEBSITE` for TRAFFIC/SALES; omit for AWARENESS/ENGAGEMENT. |
| `status` | Always `"PAUSED"`. |
| `daily_budget_amount` / `lifetime_budget_amount` | ⚠️ **MAJOR units** (connector converts — `300000` = 300,000 COP; `30` = $30.00). **Only if the campaign is NOT CBO.** Guard huge values with `confirm_large_budget`. All budget math via the shared helper [`../../_budget/budget.md`](../../_budget/budget.md). |
| `bid_strategy` | Explicit for non-CBO ad-set budgets: `LOWEST_COST_WITHOUT_CAP` (default), `COST_CAP`, `BID_CAP`, `MINIMUM_ROAS`. `*_CAP`/`MINIMUM_ROAS` require `bid_value`. |
| `bid_value` | MAJOR units. Required for `COST_CAP`/`BID_CAP`. |
| `targeting_countries` / `_cities` / `_regions` / `_zips` | At least ONE geo type required. Cities/regions need keys from `geolocation_search`. |
| `targeting_age_min` / `_age_max` / `_genders` | 18–65; genders `[0]` all / `[1]` male / `[2]` female. |
| `targeting_interests` / `_custom_audiences` / `_excluded_custom_audiences` | Objects with ids from `interest_search` / `customaudience_list`. |
| `targeting_advantage_audience` | `1` = Advantage+ audience, `0` = manual; omit for Meta default. |
| `targeting_publisher_platforms` + `_facebook_positions` / `_instagram_positions` / … | Placements. Omit for automatic (Advantage+) placements. A position array requires its platform in `publisher_platforms`. |
| `promoted_object_page_id` | Required for LEADS, AWARENESS, ENGAGEMENT. |
| `promoted_object_pixel_id` + `_custom_event_type` (e.g. `PURCHASE`) | Required for SALES. Or `promoted_object_custom_conversion_id` for a specific custom conversion. |
| `promoted_object_lead_gen_form_id` | LEADS — the lead form, at ad-set level (alt to the creative). |
| `is_dynamic_creative` | `true` = DCA/Advantage+ creative ad set. **Fixed at create.** REQUIRED before a DCA / multi-format ad (`image_hashes`/`asset_feed_spec`) can attach — else Meta rejects the ad with subcode 1885998. |
| `start_time` / `end_time` | ISO 8601. Lifetime budget needs a schedule. |
| `frequency_cap_max` / `_interval_days` | e.g. 2 per 7 days. |

## Validated gotchas (live, 2026-07-15)
- **Campaign bid_strategy propagates:** if the campaign is `LOWEST_COST_WITH_BID_CAP`/`COST_CAP`,
  `adset_create` fails with `subcode 1815857 "Bid amount required"`. Fix the campaign's strategy
  (`campaign_update` → `LOWEST_COST_WITHOUT_CAP`) or pass a `bid_value`. (Feedback gap 32.)
- **Budget unit is MAJOR here** — opposite of `campaign_create` (minor). Do NOT ×100. (Gap 35.)
- **CBO campaign → no ad-set budget.** Putting a budget on the ad set of a CBO campaign is wrong;
  the budget lives on the campaign.
- **Meta throttle:** rapid automated writes (or an account without a payment method) can return
  `subcode 2859015 "account restricted / temporarily blocked"` even when `account_status=1`
  (healthy). **Back off and retry later — never retry-storm.**
- **`is_dynamic_creative` is a create-time, structural decision** driven by the *creative* you'll use
  later — coordinate with `meta-ads-ad-setup` before creating the ad set.

## Gotchas (general)
- At least one geo is mandatory or Meta rejects the targeting.
- Optimization/promoted-object mismatch vs the objective is a hard reject — read the campaign first.
