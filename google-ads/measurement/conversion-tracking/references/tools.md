# Tools — Offline Conversion Tracking Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`** — and here there are **two** of them (config + metrics), because the
two field sets do not combine in a single query.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated live against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | Query A (config) — see below | Pull the conversion-action config. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | Query B (metrics) — see below | Pull value + volume per action. Join to A by `conversion_action_name`. |

## Query A — conversion-action config (this is "the query", part 1)
Minimal, exact fields — the config the rules read:

- `google_ads_conversion_action_name` — the join key.
- `google_ads_conversion_action_category` — feeds the depth ladder (PAGE_VIEW / SUBMIT_LEAD_FORM / PURCHASE / DEFAULT…).
- `google_ads_conversion_action_type` — `WEBPAGE` / `AD_CALL` / `UNIVERSAL_ANALYTICS_GOAL` / `UPLOAD_CLICKS` / `UPLOAD_CONVERSIONS` / `STORE_*` → feeds R1 (offline) + R4 (deprecated).
- `google_ads_conversion_action_conversion_source` — `Website (Webpage)` / `Call From Ads` / `Upload` / a CRM → feeds R1.
- `google_ads_conversion_action_primary_for_goal` — `True` / `False` → which actions are counted (R2, R3).
- `google_ads_conversion_action_status` — `ENABLED` / `REMOVED` / `HIDDEN` → filter to ENABLED; count the rest for hygiene.

Period: `last_30_days`.

## Query B — value + volume per action (this is "the query", part 2)
- `google_ads_conversion_action_name` — the join key.
- `google_ads_conversion_action_category` — to re-check depth alongside the firing data.
- `google_ads_conversions` — **primary (counted)** volume. `conversions > 0` ⇒ the action is primary.
- `google_ads_all_conversions` — total volume incl. secondary. `conversions == 0` but `all_conversions > 0`
  ⇒ the action fires but is **secondary** (not "absent" — framework §3.5). REQUIRED, not optional.
- `google_ads_conversions_value` — the value per action (R3: value == 0 on a primary = flag).

Sort: `google_ads_all_conversions` desc (catches firing-but-secondary actions the `conversions` sort hides).
Period: `last_30_days` for the snapshot **plus a wider/earlier settled window** (e.g. last 90d) to rule
out reporting lag before flagging any action as "0 / not tracked" — offline/PURCHASE actions import late.

## Join + filter
Join A ↔ B on `conversion_action_name`. **Audit the ENABLED actions only**; count REMOVED/HIDDEN for
hygiene. You join because `primary_for_goal` lives in A and value/volume live in B — both are needed
together to judge a single action.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used; this is config audit, no landing page is read.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (not requested here)
- `cost_micros` and any cost metric — not needed; this judges setup, not spend. (And asking for cost
  triggers the `cost_micros > 0` auto-filter that would hide zero-spend actions.)
- Campaign / ad-group dimensions — this is account-level config, not per-campaign.

## Gotchas (validated)
- **Config ↔ metrics don't combine** — a merged query returns *"the selected fields cannot be
  combined"*. Two queries, join by `conversion_action_name`.
- **`primary_for_goal` is in Query A**, value/volume in Query B → that's why you join (you need "is
  it primary" from A and "value/volume" from B together for one action).
- **`DEFAULT` category is ambiguous** — Google "uncategorized". Acme Insurance's Payment-Received actions
  are `DEFAULT` yet clearly down-funnel (L3). When category is `DEFAULT`, infer depth from the
  action **name** ("payment"/"purchase"/"sale" → L3; "page view"/"start" → L1/L2) and mark it inferred.
- **Most actions are `REMOVED`** — filter to ENABLED, or you'll audit dead actions.
- **`conversions` = primary** (Google UI semantics); cost is not needed here. `last_30_days` is enough.
