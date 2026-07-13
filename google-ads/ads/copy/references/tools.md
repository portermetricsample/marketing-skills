# Tools — RSA Strength & Headline Diversity Audit

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in step 2 — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Acme Insurance, Jun 2026).

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | **`execute`** | see below | Pull one ad-grain row per RSA: the headline list, the Ad Strength, Google's action items, and impressions to rank. `accounts` = the full object from step 1. |

> ⚠️ `query_data` goes through **`execute`** (it's marked not_read_only), NOT `fetch`. `accounts` =
> the COMPLETE object from step 1, not the id string.

## Step 2 — `query_data` args (this is "the query")
One ad-grain query. Ask only for the fields the verdict needs — the headline list (text + label +
pin), the strength rating, the action items, and impressions to rank by serving volume:

- `google_ads_ad_group_name` — the exact ad group to name in the recommendation.
- `google_ads_ad_group_ad_ad_strength` — the rating: `POOR` / `AVERAGE` / `GOOD` / `EXCELLENT`.
- `google_ads_ad_group_ad_ad_responsive_search_ad_headlines` — the **list of headline assets**; each
  carries `text`, `assetPerformanceLabel` (PENDING / LOW / GOOD / BEST / LEARNING), and `pinnedField`
  (e.g. `HEADLINE_1` / null). This single field is the spine of the audit.
- `google_ads_ad_group_ad_action_items` — Google's own ad recommendations (supporting evidence).
- `google_ads_impressions` — serving volume; rank ads so the most-served weak ad surfaces first.

Period: `last_30_days` preset, or a `{date_from, date_to}` of ~30–90 days for a steadier read
(longer windows make `assetPerformanceLabel` more likely to be populated, not PENDING).
Sort: `[{ "field": "google_ads_impressions", "direction": "desc" }]` — the highest-traffic ads
matter most; a weak ad that serves a lot is the first fix.

### How to read each field
| Field | Read it as |
|---|---|
| `ad_strength` | account/ad chip → flag `POOR` and `AVERAGE`; `GOOD`/`EXCELLENT` pass. |
| `..._headlines[].pinnedField` | non-null = pinned → limits rotation; brand pinned to `HEADLINE_1` is the classic drag. |
| `..._headlines[].assetPerformanceLabel` | `PENDING`/`LEARNING` = not enough data (say so); `LOW` = replace-candidate; `BEST`/`GOOD` = keep. |
| `..._headlines[].text` | scan for near-duplicates (same root reworded) that could serve together. |
| `action_items` | supporting evidence only — never the sole verdict. |

## Scrape — not needed here
No landing-page read; this audits the ad copy as configured, not the destination. (Message-match to
the landing belongs to the [`keyword-ad-landing`](../../../keyword-ad-landing/) cluster, which scrapes.)

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — no destination read (see above).
- `list_fields` / `list_custom_fields` — only to re-validate a field name if a query fails.

## Parked fields (used by complementary skills, not here)
- Extension/asset fields (sitelinks, callouts, snippets, images) → [`ad-extensions-assets-audit`](../../ad-assets/).
- Keyword / search-term / landing fields → the [`keyword-ad-landing`](../../../keyword-ad-landing/) cluster.
- CTR / conversions per ad → performance-grade work; this audit grades **build quality**, not outcomes.

## Gotchas
- **The headlines field comes back stringified** — a single-quoted, bracket-less sequence of dicts
  (`{'text': ..., 'assetPerformanceLabel': ..., 'pinnedField': ...}, {'text': ...}`), verified. Use
  `ast.literal_eval` (it parses that as a tuple of dicts); `json.loads` **fails** (single quotes, no
  enclosing `[ ]`). Then read each item's `text`, `assetPerformanceLabel`, and `pinnedField`.
- **`assetPerformanceLabel` is often `PENDING`** on new or low-volume ads → "not enough data yet",
  not "weak headline". Only call a headline LOW when the label says so on a window with real volume.
- **`pinnedField` semantics:** a pin is not always bad (a legal disclaimer may need pin 1), but a
  **brand or generic line pinned to `HEADLINE_1`** is the usual cause of an AVERAGE strength — flag it.
- **Near-duplicate headlines** can't be detected by Google's label — judge by `text` (same root,
  reworded). Two near-identical lines risk serving together, wasting an asset slot.
- **PMax** has no RSA headlines field (it uses asset groups) → this audit applies to **Search RSAs**;
  note PMax separately rather than forcing a verdict.
- If `ad_strength` + the headlines list ever return **"cannot be combined"**, split into two
  ad-grain queries and **join by `ad_group_name`** + ad id.
