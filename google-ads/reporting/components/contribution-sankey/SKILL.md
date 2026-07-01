---
name: google-ads-account-contribution-sankey
description: A Google Ads account drawn as a contribution sankey — how spend and conversions flow and contribute across the account (campaign type → campaign → outcome). Use when showing where the budget goes and which paths contribute most to results.
---

# Google Ads — Account Contribution (sankey)

A Google Ads account as a contribution sankey. The generic engine lives in [`contribution-sankey.js`](contribution-sankey.js); the Google Ads use case lives in [`google-ads/`](google-ads/).

- **Files & usage:** [`google-ads/README.md`](google-ads/README.md)
- **Live preview:** [`google-ads/demo.html`](google-ads/demo.html)
- **Sample data:** `google-ads/example.data.js` (fictional Acme Insurance)

Appearance is owned by the public **porter-design** repo (`portermetricsample/porter-design`); the component ships no CSS. Data comes from the Porter Metrics `google-ads` connector.
