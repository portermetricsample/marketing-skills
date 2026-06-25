# Tools — Google Ads Geography Segmentation

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../../_framework/porter-mcp-calls.md`](../../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the per-location base counts. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
Pick **one** geo dimension (the granularity) + the **base counts**. Everything else is derived.

**Geo dimension (pick the granularity that fits the account's footprint — exactly one per pass):**
- `google_ads_geo_target_country` (+ `_code`, `_id`) — multi-country accounts.
- `google_ads_geo_target_region` — state / province; **plain names** ("California"), national default.
- `google_ads_geo_target_metro` — DMA / metro area; local media-buying.
- `google_ads_geo_target_city` (+ `_id`) — store-radius.
- `google_ads_geo_target_most_specific_location` — finest grain.
- `google_ads_location_type` — physical presence vs presence-or-interest. **Context, not a row
  metric** — state which the account targets; it changes the meaning, don't break rows on it.

**Base counts (everything — rates / costs — is derived from these, never asked directly):**
- `google_ads_impressions`
- `google_ads_clicks`
- `google_ads_cost_micros`
- `google_ads_conversions`
- `google_ads_conversions_value`

**Period:** the report period **AND** its comparison period (vs-previous-period attribution),
≥ 4–8 weeks.

**Sort + cap:** **sort by the value metric** (e.g. `conversions_value` or `cost_micros`) and
**cap `limit`** (e.g. top 25). Geo has a long tail — roll the rest up as "all others"; never pull
200 cities unfiltered.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Geography is count-only.
- `list_fields` / `list_custom_fields` — only to re-validate / confirm a geo dimension name if a
  query fails (geo is richly exposed but confirm the exact field name).

## Gotchas
- **Long tail** — always sort + cap; don't pull 200 cities unfiltered. Roll up "all others".
- **No map atlas for every geography** — the render layer (porter-reporting) lacks some country
  atlases (e.g. Canada provinces); the viz falls back to ranked bars. **Pure rendering concern,
  not data** — the analysis is unchanged.
- **Region names are plain strings** on google-ads — no remap needed; non-US accounts return
  provinces / departments.
- **Compute every rate / cost from base counts**; **ratios don't sum across locations**.
- **`google_ads_cost_micros` arrived already in currency** on the validated pull — sanity-check
  before dividing by 1e6.
- **Geo coverage is typically ~100% of spend** (unlike demographics) — read it as the account.
- **Aggregate flattens trend** — cross-check a flagged location over time (the `time/` case).
