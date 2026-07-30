/*
 * Fictional Google Ads rows for the account-contribution use case — three tables
 * in the raw query_data shape (google_ads_* fields). Acme Insurance
 * (1234567890-1234567890), SYNTHETIC numbers (RULES.md #3). Search-only so the
 * chain flows end-to-end; the numbers are rigged so the remainder buckets show.
 */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) { root.PorterReportingExamples = root.PorterReportingExamples || {}; root.PorterReportingExamples.accountContribution = data; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function ag(c, a, cost, conv, val) {
    return { google_ads_campaign_name: c, google_ads_campaign_advertising_channel_type: "SEARCH",
      google_ads_ad_group_name: a, google_ads_cost_micros: cost, google_ads_conversions: conv, google_ads_conversions_value: val };
  }
  function kw(c, a, k, m, cost, conv, val) {
    return { google_ads_campaign_name: c, google_ads_ad_group_name: a, google_ads_keyword_info_text: k,
      google_ads_keyword_info_match_type: m, google_ads_cost_micros: cost, google_ads_conversions: conv, google_ads_conversions_value: val };
  }
  function st(c, a, k, t, cost, conv, val) {
    return { google_ads_campaign_name: c, google_ads_ad_group_name: a, google_ads_keyword_info_text: k,
      google_ads_search_term: t, google_ads_cost_micros: cost, google_ads_conversions: conv, google_ads_conversions_value: val };
  }

  var BR = "Acme_Search_Brand", TL = "Acme_Search_TermLife", CO = "Acme_Search_Competitor";

  return {
    account: { id: "1234567890-1234567890", name: "Search campaigns" },

    adGroups: [
      ag(BR, "Brand Core",       450, 29, 5800),
      ag(TL, "Term Quotes",      440, 15, 3000),
      ag(TL, "Whole Life",       160,  5, 1000),
      ag(CO, "Competitor Names", 250,  4,  600)
    ],

    keywords: [
      kw(BR, "Brand Core",       "acme insurance",  "EXACT",  300, 20, 4000),
      kw(BR, "Brand Core",       "acme life quote", "PHRASE", 150,  9, 1800),
      kw(TL, "Term Quotes",      "term life quote", "BROAD",  220,  8, 1600),
      kw(TL, "Term Quotes",      "buy term life",   "BROAD",  180,  6, 1200),
      kw(TL, "Whole Life",       "whole life cost", "BROAD",  160,  5, 1000),
      kw(CO, "Competitor Names", "competitor name", "BROAD",  200,  4,  600)
      // Term Quotes keywords sum 400 < 440 → "other keywords" 40 / 1 / 200
      // Competitor Names keyword sum 200 < 250 → "other keywords" 50 / 0 / 0
    ],

    searchTerms: [
      st(BR, "Brand Core", "acme insurance",  "acme insurance",            250, 17, 3400),
      st(BR, "Brand Core", "acme insurance",  "acme insurance reviews",     30,  2,  400),
      st(BR, "Brand Core", "acme life quote", "acme life quote",           120,  7, 1500),
      st(BR, "Brand Core", "acme life quote", "acme term quote",            20,  1,  200),
      st(TL, "Term Quotes", "term life quote", "term life quote online",   150,  5, 1000),
      st(TL, "Term Quotes", "term life quote", "cheap term life quote",     50,  2,  400),
      st(TL, "Term Quotes", "buy term life",   "buy term life insurance",  130,  4,  900),
      st(TL, "Whole Life",  "whole life cost", "whole life insurance cost",110,  4,  800),
      st(CO, "Competitor Names", "competitor name", "competitorco",        120,  3,  400),
      st(CO, "Competitor Names", "competitor name", "competitorco reviews", 40,  1,  200)
      // each keyword's terms sum < its full spend → "other / unreported searches" absorbs the gap
    ]
  };
});
