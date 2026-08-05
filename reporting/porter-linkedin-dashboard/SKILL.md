---
name: porter-linkedin-dashboard
description: >-
  Build a polished, hosted LinkedIn Company Page analytics dashboard for any LinkedIn
  Page using the PorterMetrics MCP — a 4-page report (Overview, Posts, Audience,
  Discovery) that ships as a live shareable URL. Use this skill WHENEVER the user wants
  a LinkedIn Pages / LinkedIn company-page analytics dashboard, report, or "insights"
  page built with Porter / PorterMetrics — even if they only say "make me a LinkedIn
  report", "dashboard for my LinkedIn page", "replicate this LinkedIn dashboard",
  "Porter report for LinkedIn", or hand you a Porter LinkedIn report URL to reproduce.
  It offers a one-call CLONE path that works anywhere (including plain chat, no build
  tools) plus a full build path, so every run produces a near-identical dashboard. Do
  NOT hand-roll a LinkedIn Pages report from scratch when this skill applies. This is
  the LinkedIn-Pages sibling of porter-instagram-dashboard.
---

# Porter LinkedIn Pages dashboard

This skill produces a specific, polished LinkedIn Company Page dashboard as a **hosted
Porter report** (`report.portermetrics.com/<id>`), with 4 pages:

- **Overview** — total-followers + reach/impressions/clicks scorecards, a "new followers"
  line where every day you posted is marked with an amber diamond you can hover to see
  the post and the impressions & engagements it earned, and a second row of
  reactions/comments/shares/clicks/engagement-rate cards.
- **Posts** — 6 scorecards with sparklines + period-over-period deltas, a Top-posts
  carousel where each card shows the post image in full, opens the post on LinkedIn, and
  lists its Impressions/Reactions/Comments/Shares/Clicks/Engagement; a "best days to
  post" bar chart; and a content-format (Image/Video/Text) donut.
- **Audience** — the LinkedIn B2B demographics: followers by seniority, job function,
  industry, company size and country.
- **Discovery** — page-view scorecards, page views over time split desktop vs mobile,
  which page sections people view, and Careers & Jobs interest over time.

The report **resolves its LinkedIn Page at runtime** and pulls the page's own company
name, website and logo for the header. Nothing about the account is hardcoded — that is
what makes Path A below possible.

---

## Choose a path

**Path A — Clone an existing report (fast, works EVERYWHERE).** One MCP call, no build
tools, no Node. Works in plain chat. Use this whenever a reference report already exists
(one you built before, or one the user was given a link to). The clone is byte-identical
and re-points at the user's Page, which then supplies the data, the header name, website
and logo automatically.

**Path B — Build it from source (needs Node + a shell).** Use when no reference report
exists yet, or the user wants to customize the code. This is how you create the first
one; afterwards, Path A can reproduce it endlessly.

Prerequisite for both: the **PorterMetrics MCP** connected, with the target Page
reachable via the `linkedin-pages` connector and its authorization **complete** (see
gotcha #1 — an incomplete LinkedIn authorization makes every chart fail
`reauth_required`).

---

## Path A — Clone (preferred when a reference report exists)

1. Find the user's Page:
   ```
   list_accounts(connector="linkedin-pages", query="<page name the user gave>")
   ```
   `linkedin` is ambiguous — always pass `linkedin-pages` (not `linkedin-ads`). If several
   match, ask which one. Take its `account_id` (the signed ref). A `status:"available"`
   Page is fine to use — billing just starts on the first query.
2. Clone, re-pointed at that Page:
   ```
   duplicate_report(report_id="<reference report id or its URL>",
                    accounts_used=["<account_id from step 1>"])
   ```
   `report_id` accepts a pasted `report.portermetrics.com/<id>` URL. You can clone your
   own reports, plus any that are public-by-link or shared with you — and cloning someone
   else's **requires** re-pointing at a Page that is the user's.

   **Default reference report** — a report built with THIS skill (runtime-resolved, so it
   re-brands automatically):
   ```
   https://report.portermetrics.com/ad1a0497-91d0-43ef-b0a8-4dfbabf78f99
   ```
   It was built from these exact assets and points at a LinkedIn Page at runtime, so a
   duplicate re-brands itself to the user's Page — header name, website, logo and every
   number come from their account, not from the reference. For OTHERS to clone it, the
   owner must make it public-by-link (the Share button) or share it; a user can always
   clone their OWN reports. A hardcoded-account report will NOT re-point on clone — only a
   report built from these assets (which resolve the account at runtime) clones cleanly.
3. Read the response: `error_count` must be 0. `warnings` with `error_code: "empty"` are
   fine — they just mean that Page has no posts in range, no page-section views, or no
   demographics yet. If instead you see `reauth_required` on every chart, the Page's
   LinkedIn authorization is incomplete → send the user through
   `connect_account(connector="linkedin-pages")` first, then retry (gotcha #1).
4. **Verify the re-pointing actually stuck — do not skip this.**
   ```
   get_report(<new report_id>)      → bundle_manifest.account_ids
   ```
   That list must contain the user's Page's native id (the numeric LinkedIn Page id, e.g.
   `64276106`). Observed in practice with hardcoded-account reports: the duplicate renders
   against the new Page yet the code still queries the old one — so always confirm here. A
   report built from these (runtime-resolved) assets avoids that, but verify anyway.

   If it points at the wrong Page, re-point it (metadata-only, applied inline — no
   rebuild):
   ```
   edit_report(<new report_id>, accounts_used=["<account_id from step 1>"])
   ```
   Then call `get_report` again and confirm before moving on.
5. Confirm what it renders with `preview_report(report_id)` — the header name, website,
   logo and the numbers all come from the Page's own data, so they are the giveaway: if
   they aren't the user's, the report is still bound to the wrong Page. Then hand over the
   `url` plus that no-login `preview_url`.

The copy is owned by the user, named "Copy of …", and starts **private** — it never
inherits the original's audience. Making it public is the user's call (the Share button in
the report), not yours.

---

## Path B — Build from source

### 1. Pick the Page and create the report
```
list_accounts(connector="linkedin-pages")            # choose with the user
create_report(name="<Company Name> — LinkedIn Pages",
              connectors_used=["linkedin-pages"],
              accounts_used=[<the FULL account dict from list_accounts>])
```
`create_report` returns a `base_template_url` (or `edit_hints` with a download). Fetch it
from your code-execution tool — the response is `{"body": {"content_base64": "<zip>"}}`;
base64-decode and unzip. It is a Next.js static-export project with the Porter bridge
(`lib/porter.ts`), reactive hooks (`lib/useReport.ts`, which already exports
`useAccounts()`), UI primitives and a local `simulator/`.

### 2. Drop in the bundled report code
Copy these skill assets over the template (overwrite):

| Skill asset | Destination |
| --- | --- |
| `assets/index.tsx` | `pages/index.tsx` |
| `assets/globals.css` | `styles/globals.css` |
| `assets/linkedin-pages.schema.json` | `simulator/schemas/linkedin-pages.json` |

Keep every other template file — `index.tsx` imports `Skeleton`/`SkeletonChart` from
`components/ui`, `ComparisonToggle` from `components/controls`, the hooks
(`useAccounts`, `useDateRange`, `useReportQuery`) from `lib/useReport`, the bridge from
`lib/porter`, and `chart.js`.

**There is nothing to fill in.** No account id, no name: the report reads them at runtime
via `useAccounts()`. Resist the urge to hardcode an account — that is exactly what breaks
cloning (Path A).

### 3. Patch the local audit harness (one command)
```
python3 <skill>/scripts/patch_local_audit.py <project-dir>
```
The template's audit mock only answers the `query` RPC. Since this report asks for its
accounts first (via `useAccounts` → `porter.getAccounts()`), without the patch every chart
skips its query and `npm run audit` "passes" against a blank page — a false green that
hides real field errors.

### 4. Build and self-audit
```
npm install
npx playwright install chromium     # first time only, if audit uses it
npm run build
npm run audit                        # iterate to 0 errors AND a sane chart count (~18)
```
If it reports `charts: 0`, the accounts RPC isn't resolving — re-run step 3. Empty charts
are warnings, not errors.

### 5. Upload — the upload is the real gate
```
edit_report(report_id, operations=[{action:"add_page", note:"Main"}])   → upload_url
```
Zip the project (**include `out/`, exclude `node_modules/` and `.next/`**) and POST it to
`upload_url` as `{"params": {"content_base64": "<b64>"}}`, encoding and posting in the
same script. Use `curl` — macOS Python often fails TLS verification against this host.

The upload re-audits against the Page's **real** data. On `audit_failed` the message names
the exact `[error_code] fields=… accounts=…`; fix it per
`references/linkedin-pages-api-gotchas.md`, rebuild, re-upload. The most common one is
`reauth_required` on every chart — that's not a code bug, it's an incomplete LinkedIn
authorization; run `connect_account(connector="linkedin-pages")` and retry. On success the
response is `{report_url, version_id}` and the report is published.

### 6. Deliver
`preview_report(report_id)` → a `preview_url` that renders even for a private report. Give
the user both that and the `report_url`. Note the server-side preview does not download
external images, so post thumbnails/logo can look blank there but load in the live report.

---

## Before you touch the code, read this
`references/linkedin-pages-api-gotchas.md` documents the LinkedIn Pages constraints already
handled by the bundled code: the ambiguous `linkedin` slug, `reauth_required`, native-id
queries, total-followers as a snapshot, demographics-by-dimension, post format inferred
from media, and LinkedIn CDN image handling. You don't need to rediscover them — but if you
"simplify" the code past them, the upload audit will reject it.

## Safe to customize
The date-range default (`useDateRange('30d')`), and the design tokens / brand palette at
the top of `styles/globals.css` (the `LI` palette lives in `assets/index.tsx`). Everything
else is the tested structure — change it only on an explicit request, and re-run
`npm run audit` afterwards.
