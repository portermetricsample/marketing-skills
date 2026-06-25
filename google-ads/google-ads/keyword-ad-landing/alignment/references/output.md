# Output — Keyword → ad → landing alignment

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(table, slide, doc). **No presentation here** — emojis/tables/colors are a rendering concern, not the
analysis output. The fields below mirror the framework's "Output contract — what each finding must
CONTAIN" (Identity · Verdict · Intent · Message · Destination · Recommendation).

## Enums (the only allowed values)
- `verdict` / `state`: `aligned` · `needs_review` · `broken` (three states — **no 0–10 score**)
- `break_type` (only when `broken`): `wrong_page` · `copy_gap` · `keyword_drift` · `ad_miss`
- `link.grade` (the four relevance links L1–L4): `pass` · `partial` · `fail` · `unknown`
- `match_type`: `EXACT` · `PHRASE` · `BROAD`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "keyword-ad-landing-alignment",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "coverage": {                          // step 0 — what the skill covers vs what's out
      "search_spend": 41200,               // SEARCH (covered)
      "uncovered_spend": 18800,            // PMax / Demand Gen / Shopping (no keyword↔term pair)
      "note": "$18.8K in PMax/Demand Gen is outside this skill (no search_term_view)."
    },
    "journeys_analyzed": 12,
    "currency": "CAD"
  },

  // Executive synthesis — exactly three strings, insight-first. Reporting renders it before any finding.
  "synthesis": {
    "headline":  "One sentence: how much spend flows through broken journeys + the single highest-leverage fix.",
    "diagnosis": "Where the chain breaks most: the dominant break type + the systemic pattern (e.g. dental keywords landing on a generic Health page).",
    "action":    "The one fix to take now — where / what / why."
  },

  // One finding per AD GROUP (the framework's output unit). The keyword breakdown lives INSIDE Intent.
  "findings": [
    {
      "entity": { "level": "ad_group", "ad_group": "Dental_Exact", "campaign": "Acme_Health_SEM" },  // Identity — keyed by (campaign, ad_group)
      "verdict": "broken",                 // Verdict — aligned | needs_review | broken (the three states)
      "spend": 9230,                       // context only; does NOT move the verdict (relevance is on the words)

      // The four relevance links, each graded with a one-line reason grounded in the data.
      "links": [
        { "link": "L1", "name": "search_term_to_keyword", "grade": "pass",
          "reason": "Searches like 'dental insurance plans' echo the keyword." },
        { "link": "L2", "name": "keyword_to_ad",         "grade": "pass",
          "reason": "Headlines lead with 'Dental Insurance'." },
        { "link": "L3", "name": "ad_to_landing",         "grade": "fail",
          "reason": "Page H1 reads 'Health Insurance Plans' — never names dental." },
        { "link": "L4", "name": "intent_to_landing",     "grade": "fail",
          "reason": "A dental searcher cannot find a dental offer on the page." }
      ],

      // Intent — the keyword breakdown (each keyword + match type + its top real search terms).
      "intent": [
        { "keyword": "dental insurance", "match_type": "EXACT", "spend": 5100,
          "top_search_terms": [
            { "term": "dental insurance plans", "spend": 2100, "on_intent": true },
            { "term": "best dental coverage",   "spend": 1400, "on_intent": true }
          ] }
      ],

      // Message — the ad the searcher saw (lead headlines + the description), at ad level.
      "message": {
        "ad_id": "692100000001",
        "headlines": ["Affordable Dental Insurance", "Plans From $19/mo", "Get a Quote Today"],
        "descriptions": ["Compare dental plans and enrol online in minutes."]
      },

      // Destination — the LITERAL final URL + a plain summary of what the page actually says.
      "destination": {
        "final_url": "acme.com/health-insurance",     // the real URL, not the page title
        "page_summary": "Hero headline 'Health Insurance Plans'; lists health/medical coverage; no mention of dental.",
        "h1": "Health Insurance Plans",                // highest-weight signal (may be null if not scraped)
        "mismatch_word": "Health",                     // the specific word that reveals the break
        "scraped": true                                // false → L3/L4 = unknown → verdict cannot be 'aligned'
      },

      // Recommendation — break type (when broken) + plain problem + concrete action. {where, what, why}.
      "recommendation": {
        "break_type": "wrong_page",                    // null when not broken
        "where": "Acme_Health_SEM › Dental_Exact",
        "what":  "Repoint the ad to a dedicated dental page, or lead that page's H1/hero with 'Dental'.",
        "why":   "The page headline says 'Health', not 'dental' — the searcher's scent breaks on arrival."
      }
    }
  ],

  // Roll-up — always end with this (size of the problem + systemic patterns + top fixes).
  "rollup": {
    "byVerdict": { "aligned": 5, "needs_review": 3, "broken": 4 },
    "broken_spend": 21400,                 // $ flowing through Broken journeys (the headline number)
    "needs_review_spend": 6800,
    "patterns": [                          // the breaks grouped into NAMED systemic patterns with summed spend
      { "label": "Dental keywords → a generic 'Health' page", "break_type": "wrong_page", "spend": 9200 }
    ],
    "topFixes": [ /* the highest-$ recommendations, ordered by money recovered */ ]
  }
}
```

## Rules
- **`verdict` is a STATE, never a number** — `aligned` / `needs_review` / `broken`. Aggregation: any
  clear `fail` link → `broken`; else any `unknown`/ambiguous → `needs_review`; else → `aligned`.
- **One finding per ad group**, keyed by `(campaign, ad_group)`. The keyword breakdown lives inside
  `intent[]` — never invent a unit word like "journey".
- **The verdict is on the WORDS only.** `spend` is context — it does NOT move the verdict.
  Never read conversions/CPA/CVR into a relevance grade.
- **Empty scrape → `scraped:false` → L3/L4 `unknown` → verdict `needs_review`** (never `aligned`,
  never `broken`). Don't guess page content.
- **Ground every claim** — quote the search `term`, the `headline`, the page (`h1`/`mismatch_word`).
- **Weight by spend, not row count.** Search-term coverage is partial (Google hides low-volume terms);
  the ad group's real spend is its `spend`, not the summed search-term cost.
- **Brand is its own case** — a brand keyword → homepage is usually `aligned`.
- `synthesis` is **exactly three strings** (`headline` / `diagnosis` / `action`). No `highlights`.
