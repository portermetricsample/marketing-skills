# Tools — UTM Tagging Hygiene

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2a | `tool:porter-reporting:query_data` | `execute` | UTM query (below) | Pull one campaign-grain row per campaign: the parsed UTM params + spend. `accounts` = the full object from step 1. |
| 2b | `tool:porter-reporting:query_data` | `execute` | URL query (below) | Pull the raw final URL(s) per campaign + spend, as scheme evidence. **Separate query** — final URLs cannot be combined with the `utm_*` fields. |

> ⚠️ `query_data` runs through the **`execute`** meta-tool (it mutates a query session), not `fetch`.
> See [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).

## Step 2 — `query_data` args (TWO queries, joined by `campaign_name`)
The parsed `utm_*` fields **cannot be combined with `google_ads_ad_group_ad_ad_final_urls`** in one
query (verified — it errors "fields cannot be combined"). So run two campaign-grain queries and join
them by `campaign_name`.

**Query 2a — the tagging read** (`utm_*` + campaign + spend):
- `google_ads_campaign_name` — the join key + the entity to name.
- `google_ads_utm_source` — is a source set? part of the consistency check.
- `google_ads_utm_medium` — is a medium set? part of the consistency check.
- `google_ads_utm_campaign` — the campaign tag; the main consistency axis (one scheme vs ad-hoc).
- `google_ads_utm_term` — the keyword tag; should be a **dynamic** value (`{keyword}`), not static.
- `google_ads_utm_content` — the creative tag; part of the scheme.
- `google_ads_cost_micros` — spend, to rank campaigns by dollars (÷1e6 for display).

**Query 2b — the URL evidence** (raw final URLs, separate query):
- `google_ads_campaign_name` — the join key.
- `google_ads_ad_group_ad_ad_final_urls` — the raw final URL(s); confirms a bare URL (no `utm_*`) and
  shows the actual scheme the parsed params came from.
- `google_ads_cost_micros` — spend (optional, to rank the evidence).

> These `utm_*` fields are **parsed straight from the final URL** by the google-ads connector — they
> are not a Google Ads native column. A blank value means the param is absent from the URL. (Confirmed
> live: an account with bare final URLs returns all five `utm_*` blank → `untagged`.)

Period: `last_30_days` (a `{date_from, date_to}` of ~30 days). Sort:
`[{ "field": "google_ads_cost_micros", "direction": "desc" }]` — the highest-spend untagged /
inconsistent campaigns surface first.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no landing-page read; this judges the URL **tags**, not the page content.
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by complementary skills, not here)
- Conversion-action config / values → [`conversion-tracking`](../../conversion-tracking/) (is the event
  set up, does it carry value). UTM hygiene only checks whether the *click* is traceable to a campaign.

## Gotchas
- **Two queries, not one (verified).** `utm_*` **cannot be combined** with
  `ad_group_ad_ad_final_urls` — query_data errors "fields cannot be combined". Pull the tagging read
  (2a) and the URL evidence (2b) separately and join by `campaign_name`.
- **Blank ≠ error.** An empty `utm_*` value means the param is missing from the final URL — that is
  the signal (all-blank across a campaign = no tagging). Don't treat blanks as a query failure.
- **`utm_*` are parsed from the final URL**, so inspect `ad_group_ad_ad_final_urls` to confirm: a URL
  with no query string yields five blank params; a malformed scheme can yield partial params.
- **`utm_term` static vs dynamic.** A populated `utm_term` is not enough — if it's the same literal
  string on every ad (e.g. `ppc`), it isn't carrying the keyword. Compare values across rows.
- **Aggregation grain.** Final URLs live at the ad level; roll up to the campaign for the verdict but
  keep a representative raw URL per campaign in evidence so the recommendation can name the scheme.
- **GCLID is separate from UTMs.** Auto-tagging (GCLID) is what lets Google ↔ GA4/CRM join clicks;
  manual UTMs are the human-readable scheme. Recommend **both** — they are complementary, not either/or.
