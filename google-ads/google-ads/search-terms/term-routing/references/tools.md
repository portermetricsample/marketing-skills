# Tools — Term Routing

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing. Its saved, executable
form lives in [`../scripts/query.json`](../scripts/query.json) (declarative spec the agent
substitutes and runs).

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query=<ACCOUNT_HINT>` | Discover the account **object** (not just the id). Never invent the id. Use the FULL object as `<ACCOUNT_OBJECT>`. |
| 2 | `tool:porter-reporting:query_data` | `execute` | see below | Pull the term × keyword × campaign rows. `accounts` = the full object from step 1. |

## Step 2 — `query_data` args (this is "the query")
Routing needs to see the term **across the whole account**, so it asks for 6 fields (more than
relevance) — the extra ones are what lets it de-noise and pick an owner:

- `google_ads_search_term` — **the grouping unit**.
- `google_ads_keyword_info_text` — the keyword that triggered it (owner candidates).
- `google_ads_keyword_info_match_type` — EXACT / PHRASE / BROAD. Used to **pick the owner**
  (exact > phrase > broad). Not a table splitter here (unlike relevance).
- `google_ads_campaign_name` — **required**: count campaigns + classify product line vs
  intentional segmentation by naming. **Without it you can't de-noise** (can't tell intentional
  from accidental overlap).
- `google_ads_ad_group_name` — tie-breaker for the closest owner.
- `google_ads_cost_micros` — prioritize (how much spend sits on the mis-routed term); also the
  sort key.

Period: `last_month` or a `{date_from, date_to}` of 30–90 days. Pull everything (high limit,
e.g. 5000), sort by `cost_micros` desc, and **group at read time** in `process.py`. The query is
saved in `query.json` with `date_range.preset = "last_month"`, `limit: 5000`,
`sort: cost_micros desc`.

## Where the data goes next (deterministic step)
The query result (raw `query_data` JSON `{columns, rows}`, or a CSV export with columns
`search_term, keyword, match_type, campaign, ad_group, cost`) is fed to
[`../scripts/process.py`](../scripts/process.py), which groups by term, discards intentional
variants, picks the owner, and emits the negatives. Optionally pass an **account profile**
(`../../../../_framework/account-profile.md`) as a 2nd arg to canonicalize product words → lines;
without it the script runs in generic mode (campaign 2nd-token = line). See
[`output.md`](output.md) for what it emits.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. Routing is text + structure only.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Gotchas
- **It is not inflated CPC:** one auction, one keyword chosen. The damage is **routing**, not
  cost — so don't frame the output as "you're bidding against yourself".
- **`campaign_name` is mandatory:** without it you can't separate intentional segmentation
  (age/audience/geo test campaigns) from accidental mis-routing.
- **`cost_micros > 0` auto-filter:** asking for cost hides 0-spend rows. Harmless here — the
  actionable overlap (the one worth routing) always has spend.
- **A term can be triggered by several keywords/campaigns** (multiple rows, same
  `search_term`). That multiplicity is exactly the signal — the term is grouped, never deduped
  away.
- **Exhaustiveness:** Porter returns thousands of rows without truncating; the limit is the
  chat. For a full delivery → export to CSV and pass to `process.py`, don't list in chat.
- **Reference volumes (illustrative):** e.g. ~1,400 terms, ~190 in 2+ campaigns; but the big repeated
  ones are usually age-segment tests of the same core term (intentional, discarded). The actionable
  subset is small: cross-product (e.g. a Dental campaign serving a health query) and broad-steals-exact.
