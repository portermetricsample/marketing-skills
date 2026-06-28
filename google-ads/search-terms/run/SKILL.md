---
name: search-terms-audit-run
description: Run the full Google Ads "Search Terms Audit" end to end and publish it as a hosted PorterMetrics dashboard. This is the ENTRY POINT / orchestrator for the search-terms cluster: discover the account, pull the COMPLETE search-terms report, run the analysis engines (classifier + performance + insights), adapt to the reporting page shape, and deploy it as a Porter report (live-fetch when the account's connection is healthy, or a baked snapshot otherwise). Use whenever the user wants "the search terms audit", "the search-terms dashboard", "publish/deploy the search terms report", or "run the audit on account X". The skill ends at a hosted Porter dashboard URL, not at a local HTML file.
---

# Search Terms Audit — Runner (discover → full pull → analyze → publish)

The single flow that turns an account into a hosted PorterMetrics search-terms dashboard. It composes
the cluster: [`classifier`](../classifier/) (tags) + [`performance`](../performance/) (money) +
[`insights`](../insights/) (the dollar card) → [`porter-reporting` search-terms-page](https://github.com/portermetricsample/porter-reporting/tree/main/components/google-ads/search-terms-page)
(the render) → a Porter report.

## TWO HARD RULES (do not regress — both were real failures)

### Rule 1 — pull the COMPLETE search-terms report; never a sample
The analysis MUST run on **every** search term in the period, not a top-N slice. A sampled pull makes
keyword cards look sparse ("this keyword only has 2 terms?") and undercounts every dollar figure.
- Query with a **high limit** (`limit: 10000`) sorted by cost desc. Pull the whole report.
- **Large results auto-persist to a file** (the tool returns a path when the payload exceeds the
  inline cap — PolicyMe's May report is ~2,290 rows / 288 KB). Do **not** try to read it inline:
  process that file with `jq`/python, hand the rows to the engines. This is the supported path for
  big accounts — never fall back to a small `limit` to keep the result inline.
- **The engines (labeling / performance / insights) always run on the FULL row set** → the tags,
  totals and the insights card reflect the entire account.

### Rule 2 — always show the analysis date range on the report
Every published report MUST display the period it covers. Read `date_range_resolved`
(`{date_from, date_to}`) from the `query_data` response and render it as a labeled subtitle in the
report header (e.g. *"Google Ads · May 1–31, 2026"*). A report with no visible period is incomplete —
the reader cannot tell what window the numbers describe.

## The dashboard term-coverage rule (live-fetch is unlimited; a baked snapshot is capped)
- **Live-fetch report** (the account's connection renders server-side): Porter pulls the FULL report
  at view time → it shows **every** term, no cap, and refreshes. Prefer this whenever the connection
  is healthy.
- **Baked snapshot** (connection reauth-blocked → the data is inlined into `report.js`): a single
  baked bundle holds only **~300 term-rows**. Beyond that, the inlined `var PAGE = {…}` line exceeds
  the tooling's per-read token cap (~25k tokens ≈ ~45 KB on one line), and the deployed file can no
  longer be **read back to be edited/updated** — a verified incident that left a report stuck. So when
  baking a large account:
  - The **analysis still covers everything** (Rule 1) — `insights`/totals are computed on the full row set.
  - The **cards** show the top keywords by spend, **whole keywords only** (never truncate a single
    keyword's terms mid-way — that recreates the "too few terms" bug), ≤~20 terms each, up to ~300 rows.
  - **Label the coverage honestly** in the subtitle: e.g. *"top 15 of 136 keywords by spend (≤20 terms
    each) · insights computed on all 2,290 terms"*. Never silently drop terms.
  - Keep the inlined `PAGE` line under the read cap; if a fuller list is needed, that's a CSV export or
    a live-fetch report, not a bigger baked bundle.
- A small account (e.g. Harper, 85 rows) shows **everything** either way — no cap applies.

## Operate (the end-to-end steps)
1. **Discover** the account: `list_accounts(component_name="google-ads", query="<name>")` → the full
   account dict (id, name, component_name, source_user_id, company_id).
2. **Pull the full report** ([`../performance/references/tools.md`](../performance/references/tools.md)
   field set + keyword text): `query_data(..., limit: 10000, sort cost desc)`. Capture
   `date_range_resolved`. If the result persisted to a file, read rows from there.
3. **Per-account context** (`context.json`): brand lexicon, competitor lexicon, the `model`
   (`lead_gen`/`ecommerce` — set `lead_gen` when an account *values its leads*, the verified Eastpointe
   trap), `brand_campaign_markers`. Derive from account signals; confirm the doubtful.
4. **Run the engines on the FULL rows:** `classifier` (tags) → `performance` (money, model-aware) →
   `insights` (the dollar lanes, measured-vs-estimated split).
5. **Adapt** to the page shape (porter-reporting `adapter.js`): term-centric → keyword cards. Apply the
   coverage rule above for the cards; keep `insights` from the full data; set `period` from step 2.
6. **Publish** as a Porter report ([`report-create-and-deploy`] flow): a live-fetch report when the
   account's Google Ads connection renders server-side, else a **baked snapshot** (data inlined, no
   chart) when the connection is reauth-blocked — the snapshot always renders. Either way the report
   header shows the date range (Rule 2) and the coverage label.
7. **Reply with the hosted URL** + the period + who it's shared with.

## Gotchas (verified)
- **Cost scale:** `google_ads_cost_micros` is returned already in currency — do **NOT** divide by 1e6.
- **Live-fetch vs baked:** a report renders server-side under the account's *stored* connection; that
  can be `reauth_required` even when interactive `query_data` works (different auth path). When the
  live chart 401s, deploy the **baked snapshot** instead (compute locally, inline the result).
- **AI-judgment is frozen at build time** in a deployed report (the brand/competitor lexicon); the data
  refreshes (live-fetch) but new competitor names won't auto-classify until the lexicon is updated.
