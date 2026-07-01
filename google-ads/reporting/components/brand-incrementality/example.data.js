/*
 * Fictional demo data for brand-incrementality — "Northwind" (lead-gen), account
 * 1234567890-1234567890. Synthetic numbers (RULES.md #3). Two periods for the Δ chips.
 * Raw campaign rows = what a live Porter report injects at view time. One campaign
 * carries a brand marker "(BR)" → Mode B (brand campaign exists).
 *
 * Blended: 1,840 conv · $42,180 · $22.92 CPA.  Excluding-branded: 1,120 · $34,780 · $31.05.
 */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) root.BI_EXAMPLE = data;
})(typeof self !== "undefined" ? self : this, function () {
  function row(name, cost, conv, clicks) {
    return { google_ads_campaign_name: name, google_ads_cost_micros: cost,
             google_ads_conversions: conv, google_ads_conversions_value: 0, google_ads_clicks: clicks };
  }
  var rows = [
    row("Northwind Brand (BR)", 7400, 720, 6000),                 // brand — cheap, defends the SERP
    row("Northwind Search - Generic", 18000, 600, 7000),
    row("Northwind Search - Competitor Conquest", 11000, 320, 4000),
    row("Northwind Search - Categories", 5780, 200, 3000)
  ];
  var previousRows = [
    row("Northwind Brand (BR)", 7200, 700, 5800),
    row("Northwind Search - Generic", 16800, 560, 6600),
    row("Northwind Search - Competitor Conquest", 9800, 280, 3700),
    row("Northwind Search - Categories", 5200, 180, 2800)
  ];
  return { rows: rows, previousRows: previousRows, brandName: "Northwind" };
});
