# Data: Search Term Performance

> 🔌 **How these queries are invoked on the MCP** (portal, tool-ids, fetch/execute): see [`porter-mcp-calls.md`](../../../_framework/porter-mcp-calls.md).

Verified against the Porter MCP `google-ads` connector (`search_term_view`).

> `query_data` via `execute`; `accounts` = the full object from `list_accounts`. Discover the
> account with `list_accounts(component_name="google-ads")`; never invent the id.

## Fields (this skill = performance)
The money + the destination. Exact names, `search_term_view`:
- `google_ads_search_term` — the grouping unit (aggregate metrics across its keywords).
- `google_ads_keyword_info_match_type` — EXACT / PHRASE / BROAD (informs the destination: a
  broad-served winner is the promote-to-exact candidate).
- `google_ads_cost_micros` — spend (÷ 1e6); the ranking key.
- `google_ads_clicks` — for the thin-data floor and the conv-rate denominator.
- `google_ads_conversions` — the winner/waste signal.
- `google_ads_conversions_value` — ecommerce only (ROAS); ~0 across the account → lead-gen.
- `google_ads_campaign_name` — where to add the negative / where the spend sits.

## Query
`search_term + keyword_info_match_type + cost_micros + clicks + conversions +
conversions_value + campaign_name`. Pull everything (high limit), group by `search_term` at
read time, rank by spend. Period `last_month` or 30-90 days for conversion volume.

## Compute client-side (do NOT trust native ratio fields)
Per term, from the base counts: `cost = cost_micros / 1e6`, `CPA = cost / conversions`
(∞ when conversions = 0), `conv_rate = conversions / clicks`, `ROAS = conversions_value /
cost` (value > 0). The base counts aggregate correctly across a term's keywords; the native
`cost_per_conversion` / `conversion_value_per_cost` are wrong at aggregate (same failure as
funnel-metrics). Benchmark = the account's own median CPA (or tCPA when known).

## Gotchas
- **`cost_micros > 0` is automatic:** requesting cost hides zero-spend rows. "No row" ≠ "no
  waste" — it means no spend, nothing to judge. (Here that is fine: we judge the money.)
- **Thin-data floor:** a low-click term is **unproven**, not waste — classify as Watch until it
  has had enough clicks (≈ one expected conversion at the account CPA) to call.
- **One term, several keywords/match types:** a term arrives as multiple rows; **aggregate the
  base counts** before computing CPA/conv-rate, then keep match type only for the destination.
- **Business-model branch:** `conversions_value` ~0 across the account → lead-gen (CPA only,
  hide ROAS); value > 0 → ecommerce (show ROAS).
- **Exhaustiveness:** thousands of rows → export to CSV; the limit is the chat, not Porter.
- **PMax / Demand Gen:** no `keyword_info_match_type` to promote to → destination is
  account-level negatives, not promote-to-exact.
