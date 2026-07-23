# Engineering notes — rules that each cost a failed deploy

Every item below was learned by hitting the failure live. Honor them.

## Account rows (`list_accounts`)

- The SAME native account can appear as several rows under different
  (source_user, company) pairs. **Rows are not interchangeable**: one row can
  pass everything locally and fail the cloud audit with
  `invalid_account_authorization` because its authorization never completed.
  Pick a row with `status:"connected"` when available, pass its `account_id`
  ref VERBATIM downstream, and read the response `hint` — it names
  incomplete authorizations.
- Google Ads native ids are `<customer_id>-<login_customer_id>`; the simulator
  file uses the native id, the allowlist uses the signed ref.
- **The P2 probe IS the row-validity check (mandatory):** before `create_report`,
  run one tiny `query_data` against the chosen row. If it fails with Google's
  *"login-customer-id header"* / manager-permission error, the account is only
  reachable through a manager (MCC) pair that Porter never registered — and
  possibly NO working row exists. Diagnose by listing sibling rows' MCC ids and
  probing via the action plane (`google_ads.customer_get`); the customer fix is
  to re-run `connect_account` for google-ads so Porter registers the MCC pair.
  Do NOT create the report until a probe succeeds — every chart would fail the
  cloud audit.
- `list_accounts(query=...)` lands the best match top-1 but pads with fuzzy
  noise, and an alternate row for the same native id may not surface — when
  hunting for account-row variants, PAGINATE the full list instead of trusting
  `query`.

## Fields & data

- **The template's certified field maps and simulator schemas are NOT
  authoritative** — they have shipped wrong (e.g. google-ads `cost` /
  `impressions` / `network`, all rejected by the real data plane). Live
  `list_fields` is the only truth; hand-patch
  `simulator/schemas/<connector>.json` to match it (the refresh script needs
  an internal token customers don't have).
- Known-good google-ads names: `google_ads_cost_micros` (**returns DOLLARS,
  not micros**), `google_ads_impressions`,
  `google_ads_campaign_advertising_channel_type`,
  `google_ads_campaign_status` (ENABLED/PAUSED). Unprefixed `date`, `clicks`,
  `conversions`, `campaign_name`, `device` work.
- `list_fields` dimension searches can return empty with a "no static field
  catalog" hint → retry with `account_id=`. A field you can't verify locally
  can still be tried: the cloud audit is the definitive validator.
- Day dimensions arrive as `YYYYMMDD` strings; metric values as strings —
  parse/coerce, never `new Date(raw)` or raw arithmetic.
- Ratios (CTR/CPC/CPM/CPA/CVR/ROAS) are DERIVED client-side. Native rate
  fields break at aggregates.
- Default row order is not performance order — bake `sort`+`limit` into any
  "top N" query.
- One failed sub-fetch must never blank a widget: per-chart catch + retry +
  graceful empty state (the template's `ChartFrame` does this — keep it).

## Build & upload

- Pin `generateBuildId: () => 'porterbuild'` — a random Next buildId starting
  with `-` fails the upload path validator (flaky by nature).
- Template download: POST `base_template_url` returns JSON-wrapped base64,
  not a raw zip.
- Each rebuild needs a fresh single-use `upload_url`
  (`edit_report` `add_page` `__rebuild__` no-op). Zip includes `out/`,
  excludes `node_modules/`, `.next/`, `.audit/`.
- `npm run dev` catches bad fields fast but never exercises the wrapper
  handshake; `npm run audit` (Playwright) does. Local audit clean is
  necessary, not sufficient — only the cloud audit tests REAL data.

## White-label restyle

- The template's `styles/globals.css` carries a few HARDCODED brand hexes that
  survive a token swap (observed: a bar-gradient ending in purple on an
  otherwise-restyled report). After applying the approved tokens, sweep:
  `grep -n '#[0-9a-fA-F]\{3,8\}' styles/globals.css` and convert every literal
  hex that isn't semantic (status green/amber/red) to a token var
  (e.g. `linear-gradient(90deg, var(--accent), var(--accent-2))`).
- Vendor the client logo into `public/` and reference it with a RELATIVE `src`
  (no leading slash — the wrapper's `<base href>` breaks absolute paths, and
  the runtime CSP blocks the client's own host).
- Chart primitives and components default to `var(--accent)`; the kit's token
  block also sets `--accent-line`/`--area-fill` so every chart follows the
  brand automatically.

## Theme

- The wrapper pushes its own theme at init and `edit_report`'s `set_theme`
  operation has been observed to silently no-op. **Brand-lock the approved
  theme in code**: apply it on mount AND in the `onTheme` handler. A
  `?? 'light'` fallback is not enough.

## Design reviewer (the `design` verdict on upload 200)

- It is an independent vision model and it is NOISY: findings change between
  near-identical uploads and it sometimes flags elements that exist. Treat it
  as triage — fix `high` items you can visually confirm on the preview
  (it does catch real things, e.g. a missing account name in the header);
  ignore the rest; never loop chasing `polished:true`.

## Tool discovery

- `list_actions` can misroute a task phrasing to a wrong payload entirely
  (observed: an accounts list). Rephrase and retry before concluding a
  capability doesn't exist.
- `create_report` docs may describe a stricter flow than the tool enforces
  (two-phase token gate, full account dicts). Follow the tool schema +
  `edit_hints`; when they disagree with this file, trust `edit_hints`.

## Performance

- Ad-grain queries (per-ad + image dimensions) are the slowest thing in the
  system — design progressive loading for creative grids and keep ad-grain
  windows ≤ 90 days.
