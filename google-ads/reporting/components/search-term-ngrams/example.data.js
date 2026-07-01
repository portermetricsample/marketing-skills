/*
 * Fictional demo data for search-term-ngrams — "Acme Insurance" (lead-gen),
 * account 1234567890-1234567890. Synthetic numbers, no real account (RULES.md #3).
 * Two periods so the Δ chips are exercised. Raw search-term rows = exactly what a
 * live Porter report injects at view time.
 */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) root.SNG_EXAMPLE = data;
})(typeof self !== "undefined" ? self : this, function () {
  function row(term, impr, clk, cost, conv) {
    return {
      google_ads_search_term: term, google_ads_impressions: impr, google_ads_clicks: clk,
      google_ads_cost_micros: cost, google_ads_conversions: conv, google_ads_conversions_value: 0
    };
  }
  // term, impr, clicks, cost, conversions
  var rows = [
    // brand (defense — excluded from waste)
    row("acme life insurance", 2200, 180, 40, 30),
    row("acme insurance reviews", 300, 40, 18, 2),
    row("acme term life", 250, 30, 15, 3),
    row("is acme insurance legit", 180, 16, 9, 1),
    // winning generic themes (convert well)
    row("term life insurance quote", 800, 60, 150, 6),
    row("term life insurance", 900, 70, 140, 5),
    row("life insurance quote online", 700, 55, 120, 4),
    row("life insurance calculator", 650, 50, 90, 3),
    row("affordable term life insurance", 400, 32, 70, 3),
    // clean waste (negative candidates)
    row("cheapest life insurance", 500, 40, 70, 0),
    row("cheapest life insurance canada", 300, 25, 55, 0),
    row("cheapest life insurance online", 260, 20, 48, 0),
    row("free life insurance", 400, 30, 60, 0),
    row("free insurance quotes", 250, 20, 40, 0),
    row("life insurance jobs", 200, 15, 30, 0),
    row("life insurance agent jobs", 150, 12, 24, 0),
    row("is life insurance worth it", 350, 28, 45, 0),
    row("how does life insurance work", 300, 22, 38, 0),
    // competitor (conquest decision, not a mechanical negative)
    row("manulife life insurance", 300, 22, 35, 0),
    row("manulife term life insurance", 200, 15, 26, 0),
    row("sun life insurance quote", 200, 16, 28, 0),
    // rides-brand: "whole life" sits on the brand term too -> flagged, not auto-negatived
    row("whole life insurance acme", 180, 20, 22, 0),
    row("whole life insurance cost", 220, 18, 30, 0)
  ];

  // Previous period — same terms, slightly lower, to exercise the Δ chips.
  var previousRows = rows.map(function (r) {
    return {
      google_ads_search_term: r.google_ads_search_term,
      google_ads_impressions: Math.round(r.google_ads_impressions * 0.88),
      google_ads_clicks: Math.round(r.google_ads_clicks * 0.9),
      google_ads_cost_micros: +(r.google_ads_cost_micros * 0.92).toFixed(2),
      google_ads_conversions: Math.max(0, r.google_ads_conversions - (r.google_ads_conversions > 2 ? 1 : 0)),
      google_ads_conversions_value: 0
    };
  });

  return {
    rows: rows,
    previousRows: previousRows,
    brandTerms: ["acme"],
    competitorTerms: ["manulife", "sun life"],
    targetCpa: 40
  };
});
