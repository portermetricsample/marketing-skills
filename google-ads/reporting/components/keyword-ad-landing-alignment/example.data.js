/*
 * google-ads/keyword-ad-landing-alignment — FICTIONAL demo data.
 * The two porter-analysis skill outputs for the fictional account
 * "Acme Insurance" (1234567890-1234567890), per RULES.md #3 — no real data.
 *
 *   alignment = keyword-ad-landing-alignment output  (the verdicts: findings[])
 *   metrics   = keyword-ad-landing-metrics output     (QS / IS / CTR / CVR / grades)
 *
 * They share the (campaign, ad_group) key so the component joins them. Five
 * ad groups span the three verdicts, and the grades exercise the Quality-Score
 * gate: `Dental_Broad` has quality_score:null (the pull summed it > 10 → the
 * skill nulled it) and a new keyword with no historical grades — so the card
 * must show NO "QS 0", just the categorical grades or nothing. Not real
 * performance.
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

  var alignment = {
    meta: {
      account: "Acme Insurance", connector: "google-ads", skill: "keyword-ad-landing-alignment",
      period: { from: "2026-05-01", to: "2026-05-31" },
      coverage: { search_spend: 41200, uncovered_spend: 18800, note: "$18.8K in PMax/Demand Gen is outside this skill." },
      journeys_analyzed: 5, currency: "USD"
    },
    synthesis: {
      headline: "$30.6K of $41.2K search spend flows through journeys that need attention — the biggest single leak is dental keywords landing on a generic Health page.",
      diagnosis: "The dominant break is wrong_page: dental and life-stage searches arrive on broad pages that never name the specific offer.",
      action: "Repoint Dental_Exact and Dental_Broad to a dedicated dental page (or lead its H1 with 'Dental')."
    },
    findings: [
      {
        // MULTI case — this group runs TWO ads to TWO different pages. The badge reads
        // "2 ads · 2 landing pages" and the card splits into one sub-card per ad → page.
        entity: { level: "ad_group", ad_group: "Dental_Exact", campaign: "Acme_Health_SEM" },
        verdict: "broken", spend: 9230,            // group rollup = worst pairing verdict
        ad_count: 2, landing_count: 2,
        intent: [
          { keyword: "dental insurance", match_type: "EXACT", spend: 5100, top_search_terms: [
            { term: "dental insurance plans", spend: 2100, on_intent: true },
            { term: "best dental coverage", spend: 1400, on_intent: true },
            { term: "affordable dental insurance", spend: 900, on_intent: true } ] },
          { keyword: "dental coverage", match_type: "PHRASE", spend: 4130, top_search_terms: [
            { term: "dental coverage near me", spend: 1600, on_intent: true },
            { term: "does insurance cover braces", spend: 700, on_intent: false, off_reason: "informational" } ] }
        ],
        pairings: [
          { ad_id: "692100000001",
            headlines: ["Affordable Dental Insurance", "Plans From $19/mo", "Get a Quote Today"],
            descriptions: ["Compare dental plans and enrol online in minutes."],
            destination: { final_url: "acme.com/health-insurance", page_title: "Health Insurance Plans",
              page_summary: "Hero 'Health Insurance Plans'; lists health/medical coverage; no mention of dental.",
              h1: "Health Insurance Plans", mismatch_word: "Health", scraped: true },
            links: [
              { link: "L2", name: "keyword_to_ad", grade: "pass", reason: "Headlines lead with 'Dental Insurance'." },
              { link: "L3", name: "ad_to_landing", grade: "fail", reason: "Page H1 reads 'Health Insurance Plans' — never names dental." },
              { link: "L4", name: "intent_to_landing", grade: "fail", reason: "A dental searcher cannot find a dental offer on the page." } ],
            verdict: "broken",
            recommendation: { break_type: "wrong_page", where: "Acme_Health_SEM › Dental_Exact › ad 692100000001",
              what: "Repoint this ad to the dedicated dental page (the other ad already uses it).",
              why: "The page headline says 'Health', not 'dental' — the scent breaks on arrival." } },
          { ad_id: "692100000011",
            headlines: ["Dental Insurance Plans", "Coverage From $19/mo", "Enrol in Minutes"],
            descriptions: ["Cleanings, fillings and major work — compare dental plans online."],
            destination: { final_url: "acme.com/dental-insurance", page_title: "Dental Insurance Plans",
              page_summary: "Hero 'Dental Insurance Plans' with a dental-specific quote form and plan tiers.",
              h1: "Dental Insurance Plans", mismatch_word: null, scraped: true },
            links: [
              { link: "L2", name: "keyword_to_ad", grade: "pass", reason: "Headlines lead with 'Dental Insurance'." },
              { link: "L3", name: "ad_to_landing", grade: "pass", reason: "Page H1 'Dental Insurance Plans' mirrors the ad." },
              { link: "L4", name: "intent_to_landing", grade: "pass", reason: "Dental quote form is above the fold." } ],
            verdict: "aligned",
            recommendation: { break_type: null, where: "Acme_Health_SEM › Dental_Exact › ad 692100000011",
              what: "Hold — this ad → dental page is coherent.",
              why: "All links pass; the page delivers the dental offer." } }
        ],
        // finding-level KEYWORD-DRIFT fix (an L1 problem, not tied to one ad/page)
        recommendation: { break_type: "keyword_drift", where: "Acme_Health_SEM › Dental_Exact",
          what: "Add 'does insurance cover braces' as a negative, or tighten the phrase keyword.",
          why: "$700 is going to a research query with no buying intent." }
      },
      {
        entity: { level: "ad_group", ad_group: "Dental_Broad", campaign: "Acme_Health_SEM" },
        verdict: "needs_review", spend: 6140,
        ad_count: 1, landing_count: 1,
        intent: [
          { keyword: "dental", match_type: "BROAD", spend: 6140, top_search_terms: [
            { term: "dental insurance", spend: 1900, on_intent: true },
            { term: "braces cost", spend: 1200, on_intent: false, off_reason: "informational" },
            { term: "tooth pain remedies", spend: 800, on_intent: false, off_reason: "wrong_product" } ] }
        ],
        pairings: [
          { ad_id: "692100000002",
            headlines: ["Dental Insurance Plans", "Enrol Online Today"],
            descriptions: ["Coverage for cleanings, fillings and more."],
            destination: { final_url: "acme.com/health-insurance",
              page_title: null, page_summary: "", h1: null, mismatch_word: null, scraped: false },
            links: [
              { link: "L2", name: "keyword_to_ad", grade: "partial", reason: "Ad speaks to insurance; some terms are clinical, not coverage." },
              { link: "L3", name: "ad_to_landing", grade: "unknown", reason: "Landing scrape returned empty — cannot confirm the page." },
              { link: "L4", name: "intent_to_landing", grade: "unknown", reason: "Page content unavailable." } ],
            verdict: "needs_review",
            recommendation: { break_type: null, where: "Acme_Health_SEM › Dental_Broad",
              what: "Add negatives for clinical terms (braces cost, tooth pain) and re-run once the page scrape succeeds.",
              why: "Broad match is mixing care-intent with coverage-intent; the page could not be verified." } }
        ]
      },
      {
        entity: { level: "ad_group", ad_group: "Term_Life_Exact", campaign: "Acme_Life_SEM" },
        verdict: "aligned", spend: 8420,
        ad_count: 1, landing_count: 1,
        intent: [
          { keyword: "term life insurance", match_type: "EXACT", spend: 8420, top_search_terms: [
            { term: "term life insurance quote", spend: 3400, on_intent: true },
            { term: "20 year term life", spend: 2100, on_intent: true } ] }
        ],
        pairings: [
          { ad_id: "692100000003",
            headlines: ["Term Life Insurance", "Free Quote in 2 Minutes", "Coverage From $15/mo"],
            descriptions: ["Get a personalised term life quote and apply online."],
            destination: { final_url: "acme.com/life/term-life-quote", page_title: "Term Life Insurance Quotes",
              page_summary: "Hero 'Term Life Insurance Quotes' with an above-the-fold quote form; rates and FAQ below.",
              h1: "Term Life Insurance Quotes", mismatch_word: null, scraped: true },
            links: [
              { link: "L2", name: "keyword_to_ad", grade: "pass", reason: "Headline reads 'Term Life Insurance — Free Quote'." },
              { link: "L3", name: "ad_to_landing", grade: "pass", reason: "Page H1 'Term Life Insurance Quotes' mirrors the ad." },
              { link: "L4", name: "intent_to_landing", grade: "pass", reason: "Quote form is above the fold; the searcher's need is met." } ],
            verdict: "aligned",
            recommendation: { break_type: null, where: "Acme_Life_SEM › Term_Life_Exact",
              what: "Hold — the journey is coherent. Scale budget if CPA allows.",
              why: "All links pass; the page delivers the quoted offer." } }
        ]
      },
      {
        entity: { level: "ad_group", ad_group: "Whole_Life_Phrase", campaign: "Acme_Life_SEM" },
        verdict: "broken", spend: 4980,
        ad_count: 1, landing_count: 1,
        intent: [
          { keyword: "whole life insurance", match_type: "PHRASE", spend: 4980, top_search_terms: [
            { term: "whole life insurance rates", spend: 1700, on_intent: true },
            { term: "permanent life insurance", spend: 1100, on_intent: true } ] }
        ],
        pairings: [
          { ad_id: "692100000004",
            headlines: ["Life Insurance Made Easy", "Term Life From $15/mo"],
            descriptions: ["Apply online in minutes."],
            destination: { final_url: "acme.com/life", page_title: "Life Insurance",
              page_summary: "General life-insurance hub; links to term, whole and universal but leads with term life.",
              h1: "Life Insurance", mismatch_word: "Term", scraped: true },
            links: [
              { link: "L2", name: "keyword_to_ad", grade: "fail", reason: "The ad pushes 'Term Life' — the wrong product for a whole-life searcher." },
              { link: "L3", name: "ad_to_landing", grade: "partial", reason: "Lands on the generic /life hub, not a whole-life page." },
              { link: "L4", name: "intent_to_landing", grade: "fail", reason: "No whole-life offer is reachable from the hub above the fold." } ],
            verdict: "broken",
            recommendation: { break_type: "ad_miss", where: "Acme_Life_SEM › Whole_Life_Phrase",
              what: "Write a whole-life ad (the copy currently sells term life) and point it at a whole-life page.",
              why: "The ad promises a different product than the searcher asked for." } }
        ]
      },
      {
        // LEGACY shape (singular message/destination, group-level links) — kept on purpose to
        // verify the component's back-compat path (pairingsOf synthesizes one pairing from it).
        entity: { level: "ad_group", ad_group: "Brand_Exact", campaign: "Acme_Brand" },
        verdict: "aligned", spend: 2030,
        links: [
          { link: "L1", name: "search_term_to_keyword", grade: "pass", reason: "'acme insurance' matches the brand keyword." },
          { link: "L2", name: "keyword_to_ad", grade: "pass", reason: "Headline names the brand." },
          { link: "L3", name: "ad_to_landing", grade: "pass", reason: "Lands on the homepage — expected for brand." },
          { link: "L4", name: "intent_to_landing", grade: "pass", reason: "Brand searchers find the brand; coherent." }
        ],
        intent: [
          { keyword: "acme insurance", match_type: "EXACT", spend: 2030, top_search_terms: [
            { term: "acme insurance", spend: 1500, on_intent: true },
            { term: "acme insurance login", spend: 320, on_intent: true } ] }
        ],
        message: { ad_id: "692100000005",
          headlines: ["Acme Insurance — Official Site", "Get a Quote or Sign In"],
          descriptions: ["Manage your policy or get a new quote."] },
        destination: { final_url: "acme.com",
          page_summary: "Brand homepage with quote and sign-in entry points.",
          h1: "Welcome to Acme Insurance", mismatch_word: null, scraped: true },
        recommendation: { break_type: null, where: "Acme_Brand › Brand_Exact",
          what: "Hold — brand → homepage is the right pattern.",
          why: "Brand intent is satisfied; no change needed." }
      }
    ],
    rollup: {
      byVerdict: { aligned: 2, needs_review: 1, broken: 2 },
      broken_spend: 14210, needs_review_spend: 6140,
      patterns: [
        { label: "Dental keywords → a generic 'Health' page", break_type: "wrong_page", spend: 9230 },
        { label: "Whole-life keyword → term-life ad/hub", break_type: "ad_miss", spend: 4980 }
      ],
      topFixes: [
        { where: "Acme_Health_SEM › Dental_Exact", what: "Repoint to a dental page / lead H1 with 'Dental'.", recovers: 9230 },
        { where: "Acme_Life_SEM › Whole_Life_Phrase", what: "Whole-life ad + whole-life page.", recovers: 4980 }
      ]
    }
  };

  var metrics = {
    meta: { account: "Acme Insurance", connector: "google-ads", skill: "keyword-ad-landing-metrics",
      period: { from: "2026-05-01", to: "2026-05-31" }, currency: "USD", campaign_type: "search",
      conversions_basis: "primary", site: "https://acme.com" },
    synthesis: {
      headline: "Dental_Exact carries the most search spend; its keyword/ad grades read Average while its landing-page experience reads Below Average.",
      diagnosis: "Grades sit Average-to-Above at the keyword and ad; landing-page experience is the lowest grade on the dental groups.",
      action: "Read these grades beside the alignment verdict — the verdict names which break each grade reflects."
    },
    journeys: [
      { campaign: "Acme_Health_SEM", ad_group: "Dental_Exact", spend: 9230,
        campaign_context: { search_top_impression_share: 0.58, search_absolute_top_impression_share: 0.29,
          rank_lost_top_impression_share: 0.22, budget_lost_top_impression_share: 0.20, is_lost_to: "rank" },
        keywords: [
          { keyword: "dental insurance", match_type: "EXACT", impressions: 8400, quality_score: 6,
            ad_relevance: "AVERAGE", expected_ctr: "AVERAGE", landing_page_experience: "BELOW_AVERAGE" },
          { keyword: "dental coverage", match_type: "PHRASE", impressions: 5200, quality_score: 5,
            ad_relevance: "AVERAGE", expected_ctr: "ABOVE_AVERAGE", landing_page_experience: "BELOW_AVERAGE" }
        ],
        ads: [
          { ad_id: "692100000001", impressions: 13600, clicks: 540, ctr: 0.0397, conversions: 24, cvr: 0.0444, thin_volume: false },
          { ad_id: "692100000011", impressions: 4200, clicks: 210, ctr: 0.0500, conversions: 16, cvr: 0.0762, thin_volume: false } ] },

      { campaign: "Acme_Health_SEM", ad_group: "Dental_Broad", spend: 6140,
        campaign_context: { search_top_impression_share: 0.58, search_absolute_top_impression_share: 0.29,
          rank_lost_top_impression_share: 0.22, budget_lost_top_impression_share: 0.20, is_lost_to: "rank" },
        keywords: [
          // QS came back summed (> 10) → the skill nulled it; the card must show NO "QS 0".
          { keyword: "dental", match_type: "BROAD", impressions: 9100, quality_score: null,
            ad_relevance: "BELOW_AVERAGE", expected_ctr: "BELOW_AVERAGE", landing_page_experience: null }
        ],
        ads: [ { ad_id: "692100000002", impressions: 9100, clicks: 300, ctr: 0.033, conversions: 4, cvr: 0.0133, thin_volume: true } ] },

      { campaign: "Acme_Life_SEM", ad_group: "Term_Life_Exact", spend: 8420,
        campaign_context: { search_top_impression_share: 0.71, search_absolute_top_impression_share: 0.42,
          rank_lost_top_impression_share: 0.18, budget_lost_top_impression_share: 0.11, is_lost_to: "rank" },
        keywords: [
          { keyword: "term life insurance", match_type: "EXACT", impressions: 11200, quality_score: 9,
            ad_relevance: "ABOVE_AVERAGE", expected_ctr: "ABOVE_AVERAGE", landing_page_experience: "ABOVE_AVERAGE" }
        ],
        ads: [ { ad_id: "692100000003", impressions: 11200, clicks: 520, ctr: 0.0464, conversions: 41, cvr: 0.0788, thin_volume: false } ] },

      { campaign: "Acme_Life_SEM", ad_group: "Whole_Life_Phrase", spend: 4980,
        campaign_context: { search_top_impression_share: 0.71, search_absolute_top_impression_share: 0.42,
          rank_lost_top_impression_share: 0.18, budget_lost_top_impression_share: 0.11, is_lost_to: "rank" },
        keywords: [
          { keyword: "whole life insurance", match_type: "PHRASE", impressions: 6400, quality_score: 4,
            ad_relevance: "BELOW_AVERAGE", expected_ctr: "AVERAGE", landing_page_experience: "AVERAGE" }
        ],
        ads: [ { ad_id: "692100000004", impressions: 6400, clicks: 210, ctr: 0.0328, conversions: 7, cvr: 0.0333, thin_volume: false } ] },

      { campaign: "Acme_Brand", ad_group: "Brand_Exact", spend: 2030,
        campaign_context: { search_top_impression_share: 0.93, search_absolute_top_impression_share: 0.78,
          rank_lost_top_impression_share: 0.05, budget_lost_top_impression_share: 0.02, is_lost_to: "rank" },
        keywords: [
          { keyword: "acme insurance", match_type: "EXACT", impressions: 9800, quality_score: 10,
            ad_relevance: "ABOVE_AVERAGE", expected_ctr: "ABOVE_AVERAGE", landing_page_experience: "ABOVE_AVERAGE" }
        ],
        ads: [ { ad_id: "692100000005", impressions: 9800, clicks: 880, ctr: 0.0898, conversions: 96, cvr: 0.1091, thin_volume: false } ] }
    ]
  };

  return {
    account: { name: "Acme Insurance", id: "1234567890-1234567890", connector: "google-ads" },
    period: { from: "2026-05-01", to: "2026-05-31", comparison: "previous-period" },
    alignment: alignment,
    metrics: metrics
  };
});
