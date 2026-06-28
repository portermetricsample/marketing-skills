# Tools — Campaign Settings Audit (Location + Networks)

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the plan — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated live against the `google-ads` connector (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see Step 2 | Pull the per-campaign settings row. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | see Step 3 | **Optional** — size the §6 leak: spend by geography vs the target market. |

## Step 2 — `query_data` args (this is "the query")
One campaign-grain query returns **both §6 and §7** (no point splitting). Minimal, exact fields:

- `google_ads_campaign_name` — the campaign (the unit of analysis).
- `google_ads_campaign_advertising_channel_type` — SEARCH / DEMAND_GEN / … . **Scoper:** the §7
  flags only apply when this is `SEARCH`.
- `google_ads_campaign_geo_target_type_setting_positive_geo_target_type` — §6 location type.
  Values `PRESENCE` (good) / `PRESENCE_OR_INTEREST` (flag).
- `google_ads_campaign_network_settings_target_partner_search_network` — §7 Search Partners on?
  `True` / `False` (flag `True` on SEARCH).
- `google_ads_campaign_network_settings_target_content_network` — §7 Display on? `True` / `False`
  (flag `True` on SEARCH).
- `google_ads_cost_micros` — 30-day spend, to rank by dollars and size the money at stake.

Period: `{"preset": "last_30_days"}`. Sort: `cost_micros` desc.
Also available if needed: `..._target_search_network` (Google Search on?) and `..._target_google_search`.

```jsonc
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<full account object from step 1>],
  "fields": ["google_ads_campaign_name", "google_ads_campaign_advertising_channel_type",
    "google_ads_campaign_network_settings_target_partner_search_network",
    "google_ads_campaign_network_settings_target_content_network",
    "google_ads_campaign_geo_target_type_setting_positive_geo_target_type",
    "google_ads_cost_micros"],
  "date_range": {"preset": "last_30_days"},
  "sort": [{"field": "google_ads_cost_micros", "direction": "desc"}]
})
```
Returns e.g. `["False","PRESENCE","False","SEARCH","Acme_Life_SEM_(TL)","77437.94"]` — the
toggles come back as **strings**.

## Step 3 — `query_data` args (optional §6 geo-leak query)
Only to **quantify** a §6 flag (the flag itself is self-contained). Pull spend by geography and
compare to the target market:

- `google_ads_campaign_name`
- `google_ads_geo_target_country` — or `google_ads_geo_target_region` / `_state` / `_city` for finer cuts.
- `google_ads_cost_micros`

Spend in countries/regions **outside the advertiser's target market** = the wasted-spend figure
(Acme's "15-25%"). The target market must be supplied (account profile / user); without it,
report the geo spread and let the human mark what's out-of-market.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no landing page is read; this is a settings check, not a CRO/alignment one.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by other audit checks, not here)
- `conversions`, `conversions_value`, `cost_per_conversion`, `conversion_value_per_cost` — performance, not settings.
- `ad_group_name`, `keyword_info_text` — relevance / negatives checks, not campaign settings.
- target CPA/ROAS fields — the bid-strategy check.

## Gotchas
- **Values are strings.** Compare `"True"` / `"PRESENCE_OR_INTEREST"` as text, not booleans.
- **Scope the Display flag to SEARCH.** `target_content_network == "True"` is normal/expected on
  Display / PMax / Demand-Gen — flag it only when `channel == "SEARCH"`. Same for Search Partners.
- **§6 dollar leak needs the target market supplied** — the setting flag is self-contained; the
  geo-spend interpretation is not.
- **`cost_micros > 0` auto-filter** hides 0-spend campaigns (fine — we rank by spend). Cost is in
  account currency despite the `micros` name.
- **Dogfood (Acme Insurance):** all campaigns `PRESENCE` · Partners `False` · Display `False` → 0 flags.
  A clean pass is a valid result, not a missing-data gap.
