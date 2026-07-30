/*
 * Porter Reporting — component: google-ads/keyword-ad-landing-alignment
 * ------------------------------------------------------------------------
 * "Alignment journey" — one card per ad group showing the paid journey end to
 * end and whether it tells ONE coherent story:
 *
 *     Intent (keyword → search terms)  →  Message (ad)  →  Destination (page)
 *
 * with a three-state verdict (Aligned / Needs review / Broken), the four
 * relevance links (L1–L4), the Google relevance grades (Quality Score + Ad
 * relevance + Expected CTR + Landing-page experience) and the one fix to make.
 *
 * Behaviour spec (source of truth): ../../../_foundation/component-contract.md
 *   → "Report section" (eyebrow → finding → visualization) + "Data-component
 *   states". This file IMPLEMENTS that spec; it does not restate it. The
 *   hand-built proof-of-concept it productizes is a single golf-club account's
 *   hardcoded "Journey" page — this turns that one page into a data-driven
 *   generator that runs on ANY account.
 *
 * Ownership (see _foundation/design-system.md):
 *   Reporting (this file) owns BEHAVIOUR + STRUCTURE + DATA: joining the two
 *     analysis skills by (campaign, ad_group), the verdict → severity ordering,
 *     filtering by verdict, computing the per-journey CVR / CPA from the metrics
 *     counts, gating Quality Score (numeric ONLY when 1–10 — never the summed
 *     artifact, never a bare 0), the summary roll-up, and emitting HTML with
 *     class hooks.
 *   Design owns APPEARANCE: every class hook + token — the verdict tones
 *     (--good / --bad / --callout-warn-*), the link-grade tones, badges, the
 *     muted "Google blue" link, fonts, borders, spacing. NO hex colour or font
 *     name lives in this file. The full hook list is in README.md.
 *
 * It is a GENERATOR: it RECEIVES the two skills' JSON (it never fetches) and
 * EMITS an HTML string. `mount` adds the browser control bar (filter by verdict
 * / sort) + the client-side re-render. The headline public name is
 * `PorterReporting.addAlignment` (a thin alias of `mount` — "add an alignment
 * section to this page"); the noun module `PorterReporting.alignmentJourney`
 * exposes `build` / `mount` to match its sibling components.
 *
 * INPUT — the output of two porter-analysis skills, joined here:
 *   {
 *     alignment: <keyword-ad-landing-alignment output>,   // REQUIRED — the verdicts (meta, synthesis, findings[], rollup)
 *     metrics:   <keyword-ad-landing-metrics output>,      // OPTIONAL — QS / IS / CTR / CVR / grades (journeys[])
 *     ...controls (sort, verdict filter, landingLabel, emptyMessage)
 *   }
 * The alignment skill is the spine (one finding per ad group); the metrics skill
 * decorates it. With `metrics` omitted the cards still render — verdict, links,
 * intent, message, destination and recommendation — just without the grades.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.alignmentJourney = api;
    // Honour the name the use case is known by: "add an alignment section".
    root.PorterReporting.addAlignment = api.mount;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------- helpers --
  function num(v) { return Number(v) || 0; }
  function div(a, b) { return b ? a / b : 0; }
  function group(v, dp) {
    var f = Math.pow(10, dp);
    var s = (Math.round(num(v) * f) / f).toFixed(dp);
    var p = s.split(".");
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return p.join(".");
  }
  function trimZeros(s) { return s.indexOf(".") === -1 ? s : s.replace(/\.?0+$/, ""); }
  function money(v) { return "$" + trimZeros(group(v, 2)); }
  function dec(v) { return trimZeros(group(num(v), 2)); }
  function pct(v) { return (num(v) * 100).toFixed(1) + "%"; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function titleCase(v) {
    return String(v || "").toLowerCase().split("_").map(function (w) {
      return w ? w.charAt(0).toUpperCase() + w.slice(1) : "";
    }).join(" ");
  }

  // The join key shared by both skills: (campaign, ad_group).
  function jkey(campaign, adGroup) {
    return String(campaign || "").trim() + " || " + String(adGroup || "").trim();
  }

  // ---- verdict (three states; NEVER a 0–10 score — that is a deliberate
  //      decision in the analysis skill, faithfully rendered here) ----
  var VERDICTS = {
    aligned:      { label: "Aligned",      mod: "aligned", rank: 2 },
    needs_review: { label: "Needs review", mod: "review",  rank: 1 },
    broken:       { label: "Broken",       mod: "broken",  rank: 0 }
  };
  function verdictOf(v) { return VERDICTS[String(v || "").toLowerCase()] || VERDICTS.needs_review; }

  // ---- relevance-link grade (L1–L4): pass / partial / fail / unknown ----
  var LINK_GRADE = {
    pass:    { label: "Pass",    mod: "pass" },
    partial: { label: "Partial", mod: "partial" },
    fail:    { label: "Fail",    mod: "fail" },
    unknown: { label: "—",       mod: "unknown" }
  };
  function linkGrade(g) { return LINK_GRADE[String(g || "").toLowerCase()] || LINK_GRADE.unknown; }
  // Short, human names for the four links (the schema's `name` is snake_case).
  var LINK_NAMES = {
    L1: "Search term → keyword",
    L2: "Keyword → ad",
    L3: "Ad → landing",
    L4: "Intent → landing"
  };
  function linkName(l) { return LINK_NAMES[String(l.link || "").toUpperCase()] || titleCase(l.name); }

  // ---- Google categorical grade (ABOVE_AVERAGE / AVERAGE / BELOW_AVERAGE) ----
  var GRADE = {
    ABOVE_AVERAGE: { label: "Above", mod: "above" },
    AVERAGE:       { label: "Avg",   mod: "avg" },
    BELOW_AVERAGE: { label: "Below", mod: "below" }
  };
  function gradeOf(g) { return GRADE[String(g || "").toUpperCase()] || null; }

  // -------------------------------------------------- metrics-skill indexing --
  // Build a lookup from the metrics skill's journeys[] so each alignment finding
  // can be decorated by (campaign, ad_group). Per journey we precompute:
  //   - a per-keyword map (keyed by keyword|match_type) for the Intent column badges
  //   - a representative QS + grades (impression-weighted; QS gated to 1–10)
  //   - the real-behaviour roll-up: clicks, conversions → CVR (+ spend → CPA)
  function isValidQS(v) { return typeof v === "number" && isFinite(v) && v > 0 && v <= 10; }

  function indexMetrics(metrics) {
    var idx = {};
    var journeys = (metrics && metrics.journeys) || [];
    for (var i = 0; i < journeys.length; i++) {
      var j = journeys[i];
      var key = jkey(j.campaign, j.ad_group);
      var kw = {};
      var qsSum = 0, qsW = 0;                 // impression-weighted QS (gated values only)
      var gradeTally = { ad_relevance: {}, expected_ctr: {}, landing_page_experience: {} };
      var kws = j.keywords || [];
      for (var k = 0; k < kws.length; k++) {
        var row = kws[k];
        var w = num(row.impressions) || 1;
        kw[(String(row.keyword || "").toLowerCase()) + "|" + String(row.match_type || "").toUpperCase()] = {
          quality_score: isValidQS(row.quality_score) ? row.quality_score : null,
          ad_relevance: row.ad_relevance || null,
          expected_ctr: row.expected_ctr || null,
          landing_page_experience: row.landing_page_experience || null
        };
        if (isValidQS(row.quality_score)) { qsSum += row.quality_score * w; qsW += w; }
        tallyGrade(gradeTally.ad_relevance, row.ad_relevance, w);
        tallyGrade(gradeTally.expected_ctr, row.expected_ctr, w);
        tallyGrade(gradeTally.landing_page_experience, row.landing_page_experience, w);
      }
      // ad-grain real behaviour rolled up to the journey
      var clicks = 0, convs = 0, imprs = 0, ctrNum = 0, ctrW = 0, thin = false;
      var ads = j.ads || [];
      for (var a = 0; a < ads.length; a++) {
        clicks += num(ads[a].clicks);
        convs += num(ads[a].conversions);
        imprs += num(ads[a].impressions);
        // CTR: trust Google's NATIVE per-ad ctr. Porter's ad-grain impressions
        // undercounts vs the native rate (verified live on a test account: a
        // clicks/impressions recompute ran ~3x the native ctr), so recomputing
        // overstates CTR. Weight native ctr by clicks to roll ads up to the journey.
        if (ads[a].ctr != null && isFinite(num(ads[a].ctr))) { ctrNum += num(ads[a].ctr) * num(ads[a].clicks); ctrW += num(ads[a].clicks); }
        if (ads[a].thin_volume) thin = true;
      }
      idx[key] = {
        keyword: kw,
        repQS: qsW ? Math.round((qsSum / qsW) * 10) / 10 : null,
        repGrades: {
          ad_relevance: dominantGrade(gradeTally.ad_relevance),
          expected_ctr: dominantGrade(gradeTally.expected_ctr),
          landing_page_experience: dominantGrade(gradeTally.landing_page_experience)
        },
        context: j.campaign_context || null,   // campaign-grain Impression Share — captured, intentionally not rendered (IS is campaign-grain, not per ad group)
        clicks: clicks,
        conversions: convs,
        impressions: imprs,
        ctr: ctrW > 0 ? ctrNum / ctrW : (imprs > 0 ? div(clicks, imprs) : null),   // native ctr (clicks-weighted); fall back to clicks/impr only when native is absent
        cvr: clicks > 0 ? div(convs, clicks) : null,
        thin_volume: thin
      };
    }
    return idx;
  }
  function tallyGrade(bucket, g, w) {
    var key = String(g || "").toUpperCase();
    if (key !== "ABOVE_AVERAGE" && key !== "AVERAGE" && key !== "BELOW_AVERAGE") return;
    bucket[key] = (bucket[key] || 0) + w;
  }
  function dominantGrade(bucket) {
    var best = null, bestW = 0;
    for (var k in bucket) if (bucket[k] > bestW) { bestW = bucket[k]; best = k; }
    return best;
  }

  // -------------------------------------------------------------- fragments --
  // Per-keyword Quality Score columns for the Intent column: the overall QS plus
  // Google's three components — Ad relevance, Expected CTR, Landing-page experience.
  // Expected CTR is the one signal the word-based verdict can't see (ad appeal, not relevance).
  function kwBadge(m) {
    if (!m) return "";
    var parts = [];
    if (isValidQS(m.quality_score)) parts.push('<span class="alj-qs">QS ' + m.quality_score.toFixed(1) + "</span>");
    var ad = gradeOf(m.ad_relevance), ec = gradeOf(m.expected_ctr), lp = gradeOf(m.landing_page_experience);
    if (ad) parts.push('<span class="alj-grade alj-grade--' + ad.mod + '" title="Ad relevance">Ad ' + ad.label + "</span>");
    if (ec) parts.push('<span class="alj-grade alj-grade--' + ec.mod + '" title="Expected CTR — how compelling the ad is">CTR ' + ec.label + "</span>");
    if (lp) parts.push('<span class="alj-grade alj-grade--' + lp.mod + '" title="Landing-page experience">LP ' + lp.label + "</span>");
    return parts.length ? ' <span class="alj-kw-badge">' + parts.join(" ") + "</span>" : "";
  }

  // The Google-relevance strip (representative grades for the whole ad group).
  function relevanceStrip(mx) {
    if (!mx) return '<div class="alj-grades alj-grades--none">No keyword grades for this ad group</div>';
    var parts = [];
    if (isValidQS(mx.repQS)) parts.push('<span class="alj-qs">QS ' + mx.repQS.toFixed(1) + "</span>");
    var map = [["Ad relevance", mx.repGrades.ad_relevance],
               ["Expected CTR", mx.repGrades.expected_ctr],
               ["Landing-page exp.", mx.repGrades.landing_page_experience]];
    for (var i = 0; i < map.length; i++) {
      var g = gradeOf(map[i][1]);
      if (g) parts.push('<span class="alj-grade-line">' + esc(map[i][0]) + ': <span class="alj-grade alj-grade--' + g.mod + '">' + g.label + "</span></span>");
    }
    if (!parts.length) return '<div class="alj-grades alj-grades--none">No keyword grades for this ad group</div>';
    return '<div class="alj-grades"><span class="alj-grades-label">Google relevance:</span> ' + parts.join(" ") + "</div>";
  }

  // (Impression Share is intentionally NOT rendered here. It is campaign-grain,
  // so it does not belong on a per-ad-group card; it lives in its own
  // `impression-share-competitiveness` component. This tool stays focused on the
  // search-term → keyword → ad → landing match.)

  // L1–L4 relevance links.
  function linksStrip(links) {
    if (!links || !links.length) return "";
    var items = links.map(function (l) {
      var g = linkGrade(l.grade);
      var reason = l.reason ? '<span class="alj-link-reason">' + esc(l.reason) + "</span>" : "";
      return '<div class="alj-link alj-link--' + g.mod + '">' +
        '<span class="alj-link-name">' + esc(linkName(l)) + "</span>" +
        '<span class="alj-link-grade">' + esc(g.label) + "</span>" + reason + "</div>";
    }).join("");
    return '<div class="alj-links">' + items + "</div>";
  }

  // Column 1 — Intent: keywords (with QS badge) → their top search terms.
  function intentCol(intent, mx) {
    var body;
    if (!intent || !intent.length) {
      body = '<div class="alj-empty-col">No keyword breakdown</div>';
    } else {
      body = intent.map(function (kw) {
        var m = mx && mx.keyword[(String(kw.keyword || "").toLowerCase()) + "|" + String(kw.match_type || "").toUpperCase()];
        var terms = (kw.top_search_terms || []).map(function (t) {
          var off = t.on_intent === false ? ' alj-term--off' : "";
          return '<div class="alj-term' + off + '">↳ ' + esc(t.term) + "</div>";
        }).join("");
        var mt = kw.match_type ? '<span class="alj-mt">' + esc(titleCase(kw.match_type)) + "</span>" : "";
        return '<div class="alj-kw"><div class="alj-kw-head"><strong>' + esc(kw.keyword) + "</strong> " + mt + kwBadge(m) + "</div>" + terms + "</div>";
      }).join("");
    }
    return '<div class="alj-col"><div class="alj-col-label">1 · Intent (keyword → search terms)</div>' + body + "</div>";
  }

  // Column 2 — Message: the ad the searcher saw.
  function messageCol(message, mx) {
    var body;
    if (!message || (!message.headlines && !message.descriptions)) {
      body = '<div class="alj-empty-col">No ad copy</div>';
    } else {
      var heads = (message.headlines || []).slice(0, 3).map(esc).join(' <span class="alj-ad-sep">|</span> ');
      var desc = (message.descriptions || [])[0];
      body = '<div class="alj-ad-headline">' + (heads || "—") + "</div>" +
        (desc ? '<div class="alj-ad-desc">' + esc(desc) + "</div>" : "");
    }
    // the ad's own performance metric belongs at the ad stage
    var metric = (mx && mx.ctr != null) ? '<div class="alj-col-metric">CTR ' + pct(mx.ctr) + "</div>" : "";
    return '<div class="alj-col"><div class="alj-col-label">2 · Message (ad)</div>' + body + metric + "</div>";
  }

  // Column 3 — Destination: the real landing page + what it says.
  function destinationCol(dest, landingBase, mx) {
    var body;
    if (!dest || !dest.final_url) {
      body = '<div class="alj-empty-col">No landing page</div>';
    } else {
      var url = String(dest.final_url);
      var href = /^https?:\/\//i.test(url) ? url : ((landingBase || "https://") + url.replace(/^\/+/, "/"));
      var shown = url.replace(/^https?:\/\//i, "");
      var h1 = dest.h1 ? '<div class="alj-h1">H1: “' + esc(dest.h1) + '”</div>' : "";
      var summary = dest.page_summary ? '<div class="alj-dest-summary">' + esc(dest.page_summary) + "</div>" : "";
      var miss = dest.mismatch_word ? ' <span class="alj-mismatch">mismatch: ' + esc(dest.mismatch_word) + "</span>" : "";
      var notScraped = dest.scraped === false ? ' <span class="alj-notscraped">page not scraped → review</span>' : "";
      body = '<div class="alj-dest-url"><a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(shown) + " ↗</a>" + miss + notScraped + "</div>" + h1 + summary;
    }
    // the landing's own performance metric belongs at the landing stage
    var metric = (mx && mx.cvr != null) ? '<div class="alj-col-metric">CVR ' + pct(mx.cvr) + "</div>" : "";
    return '<div class="alj-col"><div class="alj-col-label">3 · Destination (page)</div>' + body + metric + "</div>";
  }

  // The recommendation line.
  function recBlock(rec, verdictMod) {
    if (!rec || (!rec.what && !rec.why && !rec.where)) return "";
    var brk = rec.break_type ? '<span class="alj-break">' + esc(titleCase(rec.break_type)) + "</span> " : "";
    var what = rec.what ? esc(rec.what) : "";
    var why = rec.why ? ' <span class="alj-rec-why">' + esc(rec.why) + "</span>" : "";
    return '<div class="alj-rec alj-rec--' + verdictMod + '">' + brk +
      '<span class="alj-rec-label">Fix:</span> ' + what + why + "</div>";
  }

  // ---- the "N ads · M landing pages" badge. PROVES whether the single ad/page
  //      shown is the whole story (1 · 1) or a representative of several. The
  //      counts come straight from the analysis skill — never inferred here. ----
  function pairCountBadge(ads, pages) {
    var a = ads + (ads === 1 ? " ad" : " ads");
    var p = pages + (pages === 1 ? " landing page" : " landing pages");
    var whole = (ads === 1 && pages === 1);
    var title = whole
      ? "This ad group runs exactly one ad to one page — the whole story."
      : "This ad group runs " + a + " to " + p + " — each ad → page is judged on its own below.";
    return '<span class="alj-paircount alj-paircount--' + (whole ? "whole" : "multi") +
      '" title="' + esc(title) + '">' + esc(a + " · " + p) + "</span>";
  }
  function countDistinctPages(pairings) {
    var s = {}, n = 0;
    for (var i = 0; i < pairings.length; i++) {
      var u = pairings[i].destination && pairings[i].destination.final_url;
      if (u && !s[u]) { s[u] = 1; n++; }
    }
    return n || pairings.length;
  }
  // Normalize a finding to pairings[]. Back-compat: synthesize ONE pairing from the
  // legacy singular message/destination so older skill output still renders.
  function pairingsOf(finding) {
    if (finding.pairings && finding.pairings.length) return finding.pairings;
    if (finding.message || finding.destination) {
      var m = finding.message || {};
      return [{
        ad_id: m.ad_id, headlines: m.headlines, descriptions: m.descriptions,
        destination: finding.destination, links: finding.links,
        verdict: finding.verdict, recommendation: finding.recommendation
      }];
    }
    return [];
  }

  // -------------------------------------------------------------- one card --
  function card(finding, mx, landingBase) {
    var e = finding.entity || {};
    var v = verdictOf(finding.verdict);
    var spend = num(finding.spend);
    var hadPairings = !!(finding.pairings && finding.pairings.length);
    var pairings = pairingsOf(finding);
    var adCount = finding.ad_count != null ? finding.ad_count : pairings.length;
    var pageCount = finding.landing_count != null ? finding.landing_count : countDistinctPages(pairings);

    // performance chips from the metrics skill (when joined) — never invented
    var perf = ['<span class="alj-perf-spend">' + money(spend) + "</span>"];
    if (mx) {
      perf.push('<span class="alj-perf-conv">' + dec(mx.conversions) + " conv</span>");
      var cpa = mx.conversions > 0 ? money(div(spend, mx.conversions)) : "—";
      perf.push('<span class="alj-perf-cpa">' + cpa + " / conv.</span>");
      if (mx.thin_volume) perf.push('<span class="alj-thin" title="ratios on very few clicks/conversions">thin volume</span>');
    }

    // header: ad group + campaign + the "N ads · M pages" badge + group verdict
    var head = '<div class="alj-card-head">' +
      '<div class="alj-card-id"><strong class="alj-ag">' + esc(e.ad_group || "—") + '</strong>' +
        '<span class="alj-cmp">' + esc(e.campaign || "") + "</span></div>" +
      '<div class="alj-card-meta"><span class="alj-perf">' + perf.join(" · ") + "</span>" +
        pairCountBadge(adCount, pageCount) +
        '<span class="alj-verdict alj-verdict--' + v.mod + '">' + esc(v.label) + "</span></div>" +
      "</div>";

    var body;
    if (pairings.length <= 1) {
      // common case (1 ad · 1 page) — the original 3-column grid, visually unchanged
      var p0 = pairings[0] || {};
      var grid = '<div class="alj-grid">' +
        intentCol(finding.intent, mx) +
        messageCol(p0, mx) +
        destinationCol(p0.destination, landingBase, mx) +
        "</div>";
      body = linksStrip(p0.links) + grid + recBlock(p0.recommendation, v.mod);
    } else {
      // multi case — the SHARED intent once, then one sub-card per ad → its own page,
      // each with its own verdict + links + fix (the honest ad→landing breakdown).
      var intentRow = '<div class="alj-grid alj-grid--shared">' + intentCol(finding.intent, mx) + "</div>";
      var subs = pairings.map(function (p, i) {
        var pv = verdictOf(p.verdict);
        var phead = '<div class="alj-pairing-head">' +
          '<span class="alj-pairing-n">Ad ' + (i + 1) + " of " + pairings.length + "</span>" +
          '<span class="alj-verdict alj-verdict--' + pv.mod + '">' + esc(pv.label) + "</span></div>";
        var pgrid = '<div class="alj-grid alj-grid--pairing">' +
          messageCol(p, mx) + destinationCol(p.destination, landingBase, mx) + "</div>";
        return '<div class="alj-pairing alj-pairing--' + pv.mod + '">' +
          phead + linksStrip(p.links) + pgrid + recBlock(p.recommendation, pv.mod) + "</div>";
      }).join("");
      body = intentRow + '<div class="alj-pairings">' + subs + "</div>";
    }

    // optional finding-level KEYWORD-DRIFT fix (new contract only; legacy data put its
    // single recommendation inside the synthesized pairing, so don't render it twice).
    var driftRec = hadPairings ? recBlock(finding.recommendation, v.mod) : "";

    return '<article class="alj-card alj-card--' + v.mod + '">' +
      head + relevanceStrip(mx) + body + driftRec +
      "</article>";
  }

  // ----------------------------------------------------------- summary banner --
  function summary(alignment, findings) {
    var roll = alignment.rollup || {};
    var by = roll.byVerdict || countVerdicts(findings);
    var n = findings.length;
    var totalSpend = 0;
    findings.forEach(function (f) { totalSpend += num(f.spend); });
    var brokenSpend = roll.broken_spend != null ? roll.broken_spend
      : sumSpend(findings, "broken") + sumSpend(findings, "needs_review");
    var stats = [
      '<span class="alj-sum-stat"><strong>' + n + "</strong> ad-group journeys</span>",
      '<span class="alj-sum-stat alj-sum-stat--spend"><strong>' + money(totalSpend) + "</strong> total spend</span>",
      '<span class="alj-sum-stat alj-sum-stat--aligned"><strong>' + num(by.aligned) + "</strong> aligned</span>",
      '<span class="alj-sum-stat alj-sum-stat--review"><strong>' + num(by.needs_review) + "</strong> need review</span>",
      '<span class="alj-sum-stat alj-sum-stat--broken"><strong>' + num(by.broken) + "</strong> broken</span>"
    ];
    var head = (alignment.synthesis && alignment.synthesis.headline)
      ? '<div class="alj-sum-headline">' + esc(alignment.synthesis.headline) + "</div>" : "";
    var spendLine = '<div class="alj-sum-spend"><strong>' + money(brokenSpend) +
      "</strong> in spend flows through journeys that need attention.</div>";
    return '<div class="alj-summary">' + head +
      '<div class="alj-sum-stats">' + stats.join("") + "</div>" + spendLine + "</div>";
  }
  function countVerdicts(findings) {
    var by = { aligned: 0, needs_review: 0, broken: 0 };
    findings.forEach(function (f) { var k = String(f.verdict || "").toLowerCase(); if (by[k] != null) by[k]++; });
    return by;
  }
  function sumSpend(findings, verdict) {
    var s = 0;
    findings.forEach(function (f) { if (String(f.verdict || "").toLowerCase() === verdict) s += num(f.spend); });
    return s;
  }

  // -------------------------------------------------------------- the build --
  function build(opts) {
    opts = opts || {};
    var alignment = opts.alignment || {};
    var metricsIdx = indexMetrics(opts.metrics);
    var landingBase = opts.landingBase || (opts.metrics && opts.metrics.meta && opts.metrics.meta.site) || "https://";
    var emptyMessage = opts.emptyMessage || "No journeys to analyse for this range";

    var findings = (alignment.findings || []).slice();

    // filter by verdict (control)
    var vf = String(opts.verdict || "").toLowerCase();
    if (vf && VERDICTS[vf]) findings = findings.filter(function (f) { return String(f.verdict || "").toLowerCase() === vf; });

    if (!findings.length) return '<div class="alj-empty">' + esc(emptyMessage) + "</div>";

    // sort: "spend" (biggest ad spend first) [default] | "attention" (broken → review → aligned, then spend) | "alpha"
    var sk = opts.sort || "spend";
    findings.sort(function (a, b) {
      if (sk === "attention") {
        var ra = verdictOf(a.verdict).rank, rb = verdictOf(b.verdict).rank;
        if (ra !== rb) return ra - rb;                 // worst first
        return num(b.spend) - num(a.spend);
      }
      if (sk === "alpha") return String((a.entity || {}).ad_group || "").localeCompare(String((b.entity || {}).ad_group || ""));
      return num(b.spend) - num(a.spend);              // default: biggest ad spend first
    });

    var cards = findings.map(function (f) {
      var key = jkey((f.entity || {}).campaign, (f.entity || {}).ad_group);
      return card(f, metricsIdx[key] || null, landingBase);
    }).join("");

    return summary(alignment, alignment.findings || findings) + '<div class="alj-cards">' + cards + "</div>";
  }

  // ----- loading skeleton (Data-component states rule) -----
  function skeleton(n) {
    n = n || 3;
    var one = '<div class="alj-card alj-skeleton"><div class="alj-card-head"></div><div class="alj-grid"><div class="alj-col"></div><div class="alj-col"></div><div class="alj-col"></div></div></div>';
    var out = "";
    for (var i = 0; i < n; i++) out += one;
    return '<div class="alj-cards">' + out + "</div>";
  }

  // ---- self-contained mount: control bar (verdict filter / sort) + cards ----
  var SORTS = [["spend", "Ad spend (highest first)"], ["attention", "Needs attention first"], ["alpha", "Ad group (A–Z)"]];
  var VERDICT_FILTER = [["", "All verdicts"], ["broken", "Broken"], ["needs_review", "Needs review"], ["aligned", "Aligned"]];

  function scaffold() {
    var verdictOpts = VERDICT_FILTER.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
    var sortOpts = SORTS.map(function (o) { return '<option value="' + o[0] + '">' + esc(o[1]) + "</option>"; }).join("");
    return '<div class="alj-component">' +
      '<div class="alj-controls">' +
        '<label class="alj-filter">Show <select class="alj-verdict-filter">' + verdictOpts + "</select></label>" +
        '<label class="alj-filter">Sort by <select class="alj-sort">' + sortOpts + "</select></label>" +
      "</div>" +
      '<div class="alj-host"></div>' +
    "</div>";
  }

  function mount(target, opts) {
    opts = opts || {};
    if (typeof document === "undefined") return null;          // browser-only
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el) return null;
    el.innerHTML = scaffold();
    var host = el.querySelector(".alj-host");
    var state = { verdict: opts.verdict || "", sort: opts.sort || "spend" };
    var elV = el.querySelector(".alj-verdict-filter"), elS = el.querySelector(".alj-sort");
    if (elV) elV.value = state.verdict;
    if (elS) elS.value = state.sort;

    function render() {
      host.innerHTML = build({
        alignment: opts.alignment, metrics: opts.metrics, landingBase: opts.landingBase,
        emptyMessage: opts.emptyMessage, verdict: state.verdict, sort: state.sort
      });
    }
    if (elV) elV.addEventListener("change", function () { state.verdict = elV.value; render(); });
    if (elS) elS.addEventListener("change", function () { state.sort = elS.value; render(); });
    render();
    return { el: el, rerender: render, getState: function () { return state; } };
  }

  // public surface (build + mount + pieces, for tests / reuse)
  return {
    build: build,
    mount: mount,
    skeleton: skeleton,
    _internal: { indexMetrics: indexMetrics, isValidQS: isValidQS, verdictOf: verdictOf, jkey: jkey, card: card }
  };
});
