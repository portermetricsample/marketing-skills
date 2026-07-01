/*
 * Porter Reporting — use case: charts/driver-tree/google-ads/account-structure-tree
 * ------------------------------------------------------------------------
 * "Account Structure" — a Google Ads account drawn as a DRIVER TREE:
 *
 *     Account ─ Grouping ─ Campaign ─ Ad group ─ Ad
 *
 * with a "Group by" switcher that re-buckets the second column:
 *   • Campaign type   (Search / Performance Max / Demand Gen / …)
 *   • Brand intent    (Branded / Non-branded search terms — you pass the brand term)
 *   • Funnel stage    (TOFU / MOFU / BOFU, from a naming convention)
 *   • Match type      (Broad / Phrase-Exact / Brand / …, from ad-group naming)
 * …and, under the tree, a SUMAS breakdown table ("Spend & performance by <group>")
 * plus a coverage line. It is the reusable, account-agnostic version of the live
 * report's "Account Structure" page.
 *
 * This is a USE CASE on top of the general framework: it owns the GOOGLE-ADS
 * knowledge (field names, the lenses, the deep-links, the SUMAS metric set) and
 * turns Google Ads rows into the generic node tree that ../driver-tree.js draws.
 * The tree mechanics (columns, connectors, expand/collapse, efficiency colour,
 * Δ chips) all live in the engine — not here.
 *
 * Ownership (see ../../../../_foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA — the lenses, joining
 *     campaigns→ad groups→ads, summing the base counts, deriving CPA/CTR/CPC/CPM/
 *     CVR/ROAS, matching the previous period, the deep-links, coverage %, and the
 *     SUMAS breakdown table. Design owns APPEARANCE (all the .dt-* / .as-* hooks).
 *   NO hex colour or font name lives here.
 *
 * GENERATOR: it RECEIVES Google Ads rows (never fetches) and renders into a host.
 * `mount` is the full module (Group-by bar + tree + breakdown). `buildTree`
 * returns just the generic { tree, columns } for a lens, for custom wiring.
 *
 * Depends on ../driver-tree.js (PorterReporting.driverTree).
 */
(function (root, factory) {
  var engine = (typeof require === "function") ? require("../driver-tree") : null;
  var api = factory(engine, root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.accountStructureTree = api;
  }
})(typeof self !== "undefined" ? self : this, function (engineFromRequire, root) {
  "use strict";

  function engine() {
    return engineFromRequire || (root && root.PorterReporting && root.PorterReporting.driverTree);
  }

  /* ---- which Google Ads keys we read (override via opts.fields) ------------- */
  var BASE = {
    campaign:   "google_ads_campaign_name",
    campaignId: "google_ads_campaign_id",
    channel:    "google_ads_campaign_advertising_channel_type",
    adGroup:    "google_ads_ad_group_name",
    adId:       "google_ads_ad_group_ad_ad_id",
    adUrls:     "google_ads_ad_group_ad_ad_final_urls",
    searchTerm: "google_ads_search_term",
    cost:       "google_ads_cost_micros",
    impressions:"google_ads_impressions",
    clicks:     "google_ads_clicks",
    conversions:"google_ads_conversions",
    convValue:  "google_ads_conversions_value",
    impressionShare: "google_ads_search_impression_share",
    budget:     "google_ads_campaign_budget_amount_micros"
  };

  var ADS_CAMPAIGN_URL = "https://ads.google.com/aw/campaigns?campaignId=";
  var ADS_ADGROUP_URL  = "https://ads.google.com/aw/adgroups?campaignId=";

  /* ---- helpers ------------------------------------------------------------- */
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function group(v, dp) {
    var f = Math.pow(10, dp), s = (Math.round(num(v) * f) / f).toFixed(dp), p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }
  function money(v) { return "$" + trimZeros(group(v, 2)); }
  function int(v) { return group(Math.round(num(v)), 0); }
  function dec(v) { return trimZeros(group(num(v), 2)); }
  function pct(v) { return (num(v) * 100).toFixed(2) + "%"; }
  function share(v) { var x = num(v); if (x <= 1) x *= 100; return x.toFixed(1) + "%"; }
  function roasFmt(v) { return num(v).toFixed(2) + "x"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function titleCase(v) {
    return String(v).split("_").map(function (w) { return w.charAt(0) + w.slice(1).toLowerCase(); }).join(" ");
  }
  function delta(cur, prev, invert) {
    if (prev == null || prev === 0 || !isFinite(prev)) return "";
    var d = (num(cur) - prev) / prev;
    if (!isFinite(d) || d === 0) return "";
    var a = d > 0 ? "▲" : "▼", dir = (d > 0) !== !!invert ? "good" : "bad";
    return ' <span class="dt-delta dt-delta--' + dir + '">' + a + Math.abs(d * 100).toFixed(0) + "%</span>";
  }

  /* ---- the four lenses ----------------------------------------------------- */
  // Each lens classifies its SOURCE rows into the column-2 bucket. The golf-club
  // "product line" lens from the original report was pure client taxonomy and is
  // intentionally NOT shipped — these four are account-agnostic (brand takes the
  // brand term as a parameter rather than hardcoding it).
  var TYPE_LABELS = {
    SEARCH: "Search", PERFORMANCE_MAX: "Performance Max", DEMAND_GEN: "Demand Gen",
    VIDEO: "Video", SHOPPING: "Shopping", DISPLAY: "Display", APP: "App"
  };
  function typeOf(channel) { var k = String(channel || "").toUpperCase(); return TYPE_LABELS[k] || (channel ? titleCase(channel) : "Other"); }
  function stageOf(name) {
    var u = String(name || "").toUpperCase();
    if (u.indexOf("TOFU") >= 0) return "TOFU";
    if (u.indexOf("MOFU") >= 0) return "MOFU";
    if (u.indexOf("BOFU") >= 0) return "BOFU";
    return "Unstaged";
  }
  function matchOf(adGroup) {
    var u = String(adGroup || "").toLowerCase();
    if (u.indexOf("phrase") >= 0 || u.indexOf("exact") >= 0) return "Phrase / Exact";
    if (u.indexOf("broad") >= 0) return "Broad";
    if (u.indexOf("brand") >= 0) return "Brand";
    if (u.indexOf("dsa") >= 0 || u.indexOf("dynamic") >= 0) return "Dynamic";
    return "Untagged";
  }
  function brandOf(term, brandTerm) {
    if (!brandTerm) return "Non-branded";
    return String(term || "").toLowerCase().indexOf(String(brandTerm).toLowerCase()) >= 0 ? "Branded" : "Non-branded";
  }

  var LENSES = {
    campaign_type: { id: "campaign_type", label: "Campaign type", source: "campaigns",
                     columns: ["Account", "Campaign type", "Campaign", "Ad group", "Ad"],
                     groupOf: function (r, F) { return typeOf(r[F.channel]); } },
    funnel_stage:  { id: "funnel_stage", label: "Funnel stage", source: "campaigns",
                     columns: ["Account", "Funnel stage", "Campaign", "Ad group", "Ad"],
                     groupOf: function (r, F) { return stageOf(r[F.campaign]); } },
    match_type:    { id: "match_type", label: "Match type", source: "adGroups",
                     columns: ["Account", "Match type", "Ad group"],
                     groupOf: function (r, F) { return matchOf(r[F.adGroup]); } },
    brand:         { id: "brand", label: "Brand vs non-brand", source: "searchTerms",
                     columns: ["Account", "Brand intent", "Search term"],
                     groupOf: function (r, F, opts) { return brandOf(r[F.searchTerm], opts.brandTerm); } }
  };
  var LENS_ORDER = ["campaign_type", "brand", "funnel_stage", "match_type"];

  /* ---- aggregation --------------------------------------------------------- */
  function metricsOf(rows, F) {
    var m = { spend: 0, impr: 0, clk: 0, conv: 0, value: 0, isw: 0, budget: 0 };
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], im = num(r[F.impressions]);
      m.spend += num(r[F.cost]); m.impr += im; m.clk += num(r[F.clicks]);
      m.conv += num(r[F.conversions]); m.value += num(r[F.convValue]);
      m.isw += num(r[F.impressionShare]) * im;            // impression-weighted IS
      m.budget += num(r[F.budget]);
    }
    m.cpa = div(m.spend, m.conv);
    return m;
  }
  // metrics object the engine reads off a node (a subset of metricsOf)
  function nodeMetrics(agg) { return { spend: agg.spend, conv: agg.conv, value: agg.value, cpa: agg.cpa }; }

  function groupBy(rows, keyFn) {
    var m = {}, order = [];
    for (var i = 0; i < rows.length; i++) {
      var k = keyFn(rows[i]);
      if (!m[k]) { m[k] = []; order.push(k); }
      m[k].push(rows[i]);
    }
    return { map: m, order: order };
  }
  function bySpendDesc(a, b, F) { return num(b[F.cost]) - num(a[F.cost]); }

  /* ---- build the generic node tree for a lens ------------------------------ */
  function buildTree(opts) {
    opts = opts || {};
    var F = opts.fields || BASE;
    var lens = LENSES[opts.lens] || LENSES.campaign_type;
    var accountName = (opts.account && opts.account.name) || "Account";

    var campaigns = opts.campaigns || [];
    var adGroups = opts.adGroups || [];
    var ads = opts.ads || [];
    var searchTerms = opts.searchTerms || [];
    var prev = opts.previous || {};

    function sortDesc(arr) { return arr.slice().sort(function (a, b) { return bySpendDesc(a, b, F); }); }

    // previous-period lookups, keyed the same way as the current nodes
    function prevAgg(rows, keyFn) {
      var out = {}, g = groupBy(rows || [], keyFn);
      for (var i = 0; i < g.order.length; i++) out[g.order[i]] = nodeMetrics(metricsOf(g.map[g.order[i]], F));
      return out;
    }

    var rootMetrics, rootPrev, tree;

    if (lens.source === "campaigns") {
      // Account → group → campaign → ad group → ad
      var pGroup = prevAgg(prev.campaigns, function (r) { return lens.groupOf(r, F, opts); });
      var pCamp  = prevAgg(prev.campaigns, function (r) { return r[F.campaign]; });
      var pAg    = prevAgg(prev.adGroups,  function (r) { return r[F.adGroup]; });
      rootMetrics = nodeMetrics(metricsOf(campaigns, F));
      rootPrev    = prev.campaigns ? nodeMetrics(metricsOf(prev.campaigns, F)) : null;

      var g = groupBy(campaigns, function (r) { return lens.groupOf(r, F, opts); });
      // sort groups by spend desc
      g.order.sort(function (a, b) { return metricsOf(g.map[b], F).spend - metricsOf(g.map[a], F).spend; });

      var groupNodes = g.order.map(function (key) {
        var gm = nodeMetrics(metricsOf(g.map[key], F));
        var campNodes = sortDesc(g.map[key]).map(function (cr) {
          var cname = cr[F.campaign];
          var cAds = adGroups.filter(function (a) { return a[F.adGroup] != null && a[F.adGroup] !== undefined && a[F.campaign] === cname; });
          // ad-group children of this campaign
          var agRows = adGroups.filter(function (a) { return a[F.campaign] === cname; });
          var agNodes = sortDesc(agRows).slice(0, 20).map(function (ar) {
            var agname = ar[F.adGroup] || "(none)";
            var adRows = ads.filter(function (d) { return d[F.campaign] === cname && d[F.adGroup] === agname; });
            var adNodes = sortDesc(adRows).slice(0, 20).map(function (dr) {
              return {
                name: adLabel(dr, F), full: firstUrl(dr[F.adUrls]) || adLabel(dr, F),
                metrics: nodeMetrics(metricsOf([dr], F)),
                link: firstUrl(dr[F.adUrls]) || null
              };
            });
            return {
              name: agname,
              metrics: nodeMetrics(metricsOf([ar], F)),
              prev: pAg[agname] || null,
              link: ar[F.campaignId] ? (ADS_ADGROUP_URL + ar[F.campaignId]) : null,
              children: adNodes.length ? adNodes : (ads.length ? [] : null)
            };
          });
          return {
            name: cname, full: cname,
            metrics: nodeMetrics(metricsOf([cr], F)),
            prev: pCamp[cname] || null,
            link: cr[F.campaignId] ? (ADS_CAMPAIGN_URL + cr[F.campaignId]) : null,
            children: agNodes.length ? agNodes : (adGroups.length ? [] : null)
          };
        });
        return { name: key, metrics: gm, prev: pGroup[key] || null, children: campNodes };
      });

      tree = { name: accountName, metrics: rootMetrics, prev: rootPrev, children: groupNodes };

    } else if (lens.source === "adGroups") {
      // Account → match type → ad group
      var pmGroup = prevAgg(prev.adGroups, function (r) { return lens.groupOf(r, F, opts); });
      var pmAg    = prevAgg(prev.adGroups, function (r) { return r[F.adGroup]; });
      rootMetrics = nodeMetrics(metricsOf(adGroups, F));
      rootPrev    = prev.adGroups ? nodeMetrics(metricsOf(prev.adGroups, F)) : null;
      var gm2 = groupBy(adGroups, function (r) { return lens.groupOf(r, F, opts); });
      gm2.order.sort(function (a, b) { return metricsOf(gm2.map[b], F).spend - metricsOf(gm2.map[a], F).spend; });
      tree = {
        name: accountName, metrics: rootMetrics, prev: rootPrev,
        children: gm2.order.map(function (key) {
          return {
            name: key, metrics: nodeMetrics(metricsOf(gm2.map[key], F)), prev: pmGroup[key] || null,
            children: sortDesc(gm2.map[key]).slice(0, 20).map(function (ar) {
              return {
                name: ar[F.adGroup] || "(none)",
                full: ar[F.campaign] ? (ar[F.adGroup] + "  ·  " + ar[F.campaign]) : ar[F.adGroup],
                metrics: nodeMetrics(metricsOf([ar], F)), prev: pmAg[ar[F.adGroup]] || null,
                link: ar[F.campaignId] ? (ADS_ADGROUP_URL + ar[F.campaignId]) : null
              };
            })
          };
        })
      };

    } else {
      // searchTerms: Account → brand intent → search term
      var psGroup = prevAgg(prev.searchTerms, function (r) { return lens.groupOf(r, F, opts); });
      var psTerm  = prevAgg(prev.searchTerms, function (r) { return r[F.searchTerm]; });
      rootMetrics = nodeMetrics(metricsOf(searchTerms, F));
      rootPrev    = prev.searchTerms ? nodeMetrics(metricsOf(prev.searchTerms, F)) : null;
      var gs = groupBy(searchTerms, function (r) { return lens.groupOf(r, F, opts); });
      var orderBrand = ["Branded", "Non-branded"].filter(function (k) { return gs.map[k]; });
      gs.order.forEach(function (k) { if (orderBrand.indexOf(k) < 0) orderBrand.push(k); });
      tree = {
        name: accountName, metrics: rootMetrics, prev: rootPrev,
        children: orderBrand.map(function (key) {
          return {
            name: key, metrics: nodeMetrics(metricsOf(gs.map[key], F)), prev: psGroup[key] || null,
            children: sortDesc(gs.map[key]).slice(0, 15).map(function (tr) {
              return {
                name: tr[F.searchTerm] || "(empty)",
                metrics: nodeMetrics(metricsOf([tr], F)), prev: psTerm[tr[F.searchTerm]] || null
              };
            })
          };
        })
      };
    }

    return { tree: tree, columns: lens.columns, accountCpa: rootMetrics.cpa };
  }

  function adLabel(dr, F) {
    var url = firstUrl(dr[F.adUrls]);
    var slug = url ? urlSlug(url) : "(ad)";
    var id = String(dr[F.adId] || "");
    return slug + (id ? " · " + id.slice(-4) : "");
  }
  function urlSlug(u) {
    u = String(u || ""); var i = u.indexOf("://"); if (i >= 0) u = u.substring(i + 3);
    var q = u.indexOf("?"); if (q >= 0) u = u.substring(0, q);
    var parts = u.split("/"), last = "";
    for (var k = parts.length - 1; k >= 0; k--) { if (parts[k]) { last = parts[k]; break; } }
    last = last.split("-").join(" ").split("_").join(" ").trim();
    return last ? last.charAt(0).toUpperCase() + last.slice(1) : "(ad)";
  }
  function firstUrl(s) {
    s = String(s || ""); var i = s.indexOf("http"); if (i < 0) return null;
    s = s.substring(i); var cut = s.length, stops = ["'", "]", " ", ","];
    for (var k = 0; k < stops.length; k++) { var p = s.indexOf(stops[k]); if (p >= 0 && p < cut) cut = p; }
    return s.substring(0, cut);
  }

  /* ---- SUMAS breakdown table ("Spend & performance by <group>") ------------ */
  function breakdownTable(opts) {
    var F = opts.fields || BASE;
    var lens = LENSES[opts.lens] || LENSES.campaign_type;
    var src = (opts[lens.source] || []);
    var prevSrc = (opts.previous && opts.previous[lens.source]) || [];
    var hasIS = lens.source === "campaigns";
    var hasBudget = lens.source === "campaigns";
    if (!src.length) return '<div class="dt-empty">No data for this range</div>';

    var g = groupBy(src, function (r) { return lens.groupOf(r, F, opts); });
    var pg = groupBy(prevSrc, function (r) { return lens.groupOf(r, F, opts); });
    var pmap = {};
    for (var i = 0; i < pg.order.length; i++) pmap[pg.order[i]] = metricsOf(pg.map[pg.order[i]], F);

    var aggs = g.order.map(function (k) { var a = metricsOf(g.map[k], F); a.key = k; a.n = g.map[k].length; return a; });
    aggs.sort(function (a, b) { return b.spend - a.spend; });
    var totCost = 0, totVal = 0;
    aggs.forEach(function (a) { totCost += a.spend; totVal += a.value; });
    var ovRoas = div(totVal, totCost);

    function rng(get) { var mx = 0, mn = null; aggs.forEach(function (a) { var v = get(a); if (v > mx) mx = v; if (mn === null || v < mn) mn = v; }); return { mn: mn || 0, mx: mx }; }
    function heat(v, r) { if (r.mx <= r.mn) return "var(--cf-5)"; var s = 1 + Math.floor((v - r.mn) / (r.mx - r.mn) * 5); s = s < 1 ? 1 : (s > 5 ? 5 : s); return "var(--cf-" + s + ")"; }
    var rCost = rng(function (a) { return a.spend; }), rImpr = rng(function (a) { return a.impr; }),
        rClk = rng(function (a) { return a.clk; }), rConv = rng(function (a) { return a.conv; });

    function cell(headline, subs, bg) {
      var s = '<td class="as-cell" style="background:' + bg + '"><div class="as-mv">' + headline + "</div>";
      for (var i = 0; i < subs.length; i++) s += '<span class="as-sub">' + subs[i] + "</span>";
      return s + "</td>";
    }

    var head = '<tr><th class="as-grp-col">' + esc(lens.label) + "</th><th>Budget</th><th>Visibility</th><th>Engagement</th><th>Conversion</th></tr>";
    var body = "";
    aggs.forEach(function (a) {
      var p = pmap[a.key];
      var is = div(a.isw, a.impr), cpm = div(a.spend, a.impr) * 1000, ctr = div(a.clk, a.impr),
          cpc = div(a.spend, a.clk), cvr = div(a.conv, a.clk), cpa = div(a.spend, a.conv), roas = div(a.value, a.spend);
      var pIS = p ? div(p.isw, p.impr) : null;
      var unit = a.n === 1 ? "item" : "items";
      var name = '<span class="as-dot"></span>' + esc(a.key) + ' <span class="as-badge">' + a.n + " " + unit + "</span>";
      var budSubs = hasBudget ? ["Daily " + money(a.budget) + delta(a.budget, p ? p.budget : null, false)] : [];
      var visSubs = [];
      if (hasIS) visSubs.push("IS " + share(is) + delta(is, pIS, false));
      visSubs.push("CPM " + money(cpm) + delta(cpm, (p && p.impr) ? p.spend / p.impr * 1000 : null, true));
      var roasCls = roas >= ovRoas ? "good" : "bad";
      body += "<tr><td class=\"as-grp-col\">" + name + "</td>" +
        cell(money(a.spend) + delta(a.spend, p ? p.spend : null, false), budSubs, heat(a.spend, rCost)) +
        cell(int(a.impr) + delta(a.impr, p ? p.impr : null, false), visSubs, heat(a.impr, rImpr)) +
        cell(int(a.clk) + delta(a.clk, p ? p.clk : null, false),
             ["CTR " + pct(ctr) + delta(ctr, (p && p.impr) ? p.clk / p.impr : null, false),
              "CPC " + money(cpc) + delta(cpc, (p && p.clk) ? p.spend / p.clk : null, true)], heat(a.clk, rClk)) +
        cell(dec(a.conv) + delta(a.conv, p ? p.conv : null, false),
             ["Cv. rate " + pct(cvr) + delta(cvr, (p && p.clk) ? p.conv / p.clk : null, false),
              "Cost/conv " + money(cpa) + delta(cpa, (p && p.conv) ? p.spend / p.conv : null, true),
              'ROAS <span class="as-roas--' + roasCls + '">' + roasFmt(roas) + "</span>" + delta(roas, (p && p.spend) ? p.value / p.spend : null, false)],
             heat(a.conv, rConv)) +
        "</tr>";
    });
    return '<p class="as-title">Spend &amp; performance by ' + esc(lens.label.toLowerCase()) + '</p>' +
           '<div class="as-tablewrap"><table class="as-sumas">' + head + body + "</table></div>";
  }

  /* ---- coverage line ------------------------------------------------------- */
  function coverage(opts) {
    var F = opts.fields || BASE;
    var lens = LENSES[opts.lens] || LENSES.campaign_type;
    var src = opts[lens.source] || [];
    if (!src.length) return "";
    var UNCLASSIFIED = { campaign_type: "Other", funnel_stage: "Unstaged", match_type: "Untagged", brand: null };
    var bad = UNCLASSIFIED[lens.id];
    var tot = 0, classified = 0, n = src.length;
    for (var i = 0; i < src.length; i++) {
      var c = num(src[i][F.cost]); tot += c;
      var k = lens.groupOf(src[i], F, opts);
      if (lens.id === "brand") { if (k === "Branded") classified += c; }
      else if (k !== bad) classified += c;
    }
    var pctv = tot > 0 ? Math.round(classified / tot * 100) : 0;
    if (lens.id === "brand") return "<strong>" + pctv + "%</strong> of search-term spend is branded · " + n + " terms";
    var unit = lens.source === "adGroups" ? "ad groups" : (lens.source === "searchTerms" ? "search terms" : "campaigns");
    return "<strong>" + pctv + "%</strong> of spend classified · " + n + " " + unit;
  }

  /* ---- mount: Group-by bar + tree + breakdown ------------------------------ */
  function scaffold(opts, lensesShown) {
    var btns = lensesShown.map(function (id) {
      return '<button class="as-seg-btn" data-lens="' + id + '">' + esc(LENSES[id].label) + "</button>";
    }).join("");
    return '<div class="dt-component as-component">' +
      '<div class="dt-controls as-controls">' +
        '<div class="as-seg"><span class="as-seg-lab">Group by</span>' + btns + "</div>" +
        '<div class="as-cov"></div>' +
      "</div>" +
      '<div class="as-tree dt-host" data-porter-chart="as_campaigns"></div>' +
      (opts.showBreakdown === false ? "" : '<div class="as-breakdown"></div>') +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    var DT = engine();
    if (!DT) { el.innerHTML = '<div class="dt-empty">driver-tree engine not loaded</div>'; return null; }

    var lensesShown = (opts.lenses && opts.lenses.length ? opts.lenses : LENS_ORDER)
      .filter(function (id) { return LENSES[id]; });
    var state = { lens: opts.lens && LENSES[opts.lens] ? opts.lens : lensesShown[0] };

    el.innerHTML = scaffold(opts, lensesShown);
    var treeHost = el.querySelector(".as-tree");
    var breakdownHost = el.querySelector(".as-breakdown");
    var covEl = el.querySelector(".as-cov");
    var btns = el.querySelectorAll(".as-seg-btn");

    function metricsConfig() {
      return [
        { key: "spend", label: "Spend",       format: "money" },
        { key: "conv",  label: "Conversions", format: "dec"   },
        { key: "cpa",   label: "Cost/conv",   format: "money", invert: true, skipZero: true },
        { key: "value", label: "Conv. value", format: "money" }
      ];
    }

    function render() {
      for (var i = 0; i < btns.length; i++) {
        btns[i].className = btns[i].getAttribute("data-lens") === state.lens ? "as-seg-btn is-active" : "as-seg-btn";
      }
      var built = buildTree({
        lens: state.lens, fields: opts.fields, account: opts.account, brandTerm: opts.brandTerm,
        campaigns: opts.campaigns, adGroups: opts.adGroups, ads: opts.ads, searchTerms: opts.searchTerms,
        previous: opts.previous
      });
      DT.mount(treeHost, {
        tree: built.tree,
        columns: built.columns,
        metrics: metricsConfig(),
        efficiency: { metricKey: "cpa", baseline: built.accountCpa, good: 0.8, bad: 1.2 },
        compare: opts.compare !== false
      });
      if (breakdownHost) breakdownHost.innerHTML = breakdownTable({
        lens: state.lens, fields: opts.fields, brandTerm: opts.brandTerm,
        campaigns: opts.campaigns, adGroups: opts.adGroups, ads: opts.ads, searchTerms: opts.searchTerms,
        previous: opts.previous
      });
      if (covEl) covEl.innerHTML = coverage({
        lens: state.lens, fields: opts.fields, brandTerm: opts.brandTerm,
        campaigns: opts.campaigns, adGroups: opts.adGroups, ads: opts.ads, searchTerms: opts.searchTerms
      });
    }

    for (var b = 0; b < btns.length; b++) {
      btns[b].addEventListener("click", function (e) {
        state.lens = e.currentTarget.getAttribute("data-lens");
        render();
      });
    }
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  return {
    buildTree: buildTree,
    mount: mount,
    breakdownTable: breakdownTable,
    coverage: coverage,
    BASE: BASE,
    LENSES: LENSES,
    LENS_ORDER: LENS_ORDER,
    _internal: { typeOf: typeOf, stageOf: stageOf, matchOf: matchOf, brandOf: brandOf, metricsOf: metricsOf, firstUrl: firstUrl, urlSlug: urlSlug }
  };
});
