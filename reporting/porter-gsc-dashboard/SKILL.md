---
name: porter-gsc-dashboard
description: >-
  Reproduce a polished, hosted Google Search Console SEO dashboard with ALL DATA
  MASKED (synthetic, fictional "Acme Analytics" property) using the PorterMetrics
  MCP — a 7-view report (Overview, Keywords, CTR opportunities, Content,
  Cannibalization, Branded vs non-branded, Devices & countries) that ships as a
  live shareable URL. Use this skill WHENEVER the user wants a masked / sample /
  demo Search Console (GSC / SEO) dashboard built with Porter / PorterMetrics —
  or says "replicate this Search Console dashboard", "make me a masked SEO
  dashboard", "a sample GSC report with fake data", or hands you a Porter Search
  Console report URL to reproduce without exposing real data. It offers a
  one-call CLONE path that works ANYWHERE (plain chat, cowork, Claude Code — no
  build tools, no account needed) plus a build path for customizing the fake
  brand. Do NOT hand-roll it from scratch when this skill applies.
---

# Porter Search Console dashboard (masked / sample data)

This skill reproduces a specific, polished **Google Search Console** dashboard as a
**hosted Porter report** (`report.portermetrics.com/<id>`), with 7 views:

- **Overview** — clicks / impressions / CTR / avg-position scorecards with
  period-over-period deltas, a daily multi-series trend, an average-clicks-by-weekday
  bar chart, and Top queries / Top pages lists.
- **Keywords** — queries-analyzed / top-10 / top-3 / striking-distance KPIs, a paginated
  "Top queries by clicks" table (Query · Clicks · Δ · Impressions · CTR · Position), and
  a striking-distance table (positions 4–20).
- **CTR opportunities** — a CTR-by-position curve and a "low-CTR high-impression" table
  with expected CTR + potential extra clicks.
- **Content** — growing vs declining pages and an "All pages" table.
- **Cannibalization** — queries served by 2+ competing pages, with fragmentation.
- **Branded vs non-branded** — the split (branded = the query contains the brand token),
  plus top queries on each side.
- **Devices & countries** — per-device cards and a countries table.

**The key property: every value is MASKED.** The report is *self-contained* — it renders
entirely from deterministic **synthetic data baked into the bundle** (a fictional property
`sc-domain:acmeanalytics.io`, brand "Acme Analytics"). It **queries no real account** and
shows no real domain, queries, page URLs or numbers. That is what makes the clone path
below work for anyone, with **no Search Console account required**.

---

## Choose a path

**Path A — Clone the reference report (fast, works EVERYWHERE).** One MCP call, no build
tools, no Node, no account. Works in plain chat, cowork and Claude Code. Because the report
is masked and self-contained, the clone is byte-identical — same fake brand, same fake
numbers. This is the default; use it unless the user wants to change the fake brand.

**Path B — Build from source (needs Node + a shell).** Use only to CUSTOMIZE — a different
fictional brand/domain, tweaked views, or a different synthetic universe. Otherwise Path A
already gives an identical report.

Prerequisite for both: the **PorterMetrics MCP** connected. Path A needs nothing else.

---

## Path A — Clone (preferred; the default)

1. Clone the masked reference report:
   ```
   duplicate_report(report_id="https://report.portermetrics.com/60f1fc0e-e365-42b4-a6fb-14b5128ff76e")
   ```
   `report_id` accepts the pasted URL. The reference is **public by link and
   self-contained (no accounts)**, so it clones verbatim — you do NOT need to re-point it
   at any account, and the copy stays fully masked.

   - If the user pasted their OWN masked GSC report URL to reproduce, use that id instead.
   - If your Porter workspace rejects the verbatim clone and asks for an account, pass one
     of the user's Google Search Console accounts:
     `duplicate_report(report_id="…60f1fc0e…", accounts_used=["<account_id from list_accounts>"])`.
     The mask ignores the account entirely, so the data stays 100% synthetic either way.
2. Read the response: `error_count` must be 0. `chart_count` is 0 by design — the masked
   report issues no live queries, so there is nothing to fail. That is expected, not a bug.
3. Verify what it renders with `preview_report(<new report_id>)` — expect
   `audit_status: "ok"` and 0 diagnostics. Confirm the header shows "Acme Analytics /
   sc-domain:acmeanalytics.io" and that no real data appears.
4. Hand over the `url` plus the no-login `preview_url`.

The copy is owned by the user, named "Copy of …", and starts **private** — making it public
is the user's call (the Share button in the report), not yours.

---

## Path B — Build from source (only to customize the fake brand/data)

Do NOT overlay files on a fresh `create_report` template — the current base template has
drifted from the version this report was built on, so an overlay may not compile. Instead
start from the reference report's OWN bundle, which is a complete, buildable project.

### 1. Get the buildable source
```
get_report(report_id="60f1fc0e-e365-42b4-a6fb-14b5128ff76e")   → download_url
```
POST `download_url` from your shell — the response is a JSON envelope with the zip in
`body.content_base64`. Base64-decode and unzip. It is a Next.js static-export project whose
masking lives in `lib/mask.ts` (bundled here as `assets/mask.ts` for reference).

### 2. Customize (this is the only reason to use Path B)
- **Change the fictional brand/domain:** edit the constants at the top of `lib/mask.ts`
  (`MASK_BRAND`, `MASK_TOKEN`, `MASK_DOMAIN`), set `BRAND_TOKENS` in `lib/gsc.ts` to the new
  token, and swap the hardcoded strings in `components/gsc.tsx`, `pages/index.tsx` and the
  view subtitles.
- **Change the synthetic data** (volume, number of queries/pages, seasonality): edit
  `lib/mask.ts` — but keep the invariants in `references/masking-technique.md` (esp. every
  dimension STRING must stay UNIQUE, or the deltas blow up to absurd values).
- Do **not** re-point it at a real account and do **not** remove the short-circuit in
  `lib/porter.ts` — that is what keeps it masked and lets it audit with no live data.

### 3. Build and self-audit
```
npm install
npx playwright install chromium     # first time only
npm run build
npm run audit                        # must print: bridge connected · charts: 0 queried · errors: 0
```
`charts: 0 queried` is CORRECT here (unlike a normal report) — the mask short-circuits every
query so nothing hits the data plane. Eyeball `.audit/report.png` to confirm all 7 views are
populated and leak-free.

### 4. Publish as a self-contained report
```
create_report(name="<Brand> — Search Console (masked)")     # NO accounts_used / connectors_used → self-contained
edit_report(<new id>, operations=[{action:"add_page", page_id:"overview", name:"overview"}])   → upload_url
```
Zip the project (**include `out/`, exclude `node_modules/`**) and POST it to `upload_url` as
`{"params": {"content_base64": "<b64>"}}`, encoding and posting in the SAME script. Use
`curl` — macOS Python often fails TLS verification against this host. upload_url tokens
expire in minutes; re-fetch via `edit_report` right before the POST.

### 5. Deliver
Success = HTTP 200 with `audit_status: "ok"`, `error_count: 0`. Confirm with
`preview_report`. To let others clone it, the user shares it public-by-link (Share button, or
`share_report(method="link")`).

---

## Before you touch the code, read this
`references/masking-technique.md` documents how the mask works and the invariants that keep
it audit-clean and realistic — the single `porter.query()` short-circuit, the coherent
synthetic universe, and the **unique-strings** rule (duplicates fabricate absurd
period-over-period deltas). If you "simplify" past them, the report either leaks structure,
looks broken, or fails to audit.

## Safe to customize
The fictional identity (`MASK_BRAND` / `MASK_TOKEN` / `MASK_DOMAIN` in `assets/mask.ts` +
`BRAND_TOKENS` in `assets/gsc.ts`) and the design tokens in `styles/globals.css`. Everything
else is the tested structure — change it only on an explicit request, and re-run
`npm run audit` afterwards.
