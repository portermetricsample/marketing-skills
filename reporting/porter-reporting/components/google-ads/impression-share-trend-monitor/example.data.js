/* FICTIONAL example data for impression-share-trend-monitor.
 * Account: Acme Insurance (1234567890-1234567890) — synthetic, per RULES.md #3. NOT real data.
 * Shape mirrors the `impression-share-trend` analysis output (porter-analysis): one object per
 * Search campaign with weekly got/rank/budget (0-100, summing to 100), spend, driver, and the
 * 4-week-vs-prior-4-week window the monitor renders. */
(function (root) {
  var WEEKS = ["W18", "W19", "W20", "W21", "W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29"];

  // mean of the last `w` vs the `w` before — mirrors the analysis 4-wk-vs-prior-4-wk change
  function avg(a) { return a.reduce(function (s, x) { return s + x; }, 0) / (a.length || 1); }
  function mk(campaign, spend, driver, got, rank) {
    var n = got.length, weeks = WEEKS.slice(0, n);
    var budget = got.map(function (g, i) { return Math.round((100 - g - rank[i]) * 10) / 10; });
    var w = n >= 8 ? 4 : Math.max(1, Math.floor(n / 2));
    var recent = Math.round(avg(got.slice(n - w)) * 10) / 10;
    var prior = Math.round(avg(got.slice(n - 2 * w, n - w)) * 10) / 10;
    return { campaign: campaign, spend: spend, weeks: weeks, got: got, rank: rank, budget: budget,
             driver: driver, prior_is: prior, recent_is: recent, short: n < 8 };
  }

  var rows = [
    // big spender, rising, still rank-capped (bid/Quality is the lever, not money)
    mk("Acme_Auto_SEM_(TL)", 184200, "rank",
       [25, 27, 24, 26, 29, 31, 30, 33, 35, 34, 32, 38],
       [55, 52, 58, 54, 50, 48, 49, 45, 44, 46, 47, 41]),
    // budget-limited: coral dominates; more daily budget buys reach
    mk("Acme_Home_SEM_(HD)", 52400, "budget",
       [18, 17, 19, 20, 22, 21, 24, 23, 25, 26, 24, 27],
       [12, 14, 11, 10, 9, 12, 8, 10, 7, 9, 11, 8]),
    // rank-limited, steady climb
    mk("Acme_Life_SEM_(TL)", 39800, "rank",
       [22, 24, 23, 25, 26, 28, 27, 29, 30, 31, 29, 31],
       [60, 58, 61, 56, 55, 52, 54, 51, 50, 49, 52, 50]),
    // budget-limited, strong recent surge
    mk("Acme_Health_SEM_(HD)", 31100, "budget",
       [12, 13, 12, 15, 14, 17, 19, 24, 28, 30, 22, 24],
       [11, 18, 14, 12, 16, 13, 10, 9, 8, 12, 14, 10]),
    // mixed — loses to both
    mk("Acme_Renters_SEM_(HA)", 19600, "mixed",
       [16, 15, 17, 18, 19, 18, 20, 21, 22, 20, 21, 23],
       [42, 45, 40, 38, 36, 41, 35, 33, 34, 40, 38, 36]),
    // short history (5 weeks) — narrower window, flagged
    mk("Acme_Pet_SEM_Test_(HA)", 8900, "rank",
       [11, 12, 10, 11, 13],
       [70, 66, 74, 68, 60]),
    // brand: near-saturated, flat, only rank loss (competitors on the brand term)
    mk("Acme_Brand_SEM_(BR)", 7300, "rank",
       [86, 83, 84, 82, 85, 81, 84, 83, 82, 80, 83, 84],
       [14, 17, 16, 18, 15, 19, 16, 17, 18, 20, 17, 16])
  ];

  root.PorterReporting = root.PorterReporting || {};
  root.PorterReporting.impressionShareTrendMonitorExample = {
    account: "Acme Insurance (1234567890-1234567890) — fictional",
    rows: rows
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PorterReporting.impressionShareTrendMonitorExample;
})(typeof window !== "undefined" ? window : this);
