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
| `daily_budget_amount` / `lifetime_budget_amount` | ⚠️ **MINOR units** (centavos, ×offset — the connector does NOT convert; verified 2026-07-16). **Only if the campaign is NOT CBO.** Guard huge values with `confirm_large_budget`. All budget math via [`../../_budget/budget.md`](../../_budget/budget.md). |
| `bid_strategy` | Explicit for non-CBO ad-set budgets: `LOWEST_COST_WITHOUT_CAP` (default), `COST_CAP`, `BID_CAP`, `MINIMUM_ROAS`. `*_CAP`/`MINIMUM_ROAS` require `bid_value`. |
| `bid_value` | MINOR units (×offset). Required for `COST_CAP`/`BID_CAP`. |
| `targeting_countries` / `_cities` / `_regions` / `_zips` | At least ONE geo type required. Cities/regions need keys from `geolocation_search`. |
| `targeting_age_min` / `_age_max` / `_genders` | 18–65; genders `[0]` all / `[1]` male / `[2]` female. |
| `targeting_interests` / `_custom_audiences` / `_excluded_custom_audiences` | Objects with ids from `interest_search` / `customaudience_list`. |
| `targeting_advantage_audience` | `1` = Advantage+ audience, `0` = manual. ⚠️ **REQUIRED explicitly** — omitting it errors `subcode 1870227 "Advantage Audience Flag Required"`. Note: `1` disallows `age_max < 65` (subcode 1870189); for a real age cap use `0`. |
| `targeting_publisher_platforms` + `_facebook_positions` / `_instagram_positions` / … | Placements. Omit for automatic (Advantage+) placements. A position array requires its platform in `publisher_platforms`. |
| `promoted_object_page_id` | Required for LEADS, AWARENESS, ENGAGEMENT. |
| `promoted_object_pixel_id` + `_custom_event_type` (e.g. `PURCHASE`) | Required for SALES. Or `promoted_object_custom_conversion_id` for a specific custom conversion. |
| ~~`promoted_object_lead_gen_form_id`~~ | ❌ **NOT here.** Meta rejects a lead form in the ad set's `promoted_object` (`Invalid keys "lead_gen_form_id" were found in param "promoted_object"`, validated 2026-07-16). For LEADS the ad set's promoted object is the **Page only** (`promoted_object_page_id`); the lead form is attached on the **ad** via `ad_create.lead_gen_form_id` (see ad-setup). |
| `is_dynamic_creative` | `true` = DCA/Advantage+ creative ad set. **Fixed at create.** REQUIRED before a DCA / multi-format ad (`image_hashes`/`asset_feed_spec`) can attach — else Meta rejects the ad with subcode 1885998. |
| `start_time` / `end_time` | ISO 8601. Lifetime budget needs a schedule. |
| `frequency_cap_max` / `_interval_days` | e.g. 2 per 7 days. |

## Validated gotchas (live, 2026-07-15)
- **Campaign bid_strategy propagates:** if the campaign is `LOWEST_COST_WITH_BID_CAP`/`COST_CAP`,
  `adset_create` fails with `subcode 1815857 "Bid amount required"`. Fix the campaign's strategy
  (`campaign_update` → `LOWEST_COST_WITHOUT_CAP`) or pass a `bid_value`. (Feedback gap 32.)
- **Budget unit is MINOR here too** (centavos) — verified 2026-07-16 by read-back: sent `12345` → stored `12345`. The schema's "MAJOR unit / connector converts / do NOT ×100" is **WRONG**. Same as campaign: **×offset yourself**. Use [`../_budget/budget.md`](../_budget/budget.md). (Gap 35 corrected.)
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
