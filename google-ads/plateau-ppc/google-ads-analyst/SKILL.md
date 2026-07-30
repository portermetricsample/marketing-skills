---
name: plateau-ppc-google-ads-analyst
description: >-
  Analyze ANY Porter-connected Google Ads account the way an expert consultant
  does — pulls the account's own data, detects the business model, picks the
  right KPI (ROAS for e-commerce, CPA/cost-per-lead for lead-gen), and writes a
  "minutes"-style review with period deltas, per-segment reads, findings, and a
  Next Steps list. Use when the user asks to analyze / review / audit a Google
  Ads account, wants a weekly or monthly Google Ads review, asks "how is account
  X doing", "where is it leaking", "what should I change", or "analiza mi cuenta
  de Google Ads". Runs on the Porter Metrics MCP (google-ads). One account at a
  time. Account-agnostic: do not assume a vertical — detect it from the data.
---

# Google Ads Analyst — Plateau PPC method

> **Methodology: [Plateau PPC](https://plateauppc.com/)** — codified into this account-agnostic skill. No real client data lives here.

This skill replicates a validated analyst method (cross-account generalization
verdict: GENERAL; real-data robustness verdict: mostly-robust; KPI selection
100/100 across e-commerce, SaaS and local-service accounts). The LLM does the
judgment; a deterministic script does the arithmetic.

**Division of labor — read this first**
- `analyst-brain.md` (in this folder) = the full analyst method/decision rules. **This is the system prompt for the analysis. Read it and follow it.**
- `verify.py` (in this folder) = computes the canonical metrics + flags from the raw rows so the narrative never miscounts. **Always run it on the snapshot before writing the analysis, and use ITS numbers.**
- Deeper reference / vertical overlays: `../the-analyst-method.md`.

**Hard rules (from the validation):**
- Never fabricate numbers or dimensions. If a needed input isn't in the data (CRM/offline outcomes, demographics, landing-page behavior, Impression Share), **name it as a data gap — do not infer it.**
- **Establish the measurement frame before reading any performance number.** Pull each campaign's bid strategy + target + budget (snapshot query 7) and the conversion-action config + over-time mix (query 8) FIRST. A CPA/ROAS/conversion count is uninterpretable until you know which conversion action it counts, whether that set is stable across the period, and what the target is. This is the #1 cause of useless performance insights — the qualitative checks (Quality Score, search-term↔keyword alignment, extensions) don't need it; the performance checks do.
- **Don't quote target/budget numbers — they're fan-out-corrupted (verified).** Via `query_data` the same tROAS/tCPA/budget field returns different values depending on what else you query (verified on a live account: the same field came back several-fold apart on both the target and the budget — the same multiplier — matching neither true value). Trust only `bidding_strategy_type`; report the strategy + the campaign's actual ROAS/CPA; route the target/budget value to the Google Ads UI (or the connector action). A wildly-implausible printed tROAS (orders of magnitude off the actual) is an artifact, not a setting (often the daily budget echoed). And never report a money quantity ($/day budget) as a ratio (ROAS).
- Detect the business model from the data; do not assume. Real conversion value present → e-commerce (ROAS/AOV). Value absent/near-zero/assigned → lead-gen (CPA/conv-rate). Mixed → choose KPI per slice. (`verify.py` flags `VALUE_NEAR_ZERO` / `ASSIGNED_VALUES_SUSPECTED`.)
- Treat month-to-date / partial periods as incomplete (run-rate + attribution-lag caveat), never head-to-head vs a full month.
- Preserve honest open questions instead of forcing a confident diagnosis; commit only where the data settles it.

## Procedure

### 1. Resolve the account (foreground only)
`fetch(tool_id="tool:porter-accounts:list_accounts", args={"component_name":"google-ads","query":"<name>"})`.
Use the full returned account object. Only query `connection_status="connected"` accounts (querying `available` starts billing). If the user is vague and there are several, ask which one.

> **Run this skill in the MAIN session, not a background subagent** — background agents are denied Porter permission. `query_data` is a mutation → call it via **`execute`**, not `fetch`.

### 2. Pull the standard snapshot
Run these `execute(tool_id="tool:porter-reporting:query_data", args={...})` calls (last 30 days unless asked otherwise). Field combos are validated to co-exist; do not merge incompatible ones (see `the-analyst-method.md` / the `google-ads-query-planning` skill for the combination rules).

1. **Campaign fingerprint** (`last_30_days`): `campaign_name, campaign_advertising_channel_type, clicks, impressions, cost_micros, conversions, conversions_value`
2. **Monthly trend**: same metrics by `year_month, campaign_advertising_channel_type` over the last ~3 months (explicit `date_from`/`date_to`).
3. **Geo**: `geo_target_region, cost_micros, clicks, conversions, conversions_value`
4. **Device**: `device, cost_micros, clicks, conversions, conversions_value`
5. **Search terms** (keyword-surface campaign types only): `search_term, keyword_info_match_type, cost_micros, clicks, conversions, conversions_value` (top by cost)
6. **Impression Share** (Search / Search-slot): `campaign_name, search_impression_share, search_budget_lost_impression_share, search_rank_lost_impression_share, cost_micros` — **pull per campaign** (account-total IS is misleading); returns 0 on Demand Gen/Display/Video → disclose, don't report "0% IS". ⚠️ **Unit gotcha (verified):** Porter returns `search_impression_share` as a 0–1 fraction but the `*_lost_*` fields as 0–100 percentages — they will NOT sum to 100. Normalize to the same unit before comparing, treat the rank-vs-budget split as **directional only**, and keep any IS conclusion in human review. This is the known soft block.
7. **Measurement frame — bid strategy, targets & budget** (pull this BEFORE writing any performance read; ONE settings query, NO `cost_micros` so the cost>0 filter doesn't drop paused campaigns): `campaign_name, campaign_bidding_strategy_type, campaign_target_roas_target_roas, campaign_maximize_conversion_value_target_roas, campaign_target_cpa_target_cpa_micros, campaign_maximize_conversions_target_cpa_micros, campaign_budget_amount_micros`. ⚠️ **These numeric fields are CORRUPTED via query_data — trust ONLY the strategy type (verified on a live account):** the SAME target/budget field returns DIFFERENT values depending on which OTHER fields share the query — a join fan-out that multiplies non-additive setting fields. Reproduced: the SAME target-ROAS field came back several-fold different between two query shapes (identical account/window), and the budget showed the SAME multiplier — matching neither the true target nor the true budget. So a wildly-implausible printed target (e.g. an orders-of-magnitude-too-high tROAS against a ~1× actual) is a fan-out artifact, NOT the campaign's setting. **Rules:** (a) `campaign_bidding_strategy_type` is the ONLY reliable field here (it was stable) — use it (MAXIMIZE_CONVERSION_VALUE / TARGET_CPA / MAXIMIZE_CONVERSIONS / TARGET_IMPRESSION_SHARE); (b) do NOT print a numeric tROAS/tCPA/budget from these fields — no query shape returns the true value (even the isolated 2-field budget query was wrong); (c) report the STRATEGY + the campaign's ACTUAL ROAS/CPA/daily-spend, and route the target/budget VALUE to "verify in the Google Ads UI"; (d) if you need the true number programmatically, pull it via the connector action (`campaign` / `campaign_budget` `.list`), not query_data. (tCPA/budget are nominally micros ÷1e6, but the fan-out makes the scale unusable anyway.)
8. **Conversion frame — which actions are counted, and whether that set is stable** (the difference between a real performance read and a meaningless one):
   - Current config: `campaign_name, conversion_action_name, conversion_action_category, conversion_action_primary_for_goal, conversion_action_status, conversions, all_conversions`. The `conversions` column counts ONLY the actions Google treats as primary-for-goal; everything else shows `conversions = 0` with a nonzero `all_conversions`. Identify the actual counted set before reading ANY CPA/ROAS/conversion figure — if the counted action is shallow (e.g. "App Start", a page view, a quote) the CPA is cost-per-that-event, not cost-per-customer; say so.
   - Stability over time: `year_month, conversion_action_name, conversions` over the trend window. If the action(s) carrying the `conversions` credit CHANGE across the compared months, the account switched what it counts — CPA/ROAS/conversion deltas across that change are **NOT comparable** and must be flagged as the headline, not trended. (Verified: this account's counted conversion migrated from approved-policies/payments to app-starts across a few months.)

> **Reliable targets/budget — use this INSTEAD of query 7's numbers (verified working).** Query 7's target/budget *numbers* are fan-out-corrupted (⚠️ above); pull the TRUE values via the connector action (GAQL → hits Google Ads directly, no Porter join). It is a read but routes through the mutation dispatcher → call via **`execute`**, not `fetch`:
> `execute(tool_id="tool:porter-automations:execute_connector_action", args={"connector":"google-ads","action_id":"campaign.list","source_user_id":<account.source_user_id>,"company_id":<account.company_id>,"params":{"customer_id":"<the 10-digit id BEFORE the dash in account.id>","query":"SELECT campaign.name, campaign.bidding_strategy_type, campaign.maximize_conversion_value.target_roas, campaign.target_roas.target_roas, campaign.target_cpa.target_cpa_micros, campaign.maximize_conversions.target_cpa_micros, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'"}})`
> GAQL truths: `target_roas` is a real ratio (`4.0` = 400% = 4.0×); `*_micros` ÷1e6 = currency (e.g. `1000000000` micros = $1,000/day); GAQL `WHERE` has **no `OR`** (one condition family per call, else filter client-side); `budget.list` (same call shape, `FROM campaign_budget`) returns budget amounts. The strategy is in `biddingStrategyType` and the target nests under the matching strategy (e.g. `maximizeConversionValue.targetRoas`).

Skip what a campaign type can't support (e.g. no search terms / Quality Score on PMax — use asset-group/listing/placement levers instead). Save the results as a snapshot JSON in this shape:
```json
{"account":{...},"period":{"primary":"...","trend":"... NOTE 202606 is month-to-date/partial"},
 "queries":[{"name":"campaign_fingerprint_last30d","columns":[...],"rows":[...]}, ...]}
```

### 3. Verify the arithmetic
`python3 ./verify.py <snapshot.json>` → use its `computed` metrics and `account_totals` verbatim, and respect every `flags` entry (partial period, value-near-zero, assigned-values, negative-keyword candidates, missing Impression Share).

### 4. Write the analysis
Apply `analyst-brain.md` to the verified numbers. Output a minutes-style entry:
period recap with PoP/MoM deltas → per-segment reads (campaign type, geo, device, search terms, visibility) → observations → **Next Steps**. Disclose KPI choice and date window. Flag uncertainties; keep genuine open questions open.

### 5. Hand off the human-only calls
Surface but DO NOT decide: offline/CRM outcomes (true CAC, close rate, lead quality), risk appetite (how hard to bet on a thin sample), and the Impression-Share/visibility narration on PMax-heavy or local Search accounts (the known soft spot). Present evidence + options; the human commits the bet.

### 6. Known limitations (disclose these; never fabricate around them)
- **Primary vs secondary conversions:** `conversion_action_primary_for_goal` is Google's per-action "primary for goal" flag — it can differ from the account's Primary/Secondary **goal** setting in the Google Ads UI (goal-level config + account overrides). Report it as "Google's primary-for-goal flag", not as "the primary conversion", and if it conflicts with what the operator knows, defer to the operator.
- **When a conversion action was switched:** the settings fields are point-in-time (current state only); `change_event` history is capped at ~30 days. You can DETECT a switch from the monthly conversion-credit series (query 8) and date a recent one via change history, but exact timing/intent of older switches is a genuine blind spot — name it, don't guess.
- **Target/budget numbers are UNUSABLE via `query_data` (corrupted, not just imprecise):** verified that the same target-ROAS and budget fields return different values depending on which other fields share the query (a join fan-out — the same field came back several-fold apart on both target and budget, the same multiplier, matching neither true value). Never quote a numeric target/budget from query_data; trust only `bidding_strategy_type`. For the real value use the Google Ads UI or the connector action (`campaign`/`campaign_budget` `.list`). A wildly-implausible printed tROAS is Porter handing back a fan-out artifact, not a real setting — the fix is to suppress the number, not just caveat it.
