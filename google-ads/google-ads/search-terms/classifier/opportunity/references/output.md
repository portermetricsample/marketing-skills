# Output — Search Intent & Angle Discovery

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(map, slide, doc). **No presentation here** — emojis/tables are a rendering concern, not the
analysis output.

## Enums (the only allowed values)
- `intent`: `cost` · `comparison` · `informational` · `persona` · `geo` · `transactional`
- `asset`: `calculator` · `pricing_page` · `comparison_listicle` · `guide` · `persona_landing` · `local_page` · `none`
  - (`cost`→calculator/pricing_page · `comparison`→comparison_listicle · `informational`→guide ·
    `persona`→persona_landing · `geo`→local_page · `transactional`→none, already served)
- `converts_today`: `yes` · `low` · `no` — the clue of unserved intent, NOT a performance verdict.
- `already_served`: `yes` · `no` — read from current campaigns / landings (the gap).
- `hand_to_seo`: `yes` · `no` — real paid demand worth a complementary organic page.
- `campaign_type`: `search` · `no_keyword` (PMax / Demand Gen — still works for intent).

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "search-term-intent-discovery",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "campaign_type": "search"
  },

  // Executive synthesis — insight-first, the top layer reporting renders before any section.
  "synthesis": {
    "headline":  "One sentence: the biggest unmet-intent opportunity and the single asset to ship.",
    "diagnosis": "Where demand leaks: the biggest unmet-intent opportunity (intent + demand + the asset it wants) and a recurring angle the advertiser isn't using.",
    "action":    "The one content/ad idea to ship first — where / what / why."
  },

  // One entry per intent/angle cluster, SORTED BY DEMAND (impressions desc).
  // Only clusters the advertiser is NOT serving well (skip already-satisfied transactional).
  "clusters": [
    {
      "intent": "cost",
      "label": "Cost / calculator",
      "demand": {
        "impressions": 4200,
        "clicks": 180,
        "terms_count": 22
      },
      "converts_today": "low",                 // yes | low | no  (clue, not a verdict)
      "sample_queries": [                       // 3–5 real terms
        "how much is life insurance",
        "life insurance cost ontario",
        "life insurance rates by age"
      ],
      "asset": "calculator",                    // asset to CREATE (enum)
      "ad_angle": "See your real monthly price in 60 seconds — no call needed.",
      "already_served": "no",                   // yes | no  (gap, from campaigns/landings)
      "hand_to_seo": "yes"                       // yes | no  (real paid demand → organic page)
    }
  ]
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline` (one sentence), `diagnosis` (where the unmet demand sits), `action` (the single asset/idea to ship). No `highlights`.
- `clusters[]` is **sorted by demand** (`impressions` desc). Size by audience, never by spend.
- Every cluster's `intent` and `asset` come from the enums above — never free text.
- `converts_today` is the **clue** of unserved intent (high demand + low conversion), NOT a
  performance judgment on the terms. No per-term performance verdicts — this is discovery.
- Only emit clusters the advertiser is **NOT serving well** (`already_served: "no"`); skip
  transactional intent the current provider landing already satisfies.
- In `no_keyword` mode (PMax / Demand Gen) the schema is unchanged — intent discovery does not
  need the keyword; only `meta.campaign_type` flips to `no_keyword`.
