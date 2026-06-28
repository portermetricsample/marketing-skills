---
name: google-ads-dashboard
description: Assemble a complete Porter live dashboard for a Google Ads account. Orchestrates all Google Ads analysis skills into the correct pages, maps each page to its Porter reporting components, enforces the account-type gate (PMax has no keywords/search terms), and applies the Google Ads design skin. Use this skill when the user asks to build or rebuild a Google Ads dashboard for a client account.
---

# Google Ads Dashboard — Assembly Orchestrator

## What this builds
A Porter v2 multipage live dashboard for a Google Ads account. Report template baseline: `~/gads-live-dashboard-template/`. Porter reporting components: `~/porter-reporting/components/google-ads/`.

---

## Step 0 — Gather inputs before touching the dashboard

| Input | How to get it | Why it's needed |
|-------|--------------|----------------|
| `account` | `list_accounts` (connector: `google-ads`) | All queries need `customer_id-login_customer_id` |
| `date_range` | Ask user or default to last 30 days + same period prior year | All pages use the same window |
| `brand_terms` | Ask user (optional) | Gates the Brand page; skip if not provided |
| `campaign_types` | `query_data` → `google_ads_campaign_advertising_channel_type` | Gates Keywords and Search Terms pages |

**Account-type gate — run this first:**
```
SELECT google_ads_campaign_advertising_channel_type, COUNT(*) as campaigns
GROUP BY type
```
If **all** campaigns are PMax or Demand Gen → skip Pages 4 (Keywords) and 5 (Search Terms). Add a note to the report explaining why those pages are absent.

---

## Step 1 — Run the analysis skills (in this order)

Order matters: conversion tracking verdict gates whether any efficiency metric is trustworthy.

### Phase A — Foundations (run first, always)
1. `measurement/conversion-tracking` — verdict: are conversions trustworthy? If not, flag everything downstream.
2. `account-structure/structure-map` — decode campaign naming → infer dimensions for segmentation.

### Phase B — Core pages
Run in parallel after Phase A:

3. `performance/financial-overview` + `performance/funnel-metrics` → feeds **Page 1: Overview**
4. `campaigns/spend-allocation` + `campaigns/impression-share` + `campaigns/bid-strategy` → feeds **Page 2: Campaigns**
5. `measurement/conversion-cpa` → feeds **Page 3: Conversions**
6. `ads/metrics` (QS) + `search-terms/match-types` → feeds **Page 4: Keywords** *(skip if gate fails)*
7. `search-terms/performance` + `search-terms/n-grams` + `search-terms/classifier` → feeds **Page 5: Search Terms** *(skip if gate fails)*
8. `segmentation/time/cyclical` → feeds **Page 6: Dayparting**
9. `segmentation/audience/geography` → feeds **Page 7: Geography**

### Phase C — Optional pages (need brand_terms)
10. `performance/brand-incrementality` → feeds **Page 8: Brand Split** *(only if brand_terms provided)*

---

## Step 2 — Build the Porter report

### Create the report
```
create_report → connector: google-ads, account: <account>, skin: google-ads
```
Google Ads skin = violet/purple palette (`#7c5cfc` primary). Apply to all charts.

### Pages and their Porter reporting components

#### Page 1 · Overview
**Skills:** `financial-overview`, `funnel-metrics`, `segmentation/campaign`  
**Components:**
- KPI scorecard row: spend / conversions / CPA / ROAS vs prior period
- Trend line: spend + conversions over time
- Campaign contribution donut: spend share by campaign
- `campaign-performance-table`: top campaigns by spend + CPA

#### Page 2 · Campaigns
**Skills:** `campaigns/spend-allocation`, `campaigns/impression-share`, `campaigns/bid-strategy`  
**Components:**
- `campaign-performance-table`: SUMAS breakdown (spend / IS / CPA / bid strategy / status)
- `impression-share-trend-monitor`: IS over time by campaign
- `impression-share-competitiveness`: budget-limited vs rank-limited split

#### Page 3 · Conversions
**Skills:** `measurement/conversion-tracking`, `measurement/conversion-cpa`  
**Components:**
- KPI scorecard row: total conversions + CPA (note: primary actions only)
- Trend line: conversions over time by action type
- Table: per-conversion-action cost and volume

#### Page 4 · Keywords *(skip if all-PMax)*
**Skills:** `ads/metrics`, `search-terms/match-types`  
**Components:**
- Match type bar chart: broad / phrase / exact spend share
- Keyword table with QS (Expected CTR + Ad Relevance + Landing Experience columns)

#### Page 5 · Search Terms *(skip if all-PMax)*
**Skills:** `search-terms/performance`, `search-terms/n-grams`, `search-terms/classifier`  
**Components:**
- `search-terms-page`: full search term table (Winning / Watch / Waste classification)
- `search-term-ngrams`: top 1/2/3-gram patterns → negative candidates

#### Page 6 · Dayparting
**Skills:** `segmentation/time/cyclical`  
**Components:**
- Heatmap: day-of-week × hour-of-day → CPA or ROAS (cell color = vs account average)
- Summary: best slot / worst slot / recommended bid adjustment direction

#### Page 7 · Geography
**Skills:** `segmentation/audience/geography`  
**Components:**
- Geo bubble map (if Porter atlas supports the country; Canada = fallback to bars only)
- Table: region / city → spend / conversions / CPA

#### Page 8 · Brand Split *(only if brand_terms provided)*
**Skills:** `performance/brand-incrementality`  
**Components:**
- `brand-incrementality` component: branded vs non-brand KPI split
- Table: brand / non-brand / competitor → spend / CPA / ROAS

---

## Step 3 — Apply consistent design

- **Skin:** Google Ads (violet/purple). All charts use `Porter.charts.*` — no SVG/D3 from scratch.
- **Page title format:** `[Account Name] · Google Ads · [Month YYYY]`
- **Date range:** always shown in the report header.
- **Conversion tracking flag:** if `conversion-tracking` verdict was "unreliable," add a banner on Page 3 and a note on Page 1 KPIs.
- **Skipped pages:** if Keywords/Search Terms were skipped due to campaign type gate, add a note on the Overview page explaining why.

---

## Gaps (pages not yet in the template)

These skills exist but have no matching page yet — add as the template evolves:

| Future page | Skills ready | Porter component ready |
|-------------|-------------|----------------------|
| Ads health | `ads/copy`, `ads/assets`, `ads/health` | `creative-ad-preview`, `keyword-ad-landing-alignment` |
| Audiences | `segmentation/audience/demographics`, `segmentation/audience/devices` | not yet |

---

## Reference files
- Dashboard template: `~/gads-live-dashboard-template/config.json`
- Porter reporting components: `~/porter-reporting/components/google-ads/`
- Design skin tokens: `~/porter-design/` (porter-design-system skill)
- v2 report build recipe: `~/porter-reporting/_foundation/`
