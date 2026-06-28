# Tools — Spend Allocation Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the campaign-grain spend + efficiency + impression-share rows. `accounts` = the full object from step 1. |
| 2b | `tool:porter-reporting:query_data` | `execute` | same + `google_ads_ad_group_name` | Optional ad-group cut, only to name the exact ad group when a campaign needs a within-campaign shift. |

## Step 2 — `query_data` args (this is "the query")
Minimal, exact fields — only what the 2×2 verdict needs:

- `google_ads_campaign_name` — the entity to name in the recommendation.
- `google_ads_cost_micros` — spend (rank the raise/cut list by dollars; in account currency).
- `google_ads_conversions` — for CPA (`cost / conversions`).
- `google_ads_conversions_value` — to decide ROAS-branch vs CPA-branch (value ≈ 0 → CPA).
- `google_ads_conversion_value_per_cost` — **ROAS**, native, aggregates correctly.
- `google_ads_search_budget_lost_impression_share` — the **budget cap** signal (high = capped, deserves more if efficient). Use the **overall** field, not `_top_` (top-of-page) — see [`ad-rank-and-impression-share.md`](../../../../_framework/ad-rank-and-impression-share.md).
- `google_ads_search_rank_lost_impression_share` — the **rank cap** signal (high here ≠ a budget raise; it's a bid/QS fix). The `_top_` / `_absolute_top_` variants exist too — use only for a "winning premium positions" read, not the budget-vs-rank diagnosis.

Filter: `google_ads_campaign_advertising_channel_type equals SEARCH` (impression share is
Search-only). Period: `last_month` or a `{date_from, date_to}` of 30–90 days (enough volume).
Sort: `cost_micros desc`. Ad-group cut (step 2b): add `google_ads_ad_group_name`.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Budget allocation is numeric; landing CRO uses scrape.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by a complementary skill, not here)
- **Target CPA / target ROAS** + bid-strategy type → the `bid-strategy` skill (is the target aligned with actuals?).
- **Search term / keyword / ad / landing** fields → the relevance + `keyword-ad-landing-*` skills.
- **Conversion-action config / value** → the `conversion-tracking` skill (this skill only flags the value gap as "fix first").

## Gotchas
- **Budget is campaign-level.** "Raise spend" = raise the **campaign** budget; an ad-group "more" =
  bids/targets within the campaign (ad groups share the campaign budget). Never recommend an
  ad-group "budget".
- **`budget_lost_IS` vs `rank_lost_IS`** — only `budget_lost` justifies a budget raise; `rank_lost`
  is a bid/QS fix. Validated: `Acme_Life_SEM_(TL)` loses ~17% to **rank**, only ~6% to budget — a
  budget raise wouldn't help it.
- **ROAS native (`conversion_value_per_cost`) aggregates correctly**; CPA must be computed
  (`cost/conversions`) — the native `cost_per_conversion` is wrong at aggregate.
- **No-value campaigns** (`conversions_value = 0`) → judge on CPA; don't call ROAS 0 "bad ROAS"
  (it's a value-tracking gap, a `conversion-tracking` problem → "fix first").
- **Impression share is Search-only**; the `cost_micros > 0` auto-filter hides 0-spend rows (fine
  here — a 0-spend campaign has no allocation question); cost is in the account currency.
- **Exhaustiveness:** Porter returns all campaign rows without truncating; for a full delivery
  beyond chat, export to CSV.
