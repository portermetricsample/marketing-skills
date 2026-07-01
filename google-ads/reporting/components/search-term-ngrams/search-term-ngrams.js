/*
 * Porter Reporting — component: google-ads/search-term-ngrams
 * ------------------------------------------------------------------------
 * "Search-term N-gram Mining" — the Brainlabs search-query-mining method as a
 * live report table. It RECEIVES raw search-term rows (search term + metrics),
 * breaks every term into 1/2/3-grams, adds up the metrics of every term that
 * contains each n-gram, and renders one sortable/filterable row per n-gram:
 *
 *     N-gram | n | Terms | Impr | Clicks | Cost | Conv | CTR | CPA/ROAS | Action
 *
 * with a bucket chip (waste / winning / brand / competitor / neutral) and, on
 * waste rows, the blast-radius FLAG chips (broad / rides-brand / competitor /
 * has-conversions). The flags are surfaced as warnings — the reader adjudicates
 * before negativing (same doctrine as the porter-analysis skill).
 *
 * Rubric source of truth (keep in sync):
 *   porter-analysis/google-ads/search-terms/n-grams/references/framework.md
 *   (n-gram construction · ecommerce/lead-gen detection · waste/winning rules ·
 *    the blast-radius guards). This file IMPLEMENTS the same rubric in JS so a
 *    live Porter report can render it from raw rows injected at view time.
 *
 * Ownership (see _foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA: the n-gram
 *     aggregation, deriving CTR/CPC/CPA/ROAS, the bucket + flags, deltas vs the
 *     previous period, the cost heat step, filter/sort/search, and emitting the
 *     HTML with class hooks.
 *   Design owns APPEARANCE: the heat ramp (--cf-1..--cf-5), the bucket / flag /
 *     delta colours, fonts, spacing. NO hex colour or font name lives here.
 *     The full hook list is in README.md.
 *
 * GENERATOR: it never fetches. `mount` adds the browser control bar + re-render.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.searchTermNgrams = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // -- which keys the generator reads off each search-term row --
  // Defaults are the Google Ads field names; override via opts.fields. Cost
  // arrives ALREADY in currency units (Porter pre-converts the *_micros field).
  var BASE = {
    term:        "google_ads_search_term",
    impressions: "google_ads_impressions",
    clicks:      "google_ads_clicks",
    cost:        "google_ads_cost_micros",
    conversions: "google_ads_conversions",
    convValue:   "google_ads_conversions_value"
  };

  // Unigram stop words — dropped for 1-grams (meaningless alone) but KEPT inside
  // 2/3-grams where "for free" / "near me" / "how to" carry the signal.
  var STOP = (function () {
    var w = ("a an and are as at be by do for from i in is it me my of on or the to with you your we us our " +
             "that this can vs").split(" "), s = {};
    for (var i = 0; i < w.length; i++) s[w[i]] = 1;
    return s;
  })();

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
  function int(v) { return group(Math.round(num(v)), 0); }
  function dec(v) { return trimZeros(group(num(v), 2)); }
  function pct(v) { return (num(v) * 100).toFixed(2) + "%"; }
  function roasFmt(v) { return num(v).toFixed(2) + "x"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Inline Δ chip vs previous period, coloured by MEANING. `invert` flips good/bad
  // for cost-type metrics (a falling CPA is good). Class hook only — Design colours it.
  function delta(cur, prev, invert) {
    if (prev == null || prev === 0 || !isFinite(prev)) return "";
    var d = (cur - prev) / prev;
    if (!isFinite(d)) return "";
    var arrow = d > 0 ? "▲" : (d < 0 ? "▼" : "");
    var dir = d === 0 ? "flat" : (((d > 0) !== !!invert) ? "good" : "bad");
    return ' <span class="sng-delta sng-delta--' + dir + '">' + arrow + Math.abs(d * 100).toFixed(0) + "%</span>";
  }

  // Map a value to one of 5 heat steps within [mn, mx] → "cf-1".."cf-5".
  function heatStep(v, mn, mx) {
    if (mx <= mn) return 5;
    var s = 1 + Math.floor(((v - mn) / (mx - mn)) * 5);
    return s < 1 ? 1 : (s > 5 ? 5 : s);
  }

  // ------------------------------------------------------ n-gram aggregation --
  function words(term) {
    return String(term == null ? "" : term).toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  }
  function termHasAny(termLc, list) {
    for (var i = 0; i < list.length; i++) {
      var t = list[i]; if (!t) continue;
      // word-boundary contains
      if (new RegExp("\\b" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(termLc)) return true;
    }
    return false;
  }

  // Aggregate rows -> { gram: {n, cost, clk, impr, conv, val, terms:[], brandTerms} }
  function aggregate(rows, F, stop) {
    var agg = {};
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r], term = row[F.term];
      var ws = words(term), termLc = String(term == null ? "" : term).toLowerCase();
      var cost = num(row[F.cost]), clk = num(row[F.clicks]), impr = num(row[F.impressions]),
          conv = num(row[F.conversions]), val = num(row[F.convValue]);
      var seen = {};
      for (var n = 1; n <= 3; n++) {
        for (var i = 0; i + n <= ws.length; i++) {
          var gram = ws.slice(i, i + n).join(" ");
          if (n === 1 && (stop[gram] || gram.length <= 1)) continue;
          if (seen[gram]) continue;                 // once per term
          seen[gram] = 1;
          var a = agg[gram] || (agg[gram] = { n: n, cost: 0, clk: 0, impr: 0, conv: 0, val: 0, terms: 0, brandTerms: 0, _lc: termLc });
          a.cost += cost; a.clk += clk; a.impr += impr; a.conv += conv; a.val += val; a.terms += 1;
        }
      }
    }
    return agg;
  }

  // Tag brand-term share per n-gram (share of its terms that are brand searches).
  function tagBrandShare(rows, F, brandTerms) {
    // second pass so brandTerms membership is per (gram x term); cheap for report sizes.
    var byGram = {};
    if (!brandTerms.length) return byGram;
    for (var r = 0; r < rows.length; r++) {
      var term = rows[r][F.term], termLc = String(term == null ? "" : term).toLowerCase();
      var isBrand = termHasAny(termLc, brandTerms);
      if (!isBrand) continue;
      var ws = words(term), seen = {};
      for (var n = 1; n <= 3; n++) for (var i = 0; i + n <= ws.length; i++) {
        var g = ws.slice(i, i + n).join(" ");
        if (seen[g]) continue; seen[g] = 1;
        byGram[g] = (byGram[g] || 0) + 1;
      }
    }
    return byGram;
  }

  // ------------------------------------------------------------- the build --
  function buildTable(opts) {
    opts = opts || {};
    var F = opts.fields || BASE;
    var rows = opts.rows || [];
    var prevRows = opts.previousRows || [];
    var brandTerms = (opts.brandTerms || []).map(function (s) { return String(s).toLowerCase(); });
    var competitorTerms = (opts.competitorTerms || []).map(function (s) { return String(s).toLowerCase(); });
    var stop = STOP; if (opts.stopWords) { stop = {}; for (var k in STOP) stop[k] = 1; (opts.stopWords).forEach(function (s) { stop[String(s).toLowerCase()] = 1; }); }
    var minTerms = num(opts.minTerms) > 0 ? num(opts.minTerms) : 2;
    var minCostWaste = num(opts.minCostWaste);
    var winConv = opts.winConv != null ? num(opts.winConv) : 2;
    var winRoas = opts.winRoas != null ? num(opts.winRoas) : 2;
    var roasBe = opts.roasBreakeven != null ? num(opts.roasBreakeven) : 1;
    var targetCpa = opts.targetCpa != null ? num(opts.targetCpa) : null;
    var emptyMessage = opts.emptyMessage || "No search terms for this range";

    if (!rows.length) return '<div class="sng-empty">' + esc(emptyMessage) + "</div>";

    var totalTerms = rows.length;
    var ecommerce = false;
    for (var i = 0; i < rows.length; i++) { if (num(rows[i][F.convValue]) > 0) { ecommerce = true; break; } }
    var broadCut = Math.max(20, 0.10 * totalTerms);

    var agg = aggregate(rows, F, stop);
    var prevAgg = aggregate(prevRows, F, stop);
    var brandShareByGram = tagBrandShare(rows, F, brandTerms);

    function classify(gram) {
      if (termHasAny(gram, brandTerms)) return "brand";
      if (termHasAny(gram, competitorTerms)) return "competitor";
      return "generic";
    }

    // build records
    var recs = [];
    for (var gram in agg) {
      var a = agg[gram];
      if (a.terms < minTerms) continue;
      var cls = classify(gram);
      var cpa = a.conv > 0 ? a.cost / a.conv : null;
      var roas = a.cost > 0 ? a.val / a.cost : 0;
      var ctr = div(a.clk, a.impr);
      var broad = a.terms >= broadCut;
      var brandShare = a.terms ? (brandShareByGram[gram] || 0) / a.terms : 0;

      var bucket, flags = [];
      var isWin = (a.conv >= winConv) && (ecommerce ? roas >= winRoas : (targetCpa == null || (cpa != null && cpa <= targetCpa)));
      var isWaste = (a.cost >= minCostWaste) && (ecommerce ? roas < roasBe : a.conv === 0);

      if (cls === "brand") { bucket = "brand"; }
      else if (isWin) { bucket = "winning"; }
      else if (isWaste) {
        bucket = "waste";
        if (broad) flags.push("broad");
        if (brandShare >= 0.30) flags.push("rides-brand");
        if (cls === "competitor") flags.push("competitor");
        if (ecommerce && a.conv > 0) flags.push("has-conversions");
      } else if (cls === "competitor") { bucket = "competitor"; }
      else { bucket = "neutral"; }

      var p = prevAgg[gram] || null;
      recs.push({
        gram: gram, n: a.n, terms: a.terms, cost: a.cost, clk: a.clk, impr: a.impr,
        conv: a.conv, val: a.val, cpa: cpa, roas: roas, ctr: ctr, cls: cls, bucket: bucket,
        flags: flags, broad: broad,
        p: p ? { cost: p.cost, conv: p.conv, clk: p.clk, impr: p.impr,
                 cpa: p.conv > 0 ? p.cost / p.conv : null, roas: p.cost > 0 ? p.val / p.cost : 0,
                 ctr: div(p.clk, p.impr) } : null
      });
    }

    // --- filters ---
    var fN = opts.n || "", fBucket = opts.bucket || "", fClass = opts.klass || "", search = (opts.search || "").toLowerCase();
    recs = recs.filter(function (x) {
      if (fN && String(x.n) !== String(fN)) return false;
      if (fBucket && x.bucket !== fBucket) return false;
      if (fClass && x.cls !== fClass) return false;
      if (search && x.gram.indexOf(search) < 0) return false;
      return true;
    });
    if (!recs.length) return '<div class="sng-empty">' + esc(emptyMessage) + "</div>";

    // --- sort (default cost desc) ---
    var sk = opts.sort || "cost";
    recs.sort(function (a, b) {
      if (sk === "terms") return b.terms - a.terms;
      if (sk === "conv") return b.conv - a.conv;
      if (sk === "ctr") return b.ctr - a.ctr;
      if (sk === "cpa") { var ca = a.cpa == null ? Infinity : a.cpa, cb = b.cpa == null ? Infinity : b.cpa; return ca - cb; }
      if (sk === "roas") return b.roas - a.roas;
      if (sk === "alpha") return a.gram.localeCompare(b.gram);
      return b.cost - a.cost;
    });

    // --- cost heat range across the visible rows ---
    var mn = null, mx = 0;
    recs.forEach(function (x) { if (x.cost > mx) mx = x.cost; if (mn === null || x.cost < mn) mn = x.cost; });
    mn = mn || 0;

    var effCol = ecommerce ? "ROAS" : "CPA";
    var h = '<table class="sng"><thead><tr>' +
            '<th class="sng-term">N-gram</th><th>n</th><th>Terms</th><th>Impr</th>' +
            '<th>Clicks</th><th>Cost</th><th>Conv</th><th>CTR</th><th>' + effCol + '</th><th>Action</th>' +
            "</tr></thead><tbody>";

    var ACTION = { winning: "Expand", brand: "Defense", competitor: "Conquest?", neutral: "—" };

    recs.forEach(function (x) {
      var p = x.p;
      // Clean waste -> Negative; a FLAGGED waste downgrades to Review (the reader adjudicates the
      // blast-radius flag before negativing) — mirrors the porter-analysis skill's needs_confirm gate.
      var flagged = x.bucket === "waste" && x.flags.length > 0;
      var action = x.bucket === "waste" ? (flagged ? "Review" : "Negative") : ACTION[x.bucket];
      var actionCls = flagged ? "review" : x.bucket;
      var chips = '<span class="sng-bucket sng-bucket--' + x.bucket + '">' + x.bucket + "</span>";
      x.flags.forEach(function (f) { chips += ' <span class="sng-flag sng-flag--' + f + '" title="confirm before negativing">' + f + "</span>"; });
      var effCell = ecommerce
        ? roasFmt(x.roas) + delta(x.roas, p ? p.roas : null, false)
        : (x.cpa == null ? "—" : money(x.cpa) + delta(x.cpa, p ? p.cpa : null, true));
      var tint = ' style="background:var(--cf-' + heatStep(x.cost, mn, mx) + ')"';

      h += "<tr>" +
        '<td class="sng-term"><span class="sng-gram">' + esc(x.gram) + "</span> " + chips + "</td>" +
        '<td class="sng-n"><span class="sng-nbadge sng-nbadge--' + x.n + '">' + x.n + "g</span></td>" +
        '<td class="sng-terms">' + int(x.terms) + "</td>" +
        '<td>' + int(x.impr) + "</td>" +
        '<td>' + int(x.clk) + delta(x.clk, p ? p.clk : null, false) + "</td>" +
        '<td class="sng-cost"' + tint + ">" + money(x.cost) + delta(x.cost, p ? p.cost : null, false) + "</td>" +
        '<td>' + dec(x.conv) + delta(x.conv, p ? p.conv : null, false) + "</td>" +
        '<td>' + pct(x.ctr) + "</td>" +
        '<td class="sng-eff">' + effCell + "</td>" +
        '<td><span class="sng-action sng-action--' + actionCls + '">' + action + "</span></td>" +
        "</tr>";
    });

    return h + "</tbody></table>";
  }

  // ------------------------------------ self-contained mount: controls + table --
  var SORTS = [["cost", "Cost"], ["conv", "Conversions"], ["terms", "# terms"], ["ctr", "CTR"], ["cpa", "CPA"], ["roas", "ROAS"], ["alpha", "A–Z"]];
  var BUCKETS = [["", "All buckets"], ["waste", "Waste (negative)"], ["winning", "Winning (expand)"], ["brand", "Brand"], ["competitor", "Competitor"], ["neutral", "Neutral"]];
  var NS = [["", "All n"], ["1", "Unigram"], ["2", "Bigram"], ["3", "Trigram"]];
  var CLASSES = [["", "Brand + non-brand"], ["generic", "Non-brand only"], ["brand", "Brand only"], ["competitor", "Competitor only"]];

  function optList(pairs) {
    return pairs.map(function (p) { return '<option value="' + esc(p[0]) + '">' + esc(p[1]) + "</option>"; }).join("");
  }

  function scaffold() {
    return '<div class="sng-component">' +
      '<div class="sng-controls">' +
        '<label class="sng-filter">N-gram <select class="sng-n">' + optList(NS) + "</select></label>" +
        '<label class="sng-filter">Bucket <select class="sng-bucket-f">' + optList(BUCKETS) + "</select></label>" +
        '<label class="sng-filter">Brand <select class="sng-class">' + optList(CLASSES) + "</select></label>" +
        '<label class="sng-filter">Sort by <select class="sng-sort">' + optList(SORTS) + "</select></label>" +
        '<input class="sng-search" type="text" placeholder="Search n-grams… press Enter" />' +
      "</div>" +
      '<div class="sng-host"></div>' +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = scaffold();
    var host = el.querySelector(".sng-host");
    var state = { n: "", bucket: "", klass: "", sort: opts.sort || "cost", search: "" };
    var elN = el.querySelector(".sng-n"), elB = el.querySelector(".sng-bucket-f"),
        elC = el.querySelector(".sng-class"), elS = el.querySelector(".sng-sort"),
        elSearch = el.querySelector(".sng-search");
    if (elS) elS.value = state.sort;

    function render() {
      host.innerHTML = buildTable({
        rows: opts.rows, previousRows: opts.previousRows, fields: opts.fields,
        brandTerms: opts.brandTerms, competitorTerms: opts.competitorTerms,
        targetCpa: opts.targetCpa, roasBreakeven: opts.roasBreakeven,
        minTerms: opts.minTerms, minCostWaste: opts.minCostWaste,
        winConv: opts.winConv, winRoas: opts.winRoas, stopWords: opts.stopWords,
        n: state.n, bucket: state.bucket, klass: state.klass, sort: state.sort, search: state.search,
        emptyMessage: opts.emptyMessage
      });
    }
    if (elN) elN.addEventListener("change", function () { state.n = elN.value; render(); });
    if (elB) elB.addEventListener("change", function () { state.bucket = elB.value; render(); });
    if (elC) elC.addEventListener("change", function () { state.klass = elC.value; render(); });
    if (elS) elS.addEventListener("change", function () { state.sort = elS.value; render(); });
    if (elSearch) {
      elSearch.addEventListener("keydown", function (e) { if (e.key === "Enter") { state.search = elSearch.value; render(); } });
      elSearch.addEventListener("input", function () { if (elSearch.value === "") { state.search = ""; render(); } });
    }
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  return {
    build: buildTable,
    mount: mount,
    BASE: BASE,
    fmt: { money: money, int: int, dec: dec, pct: pct, roasFmt: roasFmt },
    _internal: { aggregate: aggregate, words: words, delta: delta, heatStep: heatStep }
  };
});
