/*
 * charts/driver-tree/google-ads — FICTIONAL demo data.
 *
 * Synthetic Google Ads rows for the fictional account "Acme Insurance"
 * (1234567890-1234567890), per RULES.md #3 — no real account data in the repo.
 *
 * Four row sets (campaigns / adGroups / ads / searchTerms), each in a current +
 * previous period so the Δ chips are exercised. Names deliberately carry signal
 * for ALL four lenses:
 *   • campaign type  → the channel field (SEARCH / PERFORMANCE_MAX / DEMAND_GEN / VIDEO)
 *   • funnel stage   → [TOFU] / [MOFU] / [BOFU] tags in the campaign name
 *   • match type     → "Broad" / "Phrase" / "Exact" / "Brand" in the ad-group name
 *   • brand intent   → the brand term "acme" in some search terms (brandTerm: "acme")
 * `cost` and `budget` are in CURRENCY units already (as Porter delivers the
 * *_micros fields) — the component does not re-scale. Not real performance.
 */
(function (root, factory) {
  var d = factory();
  if (typeof module === "object" && module.exports) module.exports = d;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.gaExampleData = d;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function camp(name, id, channel, cost, impr, clk, conv, cval, is, budget) {
    return {
      google_ads_campaign_name: name, google_ads_campaign_id: id,
      google_ads_campaign_advertising_channel_type: channel,
      google_ads_cost_micros: cost, google_ads_impressions: impr, google_ads_clicks: clk,
      google_ads_conversions: conv, google_ads_conversions_value: cval,
      google_ads_search_impression_share: is, google_ads_campaign_budget_amount_micros: budget
    };
  }
  function ag(campaign, campaignId, adGroup, cost, impr, clk, conv, cval) {
    return {
      google_ads_campaign_name: campaign, google_ads_campaign_id: campaignId,
      google_ads_ad_group_name: adGroup,
      google_ads_cost_micros: cost, google_ads_impressions: impr, google_ads_clicks: clk,
      google_ads_conversions: conv, google_ads_conversions_value: cval
    };
  }
  function ad(campaign, adGroup, adId, url, cost, conv, cval) {
    return {
      google_ads_campaign_name: campaign, google_ads_ad_group_name: adGroup,
      google_ads_ad_group_ad_ad_id: adId,
      google_ads_ad_group_ad_ad_final_urls: "['" + url + "']",
      google_ads_cost_micros: cost, google_ads_conversions: conv, google_ads_conversions_value: cval
    };
  }
  function st(term, campaign, cost, impr, clk, conv, cval) {
    return {
      google_ads_search_term: term, google_ads_campaign_name: campaign,
      google_ads_cost_micros: cost, google_ads_impressions: impr, google_ads_clicks: clk,
      google_ads_conversions: conv, google_ads_conversions_value: cval
    };
  }

  // ---- campaign ids ----
  var C_BRAND = "11111111", C_TERM = "22222222", C_COMP = "33333333",
      C_WHOLE = "44444444", C_PMAX = "55555555", C_DG = "66666666";

  var campaigns = [
    camp("Acme — Brand Search [BOFU]",            C_BRAND, "SEARCH",          6200, 41000, 2100, 142, 58000, 0.82, 240),
    camp("Term Life — Generic Search [MOFU]",     C_TERM,  "SEARCH",          9800, 132000, 2600, 121, 30000, 0.41, 360),
    camp("Competitor — Conquest Search [MOFU]",   C_COMP,  "SEARCH",          5400, 88000, 1200, 55, 14000, 0.22, 200),
    camp("Whole Life — Generic Search [TOFU]",    C_WHOLE, "SEARCH",          10500, 210000, 2400, 90, 25000, 0.28, 380),
    camp("Performance Max — Prospecting",         C_PMAX,  "PERFORMANCE_MAX", 9300, 480000, 3100, 128, 47000, 0, 420),
    camp("Demand Gen — Awareness [TOFU]",         C_DG,    "DEMAND_GEN",      7000, 620000, 2900, 84, 19000, 0, 300)
  ];
  var prevCampaigns = [
    camp("Acme — Brand Search [BOFU]",            C_BRAND, "SEARCH",          5400, 38000, 1850, 121, 49000, 0.79, 240),
    camp("Term Life — Generic Search [MOFU]",     C_TERM,  "SEARCH",          8600, 119000, 2300, 104, 27000, 0.44, 320),
    camp("Competitor — Conquest Search [MOFU]",   C_COMP,  "SEARCH",          4900, 81000, 1300, 61, 16000, 0.25, 200),
    camp("Whole Life — Generic Search [TOFU]",    C_WHOLE, "SEARCH",          8800, 186000, 2100, 81, 22000, 0.30, 360),
    camp("Performance Max — Prospecting",         C_PMAX,  "PERFORMANCE_MAX", 8100, 430000, 2700, 116, 41000, 0, 380),
    camp("Demand Gen — Awareness [TOFU]",         C_DG,    "DEMAND_GEN",      6300, 560000, 2500, 71, 15000, 0, 300)
  ];

  var adGroups = [
    ag("Acme — Brand Search [BOFU]",          C_BRAND, "Acme — Brand Exact",        3800, 24000, 1300, 96, 41000),
    ag("Acme — Brand Search [BOFU]",          C_BRAND, "Acme — Brand Phrase",       2400, 17000, 800, 46, 17000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Broad",         4600, 72000, 1100, 44, 11000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Phrase",        3200, 41000, 980, 49, 13000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Exact",         2000, 19000, 520, 28, 6000),
    ag("Competitor — Conquest Search [MOFU]", C_COMP,  "Competitor — Broad",        5400, 88000, 1200, 55, 14000),
    ag("Whole Life — Generic Search [TOFU]",  C_WHOLE, "Whole Life — Broad",        6300, 140000, 1300, 44, 12000),
    ag("Whole Life — Generic Search [TOFU]",  C_WHOLE, "Whole Life — Phrase",       4200, 70000, 1100, 46, 13000),
    ag("Performance Max — Prospecting",       C_PMAX,  "PMax — Asset group 1",      9300, 480000, 3100, 128, 47000),
    ag("Demand Gen — Awareness [TOFU]",       C_DG,    "DemandGen — Lookalike",     7000, 620000, 2900, 84, 19000)
  ];
  var prevAdGroups = [
    ag("Acme — Brand Search [BOFU]",          C_BRAND, "Acme — Brand Exact",        3300, 21000, 1150, 82, 35000),
    ag("Acme — Brand Search [BOFU]",          C_BRAND, "Acme — Brand Phrase",       2100, 15000, 700, 39, 14000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Broad",         4100, 65000, 980, 38, 9000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Phrase",        2800, 36000, 870, 43, 11000),
    ag("Term Life — Generic Search [MOFU]",   C_TERM,  "Term Life — Exact",         1700, 17000, 470, 23, 5000),
    ag("Competitor — Conquest Search [MOFU]", C_COMP,  "Competitor — Broad",        4900, 81000, 1300, 61, 16000),
    ag("Whole Life — Generic Search [TOFU]",  C_WHOLE, "Whole Life — Broad",        5400, 124000, 1150, 39, 10000),
    ag("Whole Life — Generic Search [TOFU]",  C_WHOLE, "Whole Life — Phrase",       3400, 62000, 950, 42, 12000),
    ag("Performance Max — Prospecting",       C_PMAX,  "PMax — Asset group 1",      8100, 430000, 2700, 116, 41000),
    ag("Demand Gen — Awareness [TOFU]",       C_DG,    "DemandGen — Lookalike",     6300, 560000, 2500, 71, 15000)
  ];

  var ads = [
    ad("Acme — Brand Search [BOFU]",        "Acme — Brand Exact",  "9001", "https://acme.example/brand-life-insurance", 2100, 54, 23000),
    ad("Acme — Brand Search [BOFU]",        "Acme — Brand Exact",  "9002", "https://acme.example/get-a-quote",          1700, 42, 18000),
    ad("Term Life — Generic Search [MOFU]", "Term Life — Broad",   "9003", "https://acme.example/term-life-insurance",  2600, 24, 6000),
    ad("Term Life — Generic Search [MOFU]", "Term Life — Phrase",  "9004", "https://acme.example/term-life-quote",      1900, 28, 8000),
    ad("Whole Life — Generic Search [TOFU]","Whole Life — Broad",  "9005", "https://acme.example/whole-life-insurance", 3400, 22, 6000),
    ad("Performance Max — Prospecting",     "PMax — Asset group 1","9006", "https://acme.example/life-insurance",       9300, 128, 47000)
  ];
  var prevAds = [
    ad("Acme — Brand Search [BOFU]",        "Acme — Brand Exact",  "9001", "https://acme.example/brand-life-insurance", 1800, 47, 20000),
    ad("Acme — Brand Search [BOFU]",        "Acme — Brand Exact",  "9002", "https://acme.example/get-a-quote",          1500, 35, 15000),
    ad("Term Life — Generic Search [MOFU]", "Term Life — Broad",   "9003", "https://acme.example/term-life-insurance",  2200, 19, 5000),
    ad("Term Life — Generic Search [MOFU]", "Term Life — Phrase",  "9004", "https://acme.example/term-life-quote",      1600, 24, 7000),
    ad("Whole Life — Generic Search [TOFU]","Whole Life — Broad",  "9005", "https://acme.example/whole-life-insurance", 2800, 19, 5000),
    ad("Performance Max — Prospecting",     "PMax — Asset group 1","9006", "https://acme.example/life-insurance",       8100, 116, 41000)
  ];

  var searchTerms = [
    st("acme life insurance",        "Acme — Brand Search [BOFU]",          2400, 14000, 980, 78, 33000),
    st("acme term life",             "Acme — Brand Search [BOFU]",          1800, 9000, 620, 48, 19000),
    st("acme insurance reviews",     "Acme — Brand Search [BOFU]",          900, 6000, 360, 16, 6000),
    st("term life insurance",        "Term Life — Generic Search [MOFU]",   4200, 61000, 1100, 41, 11000),
    st("life insurance quote",       "Term Life — Generic Search [MOFU]",   3300, 38000, 880, 38, 9000),
    st("cheap term life",            "Term Life — Generic Search [MOFU]",   2300, 22000, 520, 22, 5000),
    st("whole life insurance",       "Whole Life — Generic Search [TOFU]",  6300, 140000, 1300, 44, 12000),
    st("best life insurance 2026",   "Whole Life — Generic Search [TOFU]",  4200, 70000, 1100, 46, 13000),
    st("northwind life insurance",   "Competitor — Conquest Search [MOFU]", 3100, 52000, 700, 31, 8000),
    st("globex insurance",           "Competitor — Conquest Search [MOFU]", 2300, 36000, 500, 24, 6000)
  ];
  var prevSearchTerms = [
    st("acme life insurance",        "Acme — Brand Search [BOFU]",          2100, 12000, 860, 67, 28000),
    st("acme term life",             "Acme — Brand Search [BOFU]",          1600, 8000, 540, 41, 16000),
    st("acme insurance reviews",     "Acme — Brand Search [BOFU]",          800, 5000, 320, 14, 5000),
    st("term life insurance",        "Term Life — Generic Search [MOFU]",   3700, 54000, 980, 36, 9000),
    st("life insurance quote",       "Term Life — Generic Search [MOFU]",   2900, 33000, 780, 31, 8000),
    st("cheap term life",            "Term Life — Generic Search [MOFU]",   2000, 19000, 470, 19, 5000),
    st("whole life insurance",       "Whole Life — Generic Search [TOFU]",  5400, 124000, 1150, 39, 10000),
    st("best life insurance 2026",   "Whole Life — Generic Search [TOFU]",  3400, 62000, 950, 42, 12000),
    st("northwind life insurance",   "Competitor — Conquest Search [MOFU]", 2800, 47000, 760, 35, 9000),
    st("globex insurance",           "Competitor — Conquest Search [MOFU]", 2100, 33000, 540, 26, 7000)
  ];

  return {
    account: { name: "Acme Insurance", id: "1234567890-1234567890" },
    brandTerm: "acme",
    campaigns: campaigns, adGroups: adGroups, ads: ads, searchTerms: searchTerms,
    previous: { campaigns: prevCampaigns, adGroups: prevAdGroups, ads: prevAds, searchTerms: prevSearchTerms }
  };
});
