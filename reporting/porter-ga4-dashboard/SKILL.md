---
name: porter-ga4-dashboard
description: >-
  Replicate a polished, hosted Google Analytics 4 dashboard with FULLY MASKED
  (synthetic) data using the PorterMetrics MCP — a 4-page report (Conversions,
  Audiences, Content, Time matrix) that ships as a live shareable URL and shows a
  fictional "Acme Analytics" brand, never any real property. Use this skill
  WHENEVER the user wants a GA4 / Google Analytics analytics dashboard, report, or
  "insights" page built with Porter that must NOT expose real data — for demos,
  videos, screenshots, sales collateral, or templates — even if they only say
  "make me a masked GA4 dashboard", "a sample Google Analytics report", "replicate
  this GA4 dashboard with fake data", or hand you the reference report URL to
  reproduce. It offers a one-call CLONE path that works anywhere (including plain
  chat, no build tools) plus a full build path, so every run produces a
  near-identical masked dashboard. Do NOT hand-roll a masked GA4 report from
  scratch when this skill applies.
---

# Porter GA4 dashboard — masked sample

This skill produces a specific, polished **Google Analytics 4** dashboard as a
**hosted Porter report** (`report.portermetrics.com/<id>`) whose data is entirely
**synthetic and masked** — it shows a fictional brand, **Acme Analytics /
acmeanalytics.io**, and never queries any real account. It has 4 pages:

- **Conversions** — Key events / rate / Sessions / Event count scorecards, a key-
  events trend with a metric switcher, a "by event name" table (only `generate_lead`
  + `sign_up` convert), a "by channel group" bar chart, and a "by source / medium" table.
- **Audiences** — Total/New/Active users + engagement KPIs; Geography (country bars +
  top cities), Demographics (age/gender/language/interests), Technology
  (device/browser/OS + new-vs-returning), and an audiences table.
- **Content** — Views / users / engagement KPIs, a views trend, a searchable
  "Pages and screens" table, landing pages, page titles, and site-search terms.
- **Time matrix** — a "key metrics by period" breakdown matrix (Day/Week/Month/Quarter
  toggle, per-row blue heat) and a day-of-week × hour sessions heatmap.

**Why it is safe to share.** The report is **self-contained**: every chart is answered
locally by a synthetic-data engine (`lib/mask.ts`) and NO query ever reaches the data
plane. It declares no connectors and no accounts (`connectors_used: []`,
`account_ids: []`). That is what makes both paths below produce masked output that can
be made public with zero risk of leaking a real property.

---

## Choose a path

**Path A — Clone the masked reference (fast, works EVERYWHERE).** One MCP call, no build
tools, no Node, works in plain chat. Because the reference is self-contained, the clone is
byte-identical AND stays masked — there is nothing to re-point and nothing to leak. This
is the path for "give me the masked GA4 dashboard".

**Path B — Build it from source (needs Node + a shell).** Use when the user wants to
change the fictional data, the brand, or the structure. This skill bundles the complete
masked project under `assets/project/`.

Prerequisite for both: the **PorterMetrics MCP** connected. (No GA4 account is needed —
the report queries nothing.)

> No Porter MCP at all? There is also a **chat-only** route that reproduces the same look
> as a self-contained interactive **artifact** with fictional data — see
> `references/artifact-prompt.md`. Use it when the user is in plain Claude Chat with no
> Porter connector and just wants the visual.

---

## Path A — Clone (preferred)

1. Clone the masked reference verbatim (no accounts — it is self-contained):
   ```
   duplicate_report(report_id="https://report.portermetrics.com/730c1424-eac3-49c5-a2d0-074ffa139b51")
   ```
   `report_id` also accepts the bare id `730c1424-eac3-49c5-a2d0-074ffa139b51`. This
   reference is **public by link**, so any user can read and clone it. Do **not** pass
   `accounts_used` / `account_map` — the report has no accounts, so re-pointing is neither
   needed nor wanted; passing accounts just adds connectors the charts never use.
2. Read the response: `diagnostics.error_count` must be 0 and `chart_count` 0 (the report
   queries nothing). The copy is owned by the user, named "Copy of Google Analytics 4 —
   Sample (masked)", and starts **private**.
3. Hand over the returned `url` plus the no-login `preview_url`. The dashboard already shows
   the Acme Analytics masked data — there is nothing to fill in.

   **If a non-owner clone is ever rejected for "missing accounts":** it means the platform
   still demanded an allowlist for a report you don't own. The report needs none, so fall
   back to **Path B** (rebuild from the bundled source and `create_report` with no
   `accounts_used`). In practice the verbatim clone of this self-contained report succeeds.

Making the copy public (the Share button, or `share_report(method="link")`) is the user's
call — but since the data is masked, it is safe to do on request.

---

## Path B — Build from source

The complete masked project is bundled at `assets/project/` — you do not download or
reconcile against the `create_report` starter template. It already contains the masking
engine and the masked brand strings.

### 1. Copy the project out and install
```
cp -R <skill>/assets/project <work-dir>/ga4-masked && cd <work-dir>/ga4-masked
npm install
npx playwright install chromium     # first time only
```

### 2. (Optional) re-brand or re-shape the fiction
Everything data-related lives in **`lib/mask.ts`** — one deterministic daily universe plus
per-dimension share catalogs (countries, channels, event names, pages, …). The brand
strings live in **`lib/ga4.ts`** (`ACCOUNTS`, `PROPERTY_LABEL`) and **`pages/index.tsx`**
(header subline + footer). To change the fictional company, edit those. Keep the data
**deterministic and internally consistent** (see `references/ga4-masking-technique.md`) —
that is what makes KPIs reconcile across pages.

Do **NOT** re-introduce a live query: `lib/porter.ts`'s `query()` is deliberately
short-circuited to `return maskResult(spec)` and must send no RPC. That is the whole point.

### 3. Build and self-audit
```
npm run build
npm run audit          # must show: bridge ✓ connected · charts: 0 · errors: 0
```
`charts: 0` is CORRECT here (unlike a live report): the short-circuit means zero RPCs, so
the audit records no charts and no errors. The screenshot/PDF under `.audit/` is your visual
check that all 4 pages render the masked data.

### 4. Create the report — self-contained (NO accounts)
```
create_report(name="Google Analytics 4 — Sample (masked)",
              description="Masked sample copy of a GA4 dashboard — all figures are synthetic; queries no live account.")
```
Omit `accounts_used` and `connectors_used` — the report gathers no live data. Passing an
account would wrongly bind it to a real property.

### 5. Upload — the upload is the real gate
```
edit_report(report_id, operations=[{action:"add_page", name:"main"}])   → upload_url
```
Zip the project (**include `out/`, exclude `node_modules/`**) and POST it to `upload_url`
as `{"params": {"content_base64": "<b64>"}}`, encoding and posting in the **same script**.
Use `curl` (macOS Python often fails TLS against this host). A clean upload returns
`diagnostics.audit_status: "ok"`, `chart_count: 0`, `error_count: 0`.

### 6. Deliver
Hand over the `report_url` and the `preview_url`. To make it cloneable by others (so Path A
works against your new build), `share_report(report_id, method="link")` and point the
skill's Path A at the new id.

---

## Before you touch the code, read this
`references/ga4-masking-technique.md` explains the two load-bearing tricks — the
`porter.query()` short-circuit and the single-daily-universe generator — and why the audit
passes with a live-account-free, self-contained report. If you "simplify" past them (e.g.
restore a real query, or make dimension shares inconsistent), you either leak real data or
break KPI reconciliation.

## Safe to customize
The fictional brand and catalogs in `lib/mask.ts` / `lib/ga4.ts`, the date-range default
(`useDateRange('30d')` in `pages/index.tsx`), and the design tokens in
`styles/globals.css`. Everything else is the tested structure — change it only on an
explicit request, and re-run `npm run audit` afterwards.
