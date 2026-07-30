/* google-ads/creative-ad-preview — Reporting generator (structure + behavior only, ZERO CSS).
 *
 * Renders ONE responsive search ad the way it appears in Google search (the recognizable
 * "ad frame"), then the FULL pool of its headlines & descriptions annotated for analysis
 * (pin position, character usage, performance label, approval, served, impressions).
 *
 * Consumes a single `ad` node from porter-analysis `creative-inventory`'s `creative_graph.tree`
 * (+ the graph's `extensions`). Emits an HTML string with `.cap-*` class hooks; porter-design
 * styles them (the Google-ad look). Never fetches, never hardcodes appearance.
 *
 *   node:    window.PorterReporting.creativeAdPreview
 *   build(ad, { extensions, business })  -> HTML string (one card)
 *   mount(host, { ad, extensions, business })
 *   buildGallery({ graph, business })    -> HTML string (one card per tree ad; filters = dashboard layer)
 */
(function (root) {
  "use strict";
  var LIMIT = { headline: 30, description: 90 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function n(x) { return (typeof x === "number" ? x : 0).toLocaleString(); }
  function domainOf(url) {
    if (!url) return "";
    return String(url).replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
  function byImpr(a, b) { return (b.impressions || 0) - (a.impressions || 0); }

  // character-usage state vs the field limit (under = wasted space; over = should never happen)
  function charState(len, limit, field) {
    if (len > limit) return "over";
    var floor = field === "headline" ? 0.6 : 0.75;
    return len / limit < floor ? "under" : "ok";
  }

  // pin-aware pick of the combination shown in the frame (what a viewer might actually see)
  function pickSlots(items, slots) {
    var out = [], used = {};
    for (var p = 1; p <= slots; p++) {
      var pinned = items.find(function (it) { return String(it.pin) === String(p) && !used[it.text]; });
      if (pinned) { out.push(pinned); used[pinned.text] = 1; }
      else out.push(null);
    }
    var pool = items.slice().sort(byImpr).filter(function (it) {
      return String(it.pin) === "none" || it.pin == null || !/^[123]$/.test(String(it.pin));
    });
    for (var i = 0; i < out.length; i++) {
      if (out[i]) continue;
      var pick = pool.find(function (it) { return !used[it.text]; });
      if (pick) { out[i] = pick; used[pick.text] = 1; }
    }
    return out.filter(Boolean);
  }

  function badge(cls, label) { return '<span class="' + cls + '">' + esc(label) + "</span>"; }

  // Pool chips are NEUTRAL inventory facts (text · pin · char count · impressions · serving state).
  // The only judgment shown is `disapproved` — a needle-mover. Char usage / pin / Low are facts, not
  // recommendations (Ad-Strength hygiene is descoped — see creative/metric-levers.md).
  function chip(it, field) {
    var len = it.char_len != null ? it.char_len : (it.text || "").length;
    var limit = it.limit || LIMIT[field];
    var bad = it.approval && it.approval !== "APPROVED" && it.approval !== "UNKNOWN";
    var cls = "cap-chip";
    if (it.served === false) cls += " cap-chip--unserved";   // neutral fact: not currently running
    if (bad) cls += " cap-chip--disapproved";                 // needle-mover: handicaps reach
    var pin = /^[123]$/.test(String(it.pin))
      ? '<span class="cap-pin" title="Pinned to position ' + it.pin + '" aria-label="pinned position ' + it.pin + '">' + it.pin + "</span>"
      : "";
    var dki = it.dki ? '<span class="cap-dki" title="Keyword insertion" aria-hidden="true"></span>' : "";
    var warn = bad ? '<span class="cap-warn" title="' + esc(it.approval) + ' — fix to restore reach" aria-label="' + esc(it.approval) + '"></span>' : "";
    return (
      '<div class="' + cls + '"' + (bad ? ' title="Disapproved — fix to restore reach"' : "") + ' data-label="' + esc(it.perf_label || "") + '">' +
        pin + dki +
        '<span class="cap-chip-text">' + esc(it.text) + "</span>" + warn +
        '<span class="cap-meta">' +
          '<span class="cap-char">' + len + "/" + limit + "</span>" +
          (it.impressions != null ? ' <span class="cap-impr">' + n(it.impressions) + "</span>" : "") +
        "</span>" +
      "</div>"
    );
  }

  function group(label, items, field) {
    if (!items || !items.length) return "";
    var ordered = items.slice().sort(function (a, b) {
      var pa = /^[123]$/.test(String(a.pin)) ? 0 : 1, pb = /^[123]$/.test(String(b.pin)) ? 0 : 1;
      return pa - pb || byImpr(a, b);
    });
    return (
      '<div class="cap-group">' +
        '<p class="cap-group-label">' + esc(label) + " · " + items.length + "</p>" +
        '<div class="cap-chips">' + ordered.map(function (it) { return chip(it, field); }).join("") + "</div>" +
      "</div>"
    );
  }

  // The ONLY creative signals we recommend on — changes with real, attributable impact.
  // Ad-Strength hygiene (fill slots / char / pinning / callouts / DKI / Low / variety) is
  // DELIBERATELY EXCLUDED — see creative/metric-levers.md "Scope decision".
  var LEVERS = {
    broken_url:  { metric: "Stop wasted spend", fix: "Fix the final URL — it 404s / doesn't load" },
    disapproved: { metric: "Reach / serving",   fix: "Fix the wording or replace the asset" }
  };

  // High-impact fixes only. `broken_url` needs the live URL-health input (opts.urlHealth: {url: code}).
  function flags(ad, ext, opts) {
    opts = opts || {};
    var all = (ad.headlines || []).concat(ad.descriptions || []), out = [];
    var code = ad.final_url ? (opts.urlHealth || {})[ad.final_url] : undefined;
    if (code != null && (code === 0 || code >= 400))
      out.push({ k: "broken_url", issue: "Landing page returns " + (code === 0 ? "no response" : code) });
    var nDis = all.filter(function (it) { return it.approval && it.approval !== "APPROVED" && it.approval !== "UNKNOWN"; }).length;
    if (nDis) out.push({ k: "disapproved", issue: nDis === 1 ? "1 disapproved asset" : nDis + " disapproved assets" });
    return out;
  }

  function spotlights(ad, ext, opts) {
    var fl = flags(ad, ext, opts);
    if (!fl.length) return '<div class="cap-spotlights"><div class="cap-spot cap-spot--clean">Nothing broken or disapproved — no high-impact fix here.</div></div>';
    return '<div class="cap-spotlights"><p class="cap-group-label">High-impact fixes · ' + fl.length + "</p>" +
      fl.map(function (f) {
        var L = LEVERS[f.k] || {};
        return '<div class="cap-spot cap-spot--' + f.k + '">' +
          '<span class="cap-spot-issue">' + esc(f.issue) + "</span>" +
          '<span class="cap-spot-metric" title="Why it matters">' + esc(L.metric || "") + "</span>" +
          '<span class="cap-spot-fix">' + esc(L.fix || "") + "</span>" +
          "</div>";
      }).join("") +
      "</div>";
  }

  function build(ad, opts) {
    opts = opts || {};
    var ext = opts.extensions || {};
    if (!ad) return '<div class="cap-component"><p class="cap-empty">No ad to preview.</p></div>';

    // non-Search creative isn't a search-ad frame — be honest (see campaign-types.md)
    if (ad.ad_type && ad.ad_type !== "RSA" && ad.ad_type !== "ETA" && ad.ad_type !== "TEXT") {
      return (
        '<div class="cap-component"><div class="cap-card"><p class="cap-coverage">This ad is ' +
        esc(ad.ad_type) + " — its creative isn't a search-ad frame (it lives in asset groups / a feed). " +
        "See campaign-types.md.</p></div></div>"
      );
    }

    var H = ad.headlines || [], D = ad.descriptions || [];
    var hSlots = pickSlots(H, 3), dSlots = pickSlots(D, 2);
    var business = opts.business || (ad.campaign || "").split(/[_\s]/)[0] || "Your business";
    var domain = domainOf(ad.final_url);
    var fav = (business || "?").trim().charAt(0).toUpperCase();

    var strength = (ad.ad_strength || "UNKNOWN").toLowerCase();
    var seg = (ad.segment || "unknown");

    var sitelinks = (ext.sitelinks || []).slice(0, 4);
    var callouts = (ext.callouts || []).slice(0, 8);

    var frame =
      '<div class="cap-ad">' +
        '<div class="cap-head">' +
          '<span class="cap-fav" aria-hidden="true">' + esc(fav) + "</span>" +
          '<span class="cap-id"><span class="cap-biz">' + esc(business) + "</span>" +
          '<span class="cap-url"><span class="cap-spon">Sponsored</span> · ' + esc(domain) + "</span></span>" +
        "</div>" +
        '<div class="cap-title">' + hSlots.map(function (h) { return esc(h.text); }).join(' <span class="cap-sep">|</span> ') + "</div>" +
        '<div class="cap-desc">' + dSlots.map(function (d) { return esc(d.text); }).join(" ") + "</div>" +
        (sitelinks.length ? '<div class="cap-sitelinks">' + sitelinks.map(function (s) {
          return '<a class="cap-slink">' + esc(s) + "</a>"; }).join("") + "</div>" : "") +
        (callouts.length ? '<div class="cap-callouts">' + callouts.map(esc).join(" · ") + "</div>" : "") +
      "</div>";

    var meta =
      '<div class="cap-admeta">' +
        '<span class="cap-where">' + esc(ad.campaign || "") + " › " + esc(ad.ad_group || "") + "</span>" +
        badge("cap-strength cap-strength--" + strength, "Ad strength: " + (ad.ad_strength || "—")) +
        badge("cap-seg cap-seg--" + seg, seg.replace("_", " ")) +
      "</div>";

    var legend =
      '<div class="cap-legend">' +
        '<span class="cap-legend-item"><span class="cap-pin" aria-hidden="true">1</span> pinned</span>' +
        '<span class="cap-legend-item"><span class="cap-dki" aria-hidden="true"></span> keyword insertion</span>' +
        '<span class="cap-legend-item"><span class="cap-char">n/30</span> chars used</span>' +
        '<span class="cap-legend-item"><span class="cap-impr">123</span> impressions (30d)</span>' +
        '<span class="cap-legend-item"><span class="cap-warn" aria-hidden="true"></span> disapproved</span>' +
      "</div>";

    var pool =
      '<div class="cap-pool">' + group("Headlines", H, "headline") + group("Descriptions", D, "description") + "</div>";

    var snips = (ext.snippets || []);
    var extBlock =
      '<div class="cap-ext">' +
        ((ext.sitelinks || []).length ? '<span class="cap-ext-chip">' + (ext.sitelinks || []).length + " sitelinks</span>" : "") +
        ((ext.callouts || []).length ? '<span class="cap-ext-chip">' + (ext.callouts || []).length + " callouts</span>" : "") +
        (snips.length ? snips.map(function (s) {
          return '<span class="cap-ext-chip">' + esc(s.header) + ": " + esc((s.values || []).join(", ")) + "</span>"; }).join("") : "") +
      "</div>";

    return '<div class="cap-component">' + meta + '<div class="cap-card">' + frame + legend + spotlights(ad, ext, opts) + pool + extBlock + "</div></div>";
  }

  function mount(host, opts) {
    var el = typeof host === "string" ? document.querySelector(host) : host;
    if (el) el.innerHTML = build(opts && opts.ad, opts || {});
    return el;
  }

  function buildGallery(opts) {
    opts = opts || {};
    var g = opts.graph || {};
    var tree = (g.creative_graph ? g.creative_graph.tree : g.tree) || [];
    var ext = (g.creative_graph ? g.creative_graph.extensions : g.extensions) || {};
    if (!tree.length) return '<div class="cap-gallery"><p class="cap-empty">No ads for this range.</p></div>';
    return '<div class="cap-gallery">' + tree.map(function (ad) {
      return build(ad, { extensions: ext, business: opts.business, urlHealth: opts.urlHealth });
    }).join("") + "</div>";
  }

  var api = { build: build, mount: mount, buildGallery: buildGallery };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PorterReporting = root.PorterReporting || {};
  root.PorterReporting.creativeAdPreview = api;
})(typeof window !== "undefined" ? window : this);
