# Tools — Ad Extensions (Assets) Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the plan — not a separate thing. Verified live against
`google-ads` (Acme Insurance, Jun 2026). Asset fields exist but carry the four gotchas below — **query
each asset type separately, account-level, status-filtered, ≤30 days.**

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2a | `tool:porter-reporting:query_data` | `execute` | see below (Sitelinks) | Pull active Sitelink assets. `accounts` = the full object from step 1. |
| 2b | `tool:porter-reporting:query_data` | `execute` | see below (Callouts) | Pull active Callout assets. |
| 2c | `tool:porter-reporting:query_data` | `execute` | see below (Structured Snippets) | Pull active Structured Snippet assets. |
| 2d | `tool:porter-reporting:query_data` | `execute` | see below (Images) | Pull active Image assets. |
| (n) | `tool:porter-reporting:list_fields` | `fetch` | `data_source_name="google-ads", search="structured snippet"` / `"image asset"` | Confirm the exact field name for Structured Snippets / Images at run time (delete once confirmed). |

## Step 2 — `query_data` args (this is "the query") — ONE QUERY PER ASSET TYPE
Minimal, exact fields — one identity/text field + the status field, per type. Example (Sitelinks,
validated):

```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<full account object from step 1>],
  "fields": ["google_ads_asset_sitelink_asset_link_text", "google_ads_asset_primary_status"],
  "date_range": {"preset": "last_30_days"}, "limit": 200
})
```

The exact text/identity field per type:

- **Sitelinks** — `google_ads_asset_sitelink_asset_link_text` ✅ validated.
- **Callouts** — `google_ads_asset_callout_asset_callout_text` ✅ validated.
- **Structured Snippets** — `google_ads_asset_structured_snippet_asset_*` (header/values) — confirm the exact name via `list_fields(search="structured snippet")` at run time, then same shape.
- **Images** — `google_ads_asset_image_asset_*` — confirm via `list_fields(search="image asset")`, then same shape.
- **Status field (every query, filter on it):** `google_ads_asset_primary_status` — keep only **active** rows (drop `REMOVED` / `NOT_ELIGIBLE`), then count → present (>0) or missing (0).

Period: `last_30_days` (or `last_7_days`). **Not** `last_month` — see the 30-day-cap gotcha.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This is a metrics/asset query, not a page read.
- `list_fields` — only to confirm the Structured Snippet / Image field names, or re-validate a name if a query fails.

## Parked fields (used by a complementary skill, not here)
- `campaign_name` — **do not request it** (gotcha 2: it returns blank asset text). Per-campaign
  coverage is a deferred stretch goal, not this skill.
- The **copy/text** of each asset is pulled only to count active assets — the skill judges presence,
  not whether the text reads well (copy quality is out of scope).

## Gotchas (all validated live)
- **One asset type per query.** Asking sitelink + callout in the same query returns the callout
  column **blank** — different asset types don't share a row. Run **one query per type**.
- **Drop `campaign_name`.** Adding it returns blank asset text (the campaign↔asset join doesn't
  resolve in `query_data`). Presence is **account-level**; per-campaign coverage is deferred.
- **Filter `asset_primary_status`.** It returns mostly `REMOVED` for old assets (Acme Insurance's
  sitelinks were mostly `REMOVED` with a few `PENDING` / `NOT_ELIGIBLE`). Count only the **active**
  ones, or you'll "find" extensions that aren't serving.
- **30-day lookback cap.** Asset queries reject ranges older than 30 days (`last_month` errored
  *"start date cannot be older than 30 days"*). Use `last_7_days` / `last_30_days`.
- **Dogfood:** Acme Insurance sitelinks present (Get Started, Contact Us, Smokers, Individuals, Term Life
  Insurance, …) — most `REMOVED`, so the active count is what matters.
