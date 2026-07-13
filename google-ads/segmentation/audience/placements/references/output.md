# Output — Placement Relevance & Brand-Safety

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`output-contract.md`](../../../../../_framework/output-contract.md). Handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it (a
flagged placement table + the % off-topic headline). **No presentation here** — emojis / tables /
colors are a rendering concern, not the analysis output.

## Enums (the only allowed values)
- `verdict` (account-level applicability): `ok` · `review` · `n/a`  (`n/a` = no Display / Video / Demand-Gen)
- `placement_type`: `WEBSITE` · `YOUTUBE_VIDEO` · `MOBILE_APPLICATION`
- `relevance`: `on_topic` · `off_topic` · `unknown`
- `brand_safety`: `safe` · `sensitive` · `unsafe`
- `source` (how it was judged): `name` · `scraped`
- `confidence`: `high` · `medium` · `low`
- `state` (per placement): `keep` · `exclude` · `review`
- `action`: `exclude` · `keep` · `human_review`

## Schema

```jsonc
{
  "meta": {
    "account": "Acme Golf",
    "connector": "google-ads",
    "skill": "placement-relevance",
    "period": { "from": "2026-05-24", "to": "2026-06-22" },
    "verdict": "review",                      // ok | review | n/a
    "applicability": {
      "channel_types": ["DEMAND_GEN", "SEARCH"],   // from the fingerprint
      "content_campaigns": true,                    // Display/Video/DG present → placements exist
      "note": "n/a when Search/PMax only — they don't expose placements."
    },
    "business_context": "Golf putters and training aids (what 'on-topic' is measured against). Fictional example."
  },

  // Executive synthesis — insight-first; the % is the silver line.
  "synthesis": {
    "headline":  "One sentence: % of content spend off-topic / unsafe, and the single action (exclude N placements).",
    "diagnosis": "What kind of content the waste is on (e.g. true-crime / general entertainment) and what it says about the realized audience.",
    "action":    "The exclusion list to apply now, highest-spend first."
  },

  // One row per ABOVE-THRESHOLD placement (the long tail is rolled into rollup.other).
  "placements": [
    {
      "placement":   "aBcD3fGh1Jk",            // the bare url / app id / video id
      "display_name":"True Crime: The Cabin Case — Full Episode",
      "type":        "YOUTUBE_VIDEO",
      "target_url":  "youtube.com/video/aBcD3fGh1Jk",
      "spend":       0.06,
      "impressions": 1,
      "source":      "name",                   // name | scraped
      "relevance":   "off_topic",
      "brand_safety":"unsafe",
      "confidence":  "high",
      "reason":      "True-crime content — unrelated to golf and brand-unsafe.",
      "audience_signal": "general true-crime viewers, not golfers",
      "state":       "exclude",
      "action":      "exclude"
    },
    {
      "placement":   "Zx9YwV7uT6s",
      "display_name":"Fix Your Putting Stroke in 10 Minutes",
      "type":        "YOUTUBE_VIDEO",
      "target_url":  "youtube.com/video/Zx9YwV7uT6s",
      "spend":       0.08,
      "impressions": 3,
      "source":      "name",
      "relevance":   "on_topic",
      "brand_safety":"safe",
      "confidence":  "high",
      "reason":      "Golf content — squarely on-topic.",
      "audience_signal": "golf-content viewers",
      "state":       "keep",
      "action":      "keep"
    }
  ],

  // The roll-up reporting renders as the section summary.
  "rollup": {
    "off_topic_spend_pct": 0.41,               // off_topic ÷ classified content spend
    "unsafe_spend_pct":    0.18,
    "classified_spend":    8.29,               // spend of the above-threshold placements
    "other": { "placements": 0, "spend": 0.0 },// the rolled-up long tail below threshold
    "exclusion_candidates": [                  // off_topic / unsafe, ordered by spend (the action list)
      { "placement": "aBcD3fGh1Jk", "display_name": "True Crime: The Cabin Case…", "spend": 0.06, "reason": "true-crime / unsafe" }
    ],
    "byState": { "keep": 0, "exclude": 0, "review": 0 },
    "audience_read": "Realized audience skews general-entertainment, not only golfers."
  }
}
```

## Rules
- **`verdict: "n/a"` is a first-class result** — Search / PMax-only accounts get it with the reason,
  not an empty table. Gate on the fingerprint (`applicability`), never on an empty placement query.
- **Every placement carries `confidence`** — `name`-only and blocked-`scrape` judgments are `low`;
  never present a low-confidence guess as fact. The genuinely ambiguous → `action: "human_review"`.
- **`relevance` and `brand_safety` are independent axes** — both emitted; a placement can be on-topic
  yet brand-sensitive (or off-topic yet safe).
- **Spend is on every row** — it is what ranks the exclusion list (highest waste first) and powers the
  `off_topic_spend_pct`. The below-threshold tail is summed into `rollup.other`, never classified.
- **`source` is recorded** (`name` | `scraped`) — the reader must know whether the verdict read the
  page or just the title.
- **No presentation** — pure data; reporting renders the flagged table + the % headline.
