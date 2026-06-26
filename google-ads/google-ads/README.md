# Google Ads — use cases

Google Ads reports built with [SUMAS](../_framework/sumas.md) on the
Porter Metrics MCP (`google-ads` connector).

## Strategy context (the "S" in SUMAS, shared across all cases)

- **Porter connector:** `google-ads`.
- **Account format:** `<customer_id>-<login_customer_id>` (two 10-digit IDs
  joined by a hyphen). Never make up the ID — discover it with `list_accounts`.
- **Before any report:** get the campaign type *fingerprint*
  (`google_ads_campaign_advertising_channel_type`): Search, Performance Max,
  Shopping, Demand Gen, Display, Video, App. What you can report changes with
  the type (e.g. PMax does not expose keywords).

## Use cases (one per folder)

| Use case | SUMAS use case | Frequency | Audience | Status |
|-------------|----------------|-----------|-----------|--------|
| [financial-overview](financial-overview/) | Performance management | Monthly | Manager / finance (non-marketing) | ✅ ready |
| [funnel-metrics](funnel-metrics/) | Performance management | On demand | Marketer / media buyer | ✅ ready (recipe) |
| [keyword-ad-landing/](keyword-ad-landing/) · cluster | The journey term→keyword→ad→landing: **alignment** ✅ (relevance verdict) + **metrics** ✅ (QS/IS/CTR/CVR + Google grades) | Recurring | Media buyer / agency | ✅ both ready (landing scrape pending) |
| [search-terms/](search-terms/) · cluster | Defensive (relevance ✅, term-routing ✅, performance ⬜) + offensive (intent-discovery ✅) | Recurring | Media buyer / strategist | 🟡 in progress |
| [account-structure/](account-structure/) · cluster | structure-map ✅ (decode naming→dimensions) + structure-audit ✅ (validate alignment) + naming-convention ⬜ | Onboarding / periodic | Media buyer / agency | 🟡 in progress |
| [account-audit/](account-audit/) · cluster | QA health-check vs best practice: bid-strategy, spend-allocation, conversion-tracking, traffic-quality-settings, ad-assets, landing-cro (all ⬜) | Onboarding / periodic | Media buyer / agency | 🟡 in progress |
| [segmentation/](segmentation/) · family | Movement attribution — explain a metric's up/down by segment (contribution to change). **time** ✅ (day/week/month/quarter/year + day-of-week/hour, auto-scan or specified) · **campaign** ✅ (+ type, contribution + concentration + entry/exit) · **audience** ✅ (umbrella: demographics + geography + devices; availability/coverage-aware) | On demand | Marketer / analyst | 🟡 time + campaign + audience built |
| [impression-share/](impression-share/) | **Impression Share — snapshot + trend (unified).** Per Search campaign: the current-period cap (budget vs rank, incl. top-of-page) AND the trajectory over time (Winning/Healthy/Volatile/Losing/Crashing via the `performance_decay` engine) with the budget-vs-rank driver. Ships the analysis AND a bundled view. | Audit / monitoring | Media buyer / agency | ✅ unified |
| operativo-budget-pacing | Operational | Daily | Media buyer | ⬜ pending |
| estrategico-auditoria | Strategic | Quarterly | Decision / leadership | ⬜ pending |
