/*
 * Regression test (zero deps) — run with: node contribution-sankey.test.js
 *
 * Guards the U+0001 control-char bug: the built sankey output must be XML-export-safe
 * (no C0 control chars), or DOM→XML serialization (PDF / PPTX / screenshot / standalone
 * HTML) fails with "invalid character in attribute value" while the live page renders fine.
 */
var sk = require("./contribution-sankey");
var ac = require("./google-ads/account-contribution");
var D = require("./google-ads/example.data");

var fails = 0;
function check(name, ok, detail) {
  if (ok) { console.log("  ok   " + name); }
  else { console.log("  FAIL " + name + (detail ? "  — " + detail : "")); fails++; }
}

var CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F]/;

// build at both depths and for every metric — none may emit a control char
["cost", "conv", "value"].forEach(function (m) {
  [3, 4].forEach(function (maxLevel) {
    var data = ac.buildData({ account: D.account, adGroups: D.adGroups, keywords: D.keywords, searchTerms: D.searchTerms });
    var html = sk.build({ columns: data.columns, metrics: data.metrics, nodes: data.nodes, links: data.links, metric: m, maxLevel: maxLevel, width: 900 });
    var i = html.search(CTRL);
    check("flow=" + m + " depth=" + (maxLevel + 1) + ": no XML-illegal control chars",
      i === -1, i === -1 ? "" : "U+" + html.charCodeAt(i).toString(16).toUpperCase().padStart(4, "0") + " at index " + i);
    check("flow=" + m + " depth=" + (maxLevel + 1) + ": node ids emitted",
      (html.match(/data-sk-id="/g) || []).length > 0);
  });
});

// the source separator itself must be printable (no control char leaked into ids)
var data = ac.buildData({ account: D.account, adGroups: D.adGroups, keywords: D.keywords, searchTerms: D.searchTerms });
check("node ids are control-char-free", !data.nodes.some(function (n) { return CTRL.test(n.id); }));
check("links endpoints are control-char-free", !data.links.some(function (l) { return CTRL.test(l.source) || CTRL.test(l.target); }));

if (fails) { console.error("\n" + fails + " check(s) FAILED"); process.exit(1); }
console.log("\nAll checks passed — output is XML-export-safe.");
