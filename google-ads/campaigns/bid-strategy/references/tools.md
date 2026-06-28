# Tools — Bid Strategy Target vs Actual Alignment

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull one campaign-grain row per campaign: **strategy + the ACTUALS** (cost, conversions, value, ROAS). `accounts` = the full object from step 1. **Do NOT read the target fields here** — fan-out corrupted (⚠️ Step 3). |
| 3 | `tool:porter-automations:execute_connector_action` · `campaign.list` | **`execute`** | GAQL (⚠️ Step 3) | Pull the **true** per-campaign tROAS/tCPA + budget; join to step 2 by `campaign_name`. |

## Step 2 — `query_data` args (the ACTUALS only)
One campaign-grain query for the strategy + the metrics to compute the actual + rank by spend.
**Do NOT pull the target fields here — they are fan-out corrupted via `query_data` (see ⚠️ Step 3).**

- `google_ads_campaign_name` — the exact campaign to name in the recommendation (also the join key to Step 3).
- `google_ads_campaign_bidding_strategy_type` — decides which target to read (this field IS reliable from query_data).
- `google_ads_conversion_value_per_cost` — **actual ROAS** (native, OK at this grain).
- `google_ads_conversions` — denominator for actual CPA + volume/thin-volume check.
- `google_ads_conversions_value` — value context.
- `google_ads_cost_micros` — actual CPA numerator + ranking by spend.

Period: `last_month` (the client asks "past 30 days") or a `{date_from, date_to}` of ~30 days.
Sort: `[{ "field": "google_ads_cost_micros", "direction": "desc" }]` — most-off targets on the
biggest spenders surface first.

## Step 3 — true targets + budget via the connector action (⚠️ NOT query_data)
The `query_data` target/budget fields are **fan-out corrupted** — the same field returns different
values depending on what else is in the query, matching nothing (a "tROAS 36 / 3,600%" vs a ~1.2×
actual is this artifact). Pull the **true** targets from the `campaign.list` connector action (GAQL →
the Google Ads API directly). Full recipe + connector mechanics:
[`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).

`execute(tool:porter-automations:execute_connector_action, {connector:"google-ads",
action_id:"campaign.list", source_user_id, company_id, params:{customer_id:"<10-digit before the dash
in account.id>", query:"SELECT campaign.name, campaign.bidding_strategy_type,
campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas,
campaign.target_cpa.target_cpa_micros, campaign.maximize_conversions.target_cpa_micros,
campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'"}})`

### Field map — read the target that matches the strategy (GAQL nesting)
| Strategy (`biddingStrategyType`) | GAQL target field | Unit |
|---|---|---|
| `TARGET_CPA` | `campaign.target_cpa.target_cpa_micros` | **micros** (÷1e6) |
| `MAXIMIZE_CONVERSIONS` (+ tCPA) | `campaign.maximize_conversions.target_cpa_micros` | micros |
| `TARGET_ROAS` | `campaign.target_roas.target_roas` | ratio (4.0 = 400%) |
| `MAXIMIZE_CONVERSION_VALUE` (+ tROAS) | `campaign.maximize_conversion_value.target_roas` | ratio |

Join Step 3 targets to Step 2 actuals by `campaign_name`. Actual: CPA = `cost_micros / conversions`
(**compute** — native `cost_per_conversion` is wrong at aggregate) · ROAS = `conversion_value_per_cost`
(native, OK).

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no landing-page read; this is a config-vs-metric comparison.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by complementary skills, not here)
- `impression_share`, `search_budget_lost_impression_share` → [`spend-allocation`](../spend-allocation/) (who deserves more budget).
- Ad-group-grain targets → only pull when an **ad-group target override** differs from the campaign and needs to be named; note it, don't make it the default grain.

## Gotchas
- **tCPA in micros** (÷1e6); **tROAS is a ratio** (4.0 = 400%). **Normalize before comparing** — the
  most common false alarm is a unit mismatch.
- **Target lives in a different field per strategy** — pick by `bidding_strategy_type`; `0` / null = no
  target set → skip the campaign (or note "no target").
- **Compute CPA yourself** (`cost_micros / conversions`); the native `cost_per_conversion` is wrong at
  aggregate.
- **Realism / fan-out sanity-check (mandatory):** a target wildly off actual (e.g. a tROAS field of
  `37.2` vs an actual `1.55` — a 24× gap) is **most often the `query_data` fan-out bug** (Step 3), not
  a real target. **Re-pull the target from the `campaign.list` connector action before judging**; only
  if the connector value is ALSO far off do you weigh a portfolio-shared target / internal value scale
  / misconfig. Never recommend a target change off a `query_data` number.
- **Thin volume** (few/no conversions) → the actual is noise; flag it, don't recommend a target change.
- If the config target fields + the value metrics ever return **"cannot be combined"**, split into
  two queries (config grain, metric grain) and **join by `campaign_name`**.
