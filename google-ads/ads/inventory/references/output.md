# Output — Creative Inventory

What this skill **emits**: a JSON object — a specialization of the global
[`output-contract.md`](../../../../_framework/output-contract.md). Handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which renders it.
**No presentation here** — emojis/tables/colors are a rendering concern.

This skill is the **producer** of the **`creative_graph`** — the cached, per-account creative
structure that every other creative skill's `process.py` consumes (analogous to how
`structure-map` produces `account_profile`).

## Enums (the only allowed values)
- `field`: `headline` · `description`
- `ad_type`: `RSA` · `ETA` · `TEXT` · `OTHER` (OTHER = mapped-elsewhere, see `coverage`)
- `pin`: `1` · `2` · `3` · `none`
- `perf_label`: `LOW` · `GOOD` · `BEST` · `LEARNING` · `PENDING` · `NOT_APPLICABLE`
- `approval`: `APPROVED` · `APPROVED_LIMITED` · `DISAPPROVED` · `UNDER_REVIEW` · `UNKNOWN`
- `served`: `true` · `false`  (true = impressions > 0 in the window)
- `ad_strength`: `POOR` · `AVERAGE` · `GOOD` · `EXCELLENT` · `PENDING` · `UNKNOWN`
- `segment`: `brand` · `competitor_conquest` · `generic` · `unknown`
- `segment_source`: `profile` · `inferred` · `none`

## Schema
```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "account_id": "<customer_id>-<login_customer_id>",
    "connector": "google-ads",
    "skill": "google-ads-creative-inventory",
    "period": { "preset": "last_30_days" },
    "structure_source": "ad.responsive_search_ad arrays",
    "metrics_source": "ad_group_ad_asset_view (joined by text)"
  },

  // Executive synthesis — exactly three strings (see framework.md).
  "synthesis": {
    "headline":  "How many ads / unique headlines / descriptions, and coverage.",
    "diagnosis": "How concentrated the copy is + how much is reused vs unique.",
    "action":    "The most useful next lens (performance / copy-hygiene) + any coverage gap."
  },

  "creative_graph": {
    // ── TREE: the relationships (ad → its variations) ────────────────────────
    "tree": [
      {
        "ad_id": "111111111111",
        "ad_name": "",                       // ad's internal name (often blank for RSA)
        "ad_type": "RSA",
        "campaign": "Acme_Search_TermLife_Brand",
        "ad_group": "Term Life",
        "segment": "brand",                  // brand|competitor_conquest|generic|unknown
        "segment_source": "profile",         // profile|inferred|none
        "ad_strength": "EXCELLENT",
        "final_url": "https://www.acme-insurance.example/term-life",
        "final_url_suffix": null,            // null = no UTM suffix on the ad
        "impressions": 1439,
        "headlines": [
          { "text": "Acme Insurance", "pin": "1", "char_len": 14, "limit": 30,
            "perf_label": "PENDING", "approval": "APPROVED", "dki": false,
            "served": true, "impressions": 731, "clicks": 58, "conv": 1, "cost": 130 }
          // … the ad's real ≤15 headlines (from responsive_search_ad), metrics joined by text
        ],
        "descriptions": [
          { "text": "Affordable term life insurance — get a free quote in 2 minutes today.",
            "pin": "none", "char_len": 69, "limit": 90, "perf_label": "PENDING", "approval": "APPROVED",
            "dki": false, "served": true, "impressions": 715, "clicks": 53, "conv": 0, "cost": 105 }
          // … up to 4
        ]
      }
    ],

    // ── ROLLUP: the unit of copy (unique text aggregated across ads) ─────────
    "rollup": [
      {
        "field": "headline",
        "text": "Acme Insurance",
        "char_len": 14, "limit": 30, "dki": false,
        "n_ads": 5, "n_ad_groups": 5,
        "segments": ["brand", "generic"],          // segments it appears in
        "pinned_somewhere": true,
        "perf_labels": ["PENDING"],
        "approvals": ["APPROVED"],                 // surfaces any DISAPPROVED reused copy
        "served_any": true,
        "impressions": 10176, "clicks": 871, "conv": 50, "cost": 2123
      }
      // … one row per unique (field, text)
    ],

    // ── Extensions linked to campaigns (structure only; presence audit is account-audit/ad-assets)
    "extensions": {
      "sitelinks":  ["Get a Quote", "Coverage Options", "Contact Us"],
      "callouts":   ["No Medical Exam", "Licensed Agents"],
      "snippets":   [{ "header": "Coverage", "values": ["Term Life", "Whole Life"] }]
    },

    // ── Coverage: what was mapped and what wasn't (honesty about scope) ──────
    "coverage": {
      "ads_mapped": 6,
      "unique_headlines": 148,
      "unique_descriptions": 21,
      "channel_types_seen": ["SEARCH"],
      "not_mapped": [
        // { "type": "PERFORMANCE_MAX", "campaigns": 3, "reason": "creative lives in asset groups — see campaign-types.md" }
      ]
    }
  }
}
```

## How the schema maps to `process.py`
The deterministic core ([`../scripts/process.py`](../scripts/process.py)) returns
`creative_graph` (tree, rollup, extensions, coverage) fully built. The LLM only writes the three
`synthesis` strings and, when `segment_source` came back `none`, may upgrade a few obvious
segments to `inferred` (never overwrite a `profile` segment).

## Rules
- `synthesis` is **exactly three strings**. No `highlights`.
- Every asset carries `perf_label` from the enum (never free text); `pin` from the enum.
- `segment_source: "profile"` only when an `account_profile` was supplied; otherwise `inferred`
  (LLM guess) or `none`.
- **Structure from the ad arrays** (`structure_source`), metrics joined from the asset view —
  never list assets from the asset view (it over-reports). Each asset carries `served`;
  zero-impression assets are present and tagged `served:false`, not dropped (drop-zero is downstream).
- **Coverage is mandatory** — non-Search creative appears in `not_mapped`, never silently dropped.
- **Content only** — no HTML/colors/layout; that's reporting + design-system.
- This skill is the **producer** of `creative_graph`; emit it complete and self-consistent so
  `performance` / `copy-hygiene` / `rewrite` can load it directly.
