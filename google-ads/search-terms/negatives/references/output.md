# Output — Negative Keywords

A JSON object (canonical truth). Produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py). Consumed by the recommending skills (for the
redundancy wiring) and by [`porter-reporting`](https://github.com/portermetricsample/porter-reporting)
(for a negatives audit view). **No presentation here.**

## Enums
- `scope`: `campaign` · `ad_group` · `shared`
- `match_type`: `EXACT` · `PHRASE` · `BROAD`

## Schema

```jsonc
{
  "summary": {
    "total_negatives": 13,
    "by_scope": { "campaign": 12, "ad_group": 1 },
    "by_match_type": { "BROAD": 9, "PHRASE": 3, "EXACT": 1 },
    "shared_lists": [],
    "campaigns_with_negatives": ["EPCC_Search_Form_Submits"]
  },

  // the full normalized inventory — one entry per existing negative
  "inventory": [
    { "text": "free", "match_type": "BROAD", "scope": "campaign", "campaign": "EPCC_Search_Form_Submits", "ad_group": null, "shared_set": null, "status": "ENABLED" },
    { "text": "east point country club", "match_type": "EXACT", "scope": "ad_group", "campaign": "EPCC_Search_Form_Submits", "ad_group": "Club Memberships", "shared_set": null, "status": "ENABLED" }
  ],

  // present only when candidates.json was passed — the redundancy wiring
  "candidates": [
    { "text": "free", "match_type": "BROAD", "campaign": "EPCC_Search_Form_Submits",
      "already_covered": true,
      "covered_by": { "text": "free", "match_type": "BROAD", "scope": "campaign", "campaign": "EPCC_Search_Form_Submits" } },
    { "text": "membership cost", "match_type": "PHRASE", "campaign": "EPCC_Search_Form_Submits",
      "already_covered": false, "covered_by": null }
  ],
  "candidates_summary": { "checked": 6, "already_covered": 5, "net_new": 1 },

  // present only when negatives_raw.positive_keywords was provided — the CONFLICT audit
  "conflicts": [
    { "keyword": "public golf membership", "keyword_match": "PHRASE",
      "campaign": "EPCC_Search_Memberships_Snowbird", "ad_group": "Memberships",
      "blocked_by": { "text": "public", "match_type": "BROAD", "scope": "campaign", "campaign": "EPCC_Search_Memberships_Snowbird" } }
  ],
  "conflicts_summary": { "active_keywords_checked": 142, "blocked": 1 }
}
```

## Rules
- `inventory` is the live exclusion list (current config) — no metrics, no date range.
- **`already_covered: true` means SKIP** — the recommending skill must not surface it as `add_negative`;
  mark it "already done." Only `already_covered: false` (net-new) becomes an `add_negative`.
- `covered_by` names the existing negative that blocks the candidate (so the reader can verify the
  match-type logic).
- **Content only** — the negatives table / audit layout is a reporting concern.
