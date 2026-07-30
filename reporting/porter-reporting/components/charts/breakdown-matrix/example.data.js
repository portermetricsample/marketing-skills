/*
 * charts/breakdown-matrix — FICTIONAL demo data.
 * Synthetic numbers for the fictional account "Acme Insurance"
 * (1234567890-1234567890), per RULES.md #3 — no real account data in the repo.
 *
 * Grain: one row per DAY × CAMPAIGN (4 campaigns × 28 days = 112 rows,
 * 2026-05-04 → 2026-05-31). Each row carries several dimension columns
 * (`campaign`, `campaign_type`, `objective`, `product`) so the SAME series can be
 * re-sliced by any of them — time, campaign, objective, product — without
 * re-querying. Deterministic formula (no randomness) with a week-3 conversion dip
 * on everything except the Brand campaign. Not real performance.
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

  function r2(v) { return Math.round(v * 100) / 100; }
  function r4(v) { return Math.round(v * 10000) / 10000; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function pad(v) { return v < 10 ? "0" + v : "" + v; }

  var CAMPAIGNS = [
    { name: "Acme_Search_Term_Life",  type: "Search",          product: "Term Life",  objective: "Lead Gen", size: 1.00, cvr: 1.0 },
    { name: "Acme_Search_Whole_Life", type: "Search",          product: "Whole Life", objective: "Lead Gen", size: 0.70, cvr: 0.8 },
    { name: "Acme_PMax_Bundles",      type: "Performance Max",  product: "Bundles",    objective: "Sales",    size: 0.90, cvr: 1.2 },
    { name: "Acme_Brand_Defense",     type: "Search",          product: "Brand",      objective: "Brand",    size: 0.40, cvr: 1.6 }
  ];

  var series = [];
  for (var c = 0; c < CAMPAIGNS.length; c++) {
    var cp = CAMPAIGNS[c];
    for (var i = 0; i < 28; i++) {
      var dip = (i >= 14 && i <= 20 && cp.product !== "Brand") ? 0.55 : 1; // week-3 slump (brand resilient)
      var conv = Math.max(0, Math.round((20 * cp.size * cp.cvr + 5 * Math.sin(i / 3)) * dip));
      series.push({
        date: "202605" + pad(4 + i),
        campaign: cp.name,
        campaign_type: cp.type,
        objective: cp.objective,
        product: cp.product,
        cost: r2(620 * cp.size + 90 * Math.sin(i / 3) + 5 * i * cp.size),
        impressions: Math.round(12000 * cp.size + 1500 * Math.sin(i / 2 + 1)),
        clicks: Math.round(480 * cp.size + 60 * Math.sin(i / 2.3)),
        conversions: conv,
        conv_value: Math.round(conv * (115 + (i % 6))),
        impression_share: r4(clamp(0.40 + 0.08 * Math.sin(i / 3) + (cp.size - 0.7) * 0.05, 0.02, 0.95))
      });
    }
  }

  return {
    account: { name: "Acme Insurance", id: "1234567890-1234567890", connector: "google-ads" },
    period: { from: "2026-05-04", to: "2026-05-31", comparison: "previous-period" },
    granularityDefault: "week",
    series: series
  };
});
