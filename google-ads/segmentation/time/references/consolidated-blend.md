# Reference: Consolidated (cross-connector) Time Matrix via porter-blend

The base time skill is single-connector (Google Ads). To render the SAME **Time matrix**
*consolidated* across paid + analytics connectors (e.g. Meta + Google + GA4) in one table,
use Porter's cross-connector **blend**. All of the below is verified live (Motiva USA,
jun 2026). The gotchas are not optional — each one silently produces a wrong number.

## What works (use this)

- **Live blend, no export needed.** `query_data` in accounts mode accepts a MIX of
  connectors and merges shared columns — `amount_spent`, `ads_impressions`, `clicks`
  become ONE column each across Meta + Google. A Porter **report chart** can be a live
  blend too: `config.charts.<id>` with `data_source: "porter-blend"` + `accounts: [<FB>,
  <Google>, <GA4>]` (full `AccountItem` dicts) + blend fields. Deploys and validates fine.
- **Split rows by channel** with the `data_source` dimension — values come back as friendly
  names (`"Meta Ads"`, `"Google Ads"`, `"GA4"`).
- **Blend fields use the UNPREFIXED catalog** (`list_fields()` with no args):
  `amount_spent, ads_impressions, clicks, conversions, sessions`, time dims
  `date, year_week_dates, year_month`.

## Matrix layout (rows = category, columns = period)

Group rows by **channel**, each with its KPIs (Spend, Impressions, Clicks, CTR, CPC), then
a **Global / combined** group (Total spend = Meta+Google, blended CTR, platform conversions).
Columns = time buckets across the date range; a Day/Week/Month/Quarter toggle re-buckets.
Conditional formatting per row (min–max heat across the row) reads the trend at a glance.
Compute everything client-side from a single DAILY blend fetch so the toggle is instant and
respects the date-range control.

## GOTCHAS (these will bite)

1. **`quarter` dimension is BROKEN in porter-blend.** Dimension `quarter` returns
   MONTH-grain buckets (`YYYYMM`, 12 per year), not 4 quarters. **Derive quarter in code
   from `year_month`** (`Q = ceil(month/3)`). Never trust the native `quarter` field.
2. **Conversions do NOT consolidate across Meta + Google.** The blend `conversions` field
   **excludes `facebook-ads`** (Meta rows = 0), and no blend field carries Meta's custom
   conversion (`submit_application`); `leads` is a *different* event. For a true combined
   row, add a SEPARATE native `facebook-ads` chart
   (`facebook_ads_conversions_submit_application_total`, daily) and merge by bucket. **Never
   present a blended "conversions" total that silently drops Meta.**
3. **GA4 is not a paid channel.** No spend; its `conversions` are key events that may
   overlap platform conversions (double-count risk). Keep GA4 in its own row group; do not
   fold it into a platform-conversions total.
4. **Cross-company account drift.** A deployed report's stored account dict can carry a
   stale `company_id` vs the live authorization — re-fetch via `list_accounts` and reuse the
   exact returned dict / `account_ref`.
5. **Daily grain + long ranges:** set a high per-chart `limit` (e.g. 5000); the blend
   returns one row per (connector × day).

## Honesty rules (inherits the repo's no-hallucination stance)

- Consolidate only what is genuinely additive (spend, impressions, clicks).
- Never sum metrics with divergent definitions (conversions across platforms, GA4 key
  events) into one number without stating exactly what is inside it.
- Recompute rates (CTR, CPC, CPA) from the SUMMED base counts — never average per-bucket rates.

> Gotchas #1, #2 and #4 are logged for the dev team in
> `porter-mcp-feedback/dashboard-gaps/18` (and `/15` for the cross-company auth).
