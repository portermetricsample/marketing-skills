---
name: porter-tiktok-dashboard
description: >-
  Build a polished, hosted TikTok Insights dashboard for any TikTok account using
  the PorterMetrics MCP — a 5-page report (Overview, Videos, Video performance,
  Acquisition, Audience) that ships as a live shareable URL. Use this skill WHENEVER
  the user wants a TikTok analytics dashboard, report, or "insights" page built with
  Porter / PorterMetrics — even if they only say "make me a TikTok report", "dashboard
  for my TikTok account", "replicate this TikTok dashboard", "Porter report for TikTok",
  or hand you a Porter TikTok report URL to reproduce. It offers a one-call CLONE path
  that works anywhere (including plain chat, no build tools) plus a full build path, so
  every run produces a near-identical dashboard. Do NOT hand-roll a TikTok report from
  scratch when this skill applies.
---

# Porter TikTok Insights dashboard

This skill produces a specific, polished TikTok Insights dashboard as a **hosted Porter
report** (`report.portermetrics.com/<id>`), with 5 pages:

- **Overview** — followers/profile scorecards, a "new followers" chart annotated with a
  circular thumbnail of every video published that day (hover to see caption, views,
  likes), and a daily-engagement row (likes, comments, shares, engaged audience).
- **Videos** — 6 scorecards with sparklines + period-over-period deltas, a Top-videos
  carousel where each card opens the video and lists Views/Likes/Comments/Shares/Avg
  watch time/Watched-in-full, a best-days-to-post bar chart, a video-length-mix donut,
  and a view-distribution (impression source) donut.
- **Video performance** — a video picker, its scorecards (views, avg watch time,
  watched-in-full, new followers, favorites, duration), a per-second **retention curve**,
  a per-video impression-source donut, and a per-video viewer-type split.
- **Acquisition** — For You / non-follower reach scorecards, account-wide impression-source
  and viewer-type charts, and a sortable "acquisition by video" table.
- **Audience** — followers by gender (donut), age (bars), country and city (top-10 bars).

The report **resolves its TikTok account at runtime** and pulls the account's own name
and profile picture for the header. Nothing about the account is hardcoded — that is what
makes Path A below possible. See `references/tiktok-api-gotchas.md` before touching code.

---

## Choose a path

**Path A — Clone an existing report (fast, works EVERYWHERE).** One MCP call, no build
tools, no Node. Works in plain chat. Use this whenever a reference report already exists
(one you built before, or the default public one below). The clone is byte-identical and
re-points at the user's account, which then supplies the data, the header name and the
avatar automatically.

**Path B — Build it from source (needs Node + a shell).** Use when no reference report
exists yet, or the user wants to customize the code. This is how you create the first one;
afterwards, Path A reproduces it endlessly.

Prerequisite for both: the **PorterMetrics MCP** connected, with the target account
reachable via the `tiktok-insights` connector.

---

## Path A — Clone (preferred when a reference report exists)

1. Find the user's account:
   ```
   list_accounts(connector="tiktok-insights", query="<name the user gave>")
   ```
   If several match, ask which one. Take its `account_id` (the signed ref).
2. Clone, re-pointed at that account:
   ```
   duplicate_report(report_id="<reference report id or its URL>",
                    accounts_used=["<account_id from step 1>"])
   ```
   `report_id` accepts a pasted `report.portermetrics.com/<id>` URL. You can clone your
   own reports, plus any that are public-by-link or shared with you — and cloning someone
   else's **requires** re-pointing at an account that is the user's.

   **Default reference report** — if the user has no report of their own to clone, use
   this one, built with this skill (runtime-account, so it re-points cleanly):
   ```
   https://report.portermetrics.com/b4d44b40-15b8-4455-b7c5-8d9b32203bac
   ```
   It must be public-by-link for `duplicate_report` to read it. The clone re-brands
   itself automatically — header name, avatar and every number come from the user's
   account, not from the reference.
3. Read the response `diagnostics`: `error_count` must be 0.
   - `warnings` / `error_code: "empty"` are fine — that account just has no videos,
     no demographics, or nothing in range.
   - `error_code: "reauth_required"` means the target account's TikTok token expired —
     the user re-authorizes it at `app.portermetrics.com/porter-auth?component=tiktok-insights`,
     not a report bug (see gotchas §3).
   - `error_code: "account_not_allowed"` should NOT happen with a runtime-account
     reference. If it does, you're cloning an OLD hardcoded report — rebuild the reference
     via Path B (or migrate it: replace its `const ACCOUNTS=[…]` with `useAccounts()`).
4. **Verify the re-pointing stuck** — `get_report(<new report_id>)` →
   `bundle_manifest.account_ids` must contain the user's account. If it points at the
   wrong one, re-point inline (no rebuild): `edit_report(<new report_id>,
   accounts_used=["<account_id>"])`, then re-check.
5. Confirm what it renders with `preview_report(report_id)` — the header name, avatar and
   numbers all come from the account's own data, so they are the giveaway that it bound to
   the right account. Hand over the `url` plus that no-login `preview_url`.

The copy is owned by the user, named "Copy of …", and starts **private** — it never
inherits the original's audience. Making it public is the user's call, not yours.

**Plan note:** if the user wants the exact period-over-period comparison view (Jun-style
range + compare) and their account is on the Free plan (30 days of history), the compare
charts will hit the 30-day limit. The default view avoids this (rolling 30 days, compare
off); the full comparison needs a paid plan. See gotchas §1.

---

## Path B — Build from source

### 1. Pick the account and create the report
```
list_accounts(connector="tiktok-insights")               # choose with the user
create_report(name="<Display Name> — TikTok Insights",
              connectors_used=["tiktok-insights"],
              accounts_used=[<the account_id from list_accounts>])
```
`create_report` returns a `base_template_url` — you can ignore it. This skill ships a
complete, tested project; use it instead of the base template.

### 2. Drop in the bundled project
Unzip `assets/porter-tiktok-project.zip` (base64-decode + POST the `download_url` is only
for existing reports; here the zip is a local skill asset) into a working directory. It is
the full Next.js static-export project — the migrated `pages/index.tsx`, `styles/globals.css`,
`simulator/schemas/tiktok-insights.json`, the Porter bridge (`lib/porter.ts`), the reactive
hooks (`lib/useReport.ts`), UI primitives, and the **already-patched** `scripts/audit.mjs`.

**There is nothing to fill in.** No account id, no name: the report reads them at runtime.
Resist the urge to hardcode an account — that is exactly what breaks cloning (gotchas §2).

If instead you started from a fresh `create_report` base template and overlaid only
`assets/index.tsx` + `assets/globals.css` + `assets/tiktok-insights.schema.json`, you MUST
also run `python3 scripts/patch_local_audit.py <project-dir>` so the local audit answers the
accounts RPC (otherwise `npm run audit` false-passes at `charts: 0` — gotchas §9).

### 3. Build and self-audit
```
npm install
npx playwright install chromium     # first time only
npm run build
npm run audit                        # iterate to 0 errors AND a sane chart count (~17)
```
If it reports `charts: 0`, the accounts RPC isn't resolving — apply the patch (step 2).
Empty charts are warnings, not errors.

### 4. Upload — the upload is the real gate
```
edit_report(report_id, operations=[{action:"add_page"}])   → upload_url
```
Zip the project (**include `out/`, exclude `node_modules/`, `.next/`, `.audit/`**) and POST
it to `upload_url` as `{"params": {"content_base64": "<b64>"}}`, encoding and posting in
the same script. Use `curl` — macOS Python often fails TLS verification against this host.

The upload re-audits against the account's **real** data. On `422 audit_failed` the message
names the exact `[error_code] fields=… accounts=…`; fix it per
`references/tiktok-api-gotchas.md`, rebuild, re-upload. On `200`, the report is published.

### 5. Deliver
`preview_report(report_id)` → a `preview_url` that renders even for a private report. Give
the user both that and the `report_url`. Server-side preview does not download external
images, so thumbnails/avatar can look blank there but load in the live report (gotchas §8).

---

## Safe to customize
The date-range default (`useDateRange('30d')`) and the initial compare state (`useState(false)`)
at the top of `Home` in `pages/index.tsx`, and the TikTok design tokens at the top of
`styles/globals.css` (the `TT` red/cyan palette). Everything else is the tested structure —
change it only on an explicit request, keep the account resolution at runtime, and re-run
`npm run audit` afterwards.
