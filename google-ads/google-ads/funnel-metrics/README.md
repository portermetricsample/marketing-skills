# Google Ads — Funnel Metrics (SUMAS map)

> **Mission:** map a Google Ads account's marketing funnel the **SUMAS** way — the three
> levels (Visibility → Engagement → Conversion), each with its **efficiency (cost)** and
> **effectiveness (rate)** sub-metric — pulled from real `google-ads` connector fields, with
> every number compared **vs the previous period**.

- **Who is it for?** The marketer / media buyer who wants the funnel read, not just the money
  read. (Its sibling `financial-overview` is the bottom-funnel, finance-only view.)
- **When is it used?** On demand — "show me the funnel" — and as the metrics backbone other
  reports reuse.
- **What decision does it help make?** Where the funnel leaks: are we not being SEEN
  (visibility), not being CLICKED (engagement), or not CONVERTING (conversion)?

## Scope (the hard line)
**Google Ads only.** Every metric comes from the `google-ads` connector — no CRM, no GA4,
no call-tracking, no custom business metrics (qualified leads, true CAC, settlement rate,
call duration). Those are deliberately out of scope so the skill is generic for any Google
Ads advertiser. Quality Score, search-term and structure analysis live in their own skills.

## The map (locked) — funnel × sub-metric × Porter field
| Level (SUMAS) | Volume | Efficiency (cost) | Effectiveness (rate) |
|---|---|---|---|
| **Visibility** (gets SEEN) | Impressions `google_ads_impressions` | **CPM** *calc* `cost/impr×1000` (secondary for Search) | **Impression Share** Top `search_top_impression_share` · Abs-Top `search_absolute_top_impression_share` |
| **Engagement** (gets CLICKED) | Clicks `google_ads_clicks` | **CPC** `google_ads_average_cpc` | **CTR** `google_ads_ctr` |
| **Conversion** (does VALUE) | Conversions `google_ads_conversions` (+ Value `google_ads_conversions_value`) | **CPA** *calc* `cost/conv` · **ROAS** `google_ads_conversion_value_per_cost` *(only if value)* | **Conv. rate** `google_ads_conversions_from_interactions_rate` |

> **Visibility diagnostic** (why you're not seen): `search_rank_lost_top_impression_share`
> (lose by rank/quality) · `search_budget_lost_top_impression_share` (lose by budget).
> **AOV** (ecommerce only) = `google_ads_value_per_conversion`.

## Locked decisions (the defaults the skill ships with)
1. **Conversions = primary** (`google_ads_conversions`, matches Google UI) for the headline;
   `all_conversions` only as a context note.
2. **ROAS / AOV auto-detect:** shown **only when `conversions_value > 0`** (ecommerce). In
   lead-gen accounts the conversion efficiency metric is CPA alone, no ROAS. This is what
   makes it generic across industries.
3. **CPA is calculated** `cost/conversions` — **never** the native `cost_per_conversion`
   (it returns a wrong aggregate at account level; see `datos.md`).
4. **Impression Share = Top + Abs-Top** (no plain overall IS chased); matches how the field
   catalog and agencies actually report it.
5. **CPM is calculated** and flagged secondary — for Search the visibility lever is Impression
   Share + lost-to-rank/budget, not CPM.

## Files
- [`framework.md`](framework.md) — the recipe with SUMAS (the map + interpretation).
- [`datos.md`](datos.md) — exact `google-ads` fields, query shapes, gotchas.
