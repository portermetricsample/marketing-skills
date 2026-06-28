# Output — Keyword → ad → landing alignment

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(table, slide, doc). **No presentation here** — emojis/tables/colors are a rendering concern, not the
analysis output.

## The output unit: one finding per AD GROUP, broken into AD → LANDING pairings
One finding = one ad group. Inside it:
- **`intent[]`** — the keywords + their search terms (shared across the group). This is **L1**.
- **`pairings[]`** — one per **ad → its OWN landing page**. Each pairing is judged on its own
  (L2/L3/L4 + verdict + fix). This is where ad/page irrelevance is found.
- **`ad_count` / `landing_count`** — how many distinct ads and pages the group runs (the
  "N ads · M pages" badge). When both are `1`, the single pairing is the whole story.

Why pairings and not one ad: a group can run several ads, each with its own final URL. Google rotates
which ad serves, so you can **NOT** attribute a keyword to a specific ad — keywords are shared across
the group's ads. The honest, knowable unit is **ad → its landing page**. **NEVER emit a keyword→ad link.**

## Enums (the only allowed values)
- `verdict` / `state`: `aligned` · `needs_review` · `broken` (three states — **no 0–10 score**). Used on
  **both** the finding (group rollup) **and** each pairing.
- `break_type` (only when not aligned): `wrong_page` · `copy_gap` · `keyword_drift` · `ad_miss`
- `link.grade` (L2–L4, inside a pairing): `pass` · `partial` · `fail` · `unknown`
- `match_type`: `EXACT` · `PHRASE` · `BROAD`
- `off_reason` (only on a search term with `on_intent:false`): `competitor_brand` · `wrong_product` ·
  `wrong_geo` · `informational`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "keyword-ad-landing-alignment",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "coverage": {                          // step 0 — SEARCH (covered) vs what's out
      "search_spend": 41200,
      "uncovered_spend": 18800,
      "note": "$18.8K in PMax/Demand Gen is outside this skill (no search_term_view)."
    },
    "journeys_analyzed": 12,
    "currency": "CAD"
  },

  // Executive synthesis — exactly three strings, insight-first.
  "synthesis": {
    "headline":  "How much spend flows through broken journeys + the single highest-leverage fix.",
    "diagnosis": "Where the chain breaks most: the dominant break type + the systemic pattern.",
    "action":    "The one fix to take now — where / what / why."
  },

  // One finding per AD GROUP. Keyword breakdown in intent[]; ad/page breakdown in pairings[].
  "findings": [
    {
      "entity": { "level": "ad_group", "ad_group": "Dental_Exact", "campaign": "Acme_Health_SEM" },
      "verdict": "broken",        // GROUP rollup = worst pairing verdict (drops to broken on severe keyword drift)
      "spend": 9230,              // context only; does NOT move the verdict
      "ad_count": 2,              // badge — distinct ads in this group
      "landing_count": 2,         // badge — distinct landing pages

      // INTENT (shared across the group) — keywords + their real search terms. This IS L1.
      // Mark EVERY off-intent term (on_intent:false + off_reason), not only inside broken pairings.
      "intent": [
        { "keyword": "dental insurance", "match_type": "EXACT", "spend": 5100,
          "top_search_terms": [
            { "term": "dental insurance plans", "spend": 2100, "on_intent": true },
            { "term": "brightsmile dental",     "spend": 600,  "on_intent": false, "off_reason": "competitor_brand" }
          ] }
      ],

      // PAIRINGS — one per ad → its OWN landing page. Judge EACH against the shared intent.
      "pairings": [
        {
          "ad_id": "692100000001",
          "headlines": ["Affordable Dental Insurance", "Plans From $19/mo", "Get a Quote Today"],
          "descriptions": ["Compare dental plans and enrol online in minutes."],

          // DESTINATION — the LITERAL final URL + the AI's reading of the scraped page.
          "destination": {
            "final_url": "acme.com/health-insurance",     // the real URL, not the page title
            "page_title": "Health Insurance Plans",        // the page's own <title> (most reliable hero signal)
            "h1": "Health Insurance Plans",                // the AI's read of the hero (null if not scraped)
            "page_summary": "Hero 'Health Insurance Plans'; lists medical coverage; never names dental.",
            "mismatch_word": "Health",                     // the word that reveals the break
            "scraped": true                                // false -> L3/L4 unknown -> pairing can't be 'aligned'
          },

          // LINKS for THIS pairing — L2 keyword↔ad, L3 ad↔landing, L4 intent↔landing.
          // (L1 search_term↔keyword lives in intent[] above, as on_intent/off_reason.)
          "links": [
            { "link": "L2", "name": "keyword_to_ad",     "grade": "pass", "reason": "Headlines lead with 'Dental Insurance'." },
            { "link": "L3", "name": "ad_to_landing",     "grade": "fail", "reason": "Page H1 reads 'Health Insurance' — never names dental." },
            { "link": "L4", "name": "intent_to_landing", "grade": "fail", "reason": "A dental searcher cannot find a dental offer." }
          ],

          "verdict": "broken",         // THIS pairing's state
          "recommendation": {
            "break_type": "wrong_page",
            "where": "Acme_Health_SEM › Dental_Exact › ad 692100000001",
            "what":  "Repoint this ad to a dedicated dental page, or lead the page hero with 'Dental'.",
            "why":   "The page headline says 'Health', not 'dental' — the scent breaks on arrival."
          }
        }
        // ... a second pairing for the group's other ad → its (possibly different) page
      ],

      // Optional FINDING-level fix for KEYWORD DRIFT (an L1 problem, not tied to one ad/page).
      "recommendation": {
        "break_type": "keyword_drift",
        "where": "Acme_Health_SEM › Dental_Exact",
        "what":  "Add 'brightsmile dental' as a negative, or tighten the match type.",
        "why":   "$600 is going to a competitor-brand search this keyword shouldn't catch."
      }
    }
  ],

  // Roll-up — always end with this (size of the problem + systemic patterns + top fixes).
  "rollup": {
    "byVerdict": { "aligned": 5, "needs_review": 3, "broken": 4 },
    "broken_spend": 21400,
    "needs_review_spend": 6800,
    "patterns": [
      { "label": "Dental keywords → a generic 'Health' page", "break_type": "wrong_page", "spend": 9200 }
    ],
    "topFixes": [ /* highest-$ recommendations, ordered by money recovered */ ]
  }
}
```

## Rules
- **`verdict` is a STATE, never a number** — on **both** the finding and each pairing. Pairing
  aggregation: any clear L3/L4 `fail` → `broken`; else any `unknown`/ambiguous → `needs_review`; else
  `aligned`. The FINDING verdict = the **worst pairing verdict**, dropped to `broken` on severe keyword
  drift (L1).
- **One finding per `(campaign, ad_group)`.** The same ad-group name in two campaigns = two findings.
- **`pairings[]` is the ad→landing unit.** `ad_count` / `landing_count` = the distinct counts (the
  badge). When both are `1` there is exactly one pairing — the whole story.
- **NEVER emit a keyword→ad link.** Google rotates ads; keywords are shared across the group's ads.
  Break the group down by **ad → its own page**, not by keyword → ad.
- **The verdict is on the WORDS only.** `spend` is context — it does NOT move the verdict. Never read
  conversions/CPA/CVR into a relevance grade.
- **Empty scrape → `scraped:false` → that pairing's L3/L4 `unknown` → pairing `needs_review`** (never
  `aligned`). Don't guess page content.
- **Ground every claim** — quote the search `term`, the `headline`, the page (`h1`/`mismatch_word`).
- **Weight by spend, not row count.** Search-term coverage is partial (Google hides low-volume terms).
- **Brand is its own case** — a brand keyword → homepage is usually `aligned`.
- `synthesis` is **exactly three strings** (`headline` / `diagnosis` / `action`).
```
