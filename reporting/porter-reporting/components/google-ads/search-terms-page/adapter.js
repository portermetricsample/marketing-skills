/*
 * Porter Reporting — adapter: porter-analysis output  ->  search-terms-page shape
 * ------------------------------------------------------------------------
 * The analysis is TERM-centric (one record per search term, with a per-(term×keyword)
 * relevance list). The page is KEYWORD-centric (a card per keyword, its terms inside).
 * This adapter PIVOTS term -> (keyword × term), and derives the five flat dashboard
 * tags from the rich `labeling` tag vector. The derivation is owned by analysis —
 * see porter-analysis .../labeling/references/framework.md "Dashboard tag mapping".
 *
 *   Branded     <- brand_class == "brand"      (incl. misspelling)
 *   Competitor  <- brand_class == "competitor"
 *   Duplicate   <- cannibalized == true
 *   Irrelevant  <- THIS keyword's relevance verdict == "leak"   (per-pair, never misplaced/loose)
 *   Opportunity <- needs_own_keyword OR recommended_action == "hand_to_content"
 *
 * Inputs:
 *   rawRows   — the raw query_data rows (per keyword × term): the per-pair spend/conv the
 *               cards need (labeling aggregates spend per TERM, so we read it from raw).
 *   labeling  — the porter-analysis `labeling` output JSON (the tags).
 *   insights  — the porter-analysis `insights` output JSON ({ insights: {...} }); passed through.
 *   fields    — optional field-name overrides for rawRows.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.searchTermsPageAdapter = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var F = {
    keyword: "google_ads_keyword_info_text",
    matchType: "google_ads_keyword_info_match_type",
    term: "google_ads_search_term",
    spend: "google_ads_cost_micros",          // already currency — not /1e6
    conversions: "google_ads_conversions",
    status: "google_ads_search_term_view_status"
  };

  var TONE = { Branded: "purple", Duplicate: "yellow", Competitor: "aqua", Irrelevant: "pink", Opportunity: "green" };

  function num(v) { return Number(v) || 0; }
  function titleCaseMatch(m) {
    m = String(m || "").toLowerCase();
    return m === "exact" ? "Exact" : m === "phrase" ? "Phrase" : "Broad";
  }
  function isOn(status) {
    var s = String(status || "").toLowerCase();
    return !(s.indexOf("paus") >= 0 || s.indexOf("remov") >= 0 || s === "false");
  }

  // term -> its labeling record (for the term-level tags)
  function indexLabeling(labeling) {
    var byTerm = {};
    (labeling && labeling.terms ? labeling.terms : []).forEach(function (t) { byTerm[t.term] = t; });
    return byTerm;
  }

  // tags for ONE (keyword × term): term-level tags + the Irrelevant tag gated on THIS keyword's verdict
  function tagsFor(lrec, keyword) {
    if (!lrec) return [];
    var tg = lrec.tags || {}, out = [];
    if (tg.brand_class === "brand") out.push("Branded");
    if (tg.brand_class === "competitor") out.push("Competitor");
    if (tg.cannibalized) out.push("Duplicate");
    // Irrelevant = a `leak` verdict for THIS keyword only (never misplaced/loose).
    var leakHere = (tg.relevance || []).some(function (p) {
      return p.relevance === "leak" && (!keyword || !p.keyword || p.keyword === keyword);
    });
    if (leakHere) out.push("Irrelevant");
    var opp = (tg.cannibalization && tg.cannibalization.needs_own_keyword) ||
              lrec.recommended_action === "hand_to_content";
    if (opp) out.push("Opportunity");
    return out.map(function (label) { return { label: label, tone: TONE[label] }; });
  }

  function adapt(rawRows, labeling, insights, fields) {
    var f = fields || F;
    var byTerm = indexLabeling(labeling);
    var cards = {}, order = [];

    (rawRows || []).forEach(function (r) {
      var kw = r[f.keyword] || "(unknown keyword)";
      var key = kw + "||" + (r[f.matchType] || "");
      var card = cards[key];
      if (!card) {
        card = cards[key] = { keyword: kw, matchType: titleCaseMatch(r[f.matchType]),
                              terms: [], totals: { spend: 0, conversions: 0, cpa: null } };
        order.push(key);
      }
      var spend = num(r[f.spend]), conv = num(r[f.conversions]);
      card.terms.push({
        term: r[f.term], on: isOn(r[f.status]),
        spend: spend, conversions: conv,
        cpa: conv > 0 ? Math.round((spend / conv) * 100) / 100 : null,
        tags: tagsFor(byTerm[r[f.term]], kw)
      });
      card.totals.spend += spend; card.totals.conversions += conv;
    });

    var keywords = order.map(function (k) {
      var c = cards[k];
      c.totals.spend = Math.round(c.totals.spend * 100) / 100;
      c.totals.cpa = c.totals.conversions > 0
        ? Math.round((c.totals.spend / c.totals.conversions) * 100) / 100 : null;
      c.terms.sort(function (a, b) { return b.spend - a.spend; });
      return c;
    });
    keywords.sort(function (a, b) { return b.totals.spend - a.totals.spend; });

    return { keywords: keywords, insights: (insights && insights.insights) || insights || null };
  }

  return { adapt: adapt, tagsFor: tagsFor, F: F, TONE: TONE };
});
