# Framework: Google Ads — Funnel Metrics (SUMAS)

Applies [SUMAS](../../_framework/sumas.md). This is the **M-step made concrete** for Google
Ads: the funnel ordered Visibility → Engagement → Conversion, each with efficiency + effectiveness.

## S — Strategy
- **Who cares:** the marketer / media buyer running the account.
- **Their question:** "Where does my funnel leak — visibility, engagement, or conversion?"
- **Decision it triggers:** where to push next (raise bids/budget for visibility, fix
  ads/CTR for engagement, fix landing/offer for conversion).

## U — Use case
Performance read, on demand. Also the **metrics backbone** other reports reuse.

## M — Metrics (the funnel, ordered; each level = volume + efficiency + effectiveness)

### Visibility — the user SEES
- **Volume:** Impressions — `google_ads_impressions`.
- **Efficiency (cost):** CPM = `cost_micros / impressions × 1000` *(calculated; secondary for
  Search — keep but don't lead with it)*.
- **Effectiveness (rate):** Impression Share — `search_top_impression_share` (Top %) and
  `search_absolute_top_impression_share` (Abs-Top %). "How much of the available auction did
  we capture, and how high." ⚠️ **IS does not aggregate cleanly at account total** (it's
  per-campaign; the lost-IS pieces don't sum to 100). For accuracy pull IS **per campaign**
  and weight by impressions; at account total, label it *approximate*.
- **Diagnostic (why not seen):** `search_rank_lost_top_impression_share` (losing by
  rank/quality → fix bids/QS) vs `search_budget_lost_top_impression_share` (losing by budget
  → raise budget). This is what turns visibility from descriptive into actionable.

### Engagement — the user INTERACTS (clicks)
- **Volume:** Clicks — `google_ads_clicks`.
- **Efficiency (cost):** CPC = `cost_micros / clicks` *(calculated)*.
- **Effectiveness (rate):** CTR = `clicks / impressions` *(calculated)*.

### Conversion — the user does something of VALUE
- **Volume:** Conversions — `google_ads_conversions` (**primary**, = Google UI). Value —
  `google_ads_conversions_value`.
- **Efficiency (cost):** CPA = `cost_micros / conversions` *(calculated)*. ROAS =
  `conversions_value / cost_micros` *(calculated)* **(only when value > 0)**.
- **Effectiveness (rate):** Conversion rate = `conversions / clicks` *(calculated)*.
- **Unit value (ecommerce only):** AOV = `conversions_value / conversions` *(calculated)*.

> ⚠️ **Compute every rate/cost from the base counts — do NOT trust the native ratio fields at
> the account aggregate.** Validated live (Acme Country Club, May 2026): `conversions_from_interactions_rate`
> returned **0.0** with 100 conversions; native `ctr` read 11.5% vs the real 6.2%; native
> `average_cpc` read $371 vs the real $2.61. Only `conversion_value_per_cost` (ROAS) was
> correct — but we compute it too, for consistency. The **base counts** (impressions, clicks,
> cost, conversions, value) DO aggregate correctly; everything else is derived from them.

## A — Add context (mandatory)
Every metric carries a **vs previous period** comparison (↑/↓ + % change). That is the
default context. Optionally vs target (the account's tCPA/tROAS) when known. The pairing rule
holds: never show a cost without its rate (CPA next to conv. rate, CPC next to CTR).

## S — Segments (optional breakdowns)
Cut the same funnel by: **campaign**, **device**, **time** (date/week). Audience/age/geo are
valid Google Ads segments too but belong to a targeting report, not this one.

## Report structure
> **Reading order is outcome-first (decision-first, `writing.md` rule #1): declare Conversion
> FIRST**, then walk *back up* the funnel to explain it. The reader cares about the result
> (conversions / value / ROAS); you state it, then show what produced it. This is the **reading**
> order — the M catalog above stays in funnel order (V→E→C) for completeness; presentation inverts it.

1. **Headline** — one line, the **outcome**: conversions + value + ROAS vs previous, and the level
   where the funnel explains the move.
2. **Conversion block first** (volume + efficiency + effectiveness), then **Engagement**, then
   **Visibility** — each vs previous period. Lead with the result, decompose upward.
3. **Leak callout** — the level with the worst trend, with the diagnostic (e.g. visibility
   down → check lost-IS rank vs budget).

## Interpretation / honesty rules
- **Business-model branch:** if `conversions_value` is ~0 across the account → it's lead-gen:
  **hide ROAS and AOV**, lead with CPA + conv. rate. If value > 0 → ecommerce: show ROAS/AOV.
  The skill auto-detects; it does not assume.
- **CPA calculated, not native:** `google_ads_cost_per_conversion` is wrong at the account
  aggregate (validated: reported $9,230 vs real $259 on Acme Insurance). Always compute `cost/conv`.
- **Primary vs all conversions:** headline uses `google_ads_conversions` (primary). If the
  account's real action is calls/store, note `all_conversions` — but say which one.
- **CPM is secondary for Search:** it exists for completeness; the visibility lever is
  Impression Share + lost-to-rank/budget, not CPM.
- **`value_per_conversion` ≠ ROAS.** ROAS is `conversion_value_per_cost`.

## Metric relationships — explain every movement (the canonical "why")
The funnel identity (the cascade that turns any movement into a named driver) is now a global rule:
**[`_framework/metric-relationships.md`](../../_framework/metric-relationships.md)**. funnel-metrics
is the use case that **computes** it — it does not own it. Apply that doc here for every metric that
moves; it fills `synthesis.diagnosis` and each `recommendation.why`.

## Delivery format
On-demand funnel read (single screen or short narrative). Period:
`date_range = {"preset": "last_month"}` (or custom) + a second query of the prior period for
the "vs". Porter does not compare periods in one call.
