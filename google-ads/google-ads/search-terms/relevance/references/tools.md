# Tools — Search Term ↔ Keyword Relevance

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the term↔keyword pairs. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
This skill judges relevance, so **2 fields are enough** + 1 splitter:

- `google_ads_search_term` — the actual searched term.
- `google_ads_keyword_info_text` — the keyword that triggered it.
- `google_ads_keyword_info_match_type` — EXACT / PHRASE / BROAD. **Splitter, not a data
  column**: it decides which table the pair goes into.

Run **once per match type** (filter `keyword_info_match_type equals EXACT|PHRASE|BROAD`).
Period: `last_month` or a `{date_from, date_to}` of 30–90 days (enough volume).

> ✅ Validated: `keyword_info_text` combines with `search_term` in the same row → the
> term↔keyword pair comes back in a single query.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Relevance is text-only; the *alignment* skill uses scrape.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields → live in the complementary PERFORMANCE skill
Requested by that skill, NOT here (they do not feed a relevance verdict):
`campaign_name`, `ad_group_name` (move destination) · `cost_micros` (prioritize by spend) ·
`conversions`, `conversions_value`, `cost_per_conversion`, `conversion_value_per_cost`.

## Gotchas
- **`cost_micros > 0` auto-filter:** asking for cost hides 0-spend rows. We don't ask for
  cost here, so it doesn't bite — but it bites the performance skill.
- **A term can be triggered by several keywords/match types** (multiple rows, same
  `search_term`). The unit is the pair, so the term is **not** deduplicated.
- **Brand:** set brand terms aside before classifying.
- **Exhaustiveness:** Porter returns thousands of rows without truncating; the limit is the
  chat. For a full delivery → export to CSV, don't list in chat.
- **PMax / Demand Gen** don't expose `keyword_info_text` → no pair to judge (no-keyword mode,
  see [`framework.md`](framework.md)).
