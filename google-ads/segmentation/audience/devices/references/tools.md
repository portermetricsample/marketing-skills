# Tools — Google Ads Device Segmentation

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../../_framework/porter-mcp-calls.md`](../../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Acme Golf, 13 weeks).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the device-segmented base counts. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
One query **segmented by `google_ads_device`**, returning ≤ 4 rows. Everything else is **derived from
base counts** — don't ask for rate/cost fields.

**Device dimension (the segment):**
- `google_ads_device` — values `MOBILE` / `DESKTOP` / `TABLET` / `CONNECTED_TV`.

**Base counts (the only metrics — everything else is computed):**
- `google_ads_impressions`
- `google_ads_clicks`
- `google_ads_cost_micros`
- `google_ads_conversions`
- `google_ads_conversions_value`

**Period:** the report period **AND** its comparison period (vs-previous-period attribution).
Range ≥ 4 weeks. **Granularity:** one query segmented by `device` → ≤ 4 rows.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This is a counts-only segmentation; the alignment skill uses scrape.
- `list_fields` — only to **re-validate `google_ads_device`** if a query fails.

## Gotchas
- **Full coverage (~100% of spend)** — no Undetermined bucket, unlike demographics.
- **Connected-TV / tablet are often negligible** — keep them but don't over-weight near-zero rows.
- **Compute every rate/cost from base counts**; **ratios don't sum across devices**.
- **`google_ads_cost_micros` arrived already in currency** on the validated pull — sanity-check
  before dividing by 1e6.
- **Aggregate flattens trend** — a device flagged here should be cross-checked over time (the `time/`
  case), not concluded from this single segmented pull.
