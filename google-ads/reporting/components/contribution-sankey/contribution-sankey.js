/*
 * Porter Reporting — component: charts/contribution-sankey  (GENERAL FRAMEWORK)
 * ------------------------------------------------------------------------
 * A left → right CONTRIBUTION SANKEY: a flow diagram where a total fans out
 * through columns of nodes joined by RIBBONS whose width = the chosen metric
 * flowing through them. Reads as "where does my <spend / conversions / value>
 * actually go", level by level.
 *
 *     [ root ] ═╦═ [ A ] ═╦═ [ A1 ] ═ …
 *               ║         ╚═ [ A2 ] ═ …
 *               ╚═ [ B ] ═══ [ B1 ] ═ …
 *
 * This file is the CONNECTOR-AGNOSTIC ENGINE. It knows nothing about Google Ads,
 * Meta or GA4 — it draws ANY layered weighted flow you hand it (nodes + links,
 * each carrying a value per metric). The platform knowledge (which fields, how to
 * bucket rows into levels, the honest "remainder" buckets that keep each column
 * reconciled) lives in a USE CASE next to it, e.g.
 *   ./google-ads/account-contribution.js
 *
 * Sibling of charts/driver-tree: same hierarchy, different shape — the tree draws
 * metric CARDS joined by thin connectors; this draws RIBBONS whose THICKNESS is
 * the metric. Use the tree to read each node's numbers; use the sankey to see
 * proportion / where volume concentrates.
 *
 * Ownership (see ../../../_foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA — laying nodes into
 *     columns by level, the proportional sankey layout (node heights + ribbon
 *     widths from the active metric), the flow-by-metric switch, the depth cap,
 *     trajectory highlight (light the whole path through a hovered node), the
 *     hover tooltip card, number formatting, empty handling, emitting class hooks.
 *   Design owns APPEARANCE — what every hook + token looks like: the categorical
 *     ribbon/node colours (--cat-1..N / --sk-*), ribbon opacity, the tooltip
 *     (.pds-tooltip / --tip-*), the segmented control, fonts, dark theme. NO hex
 *     colour or font name is the source of truth here — the few colours present
 *     are CSS-var references with a neutral fallback so it still draws untokened.
 *     Hooks: README.md.
 *
 * GENERATOR: `build(opts)` RECEIVES nodes + links (it never fetches) and EMITS an
 * HTML+SVG string for the active metric/depth. `mount(target, opts)` adds the
 * browser interactivity — flow-by switch, hover highlight + tooltip, resize.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.contributionSankey = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* --------------------------------------------------------------- helpers -- */
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function f1(v) { return Math.round(num(v) * 10) / 10; }
  function group(v, dp) {
    var k = Math.pow(10, dp), s = (Math.round(num(v) * k) / k).toFixed(dp), p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }

  // Built-in formats so the engine has ZERO deps. `format` on a metric/row picks one.
  var FORMATS = {
    money: function (v) { return "$" + trimZeros(group(v, 2)); },
    int:   function (v) { return group(Math.round(num(v)), 0); },
    dec:   function (v) { return trimZeros(group(num(v), 2)); },
    pct:   function (v) { return (num(v) * 100).toFixed(1) + "%"; },
    pct2:  function (v) { return (num(v) * 100).toFixed(2) + "%"; },
    share: function (v) { var x = num(v); if (x <= 1) x *= 100; return x.toFixed(1) + "%"; },
    ratio: function (v) { return num(v).toFixed(2) + "x"; },
    raw:   function (v) { return String(v == null ? "" : v); }
  };
  function fmt(v, format) { return (FORMATS[format] || FORMATS.dec)(v); }

  // strip XML-illegal C0 control chars (keep \t \n \r) so caller IDs/labels written into
  // SVG attributes survive DOM→XML serialization (PDF / PPTX / screenshot / standalone-HTML).
  function xmlSafe(s) {
    return String(s == null ? "" : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  function esc(s) {
    return xmlSafe(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Categorical colour for a branch index. Design overrides via --cat-N / --sk-other;
  // the fallback hexes only keep it legible with no tokens loaded (never the source of truth).
  var FALLBACK = ["#6701e6", "#2dd4bf", "#fbbf24", "#ec4899", "#3b82f6", "#f97316", "#0ea5e9", "#a855f7"];
  function colorVar(bi) {
    if (bi < 0) return "var(--sk-other, #b8bdc9)";            // remainder / "other" branch
    return "var(--cat-" + ((bi % 8) + 1) + ", " + FALLBACK[bi % 8] + ")";
  }

  function av(o, metric) { return o && o.values ? num(o.values[metric]) : 0; }

  /* ----------------------------------------------- relations (for hover) ---- */
  // Filter nodes/links to the active metric + depth, then index parent/children.
  // Same filter the layout uses, so the hover graph matches what's drawn.
  function relations(opts, metric, maxLevel) {
    var cap = (maxLevel == null) ? Infinity : maxLevel;
    var byId = {}, keep = {};
    (opts.nodes || []).forEach(function (n) { byId[n.id] = n; });
    (opts.nodes || []).forEach(function (n) {
      if (n.level <= cap && (n.level === 0 || av(n, metric) > 0)) keep[n.id] = n;
    });
    var links = (opts.links || []).filter(function (l) {
      return keep[l.source] && keep[l.target] && av(l, metric) > 0;
    });
    var children = {}, parentOf = {};
    links.forEach(function (l) { (children[l.source] = children[l.source] || []).push(l.target); parentOf[l.target] = l.source; });
    return { keep: keep, links: links, children: children, parentOf: parentOf };
  }

  // The set of node ids on the full trajectory THROUGH id (ancestors + descendants).
  function trajectory(id, rel) {
    var set = {}; set[id] = 1;
    var p = rel.parentOf[id]; while (p != null) { set[p] = 1; p = rel.parentOf[p]; }
    var stack = [id];
    while (stack.length) { var cur = stack.pop(); (rel.children[cur] || []).forEach(function (c) { if (!set[c]) { set[c] = 1; stack.push(c); } }); }
    return set;
  }

  /* --------------------------------------------------------------- layout -- */
  function dimsOf(opts) {
    var headerH = opts.headerH != null ? opts.headerH : 26;
    return {
      width: opts.width || 900, height: opts.height || 560,
      padL: 10, padR: opts.padR != null ? opts.padR : 174,
      headerH: headerH, padTop: headerH + 8, padBot: 10,
      gap: opts.gap || 7, nodeW: opts.nodeW || 14, minNode: 1.4,
      labelMin: 9, labelMax: opts.labelMax || 34
    };
  }

  function layout(opts, dims) {
    var metric = opts.metric;
    var rel = relations(opts, metric, opts.maxLevel);
    var keep = rel.keep, children = rel.children;
    var ids = Object.keys(keep);
    if (!ids.length) return null;

    // branch index per node — assigned from the INPUT node order so a branch keeps
    // the SAME colour across metric / depth switches. "__other__" → remainder (grey).
    var branchIdx = {}, bcount = 0;
    (opts.nodes || []).forEach(function (n) {
      var b = n.branch;
      if (b != null && b !== "__other__" && !(b in branchIdx)) branchIdx[b] = bcount++;
    });
    function bi(n) {
      var b = n.branch;
      if (b == null) return -2;                       // no branch → neutral
      if (b === "__other__") return -1;               // remainder bucket
      return (b in branchIdx) ? branchIdx[b] : -2;
    }

    var maxCol = 0; ids.forEach(function (id) { if (keep[id].level > maxCol) maxCol = keep[id].level; });

    // order nodes per column via DFS (children contiguous under parent, value desc) → tidy, low-crossing.
    var roots = ids.map(function (id) { return keep[id]; }).filter(function (n) { return n.level === 0; })
      .sort(function (a, b) { return av(b, metric) - av(a, metric); });
    var colNodes = [];
    function pushCol(c, id) { (colNodes[c] = colNodes[c] || []).push(id); }
    function dfs(n) {
      pushCol(n.level, n.id);
      (children[n.id] || []).slice().sort(function (a, b) { return av(keep[b], metric) - av(keep[a], metric); })
        .forEach(function (cid) { dfs(keep[cid]); });
    }
    roots.forEach(dfs);

    // uniform scale: the tallest column (value + gaps) fits the target height.
    var colVal = colNodes.map(function (a) { return a.reduce(function (s, id) { return s + av(keep[id], metric); }, 0); });
    var maxColVal = Math.max.apply(null, colVal.concat([1]));
    var maxGap = Math.max.apply(null, colNodes.map(function (a) { return (a.length - 1) * dims.gap; }).concat([0]));
    var scale = (dims.height - dims.padTop - dims.padBot - maxGap) / maxColVal;
    if (!isFinite(scale) || scale <= 0) scale = 1;

    // place: stack each column in DFS order, centre columns vertically.
    var colH = colNodes.map(function (a) {
      var h = (a.length - 1) * dims.gap;
      a.forEach(function (id) { h += Math.max(dims.minNode, av(keep[id], metric) * scale); });
      return h;
    });
    var contentH = Math.max.apply(null, colH.concat([0]));
    var colStep = maxCol > 0 ? (dims.width - dims.padL - dims.padR - dims.nodeW) / maxCol : 0;

    var pos = {};
    colNodes.forEach(function (a, c) {
      var y = dims.padTop + (contentH - colH[c]) / 2;
      var x = dims.padL + c * colStep;
      a.forEach(function (id) {
        var n = keep[id], h = Math.max(dims.minNode, av(n, metric) * scale);
        pos[id] = { x: x, y: y, w: dims.nodeW, h: h, col: c, bi: bi(n), label: n.label, full: n.full || n.label };
        y += h + dims.gap;
      });
    });

    // ribbons: partition each parent's right edge among its children, same (value-desc) order they were stacked.
    var ribbons = [];
    Object.keys(children).forEach(function (pid) {
      if (!pos[pid]) return;
      var p = pos[pid], sy = p.y;
      children[pid].slice().filter(function (cid) { return pos[cid]; })
        .sort(function (a, b) { return av(keep[b], metric) - av(keep[a], metric); })
        .forEach(function (cid) {
          var c = pos[cid], w = av(keep[cid], metric) * scale;
          var sy0 = sy, sy1 = sy + w; sy += w;
          var x1 = p.x + p.w, x2 = c.x, mx = (x1 + x2) / 2;
          var d = "M" + f1(x1) + " " + f1(sy0) +
                  " C" + f1(mx) + " " + f1(sy0) + " " + f1(mx) + " " + f1(c.y) + " " + f1(x2) + " " + f1(c.y) +
                  " L" + f1(x2) + " " + f1(c.y + c.h) +
                  " C" + f1(mx) + " " + f1(c.y + c.h) + " " + f1(mx) + " " + f1(sy1) + " " + f1(x1) + " " + f1(sy1) + " Z";
          ribbons.push({ d: d, bi: c.bi, src: pid, tgt: cid });
        });
    });

    return {
      pos: pos, ribbons: ribbons, maxCol: maxCol, colStep: colStep,
      height: contentH + dims.padTop + dims.padBot
    };
  }

  /* --------------------------------------------------------------- build -- */
  function controlsHtml(opts) {
    var metrics = opts.metrics || [];
    if (opts.metricToggle === false || metrics.length < 2) return "";
    var btns = metrics.map(function (m) {
      var on = m.key === opts.metric ? " is-active" : "";
      return '<button class="sk-seg-btn' + on + '" data-metric="' + esc(m.key) + '">' + esc(m.label) + "</button>";
    }).join("");
    return '<div class="sk-controls"><div class="sk-seg"><span class="sk-seg-lab">Flow by</span>' + btns + "</div></div>";
  }

  function build(opts) {
    opts = opts || {};
    if (!opts.nodes || !opts.nodes.length) return '<div class="sk-empty">' + esc((opts && opts.emptyMessage) || "No data") + "</div>";
    var dims = dimsOf(opts);
    var L = layout(opts, dims);
    if (!L) return '<div class="sk-empty">' + esc(opts.emptyMessage || "No data for this selection") + "</div>";

    var cols = opts.columns || [];
    var hdr = "";
    for (var c = 0; c <= L.maxCol; c++) {
      if (!cols[c]) continue;
      var first = c === 0, cx = dims.padL + c * L.colStep;
      hdr += '<text class="sk-colhdr" x="' + f1(first ? dims.padL : cx + dims.nodeW / 2) + '" y="' + (dims.headerH - 9) +
             '" text-anchor="' + (first ? "start" : "middle") + '">' + esc(cols[c]) + "</text>";
    }

    var ribbons = L.ribbons.map(function (r) {
      return '<path class="sk-ribbon" data-sk-src="' + esc(r.src) + '" data-sk-tgt="' + esc(r.tgt) +
             '" d="' + r.d + '" fill="' + colorVar(r.bi) + '"/>';
    }).join("");

    var nodes = Object.keys(L.pos).map(function (id) {
      var p = L.pos[id];
      var rect = '<rect class="sk-node" data-sk-id="' + esc(id) + '" data-sk-level="' + p.col +
                 '" x="' + f1(p.x) + '" y="' + f1(p.y) + '" width="' + p.w + '" height="' + f1(p.h) + '" rx="1.5" fill="' + colorVar(p.bi) + '"><title>' + esc(p.full) + "</title></rect>";
      var label = "";
      if (p.h >= dims.labelMin) {
        var t = p.label || ""; if (t.length > dims.labelMax) t = t.slice(0, dims.labelMax - 1) + "…";
        label = '<text class="sk-label" x="' + f1(p.x + p.w + 5) + '" y="' + f1(p.y + p.h / 2) +
                '" dominant-baseline="middle">' + esc(t) + "</text>";
      }
      return rect + label;
    }).join("");

    var svg = '<svg class="sk-svg" width="' + dims.width + '" height="' + f1(L.height) +
              '" viewBox="0 0 ' + dims.width + " " + f1(L.height) + '" xmlns="http://www.w3.org/2000/svg" role="img">' +
              '<g class="sk-ribbons">' + ribbons + "</g><g class=\"sk-nodes\">" + nodes + "</g>" +
              '<g class="sk-hdrs">' + hdr + "</g></svg>";

    return '<div class="sk-component">' + controlsHtml(opts) +
           '<div class="sk-host" data-porter-chart="contribution_sankey">' + svg + "</div>" +
           '<div class="pds-tooltip sk-tip" role="tooltip" hidden></div></div>';
  }

  /* ----------------------------------------------------------- tooltip -- */
  function tipRows(opts) {
    if (opts.tooltipRows && opts.tooltipRows.length) return opts.tooltipRows;
    return (opts.metrics || []).map(function (m) { return { label: m.label, key: m.key, format: m.format }; });
  }
  function tipHtml(node, opts) {
    var rows = tipRows(opts), out = "";
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var v = (typeof r.derive === "function") ? r.derive(node.values || {}) : (node.values ? node.values[r.key] : null);
      var s = (v == null || (r.skipZero && !num(v))) ? "—" : fmt(v, r.format);
      out += '<span class="sk-tip-k">' + esc(r.label) + '</span><span class="sk-tip-v">' + s + "</span>";
    }
    return '<div class="sk-tip-h">' + esc(node.label || node.id) + "</div><div class=\"sk-tip-grid\">" + out + "</div>";
  }

  /* ---------------------------------------------------------------- mount -- */
  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    var metrics = opts.metrics || [];
    var state = { metric: opts.metric || (metrics[0] && metrics[0].key), maxLevel: opts.maxLevel };
    var byId = {}; (opts.nodes || []).forEach(function (n) { byId[n.id] = n; });
    var rt, hostW;

    function render() {
      hostW = el.clientWidth || opts.width || 900;
      var o = {}; for (var k in opts) o[k] = opts[k];
      o.width = hostW; o.metric = state.metric; o.maxLevel = state.maxLevel;
      el.innerHTML = build(o);
      wire();
    }

    function wire() {
      var btns = el.querySelectorAll(".sk-seg-btn[data-metric]");
      for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener("click", function (e) { state.metric = e.currentTarget.getAttribute("data-metric"); render(); });
      }
      var svg = el.querySelector(".sk-svg"), tip = el.querySelector(".sk-tip");
      if (!svg) return;
      var rel = relations(opts, state.metric, state.maxLevel);

      function clearHi() {
        var hot = svg.querySelectorAll(".is-hot,.is-dim");
        for (var i = 0; i < hot.length; i++) hot[i].classList.remove("is-hot", "is-dim");
        if (tip) tip.hidden = true;
      }
      function focusNode(id, ev) {
        var set = trajectory(id, rel);
        var ns = svg.querySelectorAll(".sk-node"), rs = svg.querySelectorAll(".sk-ribbon"), i;
        for (i = 0; i < ns.length; i++) { var nid = ns[i].getAttribute("data-sk-id"); ns[i].classList.toggle("is-hot", !!set[nid]); ns[i].classList.toggle("is-dim", !set[nid]); }
        for (i = 0; i < rs.length; i++) { var on = !!(set[rs[i].getAttribute("data-sk-src")] && set[rs[i].getAttribute("data-sk-tgt")]); rs[i].classList.toggle("is-hot", on); rs[i].classList.toggle("is-dim", !on); }
        if (tip && byId[id]) { tip.innerHTML = tipHtml(byId[id], opts); tip.hidden = false; moveTip(ev); }
      }
      function moveTip(ev) {
        if (!tip || tip.hidden) return;
        var r = el.getBoundingClientRect();
        var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        if (x + tip.offsetWidth > el.clientWidth) x = ev.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = Math.max(0, x) + "px"; tip.style.top = Math.max(0, y) + "px";
      }
      svg.addEventListener("mousemove", function (e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains("sk-node")) { focusNode(t.getAttribute("data-sk-id"), e); }
        else if (t && t.classList && t.classList.contains("sk-ribbon")) { focusNode(t.getAttribute("data-sk-tgt"), e); }
        else { clearHi(); }
      });
      svg.addEventListener("mouseleave", clearHi);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(render, 150); });
    }
    render();
    return {
      el: el, rerender: render,
      setMetric: function (m) { state.metric = m; render(); },
      setMaxLevel: function (n) { state.maxLevel = n; render(); },
      getState: function () { return state; }
    };
  }

  /* --------------------------------------------------------------- public -- */
  return {
    build: build, mount: mount, layout: layout, fmt: fmt, FORMATS: FORMATS,
    _internal: { relations: relations, trajectory: trajectory, colorVar: colorVar }
  };
});
