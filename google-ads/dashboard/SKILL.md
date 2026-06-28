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

3. `performance/financial-overview` + `performance/funnel-metrics` + `performance/brand-incrementality` → feeds **Page 1: Overview**
4. `campaigns/spend-allocation` + `campaigns/impression-share` + `campaigns/bid-strategy` + `campaigns/campaign-settings` → feeds **Page 2: Campaigns**
5. `ads/metrics` + `search-terms/match-types` + `search-terms/performance` + `search-terms/n-grams` + `search-terms/classifier` → feeds **Page 3: Keywords & Search Terms** *(skip if all-PMax)*
6. `ads/copy` + `ads/assets` + `ads/health` + `ads/alignment` → feeds **Page 4: Ads**
7. `segmentation/audience/placements` + `segmentation/audience/geography` + `segmentation/audience/demographics` + `segmentation/audience/devices` → feeds **Page 5: Audiences**
8. `segmentation/time/trend` + `segmentation/time/cyclical` → feeds **Page 6: Time**

---

## Step 2 — Build the Porter report

### Create the report
```
create_report → connector: google-ads, account: <account>, skin: google-ads
```
Google Ads skin = violet/purple palette (`#7c5cfc` primary). Apply to all charts.

### Pages and their Porter reporting components

#### Page 1 · Overview
**Skills:** `financial-overview`, `funnel-metrics`, `performance/brand-incrementality`, `segmentation/campaign`  
**Components:**
- KPI scorecard row: spend / conversions / CPA / ROAS vs prior period
- Trend line: spend + conversions over time
- `brand-incrementality` component: branded vs non-brand CPA/ROAS split *(requires brand_terms; skip block if not provided)*
- Campaign contribution donut: spend share by campaign
- `campaign-performance-table`: top campaigns by spend + CPA

#### Page 2 · Campaigns
Campaign-level configuration, spend distribution, and visibility.

**Skills:** `campaigns/spend-allocation`, `campaigns/impression-share`, `campaigns/bid-strategy`, `campaigns/campaign-settings`  
**Components:**
- `campaign-performance-table`: SUMAS breakdown (spend / IS / CPA / bid strategy / status)
- `impression-share-trend-monitor`: IS over time by campaign
- `impression-share-competitiveness`: budget-limited vs rank-limited split

#### Page 3 · Keywords & Search Terms *(skip entirely if all-PMax)*
**Skills:** `ads/metrics`, `search-terms/match-types`, `search-terms/performance`, `search-terms/n-grams`, `search-terms/classifier`  
**Components:**
- Match type bar chart: broad / phrase / exact spend share
- Keyword table with QS (Expected CTR + Ad Relevance + Landing Experience)
- `search-terms-page`: Winning / Watch / Waste classification
- `search-term-ngrams`: 1/2/3-gram patterns → negative candidates

#### Page 4 · Ads
RSA copy health, asset coverage, broken/disapproved ads, and keyword→ad→landing chain.

**Skills:** `ads/copy`, `ads/assets`, `ads/health`, `ads/alignment`  
**Components:**
- `creative-ad-preview`: RSA copy strength + pinning
- Ad assets coverage: sitelinks / callouts / snippets / images present?
- `keyword-ad-landing-alignment`: does the keyword → ad → landing chain make sense?

#### Page 5 · Audiences
Segmentation by who was reached. Four sub-sections on the same page.

**Skills:** `segmentation/audience/placements`, `segmentation/audience/geography`, `segmentation/audience/demographics`, `segmentation/audience/devices`  
**Components:**
- **Placements:** placement performance table (Display / PMax / Video only — skip for Search-only accounts)
- **Geography:** geo bubble map + table (region / city → spend / conversions / CPA). Canada = fallback to bars only (no atlas support).
- **Demographics:** age × gender grid → over/underperforming segments vs account CPA/ROAS
- **Technology:** desktop / mobile / tablet split → spend share + CPA per device

#### Page 6 · Time
Segmentation by when performance happened — all granularities on one page, coarse to fine.

**Skills:** `segmentation/time/trend`, `segmentation/time/cyclical`  
**Components:**
- **Trend (coarse → fine):** year → quarter → month → week → day line chart. Highlight the inflection point where CPA or ROAS turned.
- **Ad Schedule (day-of-week × hour):** heatmap with cell color = vs account average CPA/ROAS. Shows the best and worst hours and days of the week.

> **Why not a separate Dayparting page?** Day-of-week and hour-of-day are two granularities of time — they belong on the same page as monthly and weekly trends, not isolated. Together they show the full time picture from year down to hour.

---

## Step 3 — Apply consistent design

- **Skin:** Google Ads (violet/purple). All charts use `Porter.charts.*` — no SVG/D3 from scratch.
- **Page title format:** `[Account Name] · Google Ads · [Month YYYY]`
- **Date range:** always shown in the report header.
- **Conversion tracking flag:** if `conversion-tracking` verdict was "unreliable," add a note on Page 1 KPIs and on any efficiency metric on Pages 2–4.
- **Skipped sections:** if keywords/search terms were skipped due to campaign type gate, add a visible note on Page 2 explaining why.

---

## Gaps and future pages

| Future page | Skills ready | Notes |
|-------------|-------------|-------|
| Conversions | `measurement/conversion-tracking`, `measurement/conversion-cpa` | Skills built; conversion KPIs already appear in Overview. Add as Page 3 when depth justifies it. |
| Budget | ⬜ not built yet | Ad pacing + budget monitoring. Skills need to be built first before this page can be added. |

---

## Reference files
- Dashboard template: `~/gads-live-dashboard-template/config.json`
- Porter reporting components: `~/porter-reporting/components/google-ads/`
- Design skin tokens: `~/porter-design/` (porter-design-system skill)
- v2 report build recipe: `~/porter-reporting/_foundation/`
