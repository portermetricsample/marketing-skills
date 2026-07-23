/* ============================================================================
   Porter Charts — framework-free, dependency-free chart primitives.
   Pairs with the .pds-* CSS primitives. Paints only from theme CSS vars
   (--accent-line, --area-fill, --surface-card, --grid-line, --text-muted,
   --tip-*), so all 4 themes work.

   Usage (declarative — auto-initialises, re-scans on DOM changes):
     <div class="pds-scorecard__spark" data-spark="2.1,2.3,2.0,2.6,2.4,3.1"></div>
     <div data-series="120,134,128,156,149,171,168,190"
          data-series-labels="W1,W2,W3,W4,W5,W6,W7,W8"
          data-unit="$" style="height:240px"></div>

   Usage (imperative):
     PorterCharts.sparkline(el, [..values], { stroke, fill, fallback });
     PorterCharts.timeseries(el, [..values], { height, labels, unit, axes });

   RULES baked in (these ARE the design contract — do not strip them):
   - Time-series carry LABELED AXES: a Y scale (min·mid·max, gridlines) and X
     labels (from data-series-labels). The reader can read approximate values
     WITHOUT hovering. Opt out only with data-axes="off" / {axes:false}.
   - EVERY data chart has a hover TOOLTIP with the value (and label). Points on
     a time-series each get one; a sparkline gets one for its latest value.
   - Sparklines are SMOOTHED (Catmull-Rom) + area-filled — never a raw polyline,
     and are the ONE exception to axes (too small) — but still get a tooltip.
   - ≥5-point guard: a sparkline with <5 points renders NOTHING and shows the
     element's data-spark-fallback text instead (a 2-point "trend" is a lie).
   ============================================================================ */
(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var MIN_SPARK_POINTS = 5;

  function svgEl(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function parseValues(str) {
    if (!str) return [];
    return String(str).split(/[,\s]+/)
      .map(function (s) { return parseFloat(s); })
      .filter(function (v) { return !isNaN(v); });
  }

  // Abbreviate a number for an axis / tooltip ($158.9K, 1.2M, 4.8). Unit is an
  // optional leading symbol ("$"). Trailing-symbol units ("%","x") via unitAfter.
  function fmtNum(v, unit, unitAfter) {
    unit = unit || ''; unitAfter = unitAfter || '';
    var a = Math.abs(v), s;
    if (a >= 1e6) s = trimZero((v / 1e6).toFixed(a >= 1e7 ? 0 : 1)) + 'M';
    else if (a >= 1e3) s = trimZero((v / 1e3).toFixed(a >= 1e4 ? 0 : 1)) + 'K';
    else if (a >= 100) s = String(Math.round(v));
    else s = trimZero((Math.round(v * 10) / 10).toFixed(1));
    return unit + s + unitAfter;
  }
  function trimZero(str) { return String(str).replace(/\.0$/, ''); }

  // Smoothed path through points via Catmull-Rom → cubic Bezier.
  function smoothPath(pts) {
    if (pts.length < 2) return '';
    if (pts.length === 2) return 'M' + pts[0].x + ',' + pts[0].y + 'L' + pts[1].x + ',' + pts[1].y;
    var d = 'M' + pts[0].x + ',' + pts[0].y;
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1.x + (p2.x - p0.x) / 6;
      var c1y = p1.y + (p2.y - p0.y) / 6;
      var c2x = p2.x - (p3.x - p1.x) / 6;
      var c2y = p2.y - (p3.y - p1.y) / 6;
      d += 'C' + c1x + ',' + c1y + ' ' + c2x + ',' + c2y + ' ' + p2.x + ',' + p2.y;
    }
    return d;
  }

  function scale(values, w, h, pad) {
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = (max - min) || 1;
    var n = values.length;
    return values.map(function (v, i) {
      return {
        x: n === 1 ? w / 2 : pad + (w - 2 * pad) * (i / (n - 1)),
        y: pad + (h - 2 * pad) * (1 - (v - min) / range)
      };
    });
  }

  function resolve(target) {
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function readLabels(node, opts) {
    if (opts && opts.labels) return opts.labels;
    var a = node && node.getAttribute && node.getAttribute('data-series-labels');
    return a ? a.split(',').map(function (s) { return s.trim(); }) : null;
  }

  // A branded hover tooltip (.pds-hotspot > .pds-tooltip) positioned at left%/top%.
  function hotspot(leftPct, topPct, label, valStr, size) {
    var hs = document.createElement('div');
    hs.className = 'pds-hotspot';
    hs.setAttribute('style',
      'position:absolute;left:' + leftPct + '%;top:' + topPct + '%;' +
      'width:' + (size || 18) + 'px;height:' + (size || 18) + 'px;' +
      'transform:translate(-50%,-50%);pointer-events:auto;');
    var tip = document.createElement('div');
    tip.className = 'pds-tooltip';
    tip.innerHTML = '<span class="pds-tooltip__date">' + esc(label) + '</span>' +
                    '<span class="pds-tooltip__val">' + esc(valStr) + '</span>';
    hs.appendChild(tip);
    return hs;
  }

  /* ── SPARKLINE (smoothed + area-filled; no axes, but a tooltip) ─────────── */
  function sparkline(target, values, opts) {
    opts = opts || {};
    var node = resolve(target);
    if (!node) return;
    if (!values) values = parseValues(node.getAttribute('data-spark'));

    // ≥5-point guard — render nothing, show context text instead.
    if (!values || values.length < MIN_SPARK_POINTS) {
      node.innerHTML = '';
      var fb = opts.fallback || node.getAttribute('data-spark-fallback');
      if (fb) {
        node.textContent = fb;
        node.setAttribute('data-spark-empty', '');
        node.style.font = node.style.font || '';
      }
      return null;
    }

    var w = opts.width || 100;
    var h = opts.height || 26;
    var pad = opts.pad != null ? opts.pad : 3;
    var stroke = opts.stroke || 'var(--accent-line)';
    var fill = opts.fill || 'var(--area-fill)';
    var pts = scale(values, w, h, pad);
    var line = smoothPath(pts);
    var area = line + 'L' + pts[pts.length - 1].x + ',' + h + 'L' + pts[0].x + ',' + h + 'Z';

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, preserveAspectRatio: 'none' });
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', h);
    svg.style.display = 'block';
    svg.appendChild(svgEl('path', { d: area, fill: fill }));
    svg.appendChild(svgEl('path', {
      d: line, fill: 'none', stroke: stroke,
      'stroke-width': opts.strokeWidth || 2,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      'vector-effect': 'non-scaling-stroke'
    }));
    node.innerHTML = '';
    node.removeAttribute('data-spark-empty');
    if (!node.style.position) node.style.position = 'relative';
    node.appendChild(svg);

    // Tooltip — sparklines are axis-exempt but still surface their latest value.
    if (opts.tooltip !== false) {
      var unit = opts.unit || node.getAttribute('data-unit') || '';
      var unitAfter = opts.unitAfter || node.getAttribute('data-unit-after') || '';
      var hs = hotspot(50, 50, opts.tipLabel || 'Latest',
        fmtNum(values[values.length - 1], unit, unitAfter), Math.max(w, 28));
      hs.style.left = '0'; hs.style.top = '0'; hs.style.width = '100%';
      hs.style.height = '100%'; hs.style.transform = 'none';
      node.appendChild(hs);
    }
    return svg;
  }

  /* ── TIME SERIES (smoothed curve + area + dots + LABELED AXES + TOOLTIPS) ── */
  function timeseries(target, values, opts) {
    opts = opts || {};
    var node = resolve(target);
    if (!node) return;
    if (!values) values = parseValues(node.getAttribute('data-series'));
    if (!values || values.length < 2) { node.innerHTML = ''; return null; }

    var axes = opts.axes !== false && node.getAttribute('data-axes') !== 'off';
    var unit = opts.unit || node.getAttribute('data-unit') || '';
    var unitAfter = opts.unitAfter || node.getAttribute('data-unit-after') || '';
    var labels = readLabels(node, opts);

    var w = opts.width || node.clientWidth || 600;
    var h = opts.height || parseInt(node.getAttribute('data-height'), 10) || node.clientHeight || 240;
    var basePad = opts.pad != null ? opts.pad : 18;
    var mL = axes ? 50 : basePad;
    var mR = axes ? 14 : basePad;
    var mT = axes ? 12 : basePad;
    var mB = axes ? 26 : basePad;

    var stroke = opts.stroke || 'var(--accent-line)';
    var fill = opts.fill || 'var(--area-fill)';
    var dots = opts.dots !== false;

    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = (max - min) || 1;
    var plotW = w - mL - mR;
    var plotH = h - mT - mB;
    var n = values.length;
    var pts = values.map(function (v, i) {
      return {
        x: mL + (n === 1 ? plotW / 2 : plotW * (i / (n - 1))),
        y: mT + plotH * (1 - (v - min) / range),
        v: v
      };
    });
    var line = smoothPath(pts);
    var baseY = mT + plotH;
    var area = line + 'L' + pts[n - 1].x + ',' + baseY + 'L' + pts[0].x + ',' + baseY + 'Z';

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h });
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', h);
    svg.style.display = 'block';
    svg.style.overflow = 'visible';

    // Y axis: gridlines + max/mid/min value labels.
    if (axes) {
      var yVals = [max, (max + min) / 2, min];
      var yYs = [mT, mT + plotH / 2, baseY];
      for (var g = 0; g < 3; g++) {
        svg.appendChild(svgEl('line', {
          x1: mL, y1: yYs[g], x2: w - mR, y2: yYs[g],
          stroke: 'var(--grid-line)', 'stroke-width': 1
        }));
        var yt = svgEl('text', {
          x: mL - 8, y: yYs[g] + 3, 'text-anchor': 'end',
          fill: 'var(--text-muted)', 'font-size': 10,
          'font-family': 'var(--font-hanken, sans-serif)'
        });
        yt.textContent = fmtNum(yVals[g], unit, unitAfter);
        svg.appendChild(yt);
      }
    }

    svg.appendChild(svgEl('path', { d: area, fill: fill }));
    svg.appendChild(svgEl('path', {
      d: line, fill: 'none', stroke: stroke, 'stroke-width': opts.strokeWidth || 2.5,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
    if (dots) {
      pts.forEach(function (p) {
        svg.appendChild(svgEl('circle', {
          cx: p.x, cy: p.y, r: opts.dotRadius || 3.5,
          fill: 'var(--surface-card)', stroke: stroke, 'stroke-width': 2
        }));
      });
    }

    // X axis: sparse labels (up to ~6, always including the last).
    if (axes && labels && labels.length) {
      var step = Math.max(1, Math.ceil(n / 6));
      var shown = {};
      for (var i = 0; i < n; i += step) shown[i] = true;
      shown[n - 1] = true;
      for (var xi = 0; xi < n; xi++) {
        if (!shown[xi] || !labels[xi]) continue;
        var anchor = xi === 0 ? 'start' : (xi === n - 1 ? 'end' : 'middle');
        var xt = svgEl('text', {
          x: pts[xi].x, y: h - 7, 'text-anchor': anchor,
          fill: 'var(--text-muted)', 'font-size': 10,
          'font-family': 'var(--font-hanken, sans-serif)'
        });
        xt.textContent = labels[xi];
        svg.appendChild(xt);
      }
    }

    if (!node.style.position) node.style.position = 'relative';
    node.innerHTML = '';
    node.appendChild(svg);

    // Tooltips: one branded popover per point (value + label).
    if (opts.tooltip !== false) {
      var ov = document.createElement('div');
      ov.setAttribute('style', 'position:absolute;inset:0;pointer-events:none;');
      pts.forEach(function (p, i) {
        var lab = (labels && labels[i]) ? labels[i] : ('Point ' + (i + 1));
        ov.appendChild(hotspot(p.x / w * 100, p.y / h * 100, lab, fmtNum(p.v, unit, unitAfter)));
      });
      node.appendChild(ov);
    }

    node.__pdsSeries = values;
    node.__pdsOpts = opts;
    return svg;
  }

  /* ── AUTO-INIT (idempotent) + resilient re-scan ────────────────────────── */
  function init(root) {
    root = root || document;
    var sparks = root.querySelectorAll('[data-spark]');
    for (var i = 0; i < sparks.length; i++) {
      if (sparks[i].__pdsDone) continue;
      sparks[i].__pdsDone = true;
      sparkline(sparks[i]);
    }
    var series = root.querySelectorAll('[data-series]');
    for (var j = 0; j < series.length; j++) {
      if (series[j].__pdsDone) continue;
      series[j].__pdsDone = true;
      timeseries(series[j]);
      observeResize(series[j]);
    }
  }

  function observeResize(node) {
    if (typeof ResizeObserver === 'undefined' || node.__pdsRO) return;
    var ro = new ResizeObserver(function () {
      if (node.__pdsSeries) timeseries(node, node.__pdsSeries, node.__pdsOpts);
    });
    ro.observe(node);
    node.__pdsRO = ro;
  }

  // Always defer the actual DOM mutation out of the current task, so we never
  // mutate during a host framework's (e.g. React) synchronous commit phase —
  // that is what triggers "node to be removed is not a child" reconcile errors.
  var scanQueued = false;
  function scheduleScan() {
    if (scanQueued) return;
    scanQueued = true;
    // setTimeout (not rAF) — rAF is throttled in background/offscreen iframes.
    setTimeout(function () { scanQueued = false; init(); }, 0);
  }

  function start() {
    scheduleScan();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  global.PorterCharts = {
    sparkline: sparkline,
    timeseries: timeseries,
    smoothPath: smoothPath,
    parseValues: parseValues,
    fmtNum: fmtNum,
    init: init,
    scan: scheduleScan,
    MIN_SPARK_POINTS: MIN_SPARK_POINTS
  };
})(typeof window !== 'undefined' ? window : this);
