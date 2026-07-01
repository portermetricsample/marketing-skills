---
name: google-ads-account-structure-driver-tree
description: A Google Ads account drawn as an interactive driver tree — Account → campaign type → campaign → ad group, with node colour = cost-per-conversion vs the account average and chips = vs the previous period. Includes the account-structure map and the performance-drivers (LMDI) use case. Use when visualizing account structure or explaining what drove a change in performance.
---

# Google Ads — Account Structure / Performance Drivers (driver tree)

A Google Ads account as a driver tree. The generic engine lives in [`driver-tree.js`](driver-tree.js); the Google Ads use cases live in [`google-ads/`](google-ads/).

- **Files & usage:** [`google-ads/README.md`](google-ads/README.md) (account structure) · [`google-ads/performance-drivers.README.md`](google-ads/performance-drivers.README.md) (LMDI drivers)
- **Live previews:** [`google-ads/demo.html`](google-ads/demo.html) · [`google-ads/performance-drivers-demo.html`](google-ads/performance-drivers-demo.html)
- **Sample data:** `google-ads/example.data.js` (fictional Acme Insurance)

Appearance is owned by the public **porter-design** repo (`portermetricsample/porter-design`); the component ships no CSS. Data comes from the Porter Metrics `google-ads` connector.
