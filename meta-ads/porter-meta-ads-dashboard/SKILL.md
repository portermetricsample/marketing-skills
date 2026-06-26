---
name: porter-meta-ads-dashboard
description: Recreate the golden multi-page Meta (Facebook/Instagram) Ads dashboard via the Porter Metrics MCP — Overview, Campaigns (SUMAS), Creatives (with Unicorn/Winning/Losing verdicts + retention + tooltips), Budget pacing, Funnel, Audience placements, Conversion windows. Use when a user with the Porter MCP and a connected Meta Ads account wants a complete, hosted Meta Ads reporting dashboard.
---

# porter-meta-ads-dashboard

Recreates a complete, hosted **Meta Ads dashboard** on Porter's infrastructure (a shareable
`*.porter.build` URL) from a proven frontend bundle + chart config. It is account-agnostic:
point it at any connected Meta Ads account.

**Prerequisites:** the Porter Metrics MCP connected, and a Meta Ads account already connected in
Porter (Looker-Studio/Sheets/MCP connector). No coding needed from the user.

## What it builds (7 tabs, in this order)
1. **Overview** — KPI scorecards + a metric-switchable time-series (daily / hourly / weekly / day-of-week / monthly).
2. **Campaigns** — a **SUMAS** pivot table: Budget → Visibility → Engagement (Clicks | Landing) → Conversion, primary metric big with effectiveness/efficiency + Δ% underneath, objective as a tag, status dot, links to Meta Ads Manager.
3. **Creatives** — creative cards with hi-res image, Format + Days-active, the funnel KPIs (Spend, Thumbstop, Hold, CTR, ROAS) with vs-average badges, a per-creative trend curve with a **creative verdict tag** (🦄 Unicorn / Winning / Steady / Fatiguing / Losing / Testing), a video-retention curve, and **hover tooltips with exact values**. Trend metric is switchable.
4. **Budget pacing** — spend vs Meta budget per campaign.
5. **Funnel** — rounded-silhouette conversion funnel (Impressions → Link clicks → Landing → Purchases) with step drop-off.
6. **Audience placements** — spend by age / gender / country / platform.
7. **Conversion windows** — conversions by attribution window.

Design: Meta-blue palette, Iconify icons, real brand logos, card layout. Aesthetic ≈ Rosen Charts in vanilla D3.

## Assets (the proven bundle — use these, don't rebuild from scratch)
- `assets/config.json` — the report `config` (18 charts + controls).
- `assets/frontend.html`, `assets/frontend.css`, `assets/frontend.js` — the deployed bundle (~98KB).
- `reference/engineering-notes.md` — **read this before editing**; it lists every gotcha (worker ~36s ad-grain penalty, 422 edit size limit, YYYYMMDD dates, string metrics, image cache, the SDK date-range bug, hold-rate definition, the verdict classifier).

## Build steps
1. **Resolve the account.** `list_known_accounts(component_name="facebook-ads")` → pick the user's account. Capture `{id, name, company_id, source_user_id}` and the numeric act id (strip the `act_` prefix).
2. **Patch `config.json`.** Set EVERY chart's `accounts: [{id, name, company_id, component_name:"facebook-ads", source_user_id}]` to the resolved account. Set `config.name` to the user's report name.
3. **Fill the placeholders.** The bundled assets are a scrubbed TEMPLATE — no client data. Replace these tokens across all files:

   | Placeholder | Where | Replace with |
   |---|---|---|
   | `act___META_ACCT_NUM__` | config.json (×18) | `act_<numeric id>` |
   | `__META_ACCT_NUM__` | frontend.js (×6, Meta deep-links) | the numeric act id (no `act_`) |
   | `__ACCOUNT_NAME__` | config.json | the account name |
   | `__COMPANY_ID__` | config.json | `company_id` |
   | `__SOURCE_USER_ID__` | config.json | `source_user_id` |
   | `__BRAND__` | frontend.html + frontend.js | the brand/report name |
   | `__ACCT__` | frontend.js (filter option values) | see filter note below |

   - **Filter dropdown options** are hardcoded in `frontend.js` (the SDK needs explicit `options[]` — it doesn't auto-populate). The template's option values contain `__ACCT___…` placeholders that won't match real data. Either (a) leave them and tell the user the filters are inert until populated, or (b) regenerate them: `query_data` distinct `campaign_name` / `adset_name` / `ad_name` for the account and rebuild each `options:[{label, value}]` array with the real names.
   - `CRE_META` is already `{}` (per-ad Meta/Instagram deep-links). `creLinks()` degrades gracefully to no links. Optional: regenerate from per-ad `ad_id` + `*_permalink_url` (heavy ad-grain query — see notes).
   - `maskName` is already a passthrough (shows real names). Restore client-anonymization only if the user wants it.
   - Forced default range is `this_year` (in the `dateRangePicker` IIFE). Change `s.value='this_year'` to wherever the account's data actually lives — a recent-only window can be empty for seasonal/sample accounts.
4. **Patch `frontend.html`** — set the `<h1 id="report-title">` (currently "Meta Ads Dashboard") and the subtitle (`__BRAND__ — Meta Ads`).
5. **Create the report.** Call `create_report` with `name`, the patched `config`, and `frontend_html` / `frontend_css` / `frontend_js`. It returns the hosted URL.
6. **Verify** — open the URL, click through the 7 tabs. The Creatives tab takes ~36s cold (worker ad-grain penalty — expected). If a tab is empty, confirm the account has data in the selected range via `query_data`.

## Iterating after deploy
Use `edit_report` (NOT `update_report`) for incremental changes — surgical string replacements + `config_patch`. **Keep each edit `new_string` under ~2KB** (the 422 limit) and **bump the `?v=crNN` version** on the asset tags after a JS/CSS change. See `reference/engineering-notes.md`.

---

## Copy-paste kickoff prompt (for any Claude with the Porter MCP)
> Build me a complete Meta Ads dashboard with the Porter Metrics MCP, following the
> `porter-meta-ads-dashboard` skill. Steps: (1) run `list_known_accounts` for `facebook-ads`
> and ask me which account if there's more than one; (2) load the skill's `assets/config.json`
> and `assets/frontend.{html,css,js}`; (3) bind my account into every chart's `accounts` and into
> the deep-links (replace the sample account id `829199002864995`), set `CRE_META={}`, make
> `maskName` a passthrough, and set the report title; (4) `create_report` and give me the URL;
> (5) open it and verify the 7 tabs (Overview, Campaigns, Creatives, Budget pacing, Funnel,
> Audience placements, Conversion windows). The Creatives tab is slow on first load (~36s) by
> design — Porter's worker penalty on ad-grain queries; don't treat that as an error.
