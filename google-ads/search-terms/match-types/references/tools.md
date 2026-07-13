# Tools — Match Types: Efficiency & Concentration

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | **`execute`** | see Step 2 | Pull keyword-grain rows on the keyword view, to group cost/clicks/conversions by match type. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | **`execute`** | see Step 3 | The **blend probe**: list the conversion actions to learn whether per-type `conversions` blends >1 primary action. |

## Step 2 — `query_data` args (this is "the query")
One keyword-grain query on the **keyword view**. Ask only for the match type + the base counts;
you compute every ratio yourself (the native ratio fields are wrong at aggregate):

- `google_ads_keyword_info_match_type` — the dimension: `BROAD` · `PHRASE` · `EXACT`. (Note: **"AI
  Max" is NOT a match type in this view** — only these three values appear.)
- `google_ads_cost_micros` — spend per keyword (÷1e6 to dollars); the basis for share + cost/conv + sort.
- `google_ads_clicks` — volume context.
- `google_ads_conversions` — conversions per keyword (numerator-free count to compute cost/conv).

Period: `last_30_days` (the client asks "past 30 days") or a `{date_from, date_to}` of ~30–90 days.
Sort: `[{ "field": "google_ads_cost_micros", "direction": "desc" }]` — the biggest-spend keywords
surface first; the per-type roll-up is computed from the full set.

> **Branded terms:** keep the keyword text (`google_ads_keyword_info_text` if you need to label
> brand) so you can exclude branded keywords before judging
> ([`../../../../_framework/brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)).

## Step 3 — the blend probe (conversion-action inventory)
A **second, separate** query (the conversion-action view does **not** combine with the keyword view —
see Gotchas). Its only job: count how many **primary** actions feed `conversions`.

- `google_ads_conversion_action_name` — the action label.
- `google_ads_conversion_action_primary_for_goal` — `true` = it feeds the bidding `conversions` total.
- `google_ads_conversions` — volume per action (to see the mix).

If **>1** action is `primary_for_goal = true`, then per-type `conversions` from Step 2 is a **blend**
→ set `directional: true` on every match type and never assert "most/least efficient" (see framework).

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no landing-page read; this is a config-vs-metric comparison.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by complementary skills, not here)
- `google_ads_search_term_*` + match type as a breakdown → [`search-terms/performance`](../../../search-terms/performance/) (which *terms* sit behind a flagged type).
- Per-keyword relevance signals → [`search-terms/relevance`](../../../search-terms/relevance/).

## Gotchas
- **Compute every ratio** from base counts: cost/conv = `cost_micros/1e6 ÷ conversions`,
  spend-share = a type's cost ÷ total cost. Native ratio fields are wrong at aggregate.
- **The blend guardrail (verified 2026-06-23):** Porter **cannot split a single qualified action**
  (MQL/Opp) by match type — the conversion-action view won't combine with `keyword_view`, **not even
  via the per-action custom field**. So if >1 primary action exists, per-type `conversions` is a
  blend that can **invert** the true ranking (live: Broad best on all-conv $373/conv but worst on
  Cost/MQL $1,515). → report efficiency as **directional only**.
- **"AI Max" is not a match type** in the keyword view — expect exactly `BROAD` / `PHRASE` / `EXACT`.
- **Untested type = $0 spend**, not "missing from the result" — a type can be absent simply because
  no keyword uses it; treat absent / zero-cost the same: untested.
- **Exclude branded terms first** — branded keywords are usually Exact and inflate that type's
  apparent efficiency + share.
