/*
 * google-ads/campaign-performance-table — FICTIONAL demo data.
 * Synthetic numbers for the fictional account "Acme Insurance"
 * (1234567890-1234567890), per RULES.md #3 — no real account data in the repo.
 *
 * Two periods (current + previous) so the inline Δ vs previous-period chips are
 * exercised, with a spread of spend/impressions/clicks/conversions so the
 * per-stage heat ramp is visibly used, and the three campaign states
 * (enabled / paused / removed) all represented. Not real performance.
 *
 * Rows use the Google Ads field names the component reads by default (BASE).
 * `cost` and `budget` are in CURRENCY units already (as Porter delivers the
 * *_micros fields) — the component does not re-scale them. Search-campaign
 * impression-share splits roughly to IS + lost(budget) + lost(rank) ≈ 1;
 * non-search types (PMax, Demand Gen) carry 0 for the search-only IS fields.
 */
(function (root, factory) {
  var d = factory();
  if (typeof module === "object" && module.exports) module.exports = d;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.exampleData = d;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // is = search impression share · lb = IS lost to budget · lr = IS lost to rank
  function row(name, id, status, type, bid, cost, impr, clk, conv, cval, is, lb, lr, budget) {
    return {
      google_ads_campaign_name: name,
      google_ads_campaign_id: id,
      google_ads_campaign_status: status,
      google_ads_campaign_advertising_channel_type: type,
      google_ads_campaign_bidding_strategy_type: bid,
      google_ads_cost_micros: cost,
      google_ads_impressions: impr,
      google_ads_clicks: clk,
      google_ads_conversions: conv,
      google_ads_conversions_value: cval,
      google_ads_search_impression_share: is,
      google_ads_search_budget_lost_impression_share: lb,
      google_ads_search_rank_lost_impression_share: lr,
      google_ads_campaign_budget_amount_micros: budget
    };
  }

  // current period —————————————————————————————————————————————————————————
  var rows = [
    row("Acme_Brand_Search",          "1001", "ENABLED", "SEARCH",          "MAXIMIZE_CONVERSIONS",       1840.50, 41200,  3120, 142, 38900, 0.82, 0.04, 0.14,  80),
    row("Acme_Term_Life_Search",      "1002", "ENABLED", "SEARCH",          "TARGET_CPA",                 2610.00, 58400,  2240,  96, 31200, 0.41, 0.25, 0.34, 110),
    row("Acme_Auto_Insurance_Search", "1003", "ENABLED", "SEARCH",          "TARGET_CPA",                 1990.75, 47700,  1880,  74, 21800, 0.38, 0.22, 0.40,  90),
    row("Acme_Home_Insurance_Search", "1004", "ENABLED", "SEARCH",          "MAXIMIZE_CONVERSIONS",       1240.20, 30100,  1010,  41, 12450, 0.46, 0.18, 0.36,  60),
    row("Acme_Health_PMax",           "1005", "ENABLED", "PERFORMANCE_MAX", "MAXIMIZE_CONVERSION_VALUE",  3120.00, 88200,  2740, 120, 51800, 0,    0,    0,    130),
    row("Acme_Competitor_Conquest",   "1006", "ENABLED", "SEARCH",          "TARGET_IMPRESSION_SHARE",     940.60, 22600,   760,  18,  4300, 0.27, 0.15, 0.58,  50),
    row("Acme_Bundle_DemandGen",      "1007", "PAUSED",  "DEMAND_GEN",      "MAXIMIZE_CONVERSIONS",        610.00,154000,   980,  12,  2600, 0,    0,    0,     40),
    row("Acme_Renters_Search",        "1008", "REMOVED", "SEARCH",          "MAXIMIZE_CLICKS",             180.25,  8800,   410,   5,   900, 0.19, 0.31, 0.50,  25)
  ];

  // previous period (some up, some down — drives the Δ chips) ————————————————
  var previousRows = [
    row("Acme_Brand_Search",          "1001", "ENABLED", "SEARCH",          "MAXIMIZE_CONVERSIONS",       1700.00, 39000,  2950, 150, 41000, 0.80, 0.05, 0.15,  80),
    row("Acme_Term_Life_Search",      "1002", "ENABLED", "SEARCH",          "TARGET_CPA",                 2400.00, 52000,  2050,  88, 27000, 0.39, 0.28, 0.33, 100),
    row("Acme_Auto_Insurance_Search", "1003", "ENABLED", "SEARCH",          "TARGET_CPA",                 2100.00, 49000,  1950,  80, 23800, 0.40, 0.20, 0.40,  90),
    row("Acme_Home_Insurance_Search", "1004", "ENABLED", "SEARCH",          "MAXIMIZE_CONVERSIONS",       1180.00, 28800,   980,  44, 13100, 0.45, 0.19, 0.36,  60),
    row("Acme_Health_PMax",           "1005", "ENABLED", "PERFORMANCE_MAX", "MAXIMIZE_CONVERSION_VALUE",  2780.00, 80500,  2510, 101, 44900, 0,    0,    0,    120),
    row("Acme_Competitor_Conquest",   "1006", "ENABLED", "SEARCH",          "TARGET_IMPRESSION_SHARE",    1010.00, 24100,   800,  22,  5600, 0.30, 0.12, 0.58,  50),
    row("Acme_Bundle_DemandGen",      "1007", "ENABLED", "DEMAND_GEN",      "MAXIMIZE_CONVERSIONS",        720.00,169000,  1120,  16,  3500, 0,    0,    0,     40),
    row("Acme_Renters_Search",        "1008", "ENABLED", "SEARCH",          "MAXIMIZE_CLICKS",             240.00, 11200,   520,   9,  1700, 0.22, 0.28, 0.50,  25)
  ];

  return {
    account: { name: "Acme Insurance", id: "1234567890-1234567890", connector: "google-ads" },
    period: { from: "2026-05-01", to: "2026-05-31", days: 31, comparison: "previous-period" },
    rows: rows,
    previousRows: previousRows
  };
});
