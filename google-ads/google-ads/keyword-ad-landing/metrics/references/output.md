# Output — Keyword / Ad / Landing Metrics

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it next to
the alignment verdict (table, slide, doc). **No presentation here** — emojis/tables are a rendering
concern. This skill is **instrumentation**: it carries numbers and grades, **never a verdict or
classification** (no `state`, no `verdict` — that is the alignment sibling's field).

## Enums (the only allowed values)
- `grade`: `BELOW_AVERAGE` · `AVERAGE` · `ABOVE_AVERAGE` · `null` (missing / historical not yet computed)
- `match_type`: `EXACT` · `PHRASE` · `BROAD`
- `is_lost_to`: `rank` · `budget` (which one the campaign loses the top auction to)
- `campaign_type`: `search` · `uncovered` (non-Search — grades & IS absent; report its spend, print nothing)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "keyword-ad-landing-metrics",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "currency": "CAD",
    "campaign_type": "search",
    "conversions_basis": "primary"          // primary = google_ads_conversions; note if all_conversions used
  },

  // Descriptive context only — NOT a verdict. States WHAT the numbers show, never good/bad.
  "synthesis": {
    "headline":  "One sentence: which journey carries the most spend and what its chain numbers read.",
    "diagnosis": "Where the numbers sit along the chain (e.g. grades Above at keyword/ad, CVR drops at the landing).",
    "action":    "Where to look next — points the reader to the alignment verdict beside these figures, never a fix."
  },

  // One entry per journey = campaign + ad group (same unit as the alignment skill).
  "journeys": [
    {
      "campaign": "Acme_Health_SEM",
      "ad_group": "dental_plans",
      "spend": 14332,                         // google_ads_cost_micros, for ordering by dollars
      "campaign_context": {                   // Impression Share — campaign grain, printed once above its journeys
        "search_top_impression_share": 0.62,
        "search_absolute_top_impression_share": 0.31,
        "rank_lost_top_impression_share": 0.27,
        "budget_lost_top_impression_share": 0.11,
        "is_lost_to": "rank"                  // the larger of rank/budget-lost
      },
      "keywords": [                           // keyword/SERP + the per-keyword grades (keyword_view)
        {
          "keyword": "dental insurance plans",
          "match_type": "PHRASE",
          "impressions": 8400,
          "quality_score": 7,                 // 1–10 ONLY when ≤ 10; if the pull summed it (>10) → null
          "ad_relevance": "ABOVE_AVERAGE",    // grade enum — prints next to the keyword, not the ad
          "expected_ctr": "AVERAGE",
          "landing_page_experience": "BELOW_AVERAGE"
        }
      ],
      "ads": [                                // ad-grain real behavior: CTR (native) + CVR (computed)
        {
          "ad_id": "1234567890",
          "impressions": 8400,
          "clicks": 210,
          "ctr": 0.025,                       // the NATIVE ctr as a fraction — do NOT recompute clicks/impressions (Porter ad-grain impressions undercounts)
          "conversions": 6,
          "cvr": 0.0286,                      // conversions / clicks; null when clicks = 0
          "thin_volume": false                // true → annotate: ratio on too few clicks/conv to trust
        }
      ]
    }
  ]
}
```

## Rules
- **No verdict field.** This skill surfaces; it does not score, band, or judge. The `state` / `verdict`
  of the global contract is intentionally **omitted** — the relevance verdict travels in the alignment
  skill's object, rendered beside this one.
- **`synthesis` is exactly three descriptive strings** — `headline` / `diagnosis` / `action`, all
  factual ("the numbers read X"), never evaluative ("X is bad"). No `highlights`.
- **`quality_score` is `null` unless it passed the `≤ 10` check** — a value above 10 is an aggregation
  artifact (Porter sums it), not a score. Lead with the categorical grades, which are safe at any grain.
- **Grades use the `grade` enum or `null`** — a missing historical grade is `null`, never `0`.
- **`cvr` is computed**, not queried (`conversions / clicks`); `null` on zero clicks. **`ctr` is the
  native field — do NOT recompute** `clicks / impressions` (Porter's ad-grain `impressions`
  undercounts vs native ctr; verified live). Native ctr is a percentage → store it as a fraction.
- **`thin_volume: true`** flags a ratio built on a handful of clicks/conversions — a note for the
  reader, not a judgment.
- **Impression Share is campaign-grain** — it lives in `campaign_context`, printed once, not per ad group.
- **Uncovered (non-Search) journeys** carry their `spend` with `campaign_type: "uncovered"` and no
  grades / IS — report the dollars, print no zeros.
