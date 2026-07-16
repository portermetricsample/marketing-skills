# Output — Wasted Spend

The skill emits ONE JSON object. Pure data — no emojis, markdown, tables, or colors; a renderer
(`formats/*`) turns it into the human document.

## Enums

- `scope`: `search_term` · `keyword` · `ad_group` · `campaign`
- `leak_type`: `zero_conversion` · `above_target_cpa` · `below_target_roas`
- `basis`: `cpa` · `roas`  (which efficiency branch judged the entity)
- `role` (in `by_scope`): `canonical` (counted once in the total) · `diagnostic_lens` (pinpoints, not added)
- `confidence`: `firm` (spend older than the conversion-lag window) · `provisional` (spend inside it — may still convert)

## Top-level schema

```json
{
  "_meta": {
    "skill": "wasted-spend",
    "version": "1.0.0",
    "account_id": "123-456-7890",
    "period_start": "2026-06-16",
    "period_end": "2026-07-15",
    "target_cpa": 120.0,
    "target_roas": null,
    "target_source": "user",
    "conversion_lag_days": 7,
    "spend_floor": 50.0,
    "status": "complete"
  },
  "synthesis": {
    "headline": "One string: total wasted dollars, its % of account spend, and the single loudest leak.",
    "diagnosis": "One string: the shape of the waste — concentrated in a few terms, spread across an ad group, or a dead campaign — and how much is firm vs provisional.",
    "action": "One string: the highest-dollar plug — where / what / why — handing the mechanics to the sibling skill (negatives, reallocation)."
  },
  "leaks": [
    {
      "scope": "search_term",
      "entity_id": null,
      "entity_name": "free crm",
      "parent": { "campaign_name": "Search — Prospecting", "ad_group_name": "CRM — Broad", "keyword_text": "crm", "keyword_match_type": "BROAD" },
      "cost": 840.0,
      "conversions": 0.0,
      "conversions_value": 0.0,
      "cpa": null,
      "roas": null,
      "target_cpa": 120.0,
      "leak_type": "zero_conversion",
      "basis": "cpa",
      "wasted_amount": 840.0,
      "confidence": "firm",
      "why": "Spent $840 across the window and returned 0 conversions — the whole amount is wasted; the broad keyword 'crm' is matching a free-seeker query.",
      "recommendation": {
        "where": "Search term 'free crm' (triggered by broad keyword 'crm' in ad group 'CRM — Broad')",
        "what": "Add 'free crm' as a negative — hand to negative-keywords to pick the match type and the level (ad group vs campaign vs list).",
        "why": "$840 spent for 0 conversions; blocking it recovers that spend directly."
      }
    },
    {
      "scope": "keyword",
      "entity_id": "555",
      "entity_name": "project software",
      "parent": { "campaign_name": "Search — Generic", "ad_group_name": "PM Software", "keyword_text": null, "keyword_match_type": "PHRASE" },
      "cost": 2300.0,
      "conversions": 3.0,
      "conversions_value": 0.0,
      "cpa": 766.7,
      "roas": null,
      "target_cpa": 120.0,
      "leak_type": "above_target_cpa",
      "basis": "cpa",
      "wasted_amount": 1940.0,
      "confidence": "firm",
      "why": "Converts, but at a $767 CPA against a $120 target (6.4x) — the $1,940 above target is waste, not the full spend.",
      "recommendation": {
        "where": "Keyword 'project software' (phrase) in ad group 'PM Software'",
        "what": "Cut the bid hard or pause the keyword; it can't reach target at this price. Do NOT redeploy the freed budget here — that's spend-allocation.",
        "why": "$2,300 for 3 conversions at a 6.4x-over-target CPA; ~$1,940 is overspend beyond what those conversions should cost."
      }
    },
    {
      "scope": "campaign",
      "entity_id": "999",
      "entity_name": "Display — Prospecting",
      "parent": { "campaign_name": null, "ad_group_name": null, "keyword_text": null, "keyword_match_type": null },
      "cost": 3100.0,
      "conversions": 1.0,
      "conversions_value": 0.0,
      "cpa": 3100.0,
      "roas": null,
      "target_cpa": 120.0,
      "leak_type": "above_target_cpa",
      "basis": "cpa",
      "wasted_amount": 2980.0,
      "confidence": "firm",
      "why": "Counted at campaign grain because Display has no keyword breakdown; $3,100 for 1 conversion is a near-total leak at the only measurable level.",
      "recommendation": {
        "where": "Campaign 'Display — Prospecting' (whole campaign)",
        "what": "Review or pause the campaign; the leak isn't a single keyword, it's the placement/audience setup.",
        "why": "$3,100 for 1 conversion ($3,100 CPA vs $120 target) — 96% of the spend is above target."
      }
    }
  ],
  "rollup": {
    "account_cost": 63000.0,
    "account_conversions": 210.0,
    "account_cpa": 300.0,
    "total_wasted": 11400.0,
    "wasted_pct_of_spend": 0.18,
    "provisional_wasted": 900.0,
    "total_wasted_components": {
      "search_shopping_keyword_grain": 6300.0,
      "non_keyword_channel_campaign_grain": 5100.0
    },
    "by_scope": [
      { "scope": "keyword",     "role": "canonical",       "wasted": 6300.0, "leak_count": 22, "note": "Search/Shopping spend, counted once in the total." },
      { "scope": "campaign",    "role": "canonical",       "wasted": 5100.0, "leak_count": 3,  "note": "PMax/Display/Video/DemandGen only — the non-keyword remainder of the total." },
      { "scope": "search_term", "role": "diagnostic_lens", "wasted": 5200.0, "leak_count": 41, "note": "Where the keyword waste concentrates — NOT added to the total." },
      { "scope": "ad_group",    "role": "diagnostic_lens", "wasted": 4800.0, "leak_count": 9,  "note": "Structural view of the keyword waste — NOT added to the total." }
    ],
    "top_leaks": [
      { "scope": "campaign",    "entity_name": "Display — Prospecting", "wasted_amount": 2980.0 },
      { "scope": "keyword",     "entity_name": "project software",      "wasted_amount": 1940.0 },
      { "scope": "search_term", "entity_name": "free crm",              "wasted_amount": 840.0 }
    ]
  }
}
```

## Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `scope` | enum | Grain of this leak — `search_term` · `keyword` · `ad_group` · `campaign` |
| `entity_name` | string | The search term text, keyword text, ad group name, or campaign name |
| `parent` | object | Context for the recommendation — campaign / ad group / triggering keyword names (nulls where n/a) |
| `cost` | number | `metrics.cost_micros / 1e6`, account currency |
| `conversions` | number | `metrics.conversions` (a float; `< near_zero` ≈ 0.5 counts as zero) |
| `conversions_value` | number | `metrics.conversions_value / 1e6` (0 on non-value accounts) |
| `cpa` | number\|null | `cost / conversions`; `null` when conversions ≈ 0 |
| `roas` | number\|null | `conversions_value / cost`; only on the value branch |
| `target_cpa` | number | The benchmark used — user target or account baseline |
| `leak_type` | enum | `zero_conversion` · `above_target_cpa` · `below_target_roas` |
| `basis` | enum | `cpa` (lead-gen) · `roas` (value-tracking) |
| `wasted_amount` | number | `clamp(cost − conversions × target_cpa, 0, cost)` — the dollars wasted |
| `confidence` | enum | `firm` (spend older than lag) · `provisional` (inside lag — may still convert) |
| `why` | string | Plain-language reason this is a leak and how much of it is waste |
| `recommendation` | object | `{where, what, why}` — the executable move, with the sibling-skill hand-off |
| `total_wasted` | number | **Firm** wasted dollars, counted once (keyword grain for Search/Shopping + campaign grain for the rest) |
| `wasted_pct_of_spend` | number | `total_wasted / account_cost` (0–1) |
| `total_wasted_components` | object | The two count-once buckets that sum to `total_wasted` |
| `by_scope[].role` | enum | `canonical` (in the total) · `diagnostic_lens` (pinpoints only) |

## Error / edge states

- **No conversion tracking at all** (`account_conversions ≈ 0`): can't compute a baseline CPA or judge
  waste by return — set `status: "blocked"`, `_meta.reason: "no conversions in window — fix tracking
  (conversion-tracking skill) before judging waste"`, emit no leaks. Don't call an entire account 100%
  wasted because nothing is tracked.
- **No target and thin volume**: baseline CPA off very few conversions is shaky — annotate leaks with a
  `low_confidence_baseline` note; keep them `provisional`.
- **Value-tracking account**: `basis: "roas"`, `leak_type: "below_target_roas"`, and the value-branch
  wasted formula; `cpa`/`target_cpa` may still be reported for reference.
- **All waste provisional** (short window inside the lag): `total_wasted` may be 0 with a large
  `provisional_wasted` — say so in `synthesis`, and recommend re-running after the lag clears rather
  than acting on unsettled data.
- **Performance Max / Display / Video**: only campaign-grain leaks are possible (no keyword/term data);
  every such leak carries `scope: "campaign"` and a `why` that names the missing breakdown.
