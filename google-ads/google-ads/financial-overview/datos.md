# Data: Google Ads — Financial Overview (executive)

> 🔌 **How these queries are invoked on the MCP** (portal, tool-ids, fetch/execute): see [`porter-mcp-calls.md`](../../_framework/porter-mcp-calls.md).

Verified against the `google-ads` connector catalog of the Porter MCP.

> ✅ **Verified against a live account** (figures below are illustrative sample numbers, not a real account).
> Both queries run fine. Finding: `cost_per_conversion` gives a wrong aggregate at the
> account level → calculate CPA by hand (see KPIs). Technical note: `query_data` is called
> via `execute` (not `fetch`) and `accounts` requires the full object, not just the id.

## Connector
- **Porter:** `google-ads`.
- **Account:** `list_accounts(component_name="google-ads")`. ID `<customer_id>-<login_customer_id>`. Do not make it up.

## Fields
**Total KPIs:**
- `google_ads_conversions`
- `google_ads_conversions_value`
- `google_ads_cost_micros`
- `google_ads_conversion_value_per_cost` (ROAS) — ✅ aggregates correctly at account level
- **CPA = calculate `cost_micros / conversions`.** Do NOT use `google_ads_cost_per_conversion`:
  at the account level (no breakdown) it returns a wrong aggregate. Example (sample numbers):
  the field reported a wrong ~$9,200 aggregate when the true CPA was ~$250 ($150,000 / 600).

**Breakdown (flat table, column order: Name first):**
- `google_ads_conversion_action_name` (Conversion name)
- `google_ads_conversion_action_category` (Conversion type)
- `google_ads_conversions` (Conversions)
- `google_ads_conversions_value` (Value)
- `google_ads_value_per_conversion` (Value per conversion — valid per row: value and
  conversions do belong to the action. NOTE: it is NOT ROAS.)
- `google_ads_all_conversions` (only to derive the primary/secondary flag, see below)

**Calculations (not fields):**
- **% of value** = row value / total table value.
- **Primary/secondary flag**: Google does not expose a clean direct flag in the
  catalog. It is derived per row: if the action has `google_ads_conversions > 0` →
  **primary** (counts in the big KPI); if it has `conversions = 0` but
  `all_conversions > 0` → **secondary**. (When building, confirm with
  `list_fields(data_source_name="google-ads", search="primary")` in case a direct
  field exists; if not, use the derivation.)

## Period
- **Current:** `date_range = {"preset": "last_month"}`.
- **vs previous:** second query with the prior month (`{"date_from": "...", "date_to": "..."}`)
  and calculate the % change. Porter does not compare periods in a single call.

## Queries (valid combinations)
1. **Total KPIs:** `conversions + conversions_value + cost_micros +
   cost_per_conversion + conversion_value_per_cost` (no dimension = account totals).
2. **Breakdown:** `conversion_action_name + conversion_action_category +
   conversions + conversions_value + value_per_conversion + all_conversions`.
   (`all_conversions` only to derive primary/secondary; the % of value is
   calculated afterwards over the rows.)
   → One query per period (current and previous) for the "vs".

## Exact MCP calls (copy-paste)
> Portal meta-tools. If any id fails, re-confirm via `search` (the catalog is dynamic).
> Run BOTH queries below for the CURRENT period and again for the PREVIOUS period (4 calls total).

**1) Discover the account** — meta-tool `fetch`:
```
fetch(tool_id="tool:porter-accounts:list_accounts", args={"component_name": "google-ads"})
```
Keep the **complete** account object returned.

**2) Total KPIs** — meta-tool `execute` (NOT fetch):
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<the COMPLETE account object>],
  "fields": [
    "google_ads_conversions", "google_ads_conversions_value",
    "google_ads_cost_micros", "google_ads_conversion_value_per_cost"
  ],
  "date_range": {"preset": "last_month"}
})
```
→ CPA = compute `cost_micros / conversions` (do NOT request `cost_per_conversion` — wrong aggregate).

**3) Conversion breakdown** — meta-tool `execute`:
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<the COMPLETE account object>],
  "fields": [
    "google_ads_conversion_action_name", "google_ads_conversion_action_category",
    "google_ads_conversions", "google_ads_conversions_value",
    "google_ads_value_per_conversion", "google_ads_all_conversions"
  ],
  "date_range": {"preset": "last_month"}
})
```
→ NO `cost_micros`/`cost_per_conversion` here (spend isn't attributable per action). % of value = computed over the rows.

**4) Previous period:** repeat #2 and #3 with the prior month, e.g.
`"date_range": {"date_from": "2026-04-01", "date_to": "2026-04-30"}`, then compute the % changes.

## Gotchas
- **Do NOT put `cost_micros` or `cost_per_conversion` in the breakdown query** by
  conversion_action: spend is not attributed per conversion action → false number.
- **Primary vs all conversions:** the `google_ads_conversions` KPI = primary
  (= Google UI). The breakdown by `conversion_action_name` brings ALL (incl.
  secondary), so the table can add up to more than the KPI. State it with a note.
- **Automatic `cost_micros > 0`:** rows with 0 spend are hidden when requesting cost. For
  a total account overview it usually does not matter, but keep it in mind.
- **`google_ads_value_per_conversion` ≠ ROAS.** ROAS is `conversion_value_per_cost`.
- **No quarter/90-day preset:** use `{date_from, date_to}` for those ranges.
