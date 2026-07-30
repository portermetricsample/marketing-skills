/*
 * Porter Reporting — component: google-ads/campaign-performance-table
 * ------------------------------------------------------------------------
 * "Campaign Performance" — the canonical SUMAS entity table: one row per
 * campaign, columns grouped by SUMAS stage
 *
 *     <campaign> | Budget | Visibility | Engagement | Conversion
 *
 * each stage = a headline metric + stacked sub-metrics, every number carrying
 * its inline Δ vs the previous period, and each cell heat-tinted by that stage's
 * headline metric magnitude across the visible campaigns.
 *
 * Behaviour spec (source of truth): ../../../_foundation/component-contract.md
 *   → "Table" + "Canonical shape — the SUMAS table". This file IMPLEMENTS that
 *   spec; it does not restate it. Canonical example: the Acme Insurance report
 *   "Campaigns" page (`cmp_table`).
 *
 * Ownership (see _foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA: filter / sort /
 *     search, deriving rates (CTR / CPC / CPM / Cost-per-conv / ROAS), matching
 *     the previous period and computing each Δ + its MEANING (good/bad, inverted
 *     for cost metrics), the per-stage heat MAGNITUDE step, status → state, the
 *     Google Ads deep-link, number formatting, empty handling, and emitting the
 *     HTML structure with class hooks.
 *   Design owns APPEARANCE: what every class hook + token looks like — the heat
 *     ramp (--cf-1..--cf-5), the delta / badge / dot / roas colours
 *     (--good / --bad / …), fonts, borders, spacing, dark theme. NO hex colour
 *     or font name lives in this file. The full hook list is in README.md.
 *
 * It is a GENERATOR: it RECEIVES rows (it never fetches) and EMITS an HTML
 * string. `mount` adds the browser control bar (filters / sort / search) + the
 * client-side re-render.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.campaignPerformanceTable = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // -- which keys the generator reads off each campaign row (connector-agnostic) --
  // Defaults are the Google Ads field names; override via opts.fields for another
  // connector. NOTE: `cost` and `budget` arrive ALREADY in currency units — Porter
  // delivers the *_micros fields pre-converted — so the component never re-scales.
  var BASE = {
    campaign:        "google_ads_campaign_name",
    campaignId:      "google_ads_campaign_id",
    status:          "google_ads_campaign_status",
    type:            "google_ads_campaign_advertising_channel_type",
    biddingStrategy: "google_ads_campaign_bidding_strategy_type",
    cost:            "google_ads_cost_micros",
    impressions:     "google_ads_impressions",
    clicks:          "google_ads_clicks",
    conversions:     "google_ads_conversions",
    convValue:       "google_ads_conversions_value",
    impressionShare: "google_ads_search_impression_share",
    isLostBudget:    "google_ads_search_budget_lost_impression_share",
    isLostRank:      "google_ads_search_rank_lost_impression_share",
    budget:          "google_ads_campaign_budget_amount_micros"
  };

  // Deep-link to the campaign in the Google Ads UI (opens in a new tab).
  var ADS_URL = "https://ads.google.com/aw/campaigns?campaignId=";

  // ---------------------------------------------------------------- helpers --
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function group(v, dp) { // thousands separators with `dp` decimals
    var f = Math.pow(10, dp);
    var s = (Math.round(num(v) * f) / f).toFixed(dp);
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }

  function money(v) { return "$" + trimZeros(group(v, 2)); }
  function int(v) { return group(Math.round(num(v)), 0); }
  function dec(v) { return trimZeros(group(num(v), 2)); }
  function pct(v) { return (num(v) * 100).toFixed(2) + "%"; }
  function pctShare(v) { var x = num(v); if (x <= 1) x = x * 100; return x.toFixed(1) + "%"; }
  function roasFmt(v) { return num(v).toFixed(2) + "x"; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Bidding-strategy + campaign-type enums → human labels.
  var BID_LABELS = {
    MAXIMIZE_CONVERSIONS: "Maximize Conversions", TARGET_CPA: "Target CPA",
    MAXIMIZE_CONVERSION_VALUE: "Maximize Conv. Value", TARGET_ROAS: "Target ROAS",
    TARGET_IMPRESSION_SHARE: "Target Impression Share", MANUAL_CPC: "Manual CPC",
    MANUAL_CPM: "Manual CPM", MAXIMIZE_CLICKS: "Maximize Clicks", PERCENT_CPC: "Percent CPC"
  };
  function titleCase(v) {
    return String(v).split("_").map(function (w) {
      return w.charAt(0) + w.slice(1).toLowerCase();
    }).join(" ");
  }
  function bidLabel(v) {
    v = String(v || "");
    if (BID_LABELS[v]) return BID_LABELS[v];
    if (!v || v === "UNSPECIFIED" || v === "UNKNOWN") return "";
    return titleCase(v);
  }
  function typeLabel(v) { v = String(v || ""); return v ? titleCase(v) : ""; }
  // Google Ads campaign status → the dot's 2 visual states (colour owned by Design):
  // active = ENABLED (green), inactive = anything else — Paused or Removed (grey). The EXACT
  // status word still travels in the title/aria-label below, so collapsing the colour to two
  // never loses the paused-vs-removed detail.
  function statusState(v) {
    return String(v || "").toUpperCase() === "ENABLED" ? "active" : "inactive";
  }
  // …and the human status label that travels WITH the dot (title + aria-label), so the
  // current campaign status is exposed by more than colour alone — hover tooltip, screen
  // readers, and colour-blind readers all get it. This is the current status from the data
  // feed (live Porter reports re-query it at view time); the component just renders it.
  var STATUS_LABELS = { ENABLED: "Enabled", PAUSED: "Paused", REMOVED: "Removed" };
  function statusLabel(v) {
    var k = String(v || "").toUpperCase();
    return STATUS_LABELS[k] || (k ? titleCase(k) : "Unknown");
  }

  // Inline Δ chip: value vs previous period, coloured by MEANING. `invert` flips
  // good/bad for cost-type metrics (a falling CPC/CPM/CPA is good). Emits a class
  // hook only — Design owns the colour.
  function delta(cur, prev, invert) {
    if (prev == null || prev === 0 || !isFinite(prev)) return "";
    var d = (cur - prev) / prev;
    if (!isFinite(d)) return "";
    var arrow = d > 0 ? "▲" : (d < 0 ? "▼" : "");
    var dir = d === 0 ? "flat" : (((d > 0) !== !!invert) ? "good" : "bad");
    return ' <span class="cpt-delta cpt-delta--' + dir + '">' + arrow + Math.abs(d * 100).toFixed(0) + "%</span>";
  }

  // Map a value to one of 5 heat steps within [mn, mx] → "cf-1".."cf-5"
  // (low → high = red → green; Design owns the actual colours).
  function heatStep(v, mn, mx) {
    if (mx <= mn) return 5;
    var r = (v - mn) / (mx - mn);
    var s = 1 + Math.floor(r * 5);
    return s < 1 ? 1 : (s > 5 ? 5 : s);
  }

  // One SUMAS stage cell: headline value + stacked sub-metrics, heat-tinted.
  function stageCell(headline, subs, heat) {
    var tint = heat ? ' style="background:var(--cf-' + heat + ')"' : "";
    var s = '<td class="cpt-cell"' + tint + '><div class="cpt-mv">' + headline + "</div>";
    for (var i = 0; i < subs.length; i++) s += '<span class="cpt-sub">' + subs[i] + "</span>";
    return s + "</td>";
  }

  // Normalise a raw connector row into the shape the table reads.
  function readRow(row, F) {
    return {
      name: row[F.campaign], id: row[F.campaignId], status: row[F.status],
      type: row[F.type], bid: row[F.biddingStrategy],
      cost: num(row[F.cost]), impr: num(row[F.impressions]), clk: num(row[F.clicks]),
      conv: num(row[F.conversions]), cval: num(row[F.convValue]),
      is: num(row[F.impressionShare]), budget: num(row[F.budget]),
      isLostBudget: num(row[F.isLostBudget]), isLostRank: num(row[F.isLostRank])
    };
  }

  // -------------------------------------------------------------- the build --
  function buildTable(opts) {
    opts = opts || {};
    var F = opts.fields || BASE;
    var emptyMessage = opts.emptyMessage || "No campaigns for this range";
    var periodDays = num(opts.periodDays) > 0 ? num(opts.periodDays) : 0;  // >0 enables the "Budget used %" sub

    var rows = (opts.rows || []).map(function (r) { return readRow(r, F); });
    var prevRows = (opts.previousRows || []).map(function (r) { return readRow(r, F); });

    // --- filters (client-side; a live report may bind these to Porter's native
    //     filters instead — see README "Wiring into a live Porter report") ---
    var search = (opts.search || "").toLowerCase();
    var campaign = opts.campaign || "";
    var type = opts.type || "";
    var bid = opts.biddingStrategy || "";
    rows = rows.filter(function (r) {
      if (search && String(r.name || "").toLowerCase().indexOf(search) < 0) return false;
      if (campaign && r.name !== campaign) return false;
      if (type && String(r.type || "") !== type) return false;
      if (bid && String(r.bid || "") !== bid) return false;
      return true;
    });

    if (!rows.length) return '<div class="cpt-empty">' + esc(emptyMessage) + "</div>";

    // --- previous period, looked up by campaign name ---
    var pmap = {};
    for (var i = 0; i < prevRows.length; i++) if (prevRows[i].name != null) pmap[prevRows[i].name] = prevRows[i];

    // --- account ROAS: colours each row's ROAS good/bad vs the whole account ---
    var totCost = 0, totVal = 0;
    rows.forEach(function (r) { totCost += r.cost; totVal += r.cval; });
    var ovRoas = div(totVal, totCost);

    // --- sort (default = conversions desc) ---
    var sk = opts.sort || "conv";
    rows.sort(function (a, b) {
      if (sk === "alpha") return String(a.name || "").localeCompare(String(b.name || ""));
      if (sk === "budget") return b.budget - a.budget;
      if (sk === "cpa") {
        var ca = a.conv > 0 ? a.cost / a.conv : Infinity, cb = b.conv > 0 ? b.cost / b.conv : Infinity;
        return ca - cb;
      }
      return b.conv - a.conv;
    });

    // --- per-stage heat ranges: the headline metric of each stage, across rows ---
    function rng(get) {
      var mx = 0, mn = null;
      rows.forEach(function (r) { var v = get(r); if (v > mx) mx = v; if (mn === null || v < mn) mn = v; });
      return { mn: mn || 0, mx: mx };
    }
    var rCost = rng(function (r) { return r.cost; }),
        rImpr = rng(function (r) { return r.impr; }),
        rClk  = rng(function (r) { return r.clk; }),
        rConv = rng(function (r) { return r.conv; });

    var h = '<table class="cpt"><thead><tr>' +
            '<th class="cpt-camp">Campaign</th><th>Budget</th><th>Visibility</th>' +
            "<th>Engagement</th><th>Conversion</th></tr></thead><tbody>";

    rows.forEach(function (r) {
      var p = pmap[r.name] || null;
      // derived rates (this period + previous, for the deltas)
      var ctr = div(r.clk, r.impr), cpc = div(r.cost, r.clk), cpm = div(r.cost, r.impr) * 1000,
          cpa = div(r.cost, r.conv), roas = div(r.cval, r.cost), cvr = div(r.conv, r.clk),
          budgetUsed = (periodDays && r.budget) ? div(r.cost, r.budget * periodDays) : null;
      var pCtr = p ? div(p.clk, p.impr) : null, pCpc = p ? div(p.cost, p.clk) : null,
          pCpm = p ? div(p.cost, p.impr) * 1000 : null, pCpa = p ? div(p.cost, p.conv) : null,
          pRoas = p ? div(p.cval, p.cost) : null, pCvr = p ? div(p.conv, p.clk) : null;

      // campaign cell: status dot (current status, labelled) · deep-linked name (new tab) · type + bidding badges
      var typ = typeLabel(r.type), bsl = bidLabel(r.bid), stLabel = statusLabel(r.status);
      var nameCell = '<td class="cpt-camp"><span class="cpt-dot cpt-dot--' + statusState(r.status) +
        '" role="img" title="' + esc(stLabel) + '" aria-label="Status: ' + esc(stLabel) + '"></span>' +
        (r.id
          ? '<a class="cpt-link" href="' + ADS_URL + esc(r.id) + '" target="_blank" rel="noopener">' + esc(r.name) + " ↗</a>"
          : '<span class="cpt-link">' + esc(r.name) + "</span>") +
        (typ ? ' <span class="cpt-badge cpt-badge--type" title="Campaign type">' + esc(typ) + "</span>" : "") +
        (bsl ? ' <span class="cpt-badge cpt-badge--bid" title="Bidding / optimization strategy">' + esc(bsl) + "</span>" : "") +
        "</td>";

      var roasCls = roas >= ovRoas ? "good" : "bad";

      h += "<tr>" + nameCell +
        // Budget — headline Cost, subs Daily budget (· Budget used %, when the period length is known)
        stageCell(money(r.cost) + delta(r.cost, p ? p.cost : null, false),
                  budgetUsed != null
                    ? ["Daily " + money(r.budget), "Budget used " + (budgetUsed * 100).toFixed(0) + "%"]
                    : ["Daily " + money(r.budget)],
                  heatStep(r.cost, rCost.mn, rCost.mx)) +
        // Visibility — headline Impressions, subs Search IS · IS lost (budget) · IS lost (rank) · CPM
        stageCell(int(r.impr) + delta(r.impr, p ? p.impr : null, false),
                  ["IS " + pctShare(r.is) + delta(r.is, p ? p.is : null, false),
                   "Lost (budget) " + pctShare(r.isLostBudget) + delta(r.isLostBudget, p ? p.isLostBudget : null, true),
                   "Lost (rank) " + pctShare(r.isLostRank) + delta(r.isLostRank, p ? p.isLostRank : null, true),
                   "CPM " + money(cpm) + delta(cpm, pCpm, true)],
                  heatStep(r.impr, rImpr.mn, rImpr.mx)) +
        // Engagement — headline Clicks, subs CTR · CPC
        stageCell(int(r.clk) + delta(r.clk, p ? p.clk : null, false),
                  ["CTR " + pct(ctr) + delta(ctr, pCtr, false),
                   "CPC " + money(cpc) + delta(cpc, pCpc, true)],
                  heatStep(r.clk, rClk.mn, rClk.mx)) +
        // Conversion — headline Conversions, subs CVR · Conv. value · Cost/conv · ROAS
        stageCell(dec(r.conv) + delta(r.conv, p ? p.conv : null, false),
                  ["CVR " + pct(cvr) + delta(cvr, pCvr, false),
                   "Conv. value " + money(r.cval) + delta(r.cval, p ? p.cval : null, false),
                   "Cost / conv. " + money(cpa) + delta(cpa, pCpa, true),
                   'ROAS <span class="cpt-roas--' + roasCls + '">' + roasFmt(roas) + "</span>" + delta(roas, pRoas, false)],
                  heatStep(r.conv, rConv.mn, rConv.mx)) +
        "</tr>";
    });

    return h + "</tbody></table>";
  }

  // ---- self-contained mount: control bar (filters / sort / search) + table ----
  // The control bar is part of this component (full module). In a live Porter
  // report you may instead bind Campaign type / Bidding to Porter's NATIVE filters
  // (which re-query) — see README. Here every control filters the given rows
  // client-side, so the component is self-contained and portable.
  var SORTS = [["conv", "Conversions"], ["cpa", "Cost / conv."], ["budget", "Budget"], ["alpha", "Alphabetical (A–Z)"]];

  function uniq(rows, key) {
    var seen = {}, out = [];
    (rows || []).forEach(function (r) {
      var v = r[key];
      if (v != null && v !== "" && !seen[v]) { seen[v] = 1; out.push(String(v)); }
    });
    out.sort();
    return out;
  }

  function scaffold(opts) {
    var F = opts.fields || BASE;
    var campOpts = '<option value="">All campaigns</option>' +
      uniq(opts.rows, F.campaign).map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");
    var typeOpts = '<option value="">All types</option>' +
      uniq(opts.rows, F.type).map(function (t) { return '<option value="' + esc(t) + '">' + esc(typeLabel(t)) + "</option>"; }).join("");
    var bidOpts = '<option value="">All strategies</option>' +
      uniq(opts.rows, F.biddingStrategy).map(function (b) { return '<option value="' + esc(b) + '">' + esc(bidLabel(b)) + "</option>"; }).join("");
    var sortOpts = SORTS.map(function (s) { return '<option value="' + s[0] + '">' + esc(s[1]) + "</option>"; }).join("");
    return '<div class="cpt-component">' +
      '<div class="cpt-controls">' +
        '<label class="cpt-filter">Campaign <select class="cpt-campaign">' + campOpts + "</select></label>" +
        '<label class="cpt-filter">Type <select class="cpt-type">' + typeOpts + "</select></label>" +
        '<label class="cpt-filter">Bidding <select class="cpt-bid">' + bidOpts + "</select></label>" +
        '<label class="cpt-filter">Sort by <select class="cpt-sort">' + sortOpts + "</select></label>" +
        '<input class="cpt-search" type="text" placeholder="Search campaigns… press Enter" />' +
      "</div>" +
      '<div class="cpt-host"></div>' +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;          // browser-only
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = scaffold(opts);
    var host = el.querySelector(".cpt-host");
    var state = { campaign: "", type: "", biddingStrategy: "", sort: opts.sort || "conv", search: "" };
    var elCamp = el.querySelector(".cpt-campaign"), elType = el.querySelector(".cpt-type"),
        elBid = el.querySelector(".cpt-bid"), elSort = el.querySelector(".cpt-sort"),
        elSearch = el.querySelector(".cpt-search");
    if (elSort) elSort.value = state.sort;

    function render() {
      host.innerHTML = buildTable({
        rows: opts.rows, previousRows: opts.previousRows, fields: opts.fields,
        campaign: state.campaign, type: state.type, biddingStrategy: state.biddingStrategy,
        sort: state.sort, search: state.search, emptyMessage: opts.emptyMessage,
        periodDays: opts.periodDays
      });
    }
    if (elCamp) elCamp.addEventListener("change", function () { state.campaign = elCamp.value; render(); });
    if (elType) elType.addEventListener("change", function () { state.type = elType.value; render(); });
    if (elBid) elBid.addEventListener("change", function () { state.biddingStrategy = elBid.value; render(); });
    if (elSort) elSort.addEventListener("change", function () { state.sort = elSort.value; render(); });
    if (elSearch) {
      elSearch.addEventListener("keydown", function (e) { if (e.key === "Enter") { state.search = elSearch.value; render(); } });
      elSearch.addEventListener("input", function () { if (elSearch.value === "") { state.search = ""; render(); } });
    }
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  // public surface (build + mount + the pieces, for tests / reuse)
  return {
    build: buildTable,
    mount: mount,
    BASE: BASE,
    fmt: { money: money, int: int, dec: dec, pct: pct, pctShare: pctShare, roasFmt: roasFmt },
    _internal: { readRow: readRow, delta: delta, heatStep: heatStep, bidLabel: bidLabel, typeLabel: typeLabel, statusState: statusState }
  };
});
