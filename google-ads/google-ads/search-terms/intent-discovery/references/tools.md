# Tools — Search Intent & Angle Discovery

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the search terms with their demand. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
This skill discovers intent **and sizes demand**, so it **DOES use volume** (unlike the
relevance skill):

- `google_ads_search_term` — the real term (where the intent lives).
- `google_ads_impressions` — **demand** (sizes the opportunity / audience).
- `google_ads_clicks` — **demand** (sizes the opportunity / audience).
- `google_ads_conversions` — clue of unserved intent (high demand + low conversion).
- `google_ads_campaign_name` — **optional**, for the gap check: does the account already serve
  that intent? (read current landing/campaign themes from the campaign names).

**Sort by `impressions` desc** — demand, NOT spend. Here what matters is the audience size, not
the money spent. Period: `last_month` or a `{date_from, date_to}` of 30–90 days (enough demand
volume).

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Intent lives in the term text; the *alignment* skill uses scrape.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields → NOT requested here
- **`cost_micros` / cost** — deliberately NOT requested. The opportunity is **audience size**,
  not spend. Asking for cost would also trigger the `cost > 0` auto-filter (see Gotchas).
- Keyword / match-type fields (`keyword_info_text`, `keyword_info_match_type`) — those belong to
  the **relevance** skill. This skill doesn't need the keyword.

## Gotchas
- **Use impressions/clicks, NOT `cost`, to size:** the opportunity is audience size, not spend.
  The `cost > 0` auto-filter hides 0-spend rows — but since we don't request cost, it doesn't
  apply here. Good: we get to see **all** the demand.
- **It only sees what triggered:** demand that never activated an ad doesn't appear → that's SEO
  keyword research (DataForSEO). This skill only sees what already went through the paid account.
- **PMax / Demand Gen:** terms without a keyword, but they **still work** to discover intent —
  this skill doesn't need the keyword (unlike the relevance one).
- **Exhaustiveness:** thousands of terms → Porter returns them without truncating; the limit is
  the chat, not Porter. For a full delivery → export to CSV, don't list in chat.
