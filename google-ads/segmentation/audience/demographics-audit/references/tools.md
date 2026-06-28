# Tools — Audience & Demographics Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the plan — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated live against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | Query A (age) — see below | Pull **age** segment performance. `accounts` = the full object from step 1. |
| 3 | `tool:porter-reporting:query_data` | `execute` | Query B (gender) — see below | Pull **gender** segment performance (separate query — age & gender don't share a row). |
| 4 | `tool:porter-reporting:query_data` | `execute` | Query C (audiences) — see below | Pull audience **definitions** + the **attached** audiences & their metrics. |

## Query A — Age performance (this is "the query")
One demographic dimension per query. Minimal, exact fields:

- `google_ads_age` — the age band (`AGE_RANGE_18_24` … `AGE_RANGE_65_UP`, `AGE_RANGE_UNDETERMINED`).
- `google_ads_cost_micros` — spend (account currency; micros).
- `google_ads_clicks` — for context / sanity.
- `google_ads_conversions` — to compute **CPA** = cost / conv.
- `google_ads_conversions_value` — to compute **ROAS** = value / cost (only when value > 0).
- `google_ads_campaign_name` — **required cut.** Add it so the bid recommendation can name the exact
  campaign (`age × campaign`, not account-level — cluster executable-finding rule).

Period: `last_month` (or a `{date_from, date_to}` of 30–90 days for enough volume). Sort by
`cost_micros` desc so the highest-spend segments lead.

```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts": [<full account object>],
  "fields": ["google_ads_age", "google_ads_campaign_name", "google_ads_cost_micros",
             "google_ads_clicks", "google_ads_conversions", "google_ads_conversions_value"],
  "date_range": {"preset": "last_month"},
  "sort": [{"field": "google_ads_cost_micros", "direction": "desc"}]
})
```

## Query B — Gender performance
Same shape as Query A, swap `google_ads_age` → `google_ads_gender` (`MALE` / `FEMALE` /
`UNDETERMINED`). Keep `google_ads_campaign_name`. Different segments → its own query.

## Query C — Audiences (definitions + attached / performance)
Two reads (audiences don't combine with the demographic/keyword views — separate resource):
- **Definitions in the account:** `["google_ads_audience_name", "google_ads_audience_status",
  "google_ads_audience_dimensions"]`.
- **Attached + performance** (the `ad_group_audience_view`): `["google_ads_campaign_name",
  "google_ads_ad_group_name", "google_ads_ad_group_audience_view_id", "google_ads_cost_micros",
  "google_ads_conversions"]`. Join back to ad group / campaign.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no landing page is read; this is metrics-only.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails (and to
  confirm the income/parental gap, below).

## Parked fields (used by a complementary skill, not here)
- Period-over-period deltas per segment, trend by week → the `segmentation/audience/demographics`
  movement skill. This audit reads the period as a snapshot vs the account baseline, not over time.

## Not available — connector gap (log, don't fake)
- **Income range** — `list_fields("income")` / `"income range"` → **0 fields**.
- **Parental status** — `list_fields("parental status")` → **0 fields**.
Report both as "not auditable via Porter today" (feedback-repo gap), emitted in `gaps[]` — never as a
segment finding.

## Gotchas
- **One demographic dimension per query** — age, then gender separately (different segments, no shared row).
- **Audiences are a separate query** (`ad_group_audience_view`) — they don't combine with the
  demographic or keyword views (Google's resource model). Join by campaign / ad group.
- **`cost_micros > 0` auto-filter** hides 0-spend segments; cost is in account currency (micros → divide).
- **Compute CPA / ROAS yourself** from the base counts; the baseline = weighted across that
  dimension's segments (don't trust an aggregate rate field).
- **`UNDETERMINED` is real and often large** — keep it; bid-adjust, don't exclude (framework §4).
- **`conversions`, not `all_conversions`** (matches the UI) — disclose the choice.
- **Exhaustiveness:** Porter returns all rows without truncating; the limit is the chat. Full
  delivery → export to CSV, don't list in chat.
