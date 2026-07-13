# Tools — Per-Conversion-Action CPA

The ordered plan of MCP tool calls this skill makes. The "query" is the **arguments of `query_data`**;
this skill runs **two data queries** (plus a goals lookup) and joins them by `campaign_name`.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2a | `tool:porter-reporting:query_data` | `execute` | counts query (below) | Conversion counts **split by campaign × action**. `accounts` = full object from step 1. |
| 2b | `tool:porter-reporting:query_data` | `execute` | spend query (below) | Campaign **spend** + total conversions, to divide by. |
| 2c | `tool:porter-reporting:query_data` | `execute` | goals query (below) | Which campaigns optimize to a single action (→ a *true* CPA, not just fully-loaded). |

> ⚠️ `query_data` runs through **`execute`** (not_read_only), not `fetch`. `accounts` = the COMPLETE object.

## Query 2a — counts by campaign × action  (verified: these fields DO combine)
- `google_ads_campaign_name` — the join key.
- `google_ads_conversion_action_name` — the action (phone call / form / booking …).
- `google_ads_conversions` — the count **in the "Conversions" column** (what bidding counts).
- `google_ads_all_conversions` — the count **including secondary** (reveals driven-but-not-counted actions).

Sort by `google_ads_conversions` desc. **Verified:** `conversion_action_name` combines with
`campaign_name` (distinct per-campaign-per-action rows that sum to each campaign's total), but **not**
with `keyword_info_text` / match-type / age — so per-action CPA is reachable **per campaign**, never per
keyword or demographic.

## Query 2b — campaign spend
- `google_ads_campaign_name` — the join key.
- `google_ads_cost_micros` — spend (÷1e6).
- `google_ads_conversions` — the campaign's blended total (for the global CPA + a cross-check that the
  per-action counts in 2a sum to it).

## Query 2c — single-goal detection
- `google_ads_campaign_name` + `google_ads_campaign_selective_optimization_conversion_actions` — blank
  = uses account-default goals (mixed → fully-loaded only); one action listed = single-goal (→ true CPA).

## The join (do this in code, not a 4th query)
Cost (2b) is **campaign-level** and cannot be broken down by conversion action — **never** put
`cost_micros` in the same query as `conversion_action_name` (cost would duplicate across action rows).
Join 2a → 2b by `campaign_name`: `fully_loaded_cpa(action, campaign) = campaign_cost ÷ action_count`.
Account-level: `Σ campaign_cost ÷ Σ that action's count`.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **Cost never splits by conversion action.** A click can drive several actions, so the whole campaign
  cost attributes to each — that's why per-action CPA is **fully-loaded** and **not additive** (framework §4).
- **`conversions` vs `all_conversions`.** An action with `all_conversions > 0` and `conversions = 0` is
  tracked but **not** in the "Conversions" column (effectively secondary) — use `all_conversions` to
  quote its cost, and flag that bidding ignores it.
- **Thin volume.** Don't quote a CPA off 1–2 conversions — annotate as unproven.
- **Counts sum-check.** The per-action `conversions` in 2a should sum to the campaign's total in 2b; a
  blank/aggregate action row can appear (ignore it). If they still don't reconcile, note it.
