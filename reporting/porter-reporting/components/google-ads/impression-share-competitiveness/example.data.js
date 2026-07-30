/*
 * google-ads/impression-share-competitiveness — FICTIONAL demo data.
 * The keyword-ad-landing-metrics output for the fictional account
 * "Acme Insurance" (1234567890-1234567890), per RULES.md #3 — no real data.
 *
 * Reused from the alignment-journey example so the two components tell one story:
 * the same campaign-grain `campaign_context` (Impression Share), here deduped to
 * one row per campaign. Four campaigns span the limiter states:
 *   - Acme_Brand      → strong top coverage (top 93%)
 *   - Acme_Life_SEM   → rank-limited (loses more top auctions to rank than budget)
 *   - Acme_Health_SEM → rank + budget limited (both losses high)
 *   - Acme_Auto_SEM   → budget-limited (loses most top auctions to budget)
 * Top + Lost-to-rank + Lost-to-budget sum to 100% per campaign (Google's identity).
 * Synthetic numbers — not real performance.
 */
(function (root, factory) {
  var d = factory();
  if (typeof module === "object" && module.exports) module.exports = d;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.impressionShareExample = d;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Shaped like keyword-ad-landing-metrics output (journeys[] with campaign_context).
  var metrics = {
    meta: { account: "Acme Insurance", connector: "google-ads", skill: "keyword-ad-landing-metrics",
      period: { from: "2026-05-01", to: "2026-05-31" }, currency: "USD", campaign_type: "search" },
    journeys: [
      { campaign: "Acme_Health_SEM", ad_group: "Dental_Exact", spend: 9230,
        campaign_context: { search_top_impression_share: 0.58, search_absolute_top_impression_share: 0.29,
          rank_lost_top_impression_share: 0.22, budget_lost_top_impression_share: 0.20, is_lost_to: "rank" } },
      { campaign: "Acme_Health_SEM", ad_group: "Dental_Broad", spend: 6140,
        campaign_context: { search_top_impression_share: 0.58, search_absolute_top_impression_share: 0.29,
          rank_lost_top_impression_share: 0.22, budget_lost_top_impression_share: 0.20, is_lost_to: "rank" } },
      { campaign: "Acme_Life_SEM", ad_group: "Term_Life_Exact", spend: 8420,
        campaign_context: { search_top_impression_share: 0.71, search_absolute_top_impression_share: 0.42,
          rank_lost_top_impression_share: 0.18, budget_lost_top_impression_share: 0.11, is_lost_to: "rank" } },
      { campaign: "Acme_Life_SEM", ad_group: "Whole_Life_Phrase", spend: 4980,
        campaign_context: { search_top_impression_share: 0.71, search_absolute_top_impression_share: 0.42,
          rank_lost_top_impression_share: 0.18, budget_lost_top_impression_share: 0.11, is_lost_to: "rank" } },
      { campaign: "Acme_Auto_SEM", ad_group: "Auto_Exact", spend: 11200,
        campaign_context: { search_top_impression_share: 0.40, search_absolute_top_impression_share: 0.18,
          rank_lost_top_impression_share: 0.12, budget_lost_top_impression_share: 0.48, is_lost_to: "budget" } },
      { campaign: "Acme_Brand", ad_group: "Brand_Exact", spend: 2030,
        campaign_context: { search_top_impression_share: 0.93, search_absolute_top_impression_share: 0.78,
          rank_lost_top_impression_share: 0.05, budget_lost_top_impression_share: 0.02, is_lost_to: "rank" } }
    ]
  };

  return {
    account: { name: "Acme Insurance", id: "1234567890-1234567890", connector: "google-ads" },
    period: { from: "2026-05-01", to: "2026-05-31" },
    metrics: metrics
  };
});
