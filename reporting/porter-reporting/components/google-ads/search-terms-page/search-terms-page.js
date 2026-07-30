/*
 * Porter Reporting — component: google-ads/search-terms-page
 * ------------------------------------------------------------------------
 * The Google Ads "Search terms" page: a grid of KEYWORD CARDS (one card per
 * keyword, its search terms inside) + a criterion FILTER BAR + a dollar
 * INSIGHTS card. Every term carries 0+ of five tags — and is tagged ONLY when
 * something is off; a relevant / standard term is untagged.
 *
 *   filter bar: All · Branded · Duplicate · Competitor · Relevance · Opportunity
 *   keyword card: [merged header: keyword + match-type chip | Spend Conv. CPA Tags]
 *                 [rows: ●/○ term | spend | conv | cpa | tag chips (⋯ to expand) ]
 *                 [tfoot: Total]
 *   insights card: "Recommended actions" + the total $ potential + one row per lane.
 *
 * INPUT shape — the analysis contract (see DATA-SCHEMA in the spec, and adapter.js
 * which converts the porter-analysis `labeling` + `insights` output into it):
 *   { keywords: [ { keyword, matchType, totals:{spend,conversions,cpa},
 *                   terms: [ { term, on, spend, conversions, cpa,
 *                              tags: [ { label, tone } ] } ] } ],
 *     insights: { totalPotential, measuredPotential?,
 *                 rows: [ { criterion, tone, action, rationale, dollars, sub, basis? } ] } }
 *
 * Ownership (see RULES.md): Reporting (this file) owns BEHAVIOUR + STRUCTURE +
 *   DATA — the markup, the filter show/hide, the ⋯ tag-overflow toggle, the
 *   measured-vs-estimated split. It ships ZERO CSS. porter-design owns APPEARANCE
 *   (the split-table layout rules, chip colours, the lime dark-mode total). The
 *   full hook list + the required layout rules are in README.md.
 *
 * Cost arrives ALREADY in currency units (Porter pre-converts *_micros). GENERATOR:
 * it never fetches. `build` returns the page HTML; `mount` adds filter + ⋯ behaviour.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.searchTermsPage = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // filter pill -> the tag LABEL it matches. Note "Relevance" matches the `Irrelevant`
  // tag (the DATA-SCHEMA filter token for Irrelevant is `relevance`).
  var FILTERS = [
    { key: "all", label: "All", match: null },
    { key: "branded", label: "Branded", match: "Branded" },
    { key: "duplicate", label: "Duplicate", match: "Duplicate" },
    { key: "competitor", label: "Competitor", match: "Competitor" },
    { key: "relevance", label: "Relevance", match: "Irrelevant" },
    { key: "opportunity", label: "Opportunity", match: "Opportunity" }
  ];

  // ---------------------------------------------------------------- helpers --
  function num(v) { return Number(v) || 0; }
  function grp(v, dp) {
    var f = Math.pow(10, dp), s = (Math.round(num(v) * f) / f).toFixed(dp), p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }
  function money(v) { return "$" + trimZeros(grp(v, 2)); }
  function dec(v) { return trimZeros(grp(num(v), 2)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cpaCell(t) {
    if (t.cpa != null) return money(t.cpa);
    return num(t.conversions) > 0 ? money(num(t.spend) / num(t.conversions)) : "—";
  }
  function mtClass(mt) {
    var m = String(mt || "").toLowerCase();
    return m === "exact" ? "exact" : m === "phrase" ? "phrase" : "broad";
  }

  // ------------------------------------------------------------ tag chips --
  function tagChips(tags) {
    tags = tags || [];
    if (!tags.length) return '<span class="stp-tags" data-count="0"></span>';
    var chips = tags.map(function (t) {
      return '<span class="stp-tag stp-tag--' + esc(t.tone) + '">' + esc(t.label) + "</span>";
    }).join("");
    // 2+ tags: chips live in an inner CLIPPED list; the ⋯ button is a sibling that never
    // clips, and toggles the cell open to wrap (height only). mount() wires the toggle.
    var more = tags.length > 1 ? '<button type="button" class="stp-more" aria-label="Show all tags">⋯</button>' : "";
    return '<span class="stp-tags" data-count="' + tags.length + '">' +
      '<span class="stp-tags-list">' + chips + "</span>" + more + "</span>";
  }
  function tagLabels(tags) {
    return (tags || []).map(function (t) { return t.label; }).join(" ");
  }

  // ------------------------------------------------------------ keyword card --
  function card(kw) {
    var terms = kw.terms || [], totals = kw.totals || {};
    var rows = terms.map(function (t) {
      var dot = '<span class="stp-dot stp-dot--' + (t.on ? "on" : "off") + '" aria-hidden="true"></span>';
      return '<tr class="stp-row" data-tags="' + esc(tagLabels(t.tags)) + '">' +
        '<td class="stp-c-term">' + dot + '<span class="stp-term">' + esc(t.term) + "</span></td>" +
        '<td class="stp-c-spend">' + money(t.spend) + "</td>" +
        '<td class="stp-c-conv">' + dec(t.conversions) + "</td>" +
        '<td class="stp-c-cpa">' + cpaCell(t) + "</td>" +
        '<td class="stp-c-tags">' + tagChips(t.tags) + "</td>" +
      "</tr>";
    }).join("");

    var cpaTot = totals.cpa != null ? money(totals.cpa)
      : (num(totals.conversions) > 0 ? money(num(totals.spend) / num(totals.conversions)) : "—");

    return '<div class="stp-card">' +
      '<table class="stp-table">' +
        "<thead><tr class=\"stp-head\">" +
          '<th class="stp-c-term"><span class="stp-kw">' + esc(kw.keyword) + "</span>" +
            '<span class="stp-mt stp-mt--' + mtClass(kw.matchType) + '">' + esc(kw.matchType) + "</span></th>" +
          '<th class="stp-c-spend">Spend</th>' +
          '<th class="stp-c-conv">Conv.</th>' +
          '<th class="stp-c-cpa">CPA</th>' +
          '<th class="stp-c-tags">Tags</th>' +
        "</tr></thead>" +
        '<tbody class="stp-body">' + rows + "</tbody>" +
        '<tfoot class="stp-foot"><tr>' +
          '<td class="stp-c-term">Total</td>' +
          '<td class="stp-c-spend">' + money(totals.spend) + "</td>" +
          '<td class="stp-c-conv">' + dec(totals.conversions) + "</td>" +
          '<td class="stp-c-cpa">' + cpaTot + "</td>" +
          '<td class="stp-c-tags"></td>' +
        "</tr></tfoot>" +
      "</table>" +
    "</div>";
  }

  // ------------------------------------------------------------ filter bar --
  function filterBar() {
    var pills = FILTERS.map(function (f, i) {
      return '<button type="button" class="stp-pill' + (i === 0 ? " stp-pill--active" : "") +
        '" data-filter="' + f.key + '"' + (f.match ? ' data-match="' + esc(f.match) + '"' : "") +
        ">" + esc(f.label) + "</button>";
    }).join("");
    return '<div class="stp-filters" role="tablist">' + pills + "</div>";
  }

  // ------------------------------------------------------------ insights card --
  function insights(ins) {
    if (!ins) return "";
    var rows = (ins.rows || []).map(function (r) {
      var est = r.basis === "estimated"
        ? ' <span class="stp-est" title="estimated — a projection, not booked spend">est.</span>' : "";
      return '<li class="stp-irow">' +
        '<span class="stp-chip stp-chip--' + esc(r.tone) + '">' + esc(r.criterion) + "</span>" +
        '<div class="stp-imid"><span class="stp-iaction">' + esc(r.action) + "</span>" +
          '<span class="stp-irat">' + esc(r.rationale) + "</span></div>" +
        '<div class="stp-imoney"><span class="stp-idollars">' + money(r.dollars) + est + "</span>" +
          '<span class="stp-isub">' + esc(r.sub || "") + "</span></div>" +
      "</li>";
    }).join("");

    // Hero = the spec's total. Honesty line splits measured (banked) vs estimated (projected).
    var total = num(ins.totalPotential);
    var measured = ins.measuredPotential != null ? num(ins.measuredPotential) : null;
    var split = measured != null
      ? '<span class="stp-split">' + money(measured) + " measured" +
        (total > measured ? " · " + money(total - measured) + " est." : "") + "</span>"
      : "";

    return '<section class="stp-insights">' +
      '<header class="stp-insights-head">' +
        "<div><p class=\"stp-eyebrow\">Insights</p>" +
          '<h3 class="stp-insights-title">Recommended actions</h3>' +
          '<p class="stp-insights-note">Generated from the tables above — tagged terms become dollars.</p></div>' +
        '<div class="stp-total"><span class="stp-total-num">' + money(total) + "</span>" +
          '<span class="stp-total-label">monthly potential</span>' + split + "</div>" +
      "</header>" +
      '<ul class="stp-rows">' + rows + "</ul>" +
    "</section>";
  }

  // ------------------------------------------------------------- the build --
  function build(data, opts) {
    data = data || {}; opts = opts || {};
    var kws = data.keywords || [];
    if (!kws.length) return '<div class="stp-empty">' + esc(opts.emptyMessage || "No search terms for this range") + "</div>";
    var cards = kws.map(card).join("");
    return '<div class="stp-component">' +
      filterBar() +
      '<div class="stp-grid">' + cards + "</div>" +
      insights(data.insights) +
    "</div>";
  }

  // ------------------------------------ self-contained mount: filter + ⋯ --
  function mount(target, data, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = build(data, opts);
    var comp = el.querySelector(".stp-component");
    if (!comp) return null;

    // --- criterion filter (single-select). Hides non-matching rows + empty cards;
    //     hides footers while filtering; the insights card is NEVER hidden. ---
    function applyFilter(match) {
      var filtering = !!match;
      comp.setAttribute("data-filtering", filtering ? "1" : "0");
      var cards = comp.querySelectorAll(".stp-card");
      for (var i = 0; i < cards.length; i++) {
        var rowsEls = cards[i].querySelectorAll(".stp-row"), shown = 0;
        for (var j = 0; j < rowsEls.length; j++) {
          var tags = " " + (rowsEls[j].getAttribute("data-tags") || "") + " ";
          var ok = !filtering || tags.indexOf(" " + match + " ") >= 0;
          rowsEls[j].hidden = !ok;
          if (ok) shown++;
        }
        cards[i].hidden = filtering && shown === 0;   // hide cards with zero matches
      }
    }
    var pills = comp.querySelectorAll(".stp-pill");
    for (var p = 0; p < pills.length; p++) {
      pills[p].addEventListener("click", function () {
        for (var k = 0; k < pills.length; k++) pills[k].classList.remove("stp-pill--active");
        this.classList.add("stp-pill--active");
        applyFilter(this.getAttribute("data-match"));
      });
    }

    // --- tag overflow: ⋯ toggles the cell open (wrap to show all tags; height only) ---
    comp.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".stp-more") : null;
      if (!btn) return;
      var cell = btn.parentNode;
      if (cell) cell.classList.toggle("stp-tags--open");
    });

    return { el: el, applyFilter: applyFilter };
  }

  return { build: build, mount: mount, FILTERS: FILTERS, fmt: { money: money, dec: dec } };
});
