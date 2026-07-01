# Tools — Naming Convention

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in steps 2–3 — not a separate thing. Saved/executable
forms live in [`../scripts/query.json`](../scripts/query.json) (declarative spec: substitute the
`<placeholders>` and **execute** — do not re-compose the query).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query="<ACCOUNT_HINT>"` | Discover the account **object** (not just the id). Never invent the id; pass the COMPLETE object downstream. |
| 2 | `tool:porter-reporting:query_data` | `execute` | query A (see below) | **Campaign-grain** — the COMPLETE campaign name set, incl. keyword-less campaigns (Demand Gen / PMax). |
| 3 | `tool:porter-reporting:query_data` | `execute` | query B (see below) | **Ad-group-grain** — ad-group names + real match type (Search). |

These are the **same two queries `structure-map` uses** — this skill reads the same raw material
(the account's own names) but *prescribes* a standard instead of *describing* what exists.

**Preferred input, if available: the `account_profile`** produced by `structure-map`
([`../../../../_framework/account-profile.md`](../../../../_framework/account-profile.md)). When
it exists, load it and start from its decoded grammar / lexicons instead of re-inferring from
zero — the two queries then only confirm the current names and catch anything added since.

## Step 2 — query A `query_data` args (campaign-grain)
The COMPLETE set of campaign names, including those without keywords (Demand Gen / PMax) that the
ad-group query silently drops.

- `google_ads_campaign_name` — the campaign string to learn the scheme from.
- `google_ads_campaign_advertising_channel_type` — the **real** type, to validate a `Type` token.
- `google_ads_campaign_bidding_strategy_type` — the **real** bidding, to validate a `Bidding` token.
- `google_ads_impressions` — **only to return rows** (not a data column).
- Period: `last_month` (or a `{date_from, date_to}` window). `limit` ~1000.

## Step 3 — query B `query_data` args (ad-group-grain)
- `google_ads_campaign_name` — to join the ad group back to its campaign (coherence rules need
  the parent).
- `google_ads_ad_group_name` — the ad-group string to learn the ad-group scheme from.
- `google_ads_keyword_info_match_type` — the **real** match type, to validate a `Match` token. Search only.
- `google_ads_impressions` — only to return rows.
- Period: same as query A. `limit` ~5000.

> ✅ Validated (Acme Insurance, Jun 2026): `campaign_advertising_channel_type`,
> `campaign_bidding_strategy_type` and `keyword_info_match_type` come back alongside the names →
> a token in the proposed convention can be checked against the real dimension in the same row,
> which raises the confidence of its controlled vocabulary.
> ⚠️ `google_ads_keyword` (from `keyword_view`) does **NOT** combine with campaign/ad_group —
> if you need keyword text, use `keyword_info_text`.

## Why there is NO `process.py` here (the deliberate difference from its siblings)
`structure-map` and `structure-audit` tokenize the names with a deterministic `process.py`
(split by separators, count schemes, regex the match token). **This skill does not.** Generating
the *target* convention is a **judgment task, not a counting task**, and — per the design rule
for this skill — the pattern must be inferred by the **LLM on every run**, because every account
names things differently and a fixed regex would bake in a format assumption that isn't there.
This extends `structure-map`'s own principle ("infer the grammar, NOT a fixed grammar") one step:
here even the synthesis of the standard is the model's, not code's.

So the split is:
- **Deterministic:** only the data pull (the two queries above). The account object and the raw
  name lists come back the same way every time.
- **LLM (fresh each run):** inferring the dominant scheme, synthesizing the grammar for both
  levels, canonicalizing the controlled vocabulary, and writing the coherence rules. See
  [`framework.md`](framework.md).

## Business-context research (optional, native Porter MCP tools)
To canonicalize product words or resolve a code (`(TL)` → Term Life):
- `tool:porter-tools:scrape` — one page of the advertiser's site (home / products) to confirm
  the real product lines the `Product` vocabulary should use.
- Always call `get_tool_schema` first (real params). Flag findings as **"inferred from the
  site"**, not team truth. Internal agency codes the site can't resolve → **needs team dictionary**.

## Tools NOT needed here (keep it minimal)
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails
  (`on_field_error`: re-discover via `search` / `get_tool_schema` and update the spec — the
  catalog is dynamic).

## Gotchas
- **The ad-group query omits keyword-less campaigns** (Demand Gen / PMax). That is exactly why
  the campaign name set comes from query A and the ad-group detail from query B. Do not collapse
  the two into one.
- **Work over UNIQUE names.** Campaigns and ad groups are few (tens / low hundreds); do not
  reason over every keyword row. Deduplicate the names before inferring the scheme.
- **Infer the grammar, don't assume it** — separators and slot positions vary per account; the
  LLM reads them off the real names each run.
- **Validate tokens against real data** where it exists (type / match / bidding) — it raises the
  confidence of the controlled vocabulary you propose for that slot.
