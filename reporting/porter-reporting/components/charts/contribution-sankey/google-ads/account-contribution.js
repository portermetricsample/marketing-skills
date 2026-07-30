/*
 * Porter Reporting — use case: charts/contribution-sankey/google-ads/account-contribution
 * ------------------------------------------------------------------------
 * "Account contribution" — a Google Ads account drawn as a CONTRIBUTION SANKEY:
 *
 *     Campaign type ─ Campaign ─ Ad group ─ Keyword ─ Search term
 *
 * Ribbon width = the chosen metric (Spend / Conversions / Conv. value) flowing
 * through each split. A "Flow by" switch changes the metric; a "Depth" switch
 * stops at Keyword (4 levels) or extends to Search term (5 levels).
 *
 * This is a USE CASE on top of the general framework: it owns the GOOGLE-ADS
 * knowledge — which fields, joining ad groups → keywords → search terms, summing
 * the base counts, the BRANCH colour (one per campaign), and the honest REMAINDER
 * buckets that keep every column reconciled:
 *   • "other keywords"            = ad-group spend Google didn't attribute to a keyword
 *   • "other / unreported searches" = the keyword spend whose exact queries Google
 *                                     hides for privacy (+ the long tail past top-N)
 * The flow mechanics (layout, ribbons, highlight, tooltip) live in the engine.
 *
 * Ownership (see ../../../../_foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA — the joins, the sums,
 *     the remainder buckets, the branch keys, the depth/flow controls. Design owns
 *     APPEARANCE (all .sk-* hooks + the categorical tokens). NO hex / font here.
 *
 * Three input tables (raw query_data rows; the use case never fetches):
 *   adGroups    — ad-group totals (FULL spend)            → top of the funnel
 *   keywords    — keyword_view rows (full keyword spend)  → Ad group → Keyword
 *   searchTerms — search_term_view rows w/ matched keyword → Keyword → Search term
 *
 * Depends on ../contribution-sankey.js (PorterReporting.contributionSankey).
 */
(function (root, factory) {
  var engine = (typeof require === "function") ? require("../contribution-sankey") : null;
  var api = factory(engine, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.accountContribution = api;
  }
})(typeof self !== "undefined" ? self : this, function (engineFromRequire, root) {
  "use strict";

  function engine() { return engineFromRequire || (root && root.PorterReporting && root.PorterReporting.contributionSankey); }

  /* ---- which Google Ads keys we read (override via opts.fields) ------------- */
  var BASE = {
    campaign:   "google_ads_campaign_name",
    channel:    "google_ads_campaign_advertising_channel_type",
    adGroup:    "google_ads_ad_group_name",
    keyword:    "google_ads_keyword_info_text",
    match:      "google_ads_keyword_info_match_type",
    term:       "google_ads_search_term",
    cost:       "google_ads_cost_micros",
    conv:       "google_ads_conversions",
    value:      "google_ads_conversions_value"
  };
  var SEP = "\u241F";

  /* ---- helpers ------------------------------------------------------------- */
  function num(v) { return Number(v) || 0; }
  function m3() { return { cost: 0, conv: 0, value: 0 }; }
  function addRow(acc, r, F) { acc.cost += num(r[F.cost]); acc.conv += num(r[F.conv]); acc.value += num(r[F.value]); return acc; }
  function addM(a, b) { a.cost += b.cost; a.conv += b.conv; a.value += b.value; return a; }
  function sub(a, b) { return { cost: Math.max(0, a.cost - b.cost), conv: Math.max(0, a.conv - b.conv), value: Math.max(0, a.value - b.value) }; }
  function positive(m) { return m.cost > 0 || m.conv > 0 || m.value > 0; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var DEFAULT_METRICS = [
    { key: "cost",  label: "Spend",       format: "money" },
    { key: "conv",  label: "Conversions", format: "dec"   },
    { key: "value", label: "Conv. value", format: "money" }
  ];
  var TOOLTIP_ROWS = [
    { label: "Ad spend",    key: "cost",  format: "money" },
    { label: "Conversions", key: "conv",  format: "dec"   },
    { label: "Conv. value", key: "value", format: "money" },
    { label: "CPA", derive: function (v) { return v.conv ? v.cost / v.conv : 0; }, format: "money", skipZero: true }
  ];

  /* ---- build the generic { columns, nodes, links } ------------------------- */
  function buildData(opts) {
    opts = opts || {};
    var F = opts.fields || BASE;
    var topTerms = opts.topTerms || 6;
    var rootLabel = (opts.account && opts.account.name) || "Search campaigns";

    var adGroupRows = opts.adGroups || [];
    var keywordRows = opts.keywords || [];
    var termRows = opts.searchTerms || [];

    var nodes = [], links = [];
    var acc = m3();

    // ---- level 0/1/2 from ad-group totals (full spend) ----
    var campM = {};         // campaign -> metrics
    var agM = {};           // campaign|ag -> metrics
    adGroupRows.forEach(function (r) {
      var camp = r[F.campaign] || "(none)", ag = r[F.adGroup] || "(none)";
      var agKey = camp + SEP + ag;
      addRow(acc, r, F);
      addRow(campM[camp] || (campM[camp] = m3()), r, F);
      addRow(agM[agKey] || (agM[agKey] = m3()), r, F);
    });

    nodes.push({ id: "root", level: 0, label: rootLabel, values: acc });
    Object.keys(campM).forEach(function (camp) {
      nodes.push({ id: "c" + SEP + camp, level: 1, label: camp, branch: camp, values: campM[camp] });
      links.push({ source: "root", target: "c" + SEP + camp, values: campM[camp] });
    });
    Object.keys(agM).forEach(function (agKey) {
      var camp = agKey.split(SEP)[0], ag = agKey.split(SEP)[1];
      nodes.push({ id: "a" + SEP + agKey, level: 2, label: ag, branch: camp, values: agM[agKey] });
      links.push({ source: "c" + SEP + camp, target: "a" + SEP + agKey, values: agM[agKey] });
    });

    // ---- level 3: keywords (full keyword spend) + "other keywords" remainder ----
    var kwM = {};           // campaign|ag|kw -> metrics
    var kwMatch = {};       // campaign|ag|kw -> match type
    var kwSumByAg = {};     // campaign|ag -> summed keyword metrics
    keywordRows.forEach(function (r) {
      var camp = r[F.campaign] || "(none)", ag = r[F.adGroup] || "(none)", kw = r[F.keyword] || "(none)";
      var kwKey = camp + SEP + ag + SEP + kw, agKey = camp + SEP + ag;
      addRow(kwM[kwKey] || (kwM[kwKey] = m3()), r, F);
      kwMatch[kwKey] = r[F.match] || "";
      addRow(kwSumByAg[agKey] || (kwSumByAg[agKey] = m3()), r, F);
    });
    Object.keys(kwM).forEach(function (kwKey) {
      var parts = kwKey.split(SEP), camp = parts[0], ag = parts[1], kw = parts[2];
      if (!agM[camp + SEP + ag]) return;                              // no parent ad group → skip
      var lbl = kwMatch[kwKey] ? (kw + "  ·  " + String(kwMatch[kwKey]).toLowerCase()) : kw;
      nodes.push({ id: "k" + SEP + kwKey, level: 3, label: lbl, full: kw, branch: camp, values: kwM[kwKey] });
      links.push({ source: "a" + SEP + camp + SEP + ag, target: "k" + SEP + kwKey, values: kwM[kwKey] });
    });
    Object.keys(agM).forEach(function (agKey) {
      var rem = sub(agM[agKey], kwSumByAg[agKey] || m3());
      if (!positive(rem)) return;
      var camp = agKey.split(SEP)[0];
      nodes.push({ id: "ko" + SEP + agKey, level: 3, label: "other keywords", branch: "__other__", values: rem });
      links.push({ source: "a" + SEP + agKey, target: "ko" + SEP + agKey, values: rem });
    });

    // ---- level 4: search terms (top-N per keyword) + "other / unreported" remainder ----
    var byKw = {};          // keyword key -> [{label, m}]
    var stSumByKw = {};     // keyword key -> summed shown+all term metrics
    termRows.forEach(function (r) {
      var camp = r[F.campaign] || "(none)", ag = r[F.adGroup] || "(none)", kw = r[F.keyword] || "(none)";
      var kwKey = camp + SEP + ag + SEP + kw;
      if (!kwM[kwKey]) return;                                        // term's keyword not in keyword table → skip
      (byKw[kwKey] = byKw[kwKey] || []).push({ label: r[F.term] || "(empty)", m: addRow(m3(), r, F) });
    });
    Object.keys(byKw).forEach(function (kwKey) {
      var parts = kwKey.split(SEP), camp = parts[0];
      var arr = byKw[kwKey].sort(function (a, b) { return b.m.cost - a.m.cost; });
      var shown = m3();
      arr.slice(0, topTerms).forEach(function (t, i) {
        addM(shown, t.m);
        nodes.push({ id: "s" + SEP + kwKey + SEP + i, level: 4, label: t.label, branch: camp, values: t.m });
        links.push({ source: "k" + SEP + kwKey, target: "s" + SEP + kwKey + SEP + i, values: t.m });
      });
      // remainder = keyword full total − shown reported terms (long tail + privacy-hidden)
      var rem = sub(kwM[kwKey], shown);
      if (positive(rem)) {
        nodes.push({ id: "so" + SEP + kwKey, level: 4, label: "other / unreported searches", branch: "__other__", values: rem });
        links.push({ source: "k" + SEP + kwKey, target: "so" + SEP + kwKey, values: rem });
      }
    });

    return {
      columns: ["Campaign type", "Campaign", "Ad group", "Keyword", "Search term"],
      metrics: opts.metrics || DEFAULT_METRICS,
      nodes: nodes, links: links
    };
  }

  /* ---- mount: Flow-by + Depth controls + the sankey ------------------------ */
  function scaffold(metrics) {
    var mb = metrics.map(function (m, i) {
      return '<button class="sk-seg-btn' + (i === 0 ? " is-active" : "") + '" data-metric="' + esc(m.key) + '">' + esc(m.label) + "</button>";
    }).join("");
    return '<div class="sk-component ac-component">' +
      '<div class="sk-controls ac-controls">' +
        '<div class="sk-seg"><span class="sk-seg-lab">Flow by</span>' + mb + "</div>" +
        '<div class="sk-seg ac-depth"><span class="sk-seg-lab">Depth</span>' +
          '<button class="sk-seg-btn is-active" data-depth="3">→ Keyword</button>' +
          '<button class="sk-seg-btn" data-depth="4">→ Search term</button>' +
        "</div>" +
      "</div>" +
      '<div class="ac-host sk-host" data-porter-chart="account_contribution"></div>' +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    var SK = engine();
    if (!SK) { el.innerHTML = '<div class="sk-empty">contribution-sankey engine not loaded</div>'; return null; }

    var data = buildData(opts);
    if (!data.nodes.length) { el.innerHTML = '<div class="sk-empty">' + esc(opts.emptyMessage || "No data for this account") + "</div>"; return null; }

    var metrics = data.metrics;
    el.innerHTML = scaffold(metrics);
    var host = el.querySelector(".ac-host");
    var metricBtns = el.querySelectorAll(".sk-seg-btn[data-metric]");
    var depthBtns = el.querySelectorAll(".sk-seg-btn[data-depth]");

    var handle = SK.mount(host, {
      columns: data.columns, metrics: metrics, nodes: data.nodes, links: data.links,
      metric: opts.metric || metrics[0].key,
      maxLevel: opts.depth === 5 ? 4 : 3,
      metricToggle: false,                       // this use case owns the control bar
      tooltipRows: TOOLTIP_ROWS,
      height: opts.height || 560,
      emptyMessage: opts.emptyMessage
    });

    function setActive(list, attr, val) {
      for (var i = 0; i < list.length; i++) list[i].classList.toggle("is-active", list[i].getAttribute(attr) === String(val));
    }
    for (var i = 0; i < metricBtns.length; i++) metricBtns[i].addEventListener("click", function (e) {
      var k = e.currentTarget.getAttribute("data-metric"); setActive(metricBtns, "data-metric", k); handle.setMetric(k);
    });
    for (var j = 0; j < depthBtns.length; j++) depthBtns[j].addEventListener("click", function (e) {
      var d = e.currentTarget.getAttribute("data-depth"); setActive(depthBtns, "data-depth", d); handle.setMaxLevel(+d);
    });
    setActive(metricBtns, "data-metric", opts.metric || metrics[0].key);
    setActive(depthBtns, "data-depth", opts.depth === 5 ? 4 : 3);

    return { el: el, handle: handle, data: data, rerender: function () { handle.rerender(); } };
  }

  return { buildData: buildData, mount: mount, BASE: BASE, DEFAULT_METRICS: DEFAULT_METRICS };
});
