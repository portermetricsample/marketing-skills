---
name: google-ads-account-audit
description: Runs a full best-practice health-check of a Google Ads account on the Porter Metrics MCP and produces a client-ready audit — a self-contained HTML document plus a hosted Porter report. It pulls live data (performance, settings, bid targets, search terms, demographics, device/geo, assets), scrapes the top landing pages with Porter's own scrape tool, separates brand from non-brand, ranks every finding by money at stake, and writes each as a plain Where·What·Why fix. Use this whenever someone asks to "audit my Google Ads account", "review this ad account", "where is my Google Ads spend leaking", "is this account set up right", or wants a Google Ads account health-check / QA — even if they don't say "audit". One account at a time. Vertical-agnostic (lead-gen, e-commerce, local, SaaS).
---

# Google Ads — Account Audit (the assembled, runnable skill)

This is the **one skill that runs the whole audit end to end**. It bundles the three pieces a client
needs to replicate the audit on their own account:

1. **The instructions** — the per-check analysis recipes already in this repo (`account-audit/*` +
   the reused checks). This skill is their **conductor**; it does not re-derive their logic.
2. **The design** — the locked HTML/CSS in [`references/design/`](references/design/), rendered via
   [`references/render-rules.md`](references/render-rules.md). The look is fixed; only the content changes.
3. **The web scraping** — Porter's native `tool:porter-tools:scrape` (no API key; the client just
   connects the Porter MCP).

> **Boundary note.** The atomic checks under `account-audit/*` stay *pure analysis* (they emit JSON and
> never render). THIS skill is deliberately the **assembled, client-facing** one: it runs the checks
> AND renders the deliverable. That's the whole point — one thing a client can run.

## Goal
- **Who:** a marketer / agency / account owner with a Google Ads account connected to Porter Metrics.
- **When:** inheriting, reviewing, or QA-ing an account; a monthly/quarterly health-check.
- **Decision it drives:** the ranked list of money-moving fixes (what to turn off, re-target, re-fund,
  re-track), each executable by a non-technical owner.
- **The differentiator:** it judges against **external best practice** and **money at stake**,
  separates brand from non-brand before any efficiency claim, and never fabricates — gaps are flagged
  "verify in-account".

## Scope
- ✅ **One Google Ads account, best-practice health-check**, rendered to HTML + a hosted Porter report.
- ❌ **It does not change the account** (no bid/budget writes) — it recommends; the owner acts.
- ❌ **It does not validate the account against its OWN naming convention** — that's
  [`account-structure/structure-audit`](../account-structure/structure-audit/). This skill judges
  against external best practice.
- ❌ **No competitor/keyword expansion** — different jobs.

## Components (read as needed)
- **Tool plan / pipeline:** [`references/tools.md`](references/tools.md) — every MCP call, in order.
- **Orchestration brain:** [`references/framework.md`](references/framework.md) — which checks, in what
  order, brand handling, severity ranking, the synthesis arc, the verify gate.
- **Output object:** [`references/output.md`](references/output.md) — the assembled canonical JSON.
- **Design (LOCKED):** [`references/render-rules.md`](references/render-rules.md) + `references/design/`.
- **Per-check IP:** each `account-audit/<check>/references/{tools,framework,output}.md` (don't copy them).

## Operate — the pipeline

> Run these in order. Each per-check step uses **that check's own `references/tools.md`** for the exact
> fields, and **its `framework.md`** for the verdict logic. Portal mechanics (fetch vs execute, tool-ids,
> the `campaign.list` connector action for true targets, the `cost_micros`-in-dollars + fan-out gotchas):
> [`_framework/porter-mcp-calls.md`](../../_framework/porter-mcp-calls.md).

1. **Resolve the account.** `fetch tool:porter-accounts:list_accounts {component_name:"google-ads"}`
   (+ `query` if named). Pass the **full account object** into every `query_data` — never a bare id,
   never an invented id. If several match, ask which.
2. **Fingerprint the campaign mix** (one `query_data`: campaign · channel type · strategy · cost · conv ·
   value). This decides **which sections apply**: Search vs PMax/DG/Shopping, is there a brand campaign,
   do campaigns carry conversion value. Sections without data are dropped later (see Edge cases).
3. **Run the checks** (pull → judge with each check's framework). Cover what applies:
   conversion-tracking · bid-strategy · value-based-bidding · spend-allocation · campaign-settings ·
   quality-score (`keyword-ad-landing/metrics`) · search-terms & negatives (`search-terms/relevance` +
   `term-routing`, n-gram the tail with `scripts/ngram.py`) · audience-demographics · device & dayparting
   (`segmentation/time`) · geography (`segmentation/audience/geography`) · ad-assets · landing-cro
   (scrape the top final URLs). Pull true bid targets/budgets via the `campaign.list` connector action,
   never from `query_data` (fan-out corrupted).
4. **Apply the rubrics → findings.** Per check: verdict + per-entity findings + `Where/What/Why`.
   **Separate brand from non-brand; baseline on non-brand; treat brand as defense**
   ([`brand-vs-nonbrand`](../../_framework/brand-vs-nonbrand.md)). Rank everything by money at stake.
5. **Synthesize** the canonical object ([`references/output.md`](references/output.md)) + the executive
   arc: **money headline → where it leaks → culprit + opportunity → do-first** (per
   [`_framework/writing.md`](../../_framework/writing.md)).
6. **Render the HTML** by filling [`references/design/skeleton.html`](references/design/skeleton.html)
   per [`references/render-rules.md`](references/render-rules.md) (paste `audit.css` verbatim; fill slots;
   sections severity-ordered; drop sections with no data). Write the standalone file to an **out-of-repo**
   path (see Data safety).
7. **Adversarially verify before deploy.** Recompute the headline numbers from the raw pulls; check every
   metric's window is labelled; confirm brand is separated; confirm every data gap is flagged
   "verify in-account"; **zero fabricated values**. Fix anything that doesn't reconcile.
8. **Deploy as a hosted Porter report.** `scripts/to_porter_bundle.py <file.html>` → the reports-v2
   3-file bundle → `get_report_template('blank')` → `create_report` (static: `config.charts:{}`, CSS
   scoped `#audit`, `/* porter:no-compare */`, `visibility:"PRIVATE"`). Reply with **both the local file
   path and the report URL**; sharing stays the user's choice.

## Data safety (hard rule — this repo is public)
- **Never write account data into the repo.** All run outputs (the HTML, raw pulls, scrapes, CSVs) go to
  an **out-of-repo** working dir, e.g. `~/<advertiser>-gads-audit/`. The `.gitignore` also blocks them.
- The **only** committed example is the genericized synthetic one in
  [`_assembled-template/audit-template.html`](_assembled-template/audit-template.html) ("Acme Insurance").
- Hosted Porter reports default to **PRIVATE**. Don't share without the user asking.

## Edge cases (degrade gracefully — never fabricate)
- **No Demand Gen / PMax-only / Shopping / Display** → run only the sections those types support; for
  search-only checks on a PMax-only account, say so. **Drop the section's design block** if it has no data.
- **No conversion value** (pure lead-gen) → value-based-bidding is N/A (the *correct* state, not a fail);
  judge spend on CPA, not ROAS; flag the value gap in conversion-tracking.
- **Brand-only / very few campaigns / thin volume** → flag thin volume, don't recommend off noise.
- **Scrape blocked / empty** → retry `proxy:"stealth"`; still empty → landing verdict **"needs review"**,
  never guess, never reach for an external scraper.
- **Connector target fields missing** → note "no target set", don't invent one.
- In every case: emit a one-line "n/a — <reason>" or "verify in-account", and **omit the empty block**.

## Example (illustrative)
A Search-dominant life-insurance account: headline "spend ▲12%, blended ROAS 2.28→1.88 — but non-brand
ROAS actually rose 1.22→1.30; the drop is a brand modelled-value swing + untracked Health & Dental
revenue." Top fixes, ranked by $: add a value to the H&D conversion (101 conv/mo at $0); fund the capped
2.87× campaign; shift bids desktop-ward (2.45× vs 1.53×). Clean: Presence targeting, Search Partners +
Display off, offline import working.
