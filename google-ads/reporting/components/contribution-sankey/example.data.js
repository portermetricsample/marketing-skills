/*
 * Fictional, platform-neutral contribution flow for the contribution-sankey engine.
 * Acme Insurance (1234567890-1234567890) — SYNTHETIC numbers (RULES.md #3). Proves
 * the engine is not ad-specific: any layered weighted flow works.
 *
 * Shape the engine reads:
 *   columns : header per level, left → right
 *   metrics : the switchable "flow by" metrics ({key,label,format})
 *   nodes   : { id, level, label, branch, values:{<metric>:n} }   branch → colour;
 *             branch "__other__" = a remainder/“other” bucket (drawn grey)
 *   links   : { source, target, values:{<metric>:n} }   a link's value = the flow into target
 */
(function (root, factory) {
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  if (root) { root.PorterReportingExamples = root.PorterReportingExamples || {}; root.PorterReportingExamples.contributionSankey = data; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // leaf metrics, then summed up so every column reconciles.
  function v(cost, conv, value) { return { cost: cost, conv: conv, value: value }; }
  function add() { var o = { cost: 0, conv: 0, value: 0 }; for (var i = 0; i < arguments.length; i++) { o.cost += arguments[i].cost; o.conv += arguments[i].conv; o.value += arguments[i].value; } return o; }

  var leaf = {
    k1: v(300, 20, 4000), k2: v(150, 9, 1800),                          // brand
    k3: v(220, 8, 1600), k4: v(180, 6, 1200), o2: v(40, 1, 200),        // life · term (o2 = remainder)
    k5: v(160, 5, 1000),                                                // life · whole
    k6: v(200, 4, 600),  o4: v(50, 0, 0)                               // competitor (o4 = remainder)
  };
  var a1 = add(leaf.k1, leaf.k2), a2 = add(leaf.k3, leaf.k4, leaf.o2), a3 = add(leaf.k5), a4 = add(leaf.k6, leaf.o4);
  var c1 = a1, c2 = add(a2, a3), c3 = a4;
  var root = add(c1, c2, c3);

  var nodes = [
    { id: "all", level: 0, label: "Search", values: root },
    { id: "c1", level: 1, label: "Brand", branch: "c1", values: c1 },
    { id: "c2", level: 1, label: "Life insurance", branch: "c2", values: c2 },
    { id: "c3", level: 1, label: "Competitor", branch: "c3", values: c3 },
    { id: "a1", level: 2, label: "Brand terms", branch: "c1", values: a1 },
    { id: "a2", level: 2, label: "Term life", branch: "c2", values: a2 },
    { id: "a3", level: 2, label: "Whole life", branch: "c2", values: a3 },
    { id: "a4", level: 2, label: "Competitor names", branch: "c3", values: a4 },
    { id: "k1", level: 3, label: "acme insurance", branch: "c1", values: leaf.k1 },
    { id: "k2", level: 3, label: "acme life quote", branch: "c1", values: leaf.k2 },
    { id: "k3", level: 3, label: "term life quote", branch: "c2", values: leaf.k3 },
    { id: "k4", level: 3, label: "buy term life", branch: "c2", values: leaf.k4 },
    { id: "o2", level: 3, label: "other / unreported", branch: "__other__", values: leaf.o2 },
    { id: "k5", level: 3, label: "whole life cost", branch: "c2", values: leaf.k5 },
    { id: "k6", level: 3, label: "competitor name", branch: "c3", values: leaf.k6 },
    { id: "o4", level: 3, label: "other / unreported", branch: "__other__", values: leaf.o4 }
  ];
  function link(s, t, val) { return { source: s, target: t, values: val }; }
  var links = [
    link("all", "c1", c1), link("all", "c2", c2), link("all", "c3", c3),
    link("c1", "a1", a1), link("c2", "a2", a2), link("c2", "a3", a3), link("c3", "a4", a4),
    link("a1", "k1", leaf.k1), link("a1", "k2", leaf.k2),
    link("a2", "k3", leaf.k3), link("a2", "k4", leaf.k4), link("a2", "o2", leaf.o2),
    link("a3", "k5", leaf.k5), link("a4", "k6", leaf.k6), link("a4", "o4", leaf.o4)
  ];

  return {
    account: { id: "1234567890-1234567890", name: "Acme Insurance" },
    columns: ["Channel", "Campaign", "Ad group", "Keyword"],
    metrics: [
      { key: "cost",  label: "Spend",       format: "money" },
      { key: "conv",  label: "Conversions", format: "dec"   },
      { key: "value", label: "Conv. value", format: "money" }
    ],
    nodes: nodes,
    links: links
  };
});
