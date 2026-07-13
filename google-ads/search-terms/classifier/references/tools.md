# Tools — Search Term Labeling

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing. Its saved, executable form
lives in [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query=<ACCOUNT_HINT>` | Discover the account **object** (not just the id). Use the FULL object as `<ACCOUNT_OBJECT>`. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the term × keyword × campaign rows + metrics, in **one** superset query. |

## Step 2 — `query_data` args (this is "the query")
Labeling needs the **union** of the fields the four axes use, so it pulls them **once** (it does NOT
run four separate queries — that would be the orchestrator's job and four times the cost):

- `google_ads_search_term` — **the grouping unit** (the card is keyed on this).
- `google_ads_keyword_info_text` — the keyword that triggered the term (owner candidates + the
  relevance pairs).
- `google_ads_keyword_info_match_type` — EXACT / PHRASE / BROAD (owner selection + relevance).
- `google_ads_campaign_name` — **required**: cannibalization de-noising (intentional vs accidental)
  and product-line detection.
- `google_ads_ad_group_name` — owner tie-breaker + where a negative would land.
- `google_ads_cost_micros` — sizing / sort key (context, **not** a performance verdict).
- `google_ads_impressions` — demand sizing for the intent axis (informational/comparison demand).
- `google_ads_clicks` — context.
- `google_ads_conversions` — the **clue** for `hand_to_content` (high demand + 0 conversions on an
  informational/cost intent). NOT a keep/cut verdict — that's the `performance` skill.

Period: `last_month` or a `{date_from, date_to}` of 30–90 days. Pull everything (high limit, e.g.
5000), sort by `cost_micros` desc, and **group at read time** in `process.py`.

## Required business context (per-account input — never hardcoded)
Provide a small `context.json` (see [`../scripts/example.context.json`](../scripts/example.context.json)):

- `brand_terms` — the advertiser's own brand/product names → drives `brand_class: brand` (exact
  match **plus** a deterministic misspelling match for distinctive tokens — e.g. `acmelfe`/`acmelyfe`
  for "acmelife"). Include the well-spelled brand; the engine catches the typos.
- `competitor_terms` — known rival names → drives `brand_class: competitor` (conquest signal).
  **Exact-only** — common-word competitor names (e.g. "Canada Life") would false-positive on fuzzy.
- `geo_terms` — the regions served (provinces/cities) → helps the `geo` intent tag.
- `brand_campaign_markers` *(optional)* — substrings that identify the **brand campaign** for the
  containment check (default `["brand","(br)","_br_","-br-",…]`). A brand term served by any campaign
  that does NOT match a marker is a leak → `contain_brand`.

Derive these from account signals first (brand campaign names, the company name); confirm the
doubtful; ask only what can't be inferred. Optionally pass an **account profile**
(`../../../../_framework/account-profile.md`) as a 3rd arg — it is forwarded to `duplicates` for
precise product-line detection.

## Where the data goes next (deterministic step)
The raw `query_data` JSON `{columns, rows}` + the `context.json` are fed to
[`../scripts/process.py`](../scripts/process.py), which:
- **reuses** [`../duplicates/scripts/process.py`](../duplicates/scripts/process.py) as a
  **subprocess** (the cannibalization engine — single source of truth, not copied),
- tags brand class + intent deterministically,
- and emits the per-term cards with the `(term × keyword)` relevance pairs left **null** for the LLM.

See [`framework.md`](framework.md) for the LLM half and [`output.md`](output.md) for the shape.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — landing-page reading is the `keyword-ad-landing` cluster's job, not this one.
- Four separate per-axis queries — **no**; one superset query feeds every axis.

## Gotchas
- **One query, all axes.** Asking the union of fields once is cheaper and keeps the term grain
  consistent across tags. Do not split it.
- **`cost_micros > 0` auto-filter:** asking for cost hides 0-spend rows. Acceptable for triage of
  what spent/served; pure 0-cost high-impression discovery is `intent-discovery`'s job (it sorts by
  impressions).
- **`campaign_name` is mandatory** for the cannibalization axis (intentional vs accidental overlap).
- **Cannibalization engine availability:** `process.py` reports `cannibalization_engine: "ok"` when
  the `duplicates` subprocess succeeded, `"unavailable"` if it could not run (then `cannibalized`
  is unknown, not false — say so in the synthesis rather than claiming no cannibalization).
- **Exhaustiveness:** Porter returns thousands of rows without truncating; the limit is the chat.
  For a full delivery → persist to file and pass to `process.py`, don't list in chat.
