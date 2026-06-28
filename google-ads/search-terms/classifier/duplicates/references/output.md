# Output — Term Routing

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it
(table, slide, doc). **No presentation here** — emojis/tables are a rendering concern.

The body (`actionable`, `skipped_intentional`, the counts) is produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). The wrapping `meta` + `synthesis` are added by the
assembler so reporting can consume it like every other skill.

> All values below are from the **fictional** `../scripts/example.json` fixture (Acme Insurance) —
> no real account data.

## Enums (the only allowed values)
- `match`: `EXACT` · `PHRASE` · `BROAD`
- `pattern`: `same_campaign_cross_adgroup` · `cross_campaign_same_line` · `cross_product`
- `skip_reason`: `same keyword replicated across segments (intentional)`
- `profile_used`: `true` (an account profile canonicalized product words → lines) · `false`
  (generic mode: 2nd campaign token = line)

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "term-routing",
    "period": { "from": "2026-05-01", "to": "2026-05-31" },
    "profile_used": false
  },

  // Executive synthesis — insight-first, rendered before any section.
  "synthesis": {
    "headline":  "One sentence: the biggest cannibalization fix + the single negative to add now.",
    "diagnosis": "The biggest fix (term, its competing keywords, the most-relevant owner, the spend) + the dominant pattern (e.g. one broad keyword catching several terms exact owners should keep, or terms split across a campaign's ad groups).",
    "action":    "The one negative to add now — where / what / why."
  },

  // The routing plan — one entry per ACTIONABLE term, sorted by spend (desc). From process.py.
  "actionable": [
    {
      "term": "life insurance",
      "cost": 1730,                        // term's total spend across all its rows (rounded)
      "pattern": "same_campaign_cross_adgroup",   // see enum
      "term_line": "life",                 // product line the term belongs to (null if undetermined)
      "owner": {                           // the MOST-RELEVANT keyword that should own the term
        "campaign": "Acme_Life_SEM",
        "ad_group": "Life - Exact",
        "match": "EXACT",
        "keyword": "life insurance online"
      },
      "negatives": [                       // add `term` as a negative in each of these (the looser keywords)
        { "campaign": "Acme_Life_SEM", "ad_group": "Best Life", "match": "PHRASE", "keyword": "best life insurance" },
        { "campaign": "Acme_Life_SEM", "ad_group": "Cheap Life", "match": "PHRASE", "keyword": "cheap life insurance" }
      ],
      "review_segment": [],                // negatives that would hit a test/segment campaign — surfaced for HUMAN review, not auto-applied
      "term_has_no_exact_owner": true,     // no competing keyword's text == term → candidate NEW exact keyword (handoff to intent-discovery)
      "competing_keywords": ["best life insurance", "cheap life insurance", "life insurance online"]
    }
  ],
  "actionable_count": 3,

  // Terms matched by the SAME keyword across 2+ places (segment/test replication) — left alone.
  "skipped_intentional": [                 // process.py caps this list at 20 for the payload
    {
      "term": "life insurance canada",
      "cost": 530,
      "distinct_keywords": 1,
      "campaigns": ["Acme_Life_45-54_Test", "Acme_Life_55-64_Test", "Acme_Life_SEM"],
      "reason": "same keyword replicated across segments (intentional)"
    }
  ],
  "skipped_count": 1
}
```

## Rules
- `synthesis` is **exactly three strings** (`headline` / `diagnosis` / `action`). No `highlights`.
- The skill acts when a term is matched by **2+ distinct keyword TEXTS**. The `owner` is the
  most-relevant **already-existing** keyword (right product line → exact > phrase > broad →
  keyword-text closeness → spend). The fix is to add `term` as a negative in every `negatives[]`
  entry — **never create a keyword** (a `term_has_no_exact_owner: true` flag hands that idea to
  `intent-discovery`).
- The **same keyword** replicated across segment/test campaigns (1 distinct keyword) →
  `skipped_intentional`, never `actionable`. Overlap within one ad group never surfaces.
- `review_segment[]` = negatives that would land inside a test/segment campaign — surfaced for
  **human review**, never auto-applied (don't disturb an intentional test).
- `cost` is for **ranking and sizing only**, never a relevance or keep/cut verdict (those are the
  `relevance` and `performance` skills). `actionable` is sorted by `cost` desc.
- **Content only** — the human-facing layout (title "Search Term Routing — Negatives Plan", the
  ✅/⛔ rows, the date range) is a reporting concern, not baked into this JSON.
