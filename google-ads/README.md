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

## Clusters

| Cluster | What it covers | Status |
|---------|---------------|--------|
| [performance/](#performance-management) | Financial results — KPIs, funnel, brand split | ✅ ready |
| [campaigns/](campaigns/) | Campaign-level config + visibility + spend + changes | ✅ ready |
| [search-terms/](search-terms/) | Search term analysis — classify, score, mine, negate | ✅ full set |
| [keyword-ad-landing/](keyword-ad-landing/) | The term→keyword→ad→landing chain | ✅ ready |
| [ads/](ads/) | Ad copy, extensions, health | 🟡 4 of 7 built |
| [segmentation/](segmentation/) | Movement attribution by time / campaign / audience | 🟡 in progress |
| [measurement/](measurement/) | Conversion tracking + UTM hygiene + per-action CPA | ✅ ready |
| [account-structure/](account-structure/) | Naming conventions + structural consistency | 🟡 in progress |
| [account-audit/run-audit/](account-audit/run-audit/) | **Orchestrator** — assembles skills from all clusters into one prioritized audit report | ✅ ready |

---

## Performance management

| Skill | What it answers | Frequency | Audience | Status |
|-------|----------------|-----------|----------|--------|
| [financial-overview](financial-overview/) | Executive KPIs (spend, conversions, CPA, ROAS) vs prior period | Monthly | Manager / finance | ✅ ready |
| [funnel-metrics](funnel-metrics/) | Full marketer funnel: visibility → engagement → conversion | On demand | Marketer / media buyer | ✅ ready |
| [brand-incrementality/](brand-incrementality/) | Real CPA/ROAS once branded traffic is stripped out | On demand / every report | Media buyer / client | ✅ ready |

## Campaigns

| Skill | What it answers | Status |
|-------|----------------|--------|
| [campaigns/impression-share/](campaigns/impression-share/) | IS snapshot + trend + budget vs rank driver | ✅ ready |
| [campaigns/campaign-settings/](campaigns/campaign-settings/) | Location set to Presence? Search Partners / Display off? | ✅ ready |
| [campaigns/bid-strategy/](campaigns/bid-strategy/) | Is the tCPA/tROAS target aligned with actual last 30d? | ✅ ready |
| [campaigns/value-based-bidding/](campaigns/value-based-bidding/) | On Max-Conv-Value / tROAS? Enough conversions to trust it? | ✅ ready |
| [campaigns/spend-allocation/](campaigns/spend-allocation/) | Which ad groups should get more budget but aren't? | ✅ ready |
| [campaigns/change-history/](campaigns/change-history/) | What changed in the account and when — overlaid against CPA | ✅ ready |

## Search Terms

| Skill | What it answers | Status |
|-------|----------------|--------|
| [search-terms/run/](search-terms/run/) | **Orchestrator** — full audit end-to-end → Porter dashboard | ✅ ready |
| [search-terms/performance/](search-terms/performance/) | Winning / Watch / Waste by spend | ✅ ready |
| [search-terms/n-grams/](search-terms/n-grams/) | 1/2/3-gram patterns → negatives + themes to expand | ✅ ready |
| [search-terms/insights/](search-terms/insights/) | Dollar roll-up: how much each problem costs | ✅ ready |
| [search-terms/negatives/](search-terms/negatives/) | Existing negative map — consulted before any new negative is recommended | ✅ ready |
| [search-terms/match-types/](search-terms/match-types/) | Broad/phrase/exact spend share + untested match types | ✅ ready |
| [search-terms/classifier/](search-terms/classifier/) | All labels at once per term → one recommended action | ✅ ready |
| [search-terms/classifier/branded/](search-terms/classifier/branded/) | Brand / competitor / generic + brand leak detection | ✅ ready |
| [search-terms/classifier/relevance/](search-terms/classifier/relevance/) | Did this keyword deserve to trigger that term? | ✅ ready |
| [search-terms/classifier/duplicates/](search-terms/classifier/duplicates/) | Same term matched by 2+ keywords → route to owner | ✅ ready |
| [search-terms/classifier/opportunity/](search-terms/classifier/opportunity/) | Unserved demand → content / landing / ad ideas | ✅ ready |

## Keyword ↔ Ad ↔ Landing

| Skill | What it answers | Status |
|-------|----------------|--------|
| [keyword-ad-landing/alignment/](keyword-ad-landing/alignment/) | Does the keyword → ad → landing chain make sense? | ✅ ready |
| [keyword-ad-landing/metrics/](keyword-ad-landing/metrics/) | QS + 3 pillars (Expected CTR, Ad Relevance, Landing Experience) | ✅ ready |
| [keyword-ad-landing/landing-cro/](keyword-ad-landing/landing-cro/) | Does the landing page convert? Message + pain points | ✅ ready |

## Ads

| Skill | What it answers | Status |
|-------|----------------|--------|
| [ads/assets/](ads/assets/) | Are the 4 essential extensions present? (sitelinks, callouts, snippets, images) | ✅ ready |
| [ads/copy/](ads/copy/) | Ad Strength, pinning, headline labels from Google | ✅ ready |
| [ads/health/](ads/health/) | Broken landing pages + disapproved ads | ✅ ready |
| [ads/inventory/](ads/inventory/) | Full ad-copy structure map (feeds future skills) | ✅ ready |

## Segmentation

| Skill | What it answers | Status |
|-------|----------------|--------|
| [segmentation/time/](segmentation/time/) | Metric movement by day / week / month / hour | ✅ ready |
| [segmentation/campaign/](segmentation/campaign/) | Contribution + concentration + entry/exit by campaign | ✅ ready |
| [segmentation/audience/demographics/](segmentation/audience/demographics/) | Which age/gender segment drove a metric move | ✅ ready |
| [segmentation/audience/demographics-audit/](segmentation/audience/demographics-audit/) | Which age/gender segments over/underperform → bid adjustments | ✅ ready |
| [segmentation/audience/devices/](segmentation/audience/devices/) | Device performance breakdown | ✅ ready |
| [segmentation/audience/geography/](segmentation/audience/geography/) | Geo performance breakdown | ✅ ready |
| [segmentation/audience/placements/](segmentation/audience/placements/) | Placement performance (Display / PMax) | ✅ ready |

## Measurement

| Skill | What it answers | Status |
|-------|----------------|--------|
| [measurement/conversion-tracking/](measurement/conversion-tracking/) | Is offline/CRM import set up? Are counted conversions down-funnel? | ✅ ready |
| [measurement/utm-tracking/](measurement/utm-tracking/) | Are clicks tagged so GA4 + CRM can attribute them? | ✅ ready |
| [measurement/conversion-cpa/](measurement/conversion-cpa/) | Per-conversion-action cost (calls, forms, bookings separately) | ✅ ready |

## Account Structure

| Skill | What it answers | Status |
|-------|----------------|--------|
| [account-structure/structure-map/](account-structure/structure-map/) | Decode campaign naming → infer dimensions | ✅ ready |
| [account-structure/structure-audit/](account-structure/structure-audit/) | Is the account internally consistent? | ✅ ready |
| account-structure/naming-convention | Is the naming convention applied consistently? | ⬜ pending |

## Audit runner

`account-audit/run-audit/` is the only remaining skill in `account-audit/`. It is a pure orchestrator — it calls skills from all the clusters above and assembles a single prioritized audit report. No skills live under `account-audit/` anymore; it only contains the runner.
