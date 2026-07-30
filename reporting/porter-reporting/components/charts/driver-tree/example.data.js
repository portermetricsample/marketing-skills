/*
 * charts/driver-tree — FICTIONAL demo data (CONNECTOR-AGNOSTIC).
 *
 * A deliberately platform-neutral hierarchy so the demo proves the ENGINE works
 * on any nested data — not just ads. Fictional account "Acme Insurance"
 * (1234567890-1234567890), synthetic numbers, per RULES.md #3.
 *
 * Each node = { name, link?, metrics:{…}, prev:{…}?, children:[…]? }.
 *   children: array  → expandable, already loaded
 *   children: null   → expandable, NOT loaded yet (lazy — the engine shows a
 *                      "Loading…" placeholder and calls opts.onExpand)
 *   children: omitted/[] → a leaf
 * metrics keys here (spend / conv / cpa / value) are arbitrary — the caller's
 * `metrics` config decides which keys to show and how to format them.
 */
(function (root, factory) {
  var d = factory();
  if (typeof module === "object" && module.exports) module.exports = d;
  if (root) {
    root.PorterReporting = root.PorterReporting || {};
    root.PorterReporting.exampleData = d;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // n(spend, conv, value) → a metrics object with derived cost-per-conversion.
  function n(spend, conv, value) {
    return { spend: spend, conv: conv, value: value, cpa: conv ? spend / conv : 0 };
  }
  function node(name, cur, prev, children, link) {
    return { name: name, metrics: cur, prev: prev, children: children, link: link };
  }

  var tree = node("Acme Insurance", n(48200, 612, 184000), n(41800, 548, 161000), [
    node("Term Life", n(21400, 318, 102000), n(18900, 286, 92000), [
      node("Brand — Term Life", n(6200, 142, 58000), n(5400, 121, 49000), [
        node("Exact match", n(3800, 96, 41000), n(3300, 82, 35000), []),
        node("Phrase match", n(2400, 46, 17000), n(2100, 39, 14000), [])
      ], "#"),
      node("Generic — Term Life", n(9800, 121, 30000), n(8600, 104, 27000), null, "#"),
      node("Competitor — Term Life", n(5400, 55, 14000), n(4900, 61, 16000), null, "#")
    ], "#"),
    node("Whole Life", n(14600, 168, 52000), n(12400, 152, 46000), [
      node("Brand — Whole Life", n(4100, 78, 27000), n(3600, 71, 24000), null, "#"),
      node("Generic — Whole Life", n(10500, 90, 25000), n(8800, 81, 22000), null, "#")
    ], "#"),
    node("Disability", n(7300, 84, 19000), n(6900, 71, 15000), null, "#"),
    node("Bundles", n(4900, 42, 11000), n(3600, 39, 8000), null, "#")
  ], "#");

  return { tree: tree, helpers: { n: n, node: node } };
});
