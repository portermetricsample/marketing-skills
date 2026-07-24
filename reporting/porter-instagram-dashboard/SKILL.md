---
name: porter-instagram-dashboard
description: >-
  Build a polished, hosted Instagram Insights dashboard for any Instagram account
  using the PorterMetrics MCP — a 4-page report (Overview, Posts, Stories, Audience)
  that ships as a live shareable URL. Use this skill WHENEVER the user wants an
  Instagram / IG analytics dashboard, report, or "insights" page built with Porter /
  PorterMetrics — even if they only say "make me an Instagram report", "dashboard for
  my IG account", "replicate this Instagram dashboard", "Porter report for Instagram",
  or hand you a Porter Instagram report URL to reproduce. It offers a one-call CLONE
  path that works anywhere (including plain chat, no build tools) plus a full build
  path, so every run produces a near-identical dashboard. Do NOT hand-roll an
  Instagram report from scratch when this skill applies.
---

# Porter Instagram Insights dashboard

This skill produces a specific, polished Instagram Insights dashboard as a **hosted
Porter report** (`report.portermetrics.com/<id>`), with 4 pages:

- **Overview** — followers/reach scorecards, a "new followers" chart annotated with a
  circular thumbnail of every post published that day, and the profile-action taps row.
- **Posts** — 6 scorecards with sparklines + period-over-period deltas, a Top-posts
  carousel where each card opens the post and lists its Reach/Likes/Comments/Saves/
  Engagement, a post-types donut, and a best-times-to-post day×hour heatmap.
- **Stories** — impressions/reach/replies/exits, impressions over time, story types.
- **Audience** — followers by gender (donut) and by age (bars).

The report **resolves its Instagram account at runtime** and pulls the account's own
name and profile picture for the header. Nothing about the account is hardcoded — that
is what makes Path A below possible.

---

## Choose a path

**Path A — Clone an existing report (fast, works EVERYWHERE).** One MCP call, no build
tools, no Node. Works in plain chat. Use this whenever a reference report already
exists (one you built before, or one the user was given a link to). The clone is
byte-identical and re-points at the user's account, which then supplies the data, the
header name and the avatar automatically.

**Path B — Build it from source (needs Node + a shell).** Use when no reference report
exists yet, or the user wants to customize the code. This is how you create the first
one; afterwards, Path A can reproduce it endlessly.

Prerequisite for both: the **PorterMetrics MCP** connected, with the target account
reachable via the `instagram-insights` connector.

---

## Path A — Clone (preferred when a reference report exists)

1. Find the user's account:
   ```
   list_accounts(connector="instagram-insights", query="<name the user gave>")
   ```
   If several match, ask which one. Take its `account_id` (the signed ref).
2. Clone, re-pointed at that account:
   ```
   duplicate_report(report_id="<reference report id or its URL>",
                    accounts_used=["<account_id from step 1>"])
   ```
   `report_id` accepts a pasted `report.portermetrics.com/<id>` URL. You can clone your
   own reports, plus any that are public-by-link or shared with you — and cloning
   someone else's **requires** re-pointing at an account that is the user's.

   **Default reference report** — if the user has no report of their own to clone, use
   this live public one, built with this skill:
   ```
   https://report.portermetrics.com/a87617a4-20f1-4064-b66a-60dc3bc5e0f5
   ```
   It is public by link, so `duplicate_report` can read it. The clone is re-pointed at
   the user's account and re-brands itself automatically — header name, avatar and every
   number come from their account, not from the reference.
3. Read the response: `error_count` must be 0. `warnings` with `error_code: "empty"`
   are fine — they just mean that account has no Stories, no demographics, or no posts
   in range. Then hand over the returned `url`, and `preview_report(report_id)` for a
   no-login preview.

The copy is owned by the user, named "Copy of …", and starts **private** — it never
inherits the original's audience. Making it public is the user's call (the Share button
in the report), not yours.

---

## Path B — Build from source

### 1. Pick the account and create the report
```
list_accounts(connector="instagram-insights")            # choose with the user
create_report(name="<Display Name> — Instagram Insights",
              connectors_used=["instagram-insights"],
              accounts_used=[<the FULL account dict from list_accounts>])
```
`create_report` returns `base_template_url`. Download it from your code-execution tool —
the response is `{"body": {"content_base64": "<zip>"}}`; base64-decode and unzip. It is a
Next.js static-export project with the Porter bridge (`lib/porter.ts`), reactive hooks
(`lib/useReport.ts`), UI primitives and a local `simulator/`.

### 2. Drop in the bundled report code
Copy these skill assets over the template (overwrite; `ig.tsx` is new):

| Skill asset | Destination |
| --- | --- |
| `assets/index.tsx` | `pages/index.tsx` |
| `assets/ig.tsx` | `components/ig.tsx` |
| `assets/globals.css` | `styles/globals.css` |
| `assets/instagram-insights.schema.json` | `simulator/schemas/instagram-insights.json` |

Keep every other template file — `index.tsx` imports `ChartFrame` from `components/ui`,
the hooks from `lib/useReport`, the bridge from `lib/porter`, and relies on the
self-hosted fonts wired in `pages/_document.tsx`.

**There is nothing to fill in.** No account id, no name: the report reads them at
runtime. Resist the urge to hardcode an account — that is exactly what breaks cloning.

### 3. Patch the local audit harness (one command)
```
python3 <skill>/scripts/patch_local_audit.py <project-dir>
```
The template's audit mock only answers the `query` RPC. Since this report asks for its
accounts first, without the patch every chart skips its query and `npm run audit`
"passes" against a blank page — a false green that hides real field errors.

### 4. Build and self-audit
```
npm install
npx playwright install chromium     # first time only
npm run build
npm run audit                        # iterate to 0 errors AND a sane chart count (~12)
```
If it reports `charts: 0`, the accounts RPC isn't resolving — re-run step 3.
Empty charts are warnings, not errors.

### 5. Upload — the upload is the real gate
```
edit_report(report_id, operations=[{action:"add_page", name:"Main"}])   → upload_url
```
Zip the project (**include `out/`, exclude `node_modules/`**) and POST it to `upload_url`
as `{"params": {"content_base64": "<b64>"}}`, encoding and posting in the same script.
Use `curl` — macOS Python often fails TLS verification against this host.

The upload re-audits against the account's **real** data. On `422 audit_failed` the
message names the exact `[error_code] fields=… accounts=…`; fix it per
`references/instagram-api-gotchas.md`, rebuild, re-upload. On `200`, the report is
published.

### 6. Deliver
`preview_report(report_id)` → a `preview_url` that renders even for a private report.
Give the user both that and the `report_url`. Note that the server-side preview does not
download external images, so thumbnails/avatar can look blank there but load in the live
report.

---

## Before you touch the code, read this
`references/instagram-api-gotchas.md` documents the Instagram limits already handled by
the bundled code: deprecated profile metrics, the 30-day account-metric window,
`metric_type=total_value`, demographics needing a short window, and scheme-less image
URLs. You don't need to rediscover them — but if you "simplify" the code past them, the
upload audit will reject it.

## Safe to customize
The date-range default (`useDateRange('6m')`), and the design tokens at the top of
`styles/globals.css`. Everything else is the tested structure — change it only on an
explicit request, and re-run `npm run audit` afterwards.
