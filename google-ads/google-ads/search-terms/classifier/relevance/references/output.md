# Output — Search Term ↔ Keyword Relevance

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(table, slide, doc). **No presentation here** — emojis/tables are a rendering concern, not the
analysis output.

## Enums (the only allowed values)
- `verdict`: `justified` · `loose` · `leak` · `misplaced` · `brand` · `competitor` · `review`
- `action`: `keep` · `tighten_keyword` · `add_negative` · `move_to_other_campaign` · `leave` · `strategic_policy` · `human_review`
- `match_type`: `EXACT` · `PHRASE` · `BROAD`
- `campaign_type`: `search` · `no_keyword` (PMax / Demand Gen)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "search-term-keyword-relevance",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "campaign_type": "search"
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: where relevance leaks most and the single action.",
    "diagnosis": "Where it leaks: the keyword that most off-target terms leak from + a recurring drift/leak n-gram seen across keywords.",
    "action":    "The one specific fix to take now — where / what / why."
  },

  // One group per match type. Inside, grouped by keyword (the unit of reading).
  "groups": [
    {
      "match_type": "BROAD",
      "keywords": [
        {
          "keyword": "best dental insurance plan",
          "too_loose": true,                 // header flag → tighten/restructure
          "terms": [
            { "term": "dental insurance plans", "verdict": "justified", "action": "keep" },
            { "term": "health insurance",       "verdict": "misplaced", "action": "move_to_other_campaign" },
            { "term": "how to get an insurance license", "verdict": "leak", "action": "add_negative" }
          ]
        }
      ]
    }
  ],

  // n-gram candidates for phrase/exact negatives, with blast-radius note.
  "ngrams": [
    {
      "token": "license",
      "verdict": "leak",
      "recommended_negative": "phrase",      // phrase | exact (drop to exact if collateral)
      "blast_radius": "Blocks no good terms in this account."
    }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (where relevance leaks), `action` (the single fix). No `highlights`.
- Every `terms[]` item has both a `verdict` and an `action` from the enums above — never free text.
- `verdict` reflects **relevance only**. Never derive it from conversions / CPA / ROAS / cost.
- `too_loose: true` when most of a keyword's terms are `loose`/`leak` → the keyword is the faucet.
- In `no_keyword` mode there are no `groups` by keyword; emit account-level term relevance +
  recommended negatives / brand exclusions instead (see [`framework.md`](framework.md)).
