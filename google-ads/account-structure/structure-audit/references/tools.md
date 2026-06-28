# Tools — Structure Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing. Saved/executable forms
live in [`../scripts/query.json`](../scripts/query.json) (declarative spec: substitute the
`<placeholders>` and **execute** — do not re-compose the query).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query=<ACCOUNT_HINT>` | Discover the account **object** (not just the id). Use the FULL object as `<ACCOUNT_OBJECT>`; never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see Step 2 (the `structure` query) | Pull the structure rows. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | see Step 3 (the `audience` query) | **Optional** — only if audience claims in the names need to be verified. |

## Step 2 — `query_data` args (this is "the query": the `structure` query, just 1)
Minimal, exact fields. The skill judges structural consistency, so it needs the **defined
structure + the real dimensions** to compare name-vs-reality:

- `google_ads_keyword_info_text` — the keyword text.
- `google_ads_keyword_info_match_type` — the **real** EXACT / PHRASE / BROAD (check 2: vs name).
- `google_ads_campaign_name` — to infer convention + alignment + naming.
- `google_ads_campaign_advertising_channel_type` — the **real** campaign type
  (SEARCH / PMAX / SHOPPING / DEMAND_GEN / ...) → check 2: name vs reality.
- `google_ads_campaign_bidding_strategy_type` — the **real** bidding strategy
  (MAXIMIZE_CONVERSION_VALUE / MAXIMIZE_CONVERSIONS / TARGET_CPA / TARGET_ROAS /
  TARGET_IMPRESSION_SHARE / ...) → check 2: name says "ROAS/tCPA/MaxConv" vs reality.
- `google_ads_ad_group_name` — ad-group level.
- `google_ads_impressions` (or clicks) — **only so the query returns rows; not judged.**

Read order: group by campaign → ad group → keyword. Period: a `{date_from, date_to}` of ~90
days (or `last_month`) — enough volume. High `limit` (5000).

> ✅ Validated (Acme Insurance, Jun 2026): those fields **combine** in one row — including
> `channel_type` and `bidding_strategy_type`. (`..._sub_type` also combines but came back empty.)
> ⚠️ `google_ads_keyword` (from `keyword_view`) does **NOT** combine with campaign/ad_group —
> always use `keyword_info_text`.

## Step 3 — the optional `audience` query (2nd query, only when needed)
The **audience** dimension does **NOT combine** with `keyword_view` nor with
`campaign_name + ad_group_name` in one query (tested: "cannot be combined"). **It's a GOOGLE
limit** (the GAQL resource model — separate resources that don't join), **not Porter's** —
confirmed in the API docs. So if a name claims an audience/age, verify it with a 2nd query over
`ad_group_audience_view` and join by id:

- `google_ads_campaign_name`, `google_ads_ad_group_name`,
  `google_ads_ad_group_audience_view_id`, `google_ads_impressions`. Period `last_month`,
  `limit` ~1000.

Caveats: (a) this detects the **PRESENCE** of an audience per ad group (validated); the audience
**name** needs an extra join by **criterion id**; (b) **age** targeting ("45-54") is a separate
**demographic** resource (age criteria), distinct from "audiences" — to verify age claims you
must go to that resource, not `ad_group_audience_view`. Pending at scale: confirm the exact
combination of the 2nd query in Porter (`ad_group_audience_view_id` + campaign/ad_group +
criterion + metric).

## Processing handoff (where the fields go)
The `structure` result feeds [`../scripts/process.py`](../scripts/process.py), which:
- **Infers the convention** — tokenizes campaign/ad-group names; detects axes (product, match
  type, audience/age, geo, brand, funnel) by suffix patterns.
- **Check 2 (match-type):** regex over the ad-group name (broad/phrase/exact) vs the real match
  type — exact, deterministic comparison.
- **Check 3 (naming):** dominant pattern by token-structure frequency; flag outliers + generic
  ad-group names.
- **Check 4 (redundancy):** group by (keyword, match type); count ad groups/campaigns;
  intentional-vs-accidental decided by the product **CODE** (parentheses), not fixed lists.
- **Check 2 extra (name vs config):** bidding/channel name tokens vs the real values.
- **Check 1 (theme):** emitted as `theme_suspects` for the LLM — the only non-deterministic part.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This audit is structure/text only.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails
  (`on_field_error`: re-discover via `search` / `get_tool_schema` and update the spec — the
  catalog is dynamic).

## Gotchas
- **Pagination (mandatory for 100% coverage):** a single query hits the `limit` (~5000 rows;
  `total_rows == limit` = the cap). A global query covers only the **top by impressions** (enough
  for the big red flags, not the long tail). For 100% coverage, **paginate by campaign**: list
  campaigns and run the structure query per campaign (`filter campaign_name equals X`), then
  merge. Deterministic, no campaign gets cut off.
- **Completeness:** the query brings keywords **with activity** in the period. Paused keywords or
  those without traffic may not appear. For a 100% complete audit, check whether the MCP exposes
  the full list of defined keywords (pending confirmation at scale).
- **Redundancy inflates:** the raw count counts each kw×ad-group pair — report **concentrated by
  campaign/ad group**, not as "N problems".
- **Intentional vs accidental:** ALWAYS distinguish by the naming (audience/geo/age tests are
  not errors — same base name + segment suffix).
- **Don't go out of scope:** no bids / budgets / copy / QS.
- **Exhaustiveness:** thousands of keywords → export to CSV; the limit is the chat, not Porter.
