# Tools — Wasted Spend

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested below — not raw GAQL. Every metric/dimension pull here goes
through `tool:porter-reporting:query_data` via the **`execute`** meta-tool (it is flagged
not_read_only), always preceded by `tool:porter-accounts:list_accounts` to get the account **object**.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Field names verified against the `google-ads` connector via `list_fields`.

## ⚠️ The conversion-lag caveat (read before you call anything "wasted")

`google_ads_conversions` is attributed back to the **click date**, and conversions can take days to
weeks to land (form fills, phone calls, offline imports). A search term or keyword that spent in the
**last ~7–14 days** and shows 0 conversions may simply be **waiting** — cutting it now can kill a
converter that hadn't reported yet. Two defences, both applied in the framework:
1. Pull the window, but treat any leak whose spend sits inside the account's conversion-lag window as
   **provisional** (flag, don't count firm) — see `confidence` in [`output.md`](output.md).
2. Prefer a window that **ends a lag-length ago** for the firm number (e.g. judge "last 30 days
   ending 7 days ago"), and report the trailing days separately. State the window and lag in `_meta`.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | search-term fields (below) | Finest grain — search terms (Search/Shopping). `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | keyword fields (below) | Canonical grain for Search/Shopping spend (each dollar counts once here). |
| 4 | `tool:porter-reporting:query_data` | `execute` | ad-group fields (below) | Structural lens + parent naming. NOT added to the total. |
| 5 | `tool:porter-reporting:query_data` | `execute` | campaign fields (below) | Canonical grain for non-keyword channels; also yields the account baseline. |

Every pull carries the same three money fields — `google_ads_cost_micros`,
`google_ads_conversions`, `google_ads_conversions_value` — at a different grain.

## Step 2 — search-term `query_data` args (finest grain)

- `google_ads_search_term` — the grouping unit (the query that actually served).
- `google_ads_keyword_info_text` — the keyword that **triggered** the term (so a wasted term can be
  handed to `negative-keywords` with its parent keyword).
- `google_ads_keyword_info_match_type` — EXACT / PHRASE / BROAD of the triggering keyword.
- `google_ads_campaign_name` · `google_ads_ad_group_name` — where the spend sits / where to act.
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value` — the money.

A term with real cost and ~0 conversions is a leak; the whole cost is wasted. **PMax search terms are
NOT here** — the `search_term` field covers Search + Shopping; PMax waste is only judgeable at
campaign grain (step 5). Don't imply term-level PMax waste you can't measure.

## Step 3 — keyword `query_data` args (canonical Search/Shopping grain)

- `google_ads_keyword_info_text` · `google_ads_keyword_info_match_type` — the keyword + its match type.
- `google_ads_campaign_name` · `google_ads_ad_group_name` — parent naming.
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value`.

This is the grain that **counts once** for Search/Shopping spend (each keyword's dollars belong to
exactly one keyword). The account total sums wasted dollars here + step 5 for non-keyword channels.

## Step 4 — ad-group `query_data` args (diagnostic lens)

- `google_ads_campaign_name` · `google_ads_ad_group_name`
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value`.

Used to surface an ad group that is **wasteful as a whole** (broad structural leak) and to name the
parent of a keyword/term leak. **Not added to the total** — its dollars are already counted at the
keyword grain.

## Step 5 — campaign `query_data` args (non-keyword channels + account baseline)

- `google_ads_campaign_name`
- `google_ads_campaign_advertising_channel_type` — decides the grain (see below).
- `google_ads_cost_micros` · `google_ads_conversions` · `google_ads_conversions_value`.

`google_ads_campaign_advertising_channel_type` decides the grain: `SEARCH` / `SHOPPING` waste is
counted at the keyword grain (step 3); `PERFORMANCE_MAX` / `DISPLAY` / `VIDEO` / `DEMAND_GEN` waste is
counted here (no keyword breakdown exists). **Summing all rows of this query = the account baseline**
(`account_cost`, `account_conversions` → `account_cpa`) — no separate account query needed.

Common to every step: `date_range` = the reporting window (`{preset}` or `{date_from, date_to}`);
`filters` = `[[{field:"google_ads_cost_micros", operator:"greater_than", value:0}]]` if you want to
drop zero-spend rows (requesting cost usually auto-hides them); `sort` = `google_ads_cost_micros`
desc. Do NOT add `google_ads_date` — you want period totals per entity, not a daily grid (the lag
caveat is handled by choosing the window; pull daily only to locate *when* the spend happened for the
provisional flag). Value branch: `google_ads_conversion_value_per_cost` is the native ROAS (it
aggregates correctly) if you prefer it over computing `conversions_value / cost`.

## Fields read (chips)

`google_ads_search_term` · `google_ads_keyword_info_text` · `google_ads_keyword_info_match_type` ·
`google_ads_campaign_name` · `google_ads_ad_group_name` ·
`google_ads_campaign_advertising_channel_type` · `google_ads_cost_micros` ·
`google_ads_conversions` · `google_ads_conversions_value` · `google_ads_conversion_value_per_cost`.

## Data pulls (4)

1. Search terms (finest grain, Search/Shopping) — pinpoint lens.
2. Keywords — canonical grain for Search/Shopping spend.
3. Ad groups — structural lens + parent naming.
4. Campaigns — canonical grain for non-keyword channels; also yields the account baseline.

## Gotchas

- **`google_ads_cost_micros` comes back already in account currency** — Porter pre-converts
  micros→dollars (verified live: a $166 spend returns `166.01`, not `166007841`). **Do NOT divide by
  1e6.** Same for `google_ads_conversions_value`.
- **`google_ads_conversions` is a float** (e.g. 2.5 with fractional attribution). "~0 conversions"
  means `< ~0.5`, not strictly `== 0` — a keyword with 0.3 attributed conversions and $900 spend is
  still a leak. Set the near-zero threshold in the framework, don't hard-code `== 0`.
- **Compute CPA client-side** (`cost / conversions`); the native `cost_per_conversion` is wrong at
  aggregate. ROAS via `google_ads_conversion_value_per_cost` is native and aggregates correctly.
- **`conversions_value` is 0 on lead-gen accounts** that don't track value — judge those on CPA, not
  ROAS. Only switch to the ROAS branch when the account tracks value (see framework).
- **`accounts` = the complete object** from `list_accounts`, not the id string; large results persist
  to a file (the limit is the chat) → export to CSV for tens of thousands of search terms.

## Tools NOT needed here (keep it minimal)

- **Budget / target settings** (`budget.list` / `campaign.list` via `execute_connector_action`) — this
  skill judges *return on spend*, not pacing or targets. No `execute_connector_action` call here; every
  field it needs is a metric/dimension in `query_data`.
- No impression-share / budget-lost fields — that's `budget-pacing` / `spend-allocation`.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.
- No `process.py` — the leak test + count-once roll-up is small arithmetic the framework does inline.
