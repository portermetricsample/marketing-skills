/*
 * Porter Reporting — component: charts/driver-tree  (GENERAL FRAMEWORK)
 * ------------------------------------------------------------------------
 * A left → right DRIVER TREE (a.k.a. decomposition / hierarchy tree): a root
 * node fans out into columns of child nodes, joined by curved connectors, where
 * each node is a small card of metrics with its Δ vs the previous period and an
 * efficiency colour. Click a node to expand / collapse its children.
 *
 *     [ Root ] ─┬─ [ Group A ] ─┬─ [ Item A1 ] ─ …
 *               │               └─ [ Item A2 ] ─ …
 *               └─ [ Group B ] ─── [ Item B1 ] ─ …
 *
 * This file is the CONNECTOR-AGNOSTIC ENGINE. It knows nothing about Google Ads,
 * Meta, GA4 or any platform — it renders ANY nested node tree you hand it. The
 * platform-specific knowledge (which fields, which deep-links, how to bucket the
 * data into the tree) lives in a USE CASE next to it, e.g.
 *   ./google-ads/account-structure-tree.js
 * which turns Google Ads data into the generic node tree this engine draws.
 *
 * Ownership (see ../../../_foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA — laying nodes into
 *     columns by depth, expand / collapse state, drawing the SVG connectors from
 *     measured DOM rects, computing each Δ + its MEANING (good/bad, inverted for
 *     cost metrics), the efficiency class from a caller-supplied baseline, number
 *     formatting, empty handling, and emitting HTML with class hooks.
 *   Design owns APPEARANCE — what every class hook + token looks like: node card
 *     chrome, the efficiency tints (--dt-good / --dt-mid / --dt-bad), the delta
 *     colours (--good / --bad), the connector stroke (--dt-link), fonts, spacing,
 *     dark theme. NO hex colour or font name lives in this file (the connector
 *     stroke reads var(--dt-link) with a neutral grey fallback). Hooks: README.md.
 *
 * It is a GENERATOR: `build(opts)` RECEIVES a node tree (it never fetches) and
 * EMITS an HTML string for the current open-state. `mount(target, opts)` adds the
 * browser interactivity — expand / collapse, lazy children, connector drawing,
 * redraw on resize. Connectors need a real DOM (measured rects), so a static
 * `build` string draws them only once `drawConnectors(hostEl)` runs in a browser
 * (mount does this for you).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.driverTree = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* --------------------------------------------------------------- helpers -- */
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }

  function group(v, dp) {                         // thousands separators, `dp` decimals
    var f = Math.pow(10, dp);
    var s = (Math.round(num(v) * f) / f).toFixed(dp);
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }

  // Built-in formats so the engine has ZERO deps. `format` on a metric picks one.
  var FORMATS = {
    money:  function (v) { return "$" + trimZeros(group(v, 2)); },
    int:    function (v) { return group(Math.round(num(v)), 0); },
    dec:    function (v) { return trimZeros(group(num(v), 2)); },
    pct:    function (v) { return (num(v) * 100).toFixed(1) + "%"; },   // fraction → %
    pct2:   function (v) { return (num(v) * 100).toFixed(2) + "%"; },
    share:  function (v) { var x = num(v); if (x <= 1) x *= 100; return x.toFixed(1) + "%"; }, // 0..1 or 0..100
    ratio:  function (v) { return num(v).toFixed(2) + "x"; },
    raw:    function (v) { return String(v == null ? "" : v); }
  };
  function fmt(v, format) { return (FORMATS[format] || FORMATS.dec)(v); }

  // strip XML-illegal C0 control chars (keep \t \n \r) so caller IDs/labels written into
  // SVG/HTML attributes survive DOM→XML serialization (PDF / PPTX / screenshot export).
  function xmlSafe(s) {
    return String(s == null ? "" : s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  }
  function esc(s) {
    return xmlSafe(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Inline Δ chip vs previous period, coloured by MEANING. `invert` flips good/bad
  // for cost-type metrics (a falling cost is good). Class hook only — Design owns colour.
  function delta(cur, prev, invert) {
    if (prev == null || prev === 0 || !isFinite(prev)) return "";
    var d = (num(cur) - prev) / prev;
    if (!isFinite(d) || d === 0) return "";
    var arrow = d > 0 ? "▲" : "▼";
    var dir = (d > 0) !== !!invert ? "good" : "bad";
    return ' <span class="dt-delta dt-delta--' + dir + '">' + arrow + Math.abs(d * 100).toFixed(0) + "%</span>";
  }

  /* ----------------------------------------------- efficiency → node class -- */
  // Returns "dt-good" | "dt-mid" | "dt-bad" | "dt-na". By default LOWER is better
  // (a cost metric like cost-per-conversion); set eff.higherIsBetter to flip.
  function effClass(value, eff) {
    if (!eff || !value || !eff.baseline) return "dt-na";
    var r = value / eff.baseline;
    if (eff.higherIsBetter) r = r ? 1 / r : 0;     // flip so "smaller r = better" always
    var good = eff.good != null ? eff.good : 0.8;
    var bad  = eff.bad  != null ? eff.bad  : 1.2;
    if (r <= good) return "dt-good";
    if (r <= bad)  return "dt-mid";
    return "dt-bad";
  }
  function effValue(node, eff) {
    if (!eff) return 0;
    if (typeof eff.derive === "function") return num(eff.derive(node));
    if (eff.metricKey) return num(node.metrics ? node.metrics[eff.metricKey] : 0);
    return 0;
  }

  /* ------------------------------------------------------- render one node -- */
  function nodeHtml(node, depth, opts) {
    var expandable = node.children === null || (node.children && node.children.length);
    var open = !!node._open;
    var selected = opts.selectedId && node._id === opts.selectedId;
    var cls = "dt-node";
    if (node.isRoot) cls += " dt-root";
    // colour: by efficiency (default) OR by direction (contribution mode — the node
    // HELPED or HURT the focus metric). The use case sets node.direction in that mode.
    if (!node.isRoot) {
      if (opts.colorBy === "direction") cls += " " + (node.direction === "good" ? "dt-good" : (node.direction === "bad" ? "dt-bad" : "dt-na"));
      else cls += " " + (node.eff || "dt-na");
    }
    if (expandable) cls += " dt-exp";
    if (node.placeholder) cls += " dt-ph";
    if (selected) cls += " dt-sel";

    var attrs = ' class="' + cls + '" data-dt-id="' + esc(node._id) + '"' +
                (node._parent != null ? ' data-dt-parent="' + esc(node._parent) + '"' : "") +
                (expandable ? ' data-dt-expandable="1"' : "") +
                ((expandable || opts.selectable) ? ' role="button" tabindex="0"' : "");

    if (node.placeholder) {
      return '<div' + attrs + '><div class="dt-name">' + esc(node.name) + "</div></div>";
    }

    var caret = expandable ? '<span class="dt-caret">' + (open ? "▾" : "▸") + "</span>" : "";
    var link = node.link
      ? ' <a class="dt-ext" href="' + esc(node.link) + '" target="_blank" rel="noopener" title="Open in a new tab" aria-label="Open in a new tab">↗</a>'
      : "";

    // Optional prominent headline (e.g. a node's contribution to the parent's change).
    var headline = node.headline
      ? '<div class="dt-headline dt-headline--' + (node.headline.tone || "flat") + '">' +
          '<span class="dt-h-val">' + esc(node.headline.value) + "</span>" +
          (node.headline.sub ? '<span class="dt-h-sub">' + esc(node.headline.sub) + "</span>" : "") +
        "</div>"
      : "";

    var krows = "";
    var metrics = opts.metrics || [];
    for (var i = 0; i < metrics.length; i++) {
      var m = metrics[i];
      var v = node.metrics ? node.metrics[m.key] : null;
      var pv = (opts.compare && node.prev) ? node.prev[m.key] : null;
      var valStr = (v == null || (m.skipZero && !num(v))) ? "—" : fmt(v, m.format);
      var d = (pv != null) ? delta(v, pv, m.invert) : "";
      krows += '<div class="dt-krow"><span class="dt-k">' + esc(m.label) +
               '</span><span class="dt-v">' + valStr + d + "</span></div>";
    }

    return '<div' + attrs + '>' +
             '<div class="dt-top">' + caret +
               '<span class="dt-name" title="' + esc(node.full || node.name) + '">' + esc(node.name) + "</span>" +
               link +
             "</div>" +
             headline +
             (krows ? '<div class="dt-krows">' + krows + "</div>" : "") +
           "</div>";
  }

  /* ------------------------------------------- walk open-state into columns -- */
  // Assigns stable _id / _parent / _open / eff on every node, and collects the
  // VISIBLE nodes into columns by depth (a child is visible only if its parent is
  // open). Root is always open.
  function layout(rootNode, opts) {
    var cols = [];
    var open = opts._open || {};
    function visit(node, depth, parentId, path) {
      node._id = path;
      node._parent = parentId;
      node.isRoot = depth === 0;
      node._open = node.isRoot ? true : !!open[path];
      if (!node.isRoot && opts.efficiency && !node.eff && !node.placeholder) {
        node.eff = effClass(effValue(node, opts.efficiency), opts.efficiency);
      }
      (cols[depth] = cols[depth] || []).push(node);
      if (node._open && node.children && node.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          visit(node.children[i], depth + 1, path, path + "/" + i);
        }
      } else if (node._open && node.children === null) {
        // expandable but not loaded → a placeholder child column entry
        var ph = { name: opts.loadingMessage || "Loading…", placeholder: true };
        ph._id = path + "/_ph"; ph._parent = path; ph.isRoot = false;
        (cols[depth + 1] = cols[depth + 1] || []).push(ph);
      }
    }
    visit(rootNode, 0, null, "r");
    return cols;
  }

  /* --------------------------------------------------------------- build -- */
  function build(opts) {
    opts = opts || {};
    if (!opts.tree) return '<div class="dt-empty">' + esc(opts.emptyMessage || "No data") + "</div>";
    var cols = layout(opts.tree, opts);
    var headers = opts.columns || [];

    var hdr = '<div class="dt-hdrs">';
    for (var c = 0; c < cols.length; c++) {
      if (!cols[c] || !cols[c].length) continue;
      hdr += '<div class="dt-colhdr">' + esc(headers[c] || "") + "</div>";
    }
    hdr += "</div>";

    var body = '<div class="dt-cols">';
    for (var c2 = 0; c2 < cols.length; c2++) {
      if (!cols[c2] || !cols[c2].length) continue;
      body += '<div class="dt-col">';
      for (var i = 0; i < cols[c2].length; i++) body += nodeHtml(cols[c2][i], c2, opts);
      body += "</div>";
    }
    body += "</div>";

    // .dt-links is the (initially empty) SVG layer; drawConnectors fills it once
    // the markup is in a real DOM and rects can be measured.
    return '<div class="dt-wrap">' +
             '<svg class="dt-links" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"></svg>' +
             hdr + body +
           "</div>";
  }

  /* ----------------------------------------------- draw the SVG connectors -- */
  // Browser-only: measures each node's rect and draws a smooth bezier from the
  // right edge of every parent to the left edge of each visible child.
  function drawConnectors(hostEl) {
    if (typeof document === "undefined" || !hostEl) return;
    var wrap = hostEl.querySelector(".dt-wrap");
    var svg = hostEl.querySelector(".dt-links");
    if (!wrap || !svg) return;
    var nodes = wrap.querySelectorAll(".dt-node[data-dt-id]");
    var map = {};
    var k;
    for (k = 0; k < nodes.length; k++) map[nodes[k].getAttribute("data-dt-id")] = nodes[k];
    // placeholder children also carry data-dt-id via their wrapper? they are .dt-node too.

    var W = wrap.scrollWidth, H = wrap.scrollHeight;
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.width = W + "px"; svg.style.height = H + "px";
    var wr = wrap.getBoundingClientRect();
    var paths = "";
    for (k = 0; k < nodes.length; k++) {
      var ce = nodes[k];
      var pid = ce.getAttribute("data-dt-parent");
      if (!pid || !map[pid]) continue;
      var pe = map[pid];
      var pr = pe.getBoundingClientRect(), cr = ce.getBoundingClientRect();
      var x1 = pr.right - wr.left, y1 = pr.top - wr.top + pr.height / 2;
      var x2 = cr.left - wr.left,  y2 = cr.top - wr.top + cr.height / 2;
      var mx = (x1 + x2) / 2;
      paths += "<path d='M" + x1.toFixed(1) + " " + y1.toFixed(1) +
               " C " + mx.toFixed(1) + " " + y1.toFixed(1) + " " +
                       mx.toFixed(1) + " " + y2.toFixed(1) + " " +
                       x2.toFixed(1) + " " + y2.toFixed(1) +
               "' fill='none' stroke='var(--dt-link, rgba(128,134,142,0.55))' stroke-width='1.4'/>";
    }
    svg.innerHTML = paths;
  }

  /* ---------------------------------------------------------------- mount -- */
  // Interactive: renders, draws connectors, toggles open-state on click / Enter,
  // optionally lazy-loads children (children === null + opts.onExpand), redraws on
  // resize. Returns a handle so the host can re-render after loading more data.
  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    var open = {};
    var selectedId = opts.selectedId || null;
    var resizeTimer;

    function render() {
      el.innerHTML = build({
        tree: opts.tree, columns: opts.columns, metrics: opts.metrics,
        efficiency: opts.efficiency, compare: opts.compare,
        colorBy: opts.colorBy, selectable: opts.selectable, selectedId: selectedId,
        emptyMessage: opts.emptyMessage, loadingMessage: opts.loadingMessage,
        _open: open
      });
      drawConnectors(el);
    }

    function findNode(node, id) {
      if (node._id === id) return node;
      if (node.children && node.children.length) {
        for (var i = 0; i < node.children.length; i++) {
          var f = findNode(node.children[i], id);
          if (f) return f;
        }
      }
      return null;
    }

    function toggle(id) {
      open[id] = !open[id];
      var node = opts.tree ? findNode(opts.tree, id) : null;
      // lazy load: expanding a not-yet-loaded node
      if (node && open[id] && node.children === null && typeof opts.onExpand === "function") {
        Promise.resolve(opts.onExpand(node)).then(function (children) {
          if (children !== undefined) node.children = children;
          render();
        });
      }
      render();
    }

    // Selecting a node (contribution mode): mark it + notify, without forcing a toggle.
    function select(id) {
      selectedId = id;
      var node = opts.tree ? findNode(opts.tree, id) : null;
      if (typeof opts.onSelect === "function") opts.onSelect(id, node);
      render();
    }
    function onActivate(n) {
      var id = n.getAttribute("data-dt-id");
      if (opts.selectable) select(id);
      if (n.getAttribute("data-dt-expandable")) toggle(id);   // select AND drill
    }

    el.addEventListener("click", function (e) {
      var ext = e.target.closest ? e.target.closest(".dt-ext") : null;
      if (ext) { e.stopPropagation(); return; }                 // let the link open
      var n = e.target.closest ? e.target.closest(".dt-node[data-dt-id]") : null;
      if (n && !n.classList.contains("dt-ph")) onActivate(n);
    });
    el.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var n = e.target.closest ? e.target.closest(".dt-node[data-dt-id]") : null;
      if (n && !n.classList.contains("dt-ph")) { e.preventDefault(); onActivate(n); }
    });
    if (typeof window !== "undefined") {
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { drawConnectors(el); }, 150);
      });
    }

    render();
    return {
      el: el,
      rerender: render,
      redraw: function () { drawConnectors(el); },
      select: select,
      getSelected: function () { return selectedId; },
      open: open
    };
  }

  /* --------------------------------------------------------------- public -- */
  return {
    build: build,
    mount: mount,
    drawConnectors: drawConnectors,
    fmt: fmt,
    FORMATS: FORMATS,
    _internal: { delta: delta, effClass: effClass, layout: layout, esc: esc }
  };
});
