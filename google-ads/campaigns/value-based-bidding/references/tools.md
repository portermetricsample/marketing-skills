# Tools — Value-Based Bidding Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated live against the `google-ads` connector of the Porter MCP (Acme Insurance, May 2026). All
> fields combine in **one campaign-grain query**.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the campaign-grain bidding + ROAS rows. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
Minimal, exact fields — one row per campaign, everything the verdict needs:

- `google_ads_campaign_name` — the campaign (the unit of reading; group by this).
- `google_ads_campaign_bidding_strategy_type` — the strategy (`MAXIMIZE_CONVERSION_VALUE` /
  `TARGET_ROAS` / `MAXIMIZE_CONVERSIONS` / `TARGET_CPA` / `TARGET_IMPRESSION_SHARE` / `MANUAL_CPC` / …).
- `google_ads_campaign_target_roas_target_roas` — set target ROAS **when strategy = `TARGET_ROAS`**.
- `google_ads_campaign_maximize_conversion_value_target_roas` — set target ROAS **when strategy =
  `MAXIMIZE_CONVERSION_VALUE`** (0 = no target cap, pure max-value).
- `google_ads_conversion_value_per_cost` — the **real ROAS** (aggregates correctly).
- `google_ads_conversions` — volume (the 15-30 rule).
- `google_ads_conversions_value` — is value tracked at all? (0 → not eligible).
- `google_ads_cost_micros` — spend; rank by dollars. In account currency despite the name.

Period: `last_month` (or a `{date_from, date_to}` of ~30 days). Sort by `google_ads_cost_micros`
desc. Optionally filter to `channel_type = SEARCH`, or run without a filter to cover the whole
account (the bidding fields exist for all campaign types).

```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<full account object>],
  "fields": ["google_ads_campaign_name","google_ads_campaign_bidding_strategy_type",
    "google_ads_campaign_target_roas_target_roas","google_ads_campaign_maximize_conversion_value_target_roas",
    "google_ads_conversion_value_per_cost","google_ads_conversions","google_ads_conversions_value","google_ads_cost_micros"],
  "date_range": {"preset": "last_month"},
  "sort": [{"field": "google_ads_cost_micros", "direction": "desc"}]
})
```

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Everything is a direct field; nothing to read from a page.
- Settings API — there is none in `query_data`; the bidding strategy and target ROAS are exposed as
  reporting fields, so no settings interface is needed.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used only on demand, not in the base query)
- `google_ads_ad_group_target_roas` / `google_ads_ad_group_effective_target_roas` — ad-group target
  overrides. Pull **only** if you need to flag an ad group whose target differs from its campaign;
  the base read is campaign grain.

## Gotchas (validated)
- **Two target fields — pick by strategy.** `..._target_roas_target_roas` carries the target only for
  `TARGET_ROAS`; for `MAXIMIZE_CONVERSION_VALUE` the target is in
  `..._maximize_conversion_value_target_roas`. In the dogfood ALL campaigns had
  `target_roas_target_roas = 0`, while the two value-bidding Life campaigns carried `37.2` in the
  max-conv-value field. Read the field that matches the strategy; `0` = no target set.
- **Sanity-check the target's realism + unit.** Dogfood: target `37.2` (≈3720% ROAS) vs a real ROAS
  of `1.55` — a 24× gap. Could be a shared portfolio target, an internal value scale, or a
  misconfiguration. **Surface the two numbers + the gap; do NOT assume which is wrong.** Confirm the
  unit (ratio `4.0` vs percent `400` vs micros) against the real ROAS before phrasing "too high /
  too low".
- **Value = 0 → not eligible (and that's often correct).** Dogfood: Dental & Health on
  `MAXIMIZE_CONVERSIONS` with `conversions_value = 0` don't track value, so value bidding can't
  apply. Report ⛔ not-eligible and point to Section 2 (conversion-value tracking), not a bid-strategy
  switch.
- **Campaign grain.** Group by `campaign_name`. Ad-group target overrides exist (see Parked fields) —
  note them only if an ad group differs from its campaign.
- **`cost_micros > 0` auto-filter** hides 0-spend campaigns (fine — we rank by spend). Cost is in
  account currency despite the name.
- **`conversions`, not `all_conversions`** (matches the UI); disclose the choice.
