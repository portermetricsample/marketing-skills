/*
 * Porter Reporting — component: google-ads/brand-incrementality
 * ------------------------------------------------------------------------
 * "Branded vs non-branded search" — the INCREMENTALITY page. Receives raw
 * campaign rows, classifies each campaign brand vs non-brand by naming marker,
 * and renders the All / Excluding-branded view: a conversion-split donut + three
 * scorecards (Conversions · Spend · CPA-or-ROAS, each vs the previous period).
 *
 *   [ All searches | Excluding branded ]
 *   ( donut: non-brand vs brand share )   Conversions  Spend  CPA
 *
 * Branded searches convert cheaply and would mostly arrive anyway; the
 * Excluding-branded view is the incremental demand-gen number to scale on.
 *
 * Rubric twin (keep in sync): porter-analysis/google-ads/brand-incrementality.
 * Re-implements the campaign-level split in JS so a live report renders it from
 * raw rows injected at view time.
 *
 * Ownership (see _foundation/design-system.md): Reporting owns BEHAVIOUR +
 * STRUCTURE + DATA (classify brand by marker, aggregate the buckets, derive
 * CPA/ROAS, deltas vs previous, the donut proportions, the toggle); Design owns
 * APPEARANCE (the donut colours --bi-nonbrand / --bi-brand, delta / card tokens,
 * fonts, spacing). NO hex / font name here. Hooks listed in README.md.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) { root.PorterReporting = root.PorterReporting || {}; root.PorterReporting.brandIncrementality = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BASE = {
    campaign:    "google_ads_campaign_name",
    cost:        "google_ads_cost_micros",
    conversions: "google_ads_conversions",
    convValue:   "google_ads_conversions_value",
    clicks:      "google_ads_clicks"
  };
  var DEFAULT_MARKERS = ["brand", "(br)", "_br_", "-br-", "_brand", "brand_"];
  // Explicit non-brand label wins over any marker — "nonbranded" contains the substring "brand".
  var NONBRAND_SIGNALS = ["nonbrand", "non-brand", "non brand", "non_brand"];

  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function group(v, dp) {
    var f = Math.pow(10, dp), s = (Math.round(num(v) * f) / f).toFixed(dp), p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }
  function money(v) { return "$" + trimZeros(group(v, 2)); }
  function int(v) { return group(Math.round(num(v)), 0); }
  function roasFmt(v) { return num(v).toFixed(2) + "x"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // Δ chip vs previous, tone: "pos" (up good), "neg" (down good — cost metrics), "neutral" (spend).
  function delta(cur, prev, tone) {
    if (prev == null || prev === 0 || !isFinite(prev)) return "";
    var d = (cur - prev) / prev; if (!isFinite(d)) return "";
    var arrow = d > 0 ? "▲" : (d < 0 ? "▼" : "");
    var cls = tone === "neutral" ? "flat" : (d === 0 ? "flat" : (((d > 0) === (tone === "pos")) ? "good" : "bad"));
    return '<span class="bi-delta bi-delta--' + cls + '">' + arrow + " " + Math.abs(d * 100).toFixed(1) + "%</span>";
  }

  function isBrand(name, markers, names) {
    if (names.indexOf(name) >= 0) return true;
    var n = (name || "").toLowerCase();
    for (var s = 0; s < NONBRAND_SIGNALS.length; s++) if (n.indexOf(NONBRAND_SIGNALS[s]) >= 0) return false;
    for (var i = 0; i < markers.length; i++) if (n.indexOf(markers[i]) >= 0) return true;
    return false;
  }

  function aggregate(rows, F, markers, names) {
    var b = { all: z(), branded: z(), nonbranded: z() }, brandCamps = [];
    function z() { return { spend: 0, conv: 0, value: 0, clicks: 0 }; }
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], name = r[F.campaign], br = isBrand(name, markers, names);
      if (br && brandCamps.indexOf(name) < 0) brandCamps.push(name);
      var c = num(r[F.cost]), cv = num(r[F.conversions]), val = num(r[F.convValue]), ck = num(r[F.clicks]);
      var keys = ["all", br ? "branded" : "nonbranded"];
      for (var k = 0; k < keys.length; k++) {
        var t = b[keys[k]]; t.spend += c; t.conv += cv; t.value += val; t.clicks += ck;
      }
    }
    return { buckets: b, brandCampaigns: brandCamps };
  }

  function rates(t) {
    return { spend: t.spend, conv: t.conv, value: t.value,
             cpa: t.conv ? t.spend / t.conv : null, roas: t.spend ? t.value / t.spend : 0 };
  }

  function buildPanel(opts) {
    opts = opts || {};
    var F = opts.fields || BASE;
    var markers = (opts.brandCampaignMarkers || DEFAULT_MARKERS).map(function (m) { return String(m).toLowerCase(); });
    var names = opts.brandCampaignNames || [];
    var brandName = opts.brandName || "your brand";
    var view = opts.view === "exbrand" ? "exbrand" : "all";

    var rows = opts.rows || [];
    if (!rows.length) return '<div class="bi-empty">' + esc(opts.emptyMessage || "No campaigns for this range") + "</div>";

    var ag = aggregate(rows, F, markers, names);
    var cur = { all: rates(ag.buckets.all), branded: rates(ag.buckets.branded), nonbranded: rates(ag.buckets.nonbranded) };
    var prevAg = aggregate(opts.previousRows || [], F, markers, names);
    var prev = { all: rates(prevAg.buckets.all), branded: rates(prevAg.buckets.branded), nonbranded: rates(prevAg.buckets.nonbranded) };

    var ecommerce = cur.all.value > 0;
    var totConv = cur.all.conv || 1;
    var nbShare = cur.nonbranded.conv / totConv, brShare = cur.branded.conv / totConv;

    // the scorecards reflect the SELECTED bucket; the donut (the split) is constant.
    var b = view === "all" ? cur.all : cur.nonbranded;
    var pb = view === "all" ? prev.all : prev.nonbranded;
    var effLabel = ecommerce ? "ROAS" : "CPA";
    var effCur = ecommerce ? b.roas : b.cpa, effPrev = ecommerce ? pb.roas : pb.cpa;
    var effStr = ecommerce ? roasFmt(b.roas) : (b.cpa == null ? "—" : money(b.cpa));
    var effTone = ecommerce ? "pos" : "neg";   // ROAS up good; CPA down good

    var donut =
      '<div class="bi-donut-wrap">' +
        '<div class="bi-donut" style="--bi-split:' + (nbShare * 100).toFixed(2) + '%">' +
          '<div class="bi-donut-hole"><span class="bi-donut-k">Conv.</span><span class="bi-donut-v">' + int(cur.all.conv) + "</span></div>" +
        "</div>" +
        '<ul class="bi-legend">' +
          '<li class="bi-legend--nonbrand"><span class="bi-dot"></span>Non-branded ' + (nbShare * 100).toFixed(0) + "%</li>" +
          '<li class="bi-legend--brand"><span class="bi-dot"></span>Branded ' + (brShare * 100).toFixed(0) + "%</li>" +
        "</ul>" +
      "</div>";

    function card(label, valStr, d, highlight) {
      return '<div class="bi-card' + (highlight ? " bi-card--hi" : "") + '">' +
        '<div class="bi-card-k">' + esc(label) + "</div>" +
        '<div class="bi-card-v">' + valStr + "</div>" + (d || "") + "</div>";
    }
    var cards =
      '<div class="bi-cards">' +
        '<div class="bi-cards-eyebrow">' + (view === "all" ? "All searches" : "Excluding branded") + " · vs previous period</div>" +
        '<div class="bi-card-row">' +
          card("Conversions", int(b.conv), delta(b.conv, pb.conv, "pos")) +
          card("Spend", money(b.spend), delta(b.spend, pb.spend, "neutral")) +
          card(effLabel, effStr, delta(effCur, effPrev, effTone), true) +
        "</div>" +
      "</div>";

    var caption = view === "all"
      ? "Branded clicks are cheap (" + (cur.branded.cpa == null ? "low CPA" : "~" + money(cur.branded.cpa) + " CPA") +
        ") and many convert without ads — you bid to defend the brand. Useful, but it flatters this blended " + effLabel + "."
      : "The honest view: net-new customers who did not know you, the revenue Google Ads truly created, at the real " +
        effStr + " " + effLabel + ". This is the number to judge budget and scaling on.";

    return donut + cards + '<p class="bi-caption">' + esc(caption) + "</p>";
  }

  function scaffold(brandName) {
    return '<div class="bi-component">' +
      '<div class="bi-head">' +
        '<span class="bi-eyebrow">Incrementality</span>' +
        '<h2 class="bi-title">Branded vs non-branded search</h2>' +
        '<div class="bi-toggle" role="tablist">' +
          '<button class="bi-tog bi-tog--on" data-view="all" role="tab">All searches</button>' +
          '<button class="bi-tog" data-view="exbrand" role="tab">Excluding branded</button>' +
        "</div>" +
      "</div>" +
      '<p class="bi-intro">Branded searches — people already looking for ' + esc(brandName) +
        ' — convert cheaply and would mostly arrive without ads; you still bid to <b>defend</b> your position when ' +
        'competitors target your name. Toggle <b>Excluding branded</b> to isolate the <span class="bi-ink">incremental</span> ' +
        'result: the net-new customers and revenue Google Ads actually created — and the real cost behind them.</p>' +
      '<div class="bi-host"></div>' +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = scaffold(opts.brandName || "your brand");
    var host = el.querySelector(".bi-host"), state = { view: "all" };
    function render() {
      host.innerHTML = buildPanel({ rows: opts.rows, previousRows: opts.previousRows, fields: opts.fields,
        brandCampaignMarkers: opts.brandCampaignMarkers, brandCampaignNames: opts.brandCampaignNames,
        brandName: opts.brandName, targetCpa: opts.targetCpa, emptyMessage: opts.emptyMessage, view: state.view });
    }
    var togs = el.querySelectorAll(".bi-tog");
    for (var i = 0; i < togs.length; i++) togs[i].addEventListener("click", function (e) {
      state.view = e.currentTarget.getAttribute("data-view");
      for (var j = 0; j < togs.length; j++) togs[j].className = "bi-tog" + (togs[j] === e.currentTarget ? " bi-tog--on" : "");
      render();
    });
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  return { build: buildPanel, mount: mount, BASE: BASE,
           _internal: { aggregate: aggregate, isBrand: isBrand, delta: delta } };
});
