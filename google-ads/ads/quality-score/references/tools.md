# Tools — Quality Score Trend

The ordered plan of MCP tool calls this skill makes. The "query" is the **arguments of
`query_data`**, nested below — not raw GAQL. The whole trend is one `query_data` pull through the
**`execute`** meta-tool (it is flagged not_read_only), preceded by `list_accounts` for the account
**object**.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> All QS fields below are **verified to exist** in the `google-ads` connector via `list_fields`.

## ⚠️ The historical-vs-live caveat (state this honestly — do not over-claim)

Quality Score comes two ways, and they are **not** the same thing:

- **Live QS** — the point-in-time `quality_info` snapshot: the keyword's QS *right now*. It has **no
  history**; you cannot trend it. It's what `keyword-ad-landing-alignment` reads for its still photo.
- **Historical QS** — `google_ads_historical_quality_score` (a **metric**) + the three
  `google_ads_historical_*` component fields (dimensions). This is Google's **last-known QS per
  period**, and because it's a metric it can be **segmented by `google_ads_date`** — the only way to
  build a trend. **This skill uses the historical fields.**

Two honesty caveats to carry into the output:
1. **It is historical, not real-time.** Each bucket holds Google's last-known QS for that period, not
   a live reading. A keyword with **no impressions in a bucket has no QS for that bucket** — treat the
   gap as missing, never as a zero (a zero would fake a crash that didn't happen).
2. **The component fields are coarse buckets.** The three components report only
   `ABOVE_AVERAGE` / `AVERAGE` / `BELOW_AVERAGE` — Google's own three-way grade, **not** a fine 1–10
   number. So a component "trend" is a movement across three states, not a smooth curve. Say "moved
   from average to below average", never invent a decimal.

QS exists for **Search keywords only** — Display, Shopping and Performance Max have no Quality Score.
Filter to `google_ads_campaign_advertising_channel_type equals SEARCH`.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object**. Never invent the id. |
| 2 | `tool:porter-reporting:query_data` | `execute` | historical-QS fields (below) | The one pull: overall QS + 3 components + spend, segmented by date. `accounts` = the full object from step 1. |

## Step 2 — historical-QS `query_data` args (overall + 3 components, segmented by date)

- `google_ads_historical_quality_score` — **metric**, the 1–10 overall QS. VERIFIED.
- `google_ads_historical_search_predicted_ctr` — **dimension**, the **Expected CTR** component
  bucket. VERIFIED (this field exists in `query_data`; no GAQL fallback needed for Expected CTR).
- `google_ads_historical_creative_quality_score` — **dimension**, the **Ad Relevance** component. VERIFIED.
- `google_ads_historical_landing_page_quality_score` — **dimension**, the **Landing Page Experience**
  component. VERIFIED.
- `google_ads_keyword_info_text` · `google_ads_keyword_info_match_type` — the keyword + match type.
- `google_ads_ad_group_name` · `google_ads_campaign_name` — for the ad-group roll-up + naming.
- `google_ads_date` — the time axis (what makes the trend possible).
- `google_ads_impressions` — the impression floor + the "no-QS-this-bucket" gap detector.
- `google_ads_cost_micros` — to weight each finding by spend (a QS slide on a high-spend keyword
  outranks the same slide on a $3 keyword).

`filters` = `[[{field:"google_ads_campaign_advertising_channel_type", operator:"equals",
value:"SEARCH"}]]` (QS is Search-only); add a keyword-status ENABLED filter if the schema exposes it,
else drop paused keywords in code. `date_range` = the trend window as `{date_from, date_to}` (3–6
months for a weekly view). `sort` = `google_ads_keyword_info_text`, `google_ads_date`.

**Component ↔ plain-language map** (name the plain component in the output, keep the field in
parentheses):
- **Expected CTR** ← `google_ads_historical_search_predicted_ctr`
- **Ad Relevance** ← `google_ads_historical_creative_quality_score`
- **Landing Page Experience** ← `google_ads_historical_landing_page_quality_score`

**Bucketing**: `google_ads_date` returns **daily** rows. Roll them up in the framework into **weekly**
buckets for a ~quarter window, or **monthly** for a year — QS moves slowly, and daily historical QS is
noisy and often flat. Within a bucket, take the **last non-null** QS (the period's last-known value),
not the average of an integer. A window shorter than ~3 buckets can't establish a direction (see the
framework's gate).

## Fields read (chips)

`google_ads_historical_quality_score` · `google_ads_historical_search_predicted_ctr` ·
`google_ads_historical_creative_quality_score` · `google_ads_historical_landing_page_quality_score` ·
`google_ads_keyword_info_text` · `google_ads_keyword_info_match_type` · `google_ads_ad_group_name` ·
`google_ads_campaign_name` · `google_ads_date` · `google_ads_impressions` · `google_ads_cost_micros` ·
`google_ads_campaign_advertising_channel_type` (filter).

## Data pulls (1)

1. One historical-QS query (overall + 3 component buckets + impressions/cost), segmented by
   `google_ads_date` across the window. Everything else — the series, the direction, the attribution —
   is computed in the framework.

## Gotchas

- **All three components ARE available in `query_data`** — an earlier internal note wrongly claimed
  Expected CTR had no Porter field. `list_fields` confirms all four historical fields exist; trend all
  three components directly, no connector-action GAQL fallback required.
- **No-impression bucket = missing QS, not zero.** Use `google_ads_impressions` to detect the gap;
  never plot a zero (it fakes a crash).
- **`google_ads_cost_micros` comes back already in currency** (Porter pre-converts; do not /1e6) — you
  only need it as a spend weight here, so the scale doesn't affect the ranking either way.
- **`accounts` = the complete object** from `list_accounts`, not the id string; a thousands-of-keywords
  × many-buckets pull persists to a file (chat-limit) → export to CSV and roll up with a script.

## Tools NOT needed here (keep it minimal)

- **No `execute_connector_action`** (`budget.list` / `campaign.list` / GAQL) — everything this skill
  needs is a metric/dimension in `query_data`; there is no budget/target read here.
- **No live `quality_info` snapshot** — point-in-time with no history; belongs to
  `keyword-ad-landing-alignment`, not a trend.
- **No conversion / value fields** — QS trend is about rank & CPC efficiency over time, not the return
  on spend (that's `funnel-metrics`).
- `list_fields` — only to re-validate a field name if a query fails.
