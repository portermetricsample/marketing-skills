/* Fictional demo data — account "Acme Insurance" (1234567890-1234567890), SYNTHETIC numbers.
 * Shape = ONE `ad` node from porter-analysis creative-inventory's `creative_graph.tree`, plus
 * the graph's `extensions`. Not real performance. (RULES.md #3: no real data in the repos.) */
(function (root) {
  var ad = {
    ad_id: "111111111111",
    ad_name: "",
    ad_type: "RSA",
    campaign: "Acme_Search_TermLife_Brand",
    ad_group: "Term Life",
    segment: "brand",
    segment_source: "profile",
    ad_strength: "EXCELLENT",
    final_url: "https://www.acme-insurance.example/term-life",
    final_url_suffix: null,
    headlines: [
      { text: "Acme Insurance", pin: "1", perf_label: "BEST", approval: "APPROVED", dki: false, served: true, impressions: 4200, clicks: 360, conv: 22, cost: 1100 },
      { text: "Affordable Term Life Cover", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 3100, clicks: 250, conv: 18, cost: 900 },
      { text: "Get a Quote in 2 Minutes", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 2600, clicks: 210, conv: 15, cost: 720 },
      { text: "No Medical Exam Options", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 2200, clicks: 150, conv: 9, cost: 560 },
      { text: "{Keyword:Life Insurance}", pin: "none", perf_label: "PENDING", approval: "APPROVED", dki: true, served: true, impressions: 1900, clicks: 140, conv: 7, cost: 510 },
      { text: "Coverage From $15/Month", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 1700, clicks: 120, conv: 8, cost: 430 },
      { text: "Protect Your Family Today", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 1500, clicks: 95, conv: 6, cost: 360 },
      { text: "Licensed Agents Standing By", pin: "none", perf_label: "LOW", approval: "APPROVED", dki: false, served: true, impressions: 1200, clicks: 40, conv: 1, cost: 300 },
      { text: "Up to $1M in Coverage", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 1100, clicks: 78, conv: 5, cost: 270 },
      { text: "30-Day Free Look Period", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 900, clicks: 55, conv: 3, cost: 210 },
      { text: "Trusted by 50,000 Families", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 800, clicks: 60, conv: 4, cost: 190 },
      { text: "Term Life, Whole Life & More", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 760, clicks: 44, conv: 2, cost: 180 },
      { text: "Cancel Anytime, No Fees", pin: "none", perf_label: "LOW", approval: "APPROVED", dki: false, served: true, impressions: 540, clicks: 18, conv: 0, cost: 130 },
      { text: "Rates Won't Increase", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: false, impressions: 0, clicks: 0, conv: 0, cost: 0 },
      { text: "Apply Online in Minutes", pin: "none", perf_label: "PENDING", approval: "DISAPPROVED", dki: false, served: true, impressions: 320, clicks: 12, conv: 0, cost: 90 }
    ],
    descriptions: [
      { text: "Get affordable term life insurance with no medical exam. Free quote in 2 minutes.", pin: "1", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 3800, clicks: 300, conv: 20, cost: 980 },
      { text: "Coverage up to $1M from $15/month. Trusted by 50,000+ families across the country.", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 2400, clicks: 170, conv: 11, cost: 600 },
      { text: "Protect what matters. Flexible term lengths, licensed agents, 30-day free look.", pin: "none", perf_label: "GOOD", approval: "APPROVED", dki: false, served: true, impressions: 1500, clicks: 95, conv: 6, cost: 360 },
      { text: "Apply online in minutes — no paperwork.", pin: "none", perf_label: "LOW", approval: "APPROVED", dki: false, served: true, impressions: 700, clicks: 30, conv: 1, cost: 160 }
    ]
  };

  var extensions = {
    sitelinks: ["Get a Quote", "Coverage Options", "Why Acme", "Contact Us"],
    callouts: ["No Medical Exam", "30-Day Free Look", "Licensed Agents", "Rates Locked In"],
    snippets: [{ header: "Coverage", values: ["Term Life", "Whole Life", "Disability", "Critical Illness"] }]
  };

  var api = { ad: ad, extensions: extensions, business: "Acme Insurance" };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PorterReporting = root.PorterReporting || {};
  root.PorterReporting.exampleData = api;
})(typeof window !== "undefined" ? window : this);
