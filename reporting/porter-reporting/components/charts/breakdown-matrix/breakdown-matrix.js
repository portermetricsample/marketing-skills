/*
 * Porter Reporting — component: charts/breakdown-matrix
 * ------------------------------------------------------------------------
 * Metrics (rows, optionally grouped) × a BREAKDOWN (columns). The breakdown is
 * PLUGGABLE — that is the whole point of this component:
 *   • TIME axis  → bucketed by day / week / month / quarter (the canonical case)
 *   • CATEGORY   → any dimension: campaign · ad group · campaign type · product
 *                  · device · landing page · … (one column per distinct value)
 * Same transposed grid either way: leading Total column, per-row heat.
 *
 * Time is the canonical special case — the Acme Insurance report "Time" page
 * (`ga_time`). Behaviour spec (source of truth):
 *   ../../../_foundation/component-contract.md → "Breakdown matrix".
 *
 * NOTHING is hardcoded that a user might change:
 *   • the metric ROWS are caller-provided (SUMAS funnel is only the DEFAULT);
 *   • the COLUMN breakdown is caller-provided (time is only the default).
 *
 * Ownership (see _foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + DATA — bucketing, deriving rates,
 *     grouping, the Total column, column ordering, per-row heat magnitude,
 *     number formatting, empty/zero handling.
 *   Design owns APPEARANCE — heat ramp (--cf-1..--cf-5), fonts, borders — via
 *     breakdown-matrix.css → porter-design tokens. No hex / font name lives here.
 *
 * A GENERATOR: it RECEIVES a data series (never fetches) and EMITS an HTML string.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.breakdownMatrix = api;
    root.PorterReporting.timeMatrix = api;     // back-compat alias (time = one breakdown)
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // -- base counts read off each series row (override via opts.fields) ----------
  var BASE = {
    date: "date",
    cost: "cost",
    impressions: "impressions",
    clicks: "clicks",
    conversions: "conversions",
    convValue: "conv_value",
    impressionShare: "impression_share"
  };

  // ---------------------------------------------------------------- helpers --
  function num(v) { return Number(v) || 0; }
  function group(v, dp) {
    var f = Math.pow(10, dp);
    var s = (Math.round(num(v) * f) / f).toFixed(dp);
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }

  // number formatting per metric type; empty/zero money & rates -> "—"
  var fmt = {
    money:  function (v) { return num(v) <= 0 ? "—" : "$" + trimZeros(group(v, 2)); },
    money2: function (v) { return num(v) <= 0 ? "—" : "$" + group(v, 2); },
    int:    function (v) { return group(Math.round(num(v)), 0); },
    dec:    function (v) { return num(v) <= 0 ? "—" : trimZeros(group(v, 2)); },
    pct1:   function (v) { return num(v) <= 0 ? "—" : (num(v) * 100).toFixed(1) + "%"; },
    pct2:   function (v) { return num(v) <= 0 ? "—" : (num(v) * 100).toFixed(2) + "%"; },
    ratio:  function (v) { return num(v) <= 0 ? "—" : num(v).toFixed(2) + "x"; }
  };
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- time bucketing (Mon-start weeks), used only when the breakdown is time -
  var MONS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function parseDate(s) {
    if (s instanceof Date) return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    var t = String(s).replace(/-/g, "");
    return Date.UTC(+t.slice(0, 4), +t.slice(4, 6) - 1, +t.slice(6, 8));
  }
  function periodStart(ms, g) {
    var d = new Date(ms), y = d.getUTCFullYear(), mo = d.getUTCMonth();
    if (g === "day") return ms;
    if (g === "month") return Date.UTC(y, mo, 1);
    if (g === "quarter") return Date.UTC(y, mo - (mo % 3), 1);
    var off = (d.getUTCDay() + 6) % 7;
    return ms - off * 86400000;
  }
  function periodLabel(ms, g) {
    var d = new Date(ms), y = d.getUTCFullYear(), mo = d.getUTCMonth(), day = d.getUTCDate();
    if (g === "day") return MONS[mo] + " " + day;
    if (g === "month") return MONS[mo] + " " + y;
    if (g === "quarter") return "Q" + (Math.floor(mo / 3) + 1) + " " + y;
    var e = new Date(ms + 6 * 86400000);
    return MONS[mo] + " " + day + " - " + MONS[e.getUTCMonth()] + " " + e.getUTCDate();
  }

  // ---- aggregate base counts, then derive the standard rates ------------------
  function blank() { return { cost: 0, impr: 0, clk: 0, conv: 0, cval: 0, isw: 0 }; }
  function baseOf(row, F) {
    var share = num(row[F.impressionShare]); if (share > 1) share = share / 100;
    return { cost: num(row[F.cost]), impr: num(row[F.impressions]), clk: num(row[F.clicks]),
             conv: num(row[F.conversions]), cval: num(row[F.convValue]), share: share };
  }
  function addBase(o, b) {
    o.cost += b.cost; o.impr += b.impr; o.clk += b.clk;
    o.conv += b.conv; o.cval += b.cval; o.isw += b.share * b.impr; // impression-weighted IS
  }
  function derive(o) {
    return {
      cost: o.cost, impressions: o.impr,
      is: o.impr > 0 ? o.isw / o.impr : 0,
      cpm: o.impr > 0 ? (o.cost / o.impr) * 1000 : 0,
      clicks: o.clk,
      ctr: o.impr > 0 ? o.clk / o.impr : 0,
      cpc: o.clk > 0 ? o.cost / o.clk : 0,
      conversions: o.conv, convValue: o.cval,
      roas: o.cost > 0 ? o.cval / o.cost : 0,
      cpa: o.conv > 0 ? o.cost / o.conv : 0
    };
  }

  // ---- DEFAULT metric rows: the SUMAS funnel (flat list, group-tagged) --------
  // Pass your own `metrics` to change/reorder them. Each row:
  //   { key, label, format, group?, value?(derived, agg) }
  // `key` indexes the derived metrics above; `value` lets you compute a custom one.
  var SUMAS_METRICS = [
    { group: "Budget",     key: "cost",        label: "Cost",         format: "money"  },
    { group: "Visibility", key: "impressions", label: "Impressions",  format: "int"    },
    { group: "Visibility", key: "is",          label: "Search IS",    format: "pct1"   },
    { group: "Visibility", key: "cpm",         label: "CPM",          format: "money2" },
    { group: "Engagement", key: "clicks",      label: "Clicks",       format: "int"    },
    { group: "Engagement", key: "ctr",         label: "CTR",          format: "pct2"   },
    { group: "Engagement", key: "cpc",         label: "Avg CPC",      format: "money2" },
    { group: "Conversion", key: "conversions", label: "Conversions",  format: "dec"    },
    { group: "Conversion", key: "convValue",   label: "Conv. value",  format: "money"  },
    { group: "Conversion", key: "roas",        label: "ROAS",         format: "ratio"  },
    { group: "Conversion", key: "cpa",         label: "Cost / conv.", format: "money2" }
  ];

  function metricValue(spec, derived, agg) {
    return spec.value ? spec.value(derived, agg) : derived[spec.key];
  }
  function metricFmt(spec) {
    return typeof spec.format === "function" ? spec.format : (fmt[spec.format] || fmt.dec);
  }
  function heatStep(v, mn, mx) {
    if (mx <= mn) return 5;
    var r = (v - mn) / (mx - mn);
    var s = 1 + Math.floor(r * 5);
    return s < 1 ? 1 : s > 5 ? 5 : s;
  }

  // -------------------------------------------------------------- the build --
  function buildMatrix(opts) {
    opts = opts || {};
    var series = opts.series || [];
    var metrics = opts.metrics || SUMAS_METRICS;
    var F = opts.fields || BASE;
    var bd = opts.breakdown || {};
    var type = bd.type === "category" ? "category" : "time";       // default: time
    var gran = bd.granularity || opts.granularity || "week";
    var dateField = bd.dateField || F.date;
    var emptyMessage = opts.emptyMessage || "No data for this range";

    if (!series.length) return '<div class="bm-empty">' + escapeHtml(emptyMessage) + "</div>";

    // bucket rows into columns by the breakdown key
    var buckets = {}, ord = {}, total = blank();
    for (var i = 0; i < series.length; i++) {
      var row = series[i], key;
      if (type === "time") {
        var raw = row[dateField];
        if (raw == null || raw === "") continue;
        var ms = periodStart(parseDate(raw), gran);
        key = String(ms); ord[key] = ms;
      } else {
        key = bd.bucket ? bd.bucket(row) : row[bd.field];
        if (key == null || key === "") key = bd.emptyLabel || "(not set)";
        key = String(key);
      }
      if (!buckets[key]) buckets[key] = blank();
      var b = baseOf(row, F);
      addBase(buckets[key], b);
      addBase(total, b);
    }

    // order the columns
    var keys = Object.keys(buckets);
    if (type === "time") {
      keys.sort(function (a, b) { return ord[b] - ord[a]; });     // newest → oldest
    } else {
      var orderBy = bd.orderBy || (metrics[0] && metrics[0].key) || "cost";
      var sign = bd.orderDir === "asc" ? 1 : -1;                  // default: biggest first
      keys.sort(function (a, b) {
        return sign * ((derive(buckets[a])[orderBy] || 0) - (derive(buckets[b])[orderBy] || 0));
      });
      if (bd.limit > 0) keys = keys.slice(0, bd.limit);           // default: show all (no limit)
    }

    var cols = keys.map(function (k) {
      return { label: type === "time" ? periodLabel(ord[k], gran) : k,
               d: derive(buckets[k]), agg: buckets[k] };
    });
    var tot = derive(total);
    var colCount = cols.length + 2;

    // header
    var h = '<div class="bm-wrap"><table class="bm"><thead><tr>' +
            '<th class="bm-kpi">KPI</th><th class="bm-total">Total</th>';
    for (var c = 0; c < cols.length; c++) h += "<th>" + escapeHtml(cols[c].label) + "</th>";
    h += "</tr></thead><tbody>";

    // metric rows, with a header row whenever the group changes
    var prevGroup;
    metrics.forEach(function (spec) {
      if (spec.group && spec.group !== prevGroup) {
        h += '<tr class="bm-grp"><td class="bm-kpi">' + escapeHtml(spec.group) +
             '</td><td colspan="' + (colCount - 1) + '"></td></tr>';
      }
      prevGroup = spec.group;

      var f = metricFmt(spec);
      var vals = cols.map(function (col) { return metricValue(spec, col.d, col.agg); });
      var mx = Math.max.apply(null, vals.concat([0]));
      var mn = Math.min.apply(null, vals.concat([mx]));
      h += '<tr><td class="bm-kpi">' + escapeHtml(spec.label) +
           '</td><td class="bm-total">' + f(metricValue(spec, tot, total)) + "</td>";
      for (var j = 0; j < cols.length; j++) {
        var v = vals[j];
        var tint = num(v) > 0 && mx > 0 ? ' style="background:var(--cf-' + heatStep(v, mn, mx) + ')"' : "";
        h += "<td" + tint + ">" + f(v) + "</td>";
      }
      h += "</tr>";
    });

    return h + "</tbody></table></div>";
  }

  // ---- self-contained mount (browser) ----------------------------------------
  // Renders the grid plus its control bar and rebuilds on change:
  //   • "Segment by" — switch the breakdown DIMENSION (time / campaign / objective /
  //     product / …). Shown when `opts.breakdowns` lists more than one option.
  //   • "View by"    — day/week/month/quarter, shown ONLY while the segment is time.
  // Switching re-slices `opts.series` in the browser, so that series must carry the
  // dimension columns at its finest grain (one row per day × campaign × objective × …).
  // For large accounts pass `dataFor(breakdown) -> series` to supply / lazy-load a
  // series per dimension instead of shipping one granular blob.
  var GRAN_LABELS = { day: "Daily", week: "Weekly", month: "Monthly", quarter: "Quarterly" };
  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;

    // normalise the breakdown options into {id, label, bd}
    var raw = opts.breakdowns && opts.breakdowns.length
      ? opts.breakdowns
      : [opts.breakdown || { type: "time" }];
    var list = raw.map(function (b, i) {
      var isTime = (b.type || "time") !== "category";
      return { id: b.id || ("bd" + i),
               label: b.label || (isTime ? "Time" : (b.field || "Category")),
               bd: b, isTime: isTime };
    });
    var curId = opts.defaultBreakdownId || list[0].id;
    function current() { var f = list.filter(function (x) { return x.id === curId; }); return f[0] || list[0]; }
    var curGran = current().bd.granularity || opts.granularity || "week";

    function seriesFor(item) { return opts.dataFor ? opts.dataFor(item.bd) : opts.series; }

    // control bar
    var segHtml = list.length > 1
      ? '<label class="bm-ctl"><span>' + escapeHtml(opts.segmentLabel || "Segment by") + "</span>" +
        '<select class="bm-seg">' + list.map(function (x) {
          return '<option value="' + escapeHtml(x.id) + '"' + (x.id === curId ? " selected" : "") +
                 ">" + escapeHtml(x.label) + "</option>";
        }).join("") + "</select></label>"
      : "";
    var granHtml = '<label class="bm-ctl bm-ctl--gran"><span>View by</span>' +
      '<select class="bm-gran">' + ["day", "week", "month", "quarter"].map(function (g) {
        return '<option value="' + g + '"' + (g === curGran ? " selected" : "") + ">" +
               escapeHtml(GRAN_LABELS[g]) + "</option>";
      }).join("") + "</select></label>";

    el.innerHTML = '<div class="bm-component"><div class="bm-controls">' + segHtml + granHtml +
                   '</div><div class="bm-host"></div></div>';
    var host = el.querySelector(".bm-host");
    var segSel = el.querySelector(".bm-seg");
    var granSel = el.querySelector(".bm-gran");
    var granWrap = el.querySelector(".bm-ctl--gran");

    function render() {
      var c = current();
      granWrap.style.display = c.isTime ? "" : "none";       // granularity only applies to time
      var bd = c.isTime ? { type: "time", granularity: curGran, dateField: c.bd.dateField } : c.bd;
      host.innerHTML = buildMatrix({
        series: seriesFor(c), metrics: opts.metrics, fields: opts.fields,
        breakdown: bd, emptyMessage: opts.emptyMessage
      });
    }
    if (segSel) segSel.addEventListener("change", function () { curId = segSel.value; render(); });
    if (granSel) granSel.addEventListener("change", function () { curGran = granSel.value; render(); });
    render();
    return { el: el, rerender: render,
             getBreakdownId: function () { return curId; },
             getGranularity: function () { return curGran; } };
  }

  return {
    build: buildMatrix,
    mount: mount,
    BASE: BASE,
    SUMAS_METRICS: SUMAS_METRICS,
    fmt: fmt,
    _internal: { parseDate: parseDate, periodStart: periodStart, periodLabel: periodLabel, derive: derive, heatStep: heatStep }
  };
});
