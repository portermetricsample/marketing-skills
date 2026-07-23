# The hosted-report recipe — contract first, default path second

Porter hosted reports are static sites served inside a secure wrapper iframe.
This file has two layers. The **contract** is what Porter actually enforces —
it is framework-agnostic and it is the truth. The **default path** is the
Next.js template Porter ships, battle-tested end-to-end; use it unless the
user has a real reason to bring another stack.

> `create_report` returns `edit_hints` — Porter's live authoring manual.
> **Read it every time; on any conflict with this file, `edit_hints` wins**
> (it evolves server-side).

## Layer 1 — the contract (any framework)

1. **Static build, relative paths.** The upload must contain `out/index.html`
   as the SPA entry, with every asset URL RELATIVE (the wrapper injects a
   `<base href>`; absolute paths break).
2. **Data only through the bridge.** The page runs under CSP
   `connect-src 'none'` — no fetch/XHR/CDN at runtime; vendor every library
   and font into the bundle. All data crosses via the wrapper's postMessage
   bridge (`query()`, routes, theme, PDF). The template's `lib/porter.ts` is
   the reference implementation of this protocol: React users use it as-is
   (never modify it); other stacks must PORT it faithfully. This is the one
   real porting cost of leaving the default path.
3. **Accounts from the allowlist, never hardcoded.** The report may only query
   the `accounts_used` / `connectors_used` (+ `allowed_blends`) declared via
   `create_report`/`edit_report`. Charts resolve accounts at view time
   (`useAccounts()` in the template; slots for pinning) so a report can be
   duplicated onto other accounts.
4. **Standard UX kit is expected, not optional:** date-range control + period
   comparison (default on), skeleton → error(retry) → empty → data states on
   every chart, visible in-report navigation + `?page=` route sync
   (`emitRouteChanged` + `announceRoutes`), PDF export, no emoji decoration.
5. **Deploy = zip → signed URL → cloud audit.**
   `edit_report(report_id, operations=[{action:'add_page', name:'__rebuild__'}])`
   returns a fresh single-use `upload_url`. POST the zip (include `out/`,
   exclude `node_modules/`, `.next/`, `.audit/`) as
   `{"params": {"content_base64": "<b64>"}}` from a code-execution script.
   **The upload audits every chart against REAL data and refuses to publish
   broken reports (422).** This gate is the universal guarantee — it applies
   identically to every framework. HTTP 200 = published: `report_url`,
   `preview.jpg` URL, and an advisory `design` verdict.
6. **The `create_report` URL is a placeholder** until the first clean upload.
   Never hand it over before HTTP 200.

## Layer 2 — the default path (Next.js template), step by step

1. **Resolve the account** with `list_accounts(connector)`. Read
   `engineering-notes.md` §Account rows — same-named rows are NOT
   interchangeable.
2. **`create_report(name, connectors_used, accounts_used=[refs])`** → save
   `report_id`; read `edit_hints`; note `base_template_url`.
3. **Download the template:** POST `base_template_url` → the response is JSON
   `{body: {content_base64}}` → base64-decode → unzip. (Not a raw zip.)
4. **Adopt a certified gallery:** `pages/index.tsx` →
   `export { default } from '../examples/<recipe>';`, set `CONNECTOR`, mirror
   the account (native id) into `simulator/report.accounts.json`.
5. **Field truth (do NOT skip):** for every field the pages will query, verify
   the exact name with `list_fields(connector=...)` (add `account_id=` for
   custom/per-account fields; if a search returns empty with a "no static
   catalog" hint, retry account-scoped). Fix the gallery's field map AND
   hand-patch `simulator/schemas/<connector>.json` so local validation matches
   production — the shipped schemas are NOT authoritative. Ratios
   (CTR/CPC/CPM/CPA/CVR/ROAS) are always DERIVED client-side from base counts.
6. **Apply the approved design-kit tokens** to `styles/globals.css` (the 8
   vars) and **brand-lock the theme in code**: call the theme applier with the
   approved mode on mount AND inside the `onTheme` handler — the wrapper
   pushes its own default otherwise (a `?? 'light'` fallback is not enough).
7. **Pin the build id** in `next.config.js`:
   `generateBuildId: () => 'porterbuild'` (a random id can start with `-`,
   which the upload path validator rejects — flaky if unpinned).
8. **Build & audit locally:** `npm install` → `npx next build` →
   `npx playwright install chromium` → `npm run audit`. The audit drives the
   built `out/` through the real bridge against the simulator: bridge ✓,
   0 errors, screenshot + PDF in `.audit/`. Iterate until clean.
9. **Upload** (contract §5). On 422 read the per-chart errors —
   `[unknown_field]` names the bad field; `[invalid_account_authorization]`
   names the bad account row. Fix, rebuild, re-upload.
10. **Verify what was published:** fetch the returned `preview.jpg`, confirm
    the theme, header (account name + explicit period), and data sanity.
    Triage the `design` verdict (see engineering-notes §Design reviewer).
11. **Iterate page by page:** each new page = one section component + one
    ROUTES entry + render-switch line + print-block line (+ schema patch for
    any new field). Full cycle ≈ 3 minutes. Then `preview_report` for a
    shareable rendered preview; keep visibility PRIVATE until the user says
    otherwise.

## Recovery table

| Symptom | Fix |
|---|---|
| 422 `unknown_field` | Field name wrong vs live catalog — `list_fields`, patch map + simulator schema |
| 422 `invalid_account_authorization` | Wrong account row — re-run `list_accounts`, pass the exact working row verbatim |
| 422 `invalid_path` on `_next/static/-...` | Unpinned random buildId — step 7 |
| 422 `audit_failed`, bridge_not_connected | You modified the bridge or fired queries pre-mount — revert to template bridge |
| Local audit green, cloud 422 | Stale simulator schema — step 5 |
| Published but wrong theme | Wrapper overrode it — brand-lock (step 6), rebuild, re-upload |
| `list_actions` returns nonsense (e.g. accounts) | Known misroute — rephrase the task and retry |
