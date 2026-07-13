# Output — Creative Health

Emits a JSON object (content only — no emojis/tables/colors; a renderer in `porter-reporting` turns
it into the human view). Covers one account or many (portfolio roll-up).

## Enums
- `approval`: `DISAPPROVED` · `APPROVED_LIMITED`  (the only two flagged)
- `urgency`: `urgent` (spending) · `latent` (enabled, not spending) · `unknown` (no cost pull)
- `kind`: `broken_url` · `disapproved`

## Schema
```jsonc
{
  "meta": { "connector": "google-ads", "skill": "google-ads-creative-health", "generated_at": "2026-06-23" },

  "synthesis": {
    "headline":  "Accounts scanned, how many have issues, the single biggest one.",
    "diagnosis": "N broken URLs across M accounts · K disapproved ads.",
    "action":    "The first fix (broken + spending), then disapprovals."
  },

  "accounts": [
    {
      "account": "Acme Insurance",
      "account_id": "1234567890-1234567890",
      "ads_scanned": 240,
      "issue_count": 3,
      "broken_urls": [
        { "url": "https://acme.example/dead", "code": 404, "urgency": "urgent",
          "ad_count": 2, "campaigns": ["Acme_Search_Brand"] }
      ],
      "disapproved_ads": [
        { "campaign": "Acme_Conquest", "ad_group": "Competitor", "ad_id": "555",
          "approval": "DISAPPROVED", "url": "https://acme.example/x" }
      ]
    }
  ],

  "portfolio": {
    "accounts_scanned": 12,
    "accounts_with_issues": 4,
    "total_broken_urls": 6,
    "total_disapproved_ads": 9,
    "worst": [ { "account": "Acme Insurance", "account_id": "…", "issue_count": 3 } ]
  }
}
```

## Rules
- `synthesis` is exactly three strings.
- Only `DISAPPROVED` / `APPROVED_LIMITED` appear in `disapproved_ads`; `UNKNOWN`/`APPROVED` never do.
- Broken URLs are **deduped by URL** within an account (list the ads/campaigns that share it).
- `portfolio.worst` is ordered by `issue_count` (then broken-before-disapproved on ties).
- Content only — appearance is `porter-design` / `porter-reporting`.
