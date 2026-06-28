# Tools — Structure Map

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in steps 2–3 — not a separate thing. Saved/executable
forms live in [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query="<ACCOUNT_HINT>"` | Discover the account **object** (not just the id). Never invent the id; pass the COMPLETE object downstream. |
| 2 | `tool:porter-reporting:query_data` | `execute` | query A (see below) | **Campaign-grain** — the COMPLETE campaign map, incl. keyword-less campaigns (Demand Gen / PMax). |
| 3 | `tool:porter-reporting:query_data` | `execute` | query B (see below) | **Keyword/ad-group-grain** — ad group + match-type detail (Search). |
| 4 (opt.) | `tool:porter-tools:scrape` / `crawl` | `execute` | a site URL | Business-context research to confirm product lines and map codes. Call `get_tool_schema` first for real params. |

**Two queries are required because of coverage.** They are NOT redundant — see the gotcha below.

## Step 2 — query A `query_data` args (campaign-grain, "the campaign map")
Captures the COMPLETE set of campaigns, including those without keywords (Demand Gen / PMax)
that the keyword query silently drops.

- `google_ads_campaign_name` — the campaign string to decode.
- `google_ads_campaign_advertising_channel_type` — validates the **type** token (SEM→SEARCH).
- `google_ads_campaign_bidding_strategy_type` — validates the **bidding** token (ROAS→MaxConvValue).
- `google_ads_impressions` — **only to return rows** (not a data column).
- Period: `last_month` (or a `{date_from, date_to}` window). `limit` ~1000.

## Step 3 — query B `query_data` args (keyword/ad-group-grain, "the detail")
- `google_ads_campaign_name` — to join back to the campaign.
- `google_ads_ad_group_name` — the ad-group string to decode (sub-segments).
- `google_ads_keyword_info_match_type` — validates the **match-type** token (Broad). Search only.
- `google_ads_impressions` — only to return rows.
- Period: same as query A. `limit` ~5000.

> ✅ Validated: `campaign_advertising_channel_type`, `campaign_bidding_strategy_type` and
> `keyword_info_match_type` come back alongside the names → the decoded token can be checked
> against the real dimension in the same row, which raises confidence.

## The deterministic step (process.py)
Feed the raw `query_data` JSON (`{columns, rows}`, at minimum `campaign_name`; ideally also
`ad_group_name`, `channel_type`, `bidding_type`, `match_type`) to
[`../scripts/process.py`](../scripts/process.py). It does the decode — grammar, segmentation
params, `code_to_lines`, ad-group sub-segments, ambiguous tokens — in ms, deriving vocabularies
from the account itself. The model only triages the `ambiguous_tokens` afterward. See
[`output.md`](output.md) for the emitted shape.

## Business-context research (native Porter MCP tools)
To validate product lines and codes (TL/HD/HA → real products):
- `tool:porter-tools:scrape` — one page of the advertiser's site (home / products page) to
  markdown. Confirms what it sells.
- `tool:porter-tools:crawl` — several pages if needed (async → `check_crawl_status`).
- Always call `get_tool_schema` first (real params). Flag what's found as **"inferred from the
  site"**, not as team truth.

### What research does NOT resolve
Internal agency codes (`AO`, `Embedded` as a strategy) aren't on the public site → flag
**ambiguous, needs the team dictionary**. Don't make it up.

## Tools NOT needed here (keep it minimal)
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **The keyword query omits keyword-less campaigns.** Validated in the stress test: Acme Insurance's
  Demand Gen campaigns did NOT show up in query B. That is exactly why the campaign map comes
  from query A (campaign-grain) and the ad-group/keyword detail from query B. Do not collapse
  the two into one.
- **Infer the grammar, don't assume it** — separators and token positions vary per account.
- **Inconsistent granularity** (a code that covers 2 product words) is a **finding** modeled as
  a family→line hierarchy, NOT an error to force-parse.
- **Validate tokens against real data** where it exists (type/match/bidding) — raises confidence.
- **Exhaustiveness:** thousands of rows → the limit is the chat. Work over **unique names**
  (campaigns / ad groups), which are few, not over every keyword. Paginate by campaign if the
  account is large (see `structure-audit`).
