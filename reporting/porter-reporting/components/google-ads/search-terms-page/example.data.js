/*
 * Fictional sample for search-terms-page (per RULES.md #3: only "Acme Insurance",
 * synthetic numbers — never a real account). Shape = the analysis contract the
 * page consumes (what adapter.js produces from the porter-analysis output).
 * Tags fire ONLY when something is off; a relevant/standard term is untagged.
 */
window.STP_EXAMPLE = {
  keywords: [
    {
      keyword: "life insurance", matchType: "Broad",
      totals: { spend: 820, conversions: 23, cpa: 35.65 },
      terms: [
        { term: "life insurance online", on: true, spend: 420, conversions: 14, cpa: 30, tags: [] },
        { term: "acme life insurance", on: true, spend: 120, conversions: 8, cpa: 15,
          tags: [{ label: "Branded", tone: "purple" }] },
        { term: "rival life insurance quote", on: true, spend: 70, conversions: 1, cpa: 70,
          tags: [{ label: "Competitor", tone: "aqua" }, { label: "Irrelevant", tone: "pink" }] },
        { term: "life insurance jobs", on: true, spend: 90, conversions: 0, cpa: null,
          tags: [{ label: "Irrelevant", tone: "pink" }] },
        { term: "free life insurance", on: true, spend: 60, conversions: 0, cpa: null, tags: [] },
        { term: "how much is life insurance", on: true, spend: 60, conversions: 0, cpa: null,
          tags: [{ label: "Opportunity", tone: "green" }] }
      ]
    },
    {
      keyword: "term life insurance", matchType: "Exact",
      totals: { spend: 530, conversions: 18, cpa: 29.44 },
      terms: [
        { term: "term life insurance", on: true, spend: 380, conversions: 14, cpa: 27.14,
          tags: [{ label: "Duplicate", tone: "yellow" }] },
        { term: "term life insurance for seniors", on: true, spend: 110, conversions: 3, cpa: 36.67, tags: [] },
        { term: "term life insurance quotes", on: false, spend: 40, conversions: 1, cpa: 40, tags: [] }
      ]
    },
    {
      keyword: "best term life insurance", matchType: "Phrase",
      totals: { spend: 220, conversions: 4, cpa: 55 },
      terms: [
        { term: "term life insurance", on: true, spend: 90, conversions: 2, cpa: 45,
          tags: [{ label: "Duplicate", tone: "yellow" }] },
        { term: "best term life insurance 2026", on: true, spend: 70, conversions: 2, cpa: 35,
          tags: [{ label: "Opportunity", tone: "green" }] },
        { term: "cheap term life insurance", on: true, spend: 60, conversions: 0, cpa: null,
          tags: [{ label: "Irrelevant", tone: "pink" }] }
      ]
    }
  ],
  insights: {
    totalPotential: 586,
    measuredPotential: 280,
    rows: [
      { criterion: "Opportunity", tone: "green", basis: "estimated",
        action: "New keywords · uncovered intents",
        rationale: "\"how much is life insurance\" and \"best term life insurance 2026\" show real demand no keyword owns — build the calculator/comparison they ask for.",
        dollars: 180, sub: "untapped intents" },
      { criterion: "Irrelevant", tone: "pink", basis: "measured",
        action: "Add 2 terms as negatives",
        rationale: "\"life insurance jobs\" ($90) and \"cheap term life insurance\" ($60) drew spend on searches outside the keyword's intent — exclude them.",
        dollars: 150, sub: "recoverable" },
      { criterion: "Duplicate", tone: "yellow", basis: "estimated",
        action: "Resolve 1 cannibalization",
        rationale: "\"term life insurance\" is caught by exact AND the broad phrase keyword — route it to the exact owner, negative the looser copy.",
        dollars: 90, sub: "wasted overlap" },
      { criterion: "Competitor", tone: "aqua", basis: "measured",
        action: "Explore a comparison angle",
        rationale: "\"rival life insurance quote\" ($70) is spend on a competitor search — reallocate or build a deliberate comparison page.",
        dollars: 70, sub: "reallocate" },
      { criterion: "Wasteful", tone: "amber", basis: "measured",
        action: "Review 1 wasteful term",
        rationale: "\"free life insurance\" ($60) is a RIGHT-FIT search still losing money — fix the landing/bid before cutting; do NOT negative a real customer.",
        dollars: 60, sub: "review / fix" },
      { criterion: "Branded", tone: "purple", basis: "estimated",
        action: "Recapture brand traffic",
        rationale: "\"acme life insurance\" ($120) is a brand search served by the non-brand campaign — move it to the brand campaign for cheaper conversions (assumes a 30% lower brand CPA).",
        dollars: 36, sub: "CPA savings" }
    ]
  }
};
