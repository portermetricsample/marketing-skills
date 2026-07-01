/*
 * Porter Reporting — component: google-ads/impression-share-competitiveness
 * ------------------------------------------------------------------------
 * "Search Impression Share — auction competitiveness (YOUR account)" — one row
 * per CAMPAIGN showing how much of the top-of-page Search auction you win and
 * where you lose the rest:
 *
 *     Campaign | Spend | Top IS | Abs. top IS | Lost · rank | Lost · budget | coverage bar | limiter
 *
 * The three top-IS shares (Top + Lost-to-rank + Lost-to-budget) sum to 100% of
 * the auctions you were eligible to show at the top of — so the coverage bar is
 * a faithful split of "won vs lost to rank vs lost to budget", and the limiter
 * chip names what is capping you (the standard budget-vs-rank diagnosis).
 *
 * WHY THIS COMPONENT EXISTS — the honest substitute for Auction Insights.
 *   The Google Ads "Auction Insights" report (named competitor domains with
 *   overlap / outranking / position-above / top-of-page rate per rival) CANNOT be
 *   built on the Porter google-ads connector: the catalog exposes the six
 *   `auction_insight_*` metrics but NO competitor/domain dimension to attribute
 *   them, and those metrics fail with `reauth_required` on a live account
 *   (verified live 2026-06-23 on a connected test account; documented in
 *   ~/porter-mcp-feedback/05-google-ads-auction-insights-no-competitor-dimension.md).
 *   This view is the
 *   best IS-based answer Porter CAN support: your OWN auction competitiveness,
 *   NOT competitor intelligence. It is labelled as such — it never invents rivals.
 *
 * Grain: CAMPAIGN. Impression Share is a campaign-grain metric in the metrics
 *   skill's contract (`campaign_context`). This component dedupes the metrics
 *   skill's journeys[] down to one row per campaign (or takes explicit rows).
 *
 * Ownership (see _foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA: deduping to campaign
 *     grain, summing spend, the spend-weighted account top-IS, the budget-vs-rank
 *     limiter call, sort, and emitting HTML with class hooks.
 *   Design owns APPEARANCE: every class hook + token. NO hex colour / font here.
 *
 * GENERATOR: it never fetches. `mount` adds the browser sort control + re-render.
 *
 * INPUT (pass ONE of):
 *   { rows: [ { campaign, spend, search_top_impression_share,
 *               search_absolute_top_impression_share, rank_lost_top_impression_share,
 *               budget_lost_top_impression_share, is_lost_to } , ... ] }
 *   { metrics: <keyword-ad-landing-metrics output> }   // deduped to campaign rows
 *   ...controls (sort, emptyMessage)
 * IS values are FRACTIONS (0–1), per the metrics skill's normalized contract
 * (the skill divides Porter's 0–100 percent scale by 100). Rendered via pct().
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.impressionShare = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------- helpers --
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function group(v, dp) {
    var f = Math.pow(10, dp);
    var s = (Math.round(num(v) * f) / f).toFixed(dp);
    var p = s.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }
  function money(v) { return "$" + trimZeros(group(v, 2)); }
  function pct(v) { return (num(v) * 100).toFixed(1) + "%"; }
  function pct0(v) { return Math.round(num(v) * 100) + "%"; }
  function clamp01(v) { v = num(v); return v < 0 ? 0 : v > 1 ? 1 : v; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // read tolerant of the two key spellings (with / without the `search_` prefix)
  function val(o, keys) {
    for (var i = 0; i < keys.length; i++) { var v = o[keys[i]]; if (v != null && v !== "") return v; }
    return null;
  }
  function readRow(r) {
    var ctx = r.campaign_context || r;
    return {
      campaign: r.campaign || r.campaign_name || "",
      spend: num(r.spend != null ? r.spend : r.cost),
      top: clamp01(val(ctx, ["search_top_impression_share", "top_impression_share"])),
      abs: clamp01(val(ctx, ["search_absolute_top_impression_share", "absolute_top_impression_share"])),
      rankLost: clamp01(val(ctx, ["rank_lost_top_impression_share", "search_rank_lost_top_impression_share"])),
      budgetLost: clamp01(val(ctx, ["budget_lost_top_impression_share", "search_budget_lost_top_impression_share"])),
      lostTo: String(ctx.is_lost_to || "").toLowerCase()
    };
  }

  // dedupe a metrics-skill journeys[] down to one row per campaign (campaign-grain
  // IS lives in campaign_context, identical across the campaign's ad groups; spend sums)
  function fromMetrics(metrics) {
    var map = {}, order = [];
    var journeys = (metrics && metrics.journeys) || [];
    for (var i = 0; i < journeys.length; i++) {
      var j = journeys[i], c = String(j.campaign || "");
      if (!map[c]) { map[c] = { campaign: c, spend: 0, campaign_context: j.campaign_context || null }; order.push(c); }
      map[c].spend += num(j.spend);
      if (!map[c].campaign_context && j.campaign_context) map[c].campaign_context = j.campaign_context;
    }
    return order.map(function (c) { return map[c]; });
  }

  // ---- the budget-vs-rank limiter (the metrics skill's diagnosis, rendered) ----
  // Strong top coverage → little is lost. Otherwise name the bigger leak; both
  // high → rank + budget. Mirrors the metrics framework's diagnosis table; it
  // reads the skill's numbers, it does not invent a score.
  var LIMITER = {
    strong: { label: "Strong top coverage", mod: "strong" },
    budget: { label: "Budget-limited",      mod: "budget" },
    rank:   { label: "Rank-limited",        mod: "rank" },
    both:   { label: "Rank + budget limited", mod: "both" }
  };
  function limiterOf(r) {
    if (r.top >= 0.80) return LIMITER.strong;
    var hiR = r.rankLost >= 0.20, hiB = r.budgetLost >= 0.20;
    if (hiR && hiB) return LIMITER.both;
    if (r.budgetLost > r.rankLost) return LIMITER.budget;       // tie → rank (address rank first)
    return LIMITER.rank;
  }

  // ------------------------------------------------------------- fragments --
  // coverage bar: Top + Lost-rank + Lost-budget = 100% of top-eligible auctions
  function coverageBar(r) {
    var top = clamp01(r.top), rl = clamp01(r.rankLost), bl = clamp01(r.budgetLost);
    var sum = top + rl + bl;
    if (sum <= 0) return '<div class="pis-bar pis-bar--empty"></div>';
    // normalise so the three segments fill the track even if they don't sum to exactly 1
    function w(x) { return (x / sum * 100).toFixed(2) + "%"; }
    return '<div class="pis-bar" role="img" aria-label="Top ' + pct0(top) + ', lost to rank ' + pct0(rl) + ', lost to budget ' + pct0(bl) + '">' +
      '<span class="pis-bar-seg pis-bar-seg--top" style="width:' + w(top) + '" title="Top IS ' + pct(top) + '"></span>' +
      '<span class="pis-bar-seg pis-bar-seg--lost-rank" style="width:' + w(rl) + '" title="Lost to rank ' + pct(rl) + '"></span>' +
      '<span class="pis-bar-seg pis-bar-seg--lost-budget" style="width:' + w(bl) + '" title="Lost to budget ' + pct(bl) + '"></span>' +
      "</div>";
  }

  function row(r) {
    var lim = limiterOf(r);
    return '<tr class="pis-row pis-row--' + lim.mod + '">' +
      '<td class="pis-camp">' + esc(r.campaign || "—") + "</td>" +
      '<td class="pis-spend">' + money(r.spend) + "</td>" +
      '<td class="pis-is pis-is--top">' + pct(r.top) + "</td>" +
      '<td class="pis-is pis-is--abs">' + pct(r.abs) + "</td>" +
      '<td class="pis-lost pis-lost--rank">' + pct(r.rankLost) + "</td>" +
      '<td class="pis-lost pis-lost--budget">' + pct(r.budgetLost) + "</td>" +
      '<td class="pis-coverage">' + coverageBar(r) + "</td>" +
      '<td class="pis-limiter pis-limiter--' + lim.mod + '">' + esc(lim.label) + "</td>" +
      "</tr>";
  }

  function header() {
    return '<thead><tr class="pis-head">' +
      "<th>Campaign</th><th>Spend</th>" +
      '<th title="How often your ad showed anywhere above organic results">Top IS</th>' +
      '<th title="How often your ad was the very first ad above organic results">Abs. top</th>' +
      '<th title="Top-of-page impressions lost because of Ad Rank (bid / Quality Score / assets)">Lost · rank</th>' +
      '<th title="Top-of-page impressions lost because the budget ran out">Lost · budget</th>' +
      '<th>Top-auction coverage</th><th>Limited by</th>' +
      "</tr></thead>";
  }

  function summary(rows) {
    var totalSpend = 0, wTop = 0, rankSpend = 0, budgetSpend = 0;
    rows.forEach(function (r) {
      totalSpend += r.spend;
      wTop += r.top * r.spend;                       // spend-weighted top IS
      var lim = limiterOf(r);
      if (lim.mod === "budget" || lim.mod === "both") budgetSpend += r.spend;
      if (lim.mod === "rank" || lim.mod === "both") rankSpend += r.spend;
    });
    var weightedTop = totalSpend ? wTop / totalSpend : 0;
    var stats = [
      '<span class="pis-sum-stat"><strong>' + rows.length + "</strong> campaigns</span>",
      '<span class="pis-sum-stat pis-sum-stat--spend"><strong>' + money(totalSpend) + "</strong> Search spend</span>",
      '<span class="pis-sum-stat pis-sum-stat--weighted-is"><strong>' + pct(weightedTop) + "</strong> top IS (spend-weighted)</span>",
      '<span class="pis-sum-stat pis-sum-stat--rank"><strong>' + money(rankSpend) + "</strong> behind rank-limited campaigns</span>",
      '<span class="pis-sum-stat pis-sum-stat--budget"><strong>' + money(budgetSpend) + "</strong> behind budget-limited campaigns</span>"
    ];
    return '<div class="pis-summary"><div class="pis-sum-stats">' + stats.join("") + "</div></div>";
  }

  // the honesty note — this is NOT competitor Auction Insights
  function note() {
    return '<p class="pis-note">Your account’s own Search auction competitiveness. ' +
      'This is <strong>not</strong> competitor Auction Insights — the Porter google-ads connector ' +
      'exposes no competitor-domain dimension, so rival domains, overlap rate and outranking share ' +
      'cannot be shown.</p>';
  }

  // -------------------------------------------------------------- the build --
  function build(opts) {
    opts = opts || {};
    var rows = (opts.rows ? opts.rows.map(readRow)
              : opts.metrics ? fromMetrics(opts.metrics).map(readRow)
              : []);
    var emptyMessage = opts.emptyMessage || "No Search impression-share data for this range";
    if (!rows.length) return '<div class="pis-empty">' + esc(emptyMessage) + "</div>";

    var sk = opts.sort || "spend";
    rows.sort(function (a, b) {
      if (sk === "exposure") return a.top - b.top;        // worst top-IS first (most room to grow)
      if (sk === "budget") return b.budgetLost - a.budgetLost;
      if (sk === "rank") return b.rankLost - a.rankLost;
      if (sk === "alpha") return String(a.campaign).localeCompare(String(b.campaign));
      return b.spend - a.spend;                           // default: biggest spend first
    });

    return note() + summary(rows) +
      '<table class="pis-table">' + header() + "<tbody>" + rows.map(row).join("") + "</tbody></table>";
  }

  // ----- loading skeleton -----
  function skeleton(n) {
    n = n || 4;
    var tr = "";
    for (var i = 0; i < n; i++) tr += '<tr class="pis-row pis-skeleton"><td colspan="8"></td></tr>';
    return '<table class="pis-table">' + header() + "<tbody>" + tr + "</tbody></table>";
  }

  // ----- self-contained mount: sort control + table -----
  var SORTS = [
    ["spend", "Search spend (highest first)"],
    ["exposure", "Lowest top IS first (most room to grow)"],
    ["budget", "Most lost to budget"],
    ["rank", "Most lost to rank"],
    ["alpha", "Campaign (A–Z)"]
  ];
  function scaffold() {
    var opts = SORTS.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
    return '<div class="pis-component">' +
      '<div class="pis-controls"><label class="pis-filter">Sort by ' +
        '<select class="pis-sort">' + opts + "</select></label></div>" +
      '<div class="pis-host"></div></div>';
  }
  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = scaffold();
    var host = el.querySelector(".pis-host");
    var elS = el.querySelector(".pis-sort");
    var state = { sort: opts.sort || "spend" };
    if (elS) elS.value = state.sort;
    function render() {
      host.innerHTML = build({ rows: opts.rows, metrics: opts.metrics, emptyMessage: opts.emptyMessage, sort: state.sort });
    }
    if (elS) elS.addEventListener("change", function () { state.sort = elS.value; render(); });
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  return {
    build: build,
    mount: mount,
    skeleton: skeleton,
    _internal: { fromMetrics: fromMetrics, readRow: readRow, limiterOf: limiterOf }
  };
});
