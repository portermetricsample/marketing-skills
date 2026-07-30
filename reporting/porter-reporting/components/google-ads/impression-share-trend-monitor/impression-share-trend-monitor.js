/* google-ads/impression-share-trend-monitor
 * Spend-ranked Impression Share MONITOR (over time): one row per Search campaign, each measured
 * against ITSELF — own-scale IS sparkline + 4-week-vs-prior-4-week change + a "limited by" bar —
 * with a click-to-expand week-by-week breakdown (got / lost-to-rank / lost-to-budget).
 *
 * Renders the output of the `impression-share-trend` analysis skill (porter-analysis). It RECEIVES
 * the findings and renders them; it never fetches, classifies, or re-derives the driver.
 *
 * Public name: PorterReporting.impressionShareTrendMonitor  (build / mount / skeleton)
 * Vanilla JS, no deps. Browser AND Node. SHIPS ZERO CSS — emits class hooks (.pist-*) only;
 * porter-design styles them from tokens (see README → "Styling hooks"). No literal hex here.
 */
(function (root) {
  "use strict";

  /* ---------- formatting helpers ---------- */
  function r0(x) { return Math.round(x); }
  function pct(x) { return r0(x) + "%"; }                 // x already 0-100
  function money(x) {
    if (x == null) return "";
    return x >= 1000 ? "$" + (x / 1000).toFixed(1) + "k" : "$" + r0(x);
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- map the analysis output → render rows ----------
   * Accepts either explicit `rows` or an `analysis` object (the impression-share-trend output,
   * whose campaigns[] carry: campaign, spend, weeks[], got[], rank[], budget[], driver,
   * prior_is, recent_is, short). Both arrive as 0-100 weekly series. */
  function toRows(opts) {
    if (Array.isArray(opts.rows)) return opts.rows.slice();
    var camps = (opts.analysis && opts.analysis.campaigns) || [];
    return camps.map(function (c) {
      return {
        campaign: c.campaign, spend: c.spend, weeks: c.weeks || [],
        got: c.got || c.series || [], rank: c.rank || [], budget: c.budget || [],
        driver: c.driver, prior_is: c.prior_is, recent_is: c.recent_is, short: !!c.short
      };
    });
  }

  var SORTS = {
    spend: function (a, b) { return (b.spend || 0) - (a.spend || 0); },
    change: function (a, b) { return chg(a) - chg(b); },              // most-declining first
    alpha: function (a, b) { return String(a.campaign).localeCompare(b.campaign); }
  };
  function chg(m) { return (m.recent_is || 0) - (m.prior_is || 0); }

  /* ---------- atoms (structure only; appearance from tokens) ---------- */
  function spark(got) {
    if (!got || !got.length) return "";
    var w = 150, h = 34, pad = 4, lo = Math.min.apply(null, got), hi = Math.max.apply(null, got);
    var rng = (hi - lo) || 1, n = got.length, pts = [];
    for (var i = 0; i < n; i++) {
      var x = pad + (w - 2 * pad) * (n > 1 ? i / (n - 1) : 0);
      var y = pad + (h - 2 * pad) * (1 - (got[i] - lo) / rng);
      pts.push(x.toFixed(1) + "," + y.toFixed(1));
    }
    var last = pts[pts.length - 1].split(",");
    return '<svg class="pist-spark-svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<polyline class="pist-spark-line" fill="none" points="' + pts.join(" ") + '"/>' +
      '<circle class="pist-spark-dot" cx="' + last[0] + '" cy="' + last[1] + '" r="3"/></svg>';
  }

  // recent-window "why" bar (got / rank / budget of the latest window — the at-a-glance driver)
  function whyBar(m) {
    var g = m.got.length ? m.got[m.got.length - 1] : 0;
    var rk = m.rank.length ? m.rank[m.rank.length - 1] : 0;
    var bg = m.budget.length ? m.budget[m.budget.length - 1] : 0;
    var tot = (g + rk + bg) || 1;
    function seg(v, k) { return '<span class="pist-seg pist-seg--' + k + '" style="width:' + (v / tot * 100).toFixed(1) + '%" title="' + k + ': ' + pct(v) + '"></span>'; }
    return '<span class="pist-whybar">' + seg(g, "got") + seg(rk, "rank") + seg(bg, "budget") + "</span>";
  }

  // expandable week-by-week breakdown — one column per week, each a 100% vertical stack
  function weekGrid(m) {
    var cols = "";
    for (var i = 0; i < m.weeks.length; i++) {
      var g = m.got[i] || 0, rk = m.rank[i] || 0, bg = m.budget[i] || 0, t = (g + rk + bg) || 1;
      cols += '<div class="pist-wkcol">' +
        '<div class="pist-wkbar">' +
        '<span class="pist-wkseg pist-wkseg--budget" style="height:' + (bg / t * 100).toFixed(1) + '%" title="budget: ' + pct(bg) + '"></span>' +
        '<span class="pist-wkseg pist-wkseg--rank" style="height:' + (rk / t * 100).toFixed(1) + '%" title="rank: ' + pct(rk) + '"></span>' +
        '<span class="pist-wkseg pist-wkseg--got" style="height:' + (g / t * 100).toFixed(1) + '%" title="got: ' + pct(g) + '"></span>' +
        '</div><div class="pist-wklabel">' + esc(m.weeks[i]) + "</div></div>";
    }
    return '<div class="pist-detail-note">Weekly breakdown — the "got" height is the impression share itself; rank/budget show where reach was lost.</div>' +
      '<div class="pist-wkgrid">' + cols + "</div>";
  }

  function rowHTML(m, idx) {
    var d = chg(m), dir = d > 1 ? "up" : (d < -1 ? "down" : "flat");
    var arrow = d > 1 ? "▲" : (d < -1 ? "▼" : "—");
    var lim = m.driver || "mixed";
    return '<div class="pist-row pist-row--' + esc(lim) + '" data-drv="' + esc(lim) + '">' +
      '<button class="pist-rowhead" type="button" data-i="' + idx + '" aria-expanded="false">' +
        '<span class="pist-chev" aria-hidden="true">▸</span>' +
        '<span class="pist-id"><span class="pist-camp">' + esc(m.campaign) + '</span>' +
          '<span class="pist-spend">' + money(m.spend) + "</span></span>" +
        '<span class="pist-spark">' + spark(m.got) +
          '<span class="pist-window">' + pct(m.prior_is) + " → " + pct(m.recent_is) + "</span></span>" +
        '<span class="pist-change pist-change--' + dir + '">' + arrow + " " + Math.abs(r0(d)) + " pts" +
          (m.short ? '<span class="pist-short">short history</span>' : "") + "</span>" +
        '<span class="pist-why">' + whyBar(m) +
          '<span class="pist-limiter pist-limiter--' + esc(lim) + '">limited by ' + esc(lim) + "</span></span>" +
      "</button>" +
      '<div class="pist-detail" data-detail="' + idx + '" hidden>' + weekGrid(m) + "</div>" +
    "</div>";
  }

  function chipsHTML(rows) {
    var counts = { rank: 0, budget: 0, mixed: 0 };
    rows.forEach(function (m) { counts[m.driver] = (counts[m.driver] || 0) + 1; });
    var out = '<button class="pist-chip pist-chip--on" type="button" data-f="all">All (' + rows.length + ")</button>";
    ["rank", "budget", "mixed"].forEach(function (k) {
      if (counts[k]) out += '<button class="pist-chip pist-chip--' + k + '" type="button" data-f="' + k + '">' +
        '<span class="pist-dot pist-dot--' + k + '"></span>' + k.charAt(0).toUpperCase() + k.slice(1) + " (" + counts[k] + ")</button>";
    });
    return '<div class="pist-chips" role="group" aria-label="Filter by what limits the campaign">' + out + "</div>";
  }

  var LEGEND = '<div class="pist-legend"><span class="pist-lg-label">where reach is lost</span>' +
    '<span class="pist-lg"><span class="pist-sw pist-sw--got"></span>got</span>' +
    '<span class="pist-lg"><span class="pist-sw pist-sw--rank"></span>rank (auction)</span>' +
    '<span class="pist-lg"><span class="pist-sw pist-sw--budget"></span>budget (money)</span></div>';

  var HEAD = '<div class="pist-head"><span></span><span>Campaign · spend</span>' +
    '<span>IS over time</span><span>change · 4w</span><span>where reach is lost</span></div>';

  /* ---------- public: build ---------- */
  function build(opts) {
    opts = opts || {};
    var rows = toRows(opts);
    if (!rows.length) {
      return '<div class="pist-component"><div class="pist-empty">' +
        esc(opts.emptyMessage || "No Search campaigns with impression-share data for this range.") + "</div></div>";
    }
    rows.sort(SORTS[opts.sort] || SORTS.spend);
    return '<div class="pist-component">' +
      '<div class="pist-controls">' + chipsHTML(rows) + LEGEND + "</div>" +
      HEAD + rows.map(rowHTML).join("") + "</div>";
  }

  /* ---------- public: skeleton (loading state) ---------- */
  function skeleton(n) {
    n = n || 6; var rows = "";
    for (var i = 0; i < n; i++) rows += '<div class="pist-skel-row"></div>';
    return '<div class="pist-component pist-skeleton"><div class="pist-skel-controls"></div>' + HEAD + rows + "</div>";
  }

  /* ---------- public: mount (build + wire chips + drill-down) ---------- */
  function mount(sel, opts) {
    var host = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!host) return null;
    host.innerHTML = build(opts || {});
    var comp = host.querySelector(".pist-component");
    if (!comp) return comp;

    // drill-down: expand/collapse a row's weekly breakdown
    comp.addEventListener("click", function (e) {
      var head = e.target.closest(".pist-rowhead");
      if (!head) return;
      var i = head.getAttribute("data-i");
      var detail = comp.querySelector('.pist-detail[data-detail="' + i + '"]');
      if (!detail) return;
      var open = !detail.hasAttribute("hidden");
      if (open) detail.setAttribute("hidden", ""); else detail.removeAttribute("hidden");
      head.setAttribute("aria-expanded", String(!open));
      var chev = head.querySelector(".pist-chev");
      if (chev) chev.textContent = open ? "▸" : "▾";
    });

    // chips: filter rows by driver
    comp.addEventListener("click", function (e) {
      var chip = e.target.closest(".pist-chip");
      if (!chip) return;
      var f = chip.getAttribute("data-f");
      comp.querySelectorAll(".pist-row").forEach(function (rw) {
        rw.style.display = (f === "all" || rw.getAttribute("data-drv") === f) ? "" : "none";
      });
      comp.querySelectorAll(".pist-chip").forEach(function (c) {
        c.classList.toggle("pist-chip--on", c.getAttribute("data-f") === f);
      });
    });
    return comp;
  }

  var api = { build: build, mount: mount, skeleton: skeleton };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PorterReporting = root.PorterReporting || {};
  root.PorterReporting.impressionShareTrendMonitor = api;
})(typeof window !== "undefined" ? window : this);
