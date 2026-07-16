# Tools — PMax Diagnostics

The ordered plan of MCP tool calls this skill makes. The "query" is the **arguments of `query_data`**,
nested below — not raw GAQL. The earning lens and the asset-group read are both metric/dimension pulls
through `tool:porter-reporting:query_data` (the **`execute`** meta-tool — it is flagged not_read_only),
preceded by `list_accounts` for the account **object**. The one thing `query_data` does NOT expose
(coarse search-category insight) is routed to `execute_connector_action`, and everything else PMax
hides goes to `visibility_limits` — never faked.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Campaign + asset-group + per-asset fields below are **verified** in the `google-ads` connector via
> `list_fields`.

## ⚠️ Connector feasibility for PMax = PARTIAL — read this first

This is the whole point of the skill. Some things are exposed, most are not. **Do not build a verdict
from data the API never returned.**

| What | Exposed for PMax | How to read it | Use it for |
|------|------------------|----------------|-----------|
| Campaign-level cost / conversions / value / ROAS / CPA | ✅ yes | `query_data` (verified fields) | the primary earning-vs-baseline lens |
| Identify PMax (`google_ads_campaign_advertising_channel_type = PERFORMANCE_MAX`) | ✅ yes | `query_data` filter | isolate PMax campaigns |
| Asset-group rows: name, status, ad_strength + asset-group-level cost/conv/value | ✅ yes | `query_data` (verified `google_ads_asset_group_*`) | the only creative-level read you get |
| Per-asset performance label + field type | ✅ yes | `query_data` (`google_ads_asset_performance_label`, `google_ads_asset_field_type`) | directional "which asset is pulling weight" |
| Coarse search **category** buckets (`campaign_search_term_insight`) | ⚠️ partial | **not** in `query_data` → `execute_connector_action` GAQL (validate action) or UI | category-level themes ONLY — never the search-terms report |
| Impression share on PMax | 🔴 not exposed | — | leave out; PMax does not return IS the way Search does |
| **Individual search terms** driving PMax spend | 🔴 not exposed | → Google Ads UI (partial even there) | — |
| **Placements** (URLs, apps, channels) | 🔴 not exposed | → Google Ads UI placement report | — |
| **Audience signals / segments** + their performance | 🔴 not exposed | → Google Ads UI | — |
| **Channel split** (Search / YouTube / Display / Discover inside PMax) | 🔴 not exposed | → Google Ads UI / PMax insights | — |

**The rule: everything marked 🔴 goes into the `visibility_limits` output block, verbatim in intent.
Never imply a search-term, placement, audience, or channel verdict was formed from Porter data — it
was not.**

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object**. Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | PMax-campaign fields (below) | The earning lens — cost/conv/value per PMax campaign. **Required.** |
| 3 | `tool:porter-reporting:query_data` | `execute` | asset-group fields (below) | Asset-group-level cost/conv (the only creative read). **Required.** |
| 4 | `tool:porter-reporting:query_data` | `execute` | per-asset fields (below) | Per-asset performance label. Optional, directional. |
| 5 | `tool:porter-automations:execute_connector_action` | `execute` | GAQL on `campaign_search_term_insight` | Coarse search-category insight — NOT in `query_data`; see below. Optional, the *ceiling*. |

## Step 2 — PMax-campaign `query_data` args (the earning lens) — REQUIRED

- `google_ads_campaign_name`
- `google_ads_campaign_advertising_channel_type` — the field that isolates PMax.
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value` — the money.
- `google_ads_conversion_value_per_cost` — native **ROAS** (aggregates correctly).

`filters` = `[[{field:"google_ads_campaign_advertising_channel_type", operator:"equals",
value:"PERFORMANCE_MAX"}]]`. `date_range` = the period. Compute in the framework:
`cpa = cost / conversions` (native `cost_per_conversion` is wrong at aggregate); ROAS from the native
field. **Conversion rate**, if wanted, = `conversions / clicks` computed (add `google_ads_clicks`) —
the native `google_ads_current_model_attributed_conversions_from_interactions_rate` exists but is a
rate field, unreliable at aggregate and blended across the hidden channels. **Do NOT** add any
impression-share field — PMax does not report it like Search; a printed "0% IS" would be a false
signal, not a real cap.

## Step 3 — asset-group `query_data` args (the only creative-level read) — REQUIRED

- `google_ads_campaign_name` — join back to step 2.
- `google_ads_asset_group_name` · `google_ads_asset_group_id` · `google_ads_asset_group_status`
- `google_ads_asset_group_ad_strength` — POOR/AVERAGE/GOOD/EXCELLENT, a quality proxy, **not** a
  performance verdict.
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value` — asset-group
  level spend/conv (the finest cut PMax exposes).

`filters` = same PMax channel-type filter. This is legible enough to say "Group A carries the spend,
Group B is starved" — nothing finer.

## Step 4 — per-asset `query_data` args (optional, directional)

- `google_ads_asset_group_name` (or `google_ads_asset_group_id`)
- `google_ads_asset_field_type` — HEADLINE / IMAGE / VIDEO / …
- `google_ads_asset_performance_label` — LOW / GOOD / BEST / LEARNING / PENDING per asset.

It hints which creatives to swap — but it is Google's own label, not a conversion read, so present it
as directional only.

## Step 5 — coarse search-CATEGORY insight (NOT `query_data`, NOT the search-terms report)

`campaign_search_term_insight.category_label` has **no `google_ads_*` field in `query_data`**
(confirmed: `list_fields` returns nothing for it). Two honest options, in order:
1. **Connector-action GAQL path** — `tool:porter-automations:execute_connector_action`, `connector =
   "google-ads"`, with a GAQL pass-through action (the same mechanism `negative-keywords` uses via
   `keyword.list`). *Validate the exact `action_id` exists via `search` / `list_actions` before
   relying on it — there is no verified PMax-insight action id.* GAQL:
   `SELECT campaign.id, campaign_search_term_insight.category_label, metrics.clicks,
   metrics.impressions, metrics.conversions FROM campaign_search_term_insight WHERE segments.date
   BETWEEN '{start}' AND '{end}' AND campaign.id = {pmax_campaign_id}` — filter by `campaign.id` and
   query per PMax campaign (`campaign_search_term_insight` has no free `campaign` dimension to SELECT).
2. **If no such action is exposed → treat this as a UI-only signal** and put it in `visibility_limits`.

Either way this is **category *themes*** (e.g. "running shoes", "gift ideas"), **NOT** individual
search terms, and it cannot be joined to keywords or made exclusion-ready. Use it only to say "PMax is
showing against these coarse categories". The real search-terms report does not exist for PMax — say so.

## Fields read (chips)

`google_ads_campaign_name` · `google_ads_campaign_advertising_channel_type` · `google_ads_cost_micros` ·
`google_ads_conversions` · `google_ads_conversions_value` · `google_ads_conversion_value_per_cost` ·
`google_ads_clicks` · `google_ads_asset_group_name` · `google_ads_asset_group_id` ·
`google_ads_asset_group_status` · `google_ads_asset_group_ad_strength` · `google_ads_asset_field_type` ·
`google_ads_asset_performance_label` · *(connector-action)* `campaign_search_term_insight.category_label`.

## Data pulls (4, last two optional)

1. PMax campaigns — cost/conv/value + native ROAS (the earning lens). **Required, `query_data`.**
2. Asset-group-level performance per PMax campaign. **Required, `query_data`** (the only creative read).
3. Per-asset performance labels. Optional, directional, `query_data`.
4. Coarse search-category insight. Optional — `execute_connector_action` GAQL (validate) or UI-only;
   explicitly the *ceiling*, not the search-terms report.

Plus the **Search baseline** (non-brand Search CPA/ROAS) — supplied as input from
`financial-overview` / `spend-allocation`, not pulled here.

## Not exposed — goes to `visibility_limits`, never faked

- PMax **individual search terms** (only coarse categories exist, via step 5).
- PMax **placements** (where the ad showed — URLs/apps/channels).
- PMax **audience signals** and their per-segment performance.
- PMax **channel split** (Search / YouTube / Display / Discover / Gmail inside one campaign).
- PMax **impression share** (not returned like Search).

For all of these the fallback is the **Google Ads UI** (partial even there). The skill's job is to say
this out loud — see `visibility_limits` in [`output.md`](output.md).

## Gotchas

- **`google_ads_cost_micros` / `conversions_value` come back already in currency** (Porter pre-converts;
  do NOT /1e6).
- **`accounts` = the complete object** from `list_accounts`, not the id string.
- **`execute_connector_action` is a READ here but routes through `execute`** (calling it via `fetch`
  returns `not_read_only`) — same as the `*.list` GAQL reads elsewhere.
- No per-date segmentation for the verdict — PMax earning is a period total. (Add `google_ads_date`
  only if the caller wants a trend.)
- No `process.py` — the CPA/ROAS ratio + asset-group rollup is a small inline join. If an account has
  many PMax campaigns, cache step 3.
