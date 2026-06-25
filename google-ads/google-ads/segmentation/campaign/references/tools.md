# Tools — Campaign Segmentation

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing. This skill runs the query
**twice**: once for the report period, once for the comparison period (the method is a
vs-previous-period attribution by campaign).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below — **report period** | Pull campaign-grained base counts for the report period. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | see below — **comparison period** | Same query, comparison period. Needed because the method is a vs-previous-period attribution. |

## Step 2 / 3 — `query_data` args (this is "the query")

**Campaign dimensions** (the segments — one row per campaign per period):
- `google_ads_campaign_name` — the campaign label.
- `google_ads_campaign_id` — **the join key across periods** (names can be renamed; ids don't).
- `google_ads_campaign_advertising_channel_type` — the type fingerprint (Search / PMax / Shopping /
  Demand Gen / Display / Video). Gates what's reportable and drives the type cross-cut.
- `google_ads_campaign_status` — enabled / paused / removed → detects entry / exit.

**Base counts** (everything else is derived — never request a ratio field):
- `google_ads_impressions`
- `google_ads_clicks`
- `google_ads_cost_micros`
- `google_ads_conversions`
- `google_ads_conversions_value`

**Period & granularity:**
- Run **once per period**: the report period **and** its comparison period (e.g. `last_month` vs the
  prior month, or two `{date_from, date_to}` ranges of equal length).
- **Granularity: by campaign** — one row per campaign per period.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used; this skill is counts-only, no landing-page reading.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **Compute every rate/cost from the base counts** — native ratio fields (CTR, CPA, ROAS…) are wrong
  at the aggregate. Request only the 5 base counts; derive all ratios deterministically.
- **Ratios don't sum across campaigns** — to attribute a ratio's move, attribute its
  **numerator/denominator counts** to campaigns, not the ratio itself.
- **Entry/exit needs BOTH periods** — a campaign present in only one period is **structural**, not a
  like-for-like change; separate it. This is why both queries are mandatory.
- **Match campaigns across periods by `campaign_id`**, not by name (names can be renamed).
- **Campaign type gates metrics** — PMax / Shopping lack keyword/search-term data; some metrics are
  **N/A by type**. Don't compare type-incomparable sets as if equal.
- **Exhaustiveness:** Porter returns all campaigns without truncating; the limit is the chat. For a
  full delivery → export, don't list every campaign in chat.
