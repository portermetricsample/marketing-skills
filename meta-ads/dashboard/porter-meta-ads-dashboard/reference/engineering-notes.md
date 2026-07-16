# Engineering notes — the gotchas (read before editing the bundle)

Every item here cost real debugging time on the original build. Honor them.

## Porter data quirks
- **Date dimension is `"YYYYMMDD"` string** (`"20260504"`), NOT ISO. `new Date(it)` → Invalid Date and silently drops the series. Use the `parseDate()` helper in `frontend.js`.
- **Metric values come back as strings** (`"486.21"`). Coerce with `+v` / the `num()` helper before math.
- **Image fields lack scheme** — prepend `https://`. Use `imgUrl()`.
  - `image_asset` = the Ad image, ~1000px, **Porter-proxied and durable** (does not expire) → use this for thumbnails and for the localStorage cache.
  - `image_thumbnail` = small/blurry. `promoted_post_full_picture` = 1000px but a raw FB CDN URL that **expires** — do not cache it.

## Report worker performance (the big one)
- **Ad-grain queries (`dimension: ad_name`) take a FIXED ~36s through the report worker**, regardless of metric count. Adding an image dimension pushes it to ~48s. The identical `query_data` (MCP) call returns instantly — it's the worker, not the data. Unfixable from the dashboard side.
- **A full YEAR of ad-grain (ad_name × date) can exceed the worker timeout** → `HTTP 200 {error: ReadTimeout, upstream_status:500}`. 30–90 days is safe; a year is borderline and fails under load.
- Mitigations shipped in this bundle:
  - **Ghost/skeleton cards** render instantly (`renderGhostCards`).
  - **Progressive load**: metrics + verdicts first (`chart_creatives_metrics`), then thumbnails (`chart_creatives`) and daily trends (`chart_creatives_daily`) fill in asynchronously.
  - **Background pre-warm**: at +3.5s `window._crM/_crT/_crDaily` are fetched, so opening the Creatives tab after browsing others is ~0.6s instead of ~36s. Invalidated on date change.
  - **localStorage image cache** (`_crImg`): `image_asset` URLs are durable, so they're cached; repeat visits paint images instantly while the slow query refreshes in the background. `loading="eager" decoding="async"` on the visible imgs.

## `edit_report` 422 size limit
- A single edit `new_string` of ≥ ~3KB returns an opaque HTTP 422. **Chunk large JS injections into < 2KB appends.** Replacing a whole long line (large old + large new) compounds it — prefer small, uniquely-anchored edits.

## Cache-busting
- Deployed assets are served with **no `Cache-Control`** → browsers heuristically cache `report.js`/`style.css`. After an edit, bump the query-string version on the `<script>`/`<link>` tags (`report.js?v=crNN`). The worker serves query-stringed assets 200.

## Date-range default (SDK bug)
- `sdk.js` **hardcodes the picker default to `last_30_days`** and **ignores `config.controls.date_range.default`**. To open on a different range, force it in `report.js` right after `Porter.dateRangePicker('date-picker')`: set the `<select.porter-daterange__preset>` value and dispatch a `change` event (guarded by a `_crYrSet` flag so the user can still switch manually). See the IIFE in `frontend.js`.
- Pick the default range to **match where the account's data actually is** (a seasonal/sample account can be empty in the last 90 days). This bundle forces `this_year`; change it if the data sits elsewhere.

## Resilience
- **One failed sub-fetch must not blank the widget.** Period-over-period and progressive loads use `.catch(()=>null)` + a `fetchRetry()` wrapper (retry with ~700ms backoff). Never let `Promise.all` reject the whole render.
- Show a graceful empty state, not a stack trace, when the worker returns nothing.

## Creative metrics (definitions that matter)
- **Thumbstop / hook rate** = `video_play_actions` (3s) ÷ impressions.
- **Hold rate** = `video_thruplay_watched_actions` (15s) ÷ `video_play_actions` (3s) — i.e. ÷ 3s-plays, NOT ÷ impressions.
- **CTR** = `inline_link_clicks` ÷ impressions.
- **ROAS** = `purchase_roas_purchase`; conversion value = `value_omni_purchase`.
- **Retention curve** = `[video_play_actions, video_p25/p50/p75/p100_watched_actions]`.
- **Created date / days-active** = `facebook_ads_created_time` (returns `"2026-01-07"`); days = round((now − created)/86400000).
- **Format** = derived: `video = video_play_actions > 0`. (`ad_format_asset` returns an opaque id and fragments rows — don't use it.)

## Creative-performance classifier (the verdict tag)
Verdicts: **Unicorn / Winning / Steady / Fatiguing / Losing / Testing** (sibling of the `performance_decay` skill; full grounding in `~/.claude/skills/creative_performance/reference/framework.md`).
- **LEVEL drives the verdict** — full-period, volume-weighted vs the *account* benchmark (adapts to any vertical). **TREND only nuances it** — WEEKLY buckets (daily ad-rate series are pure noise on low-impression days).
- Adaptive outcome: **ROAS** if the account tracks purchases, else **CTR** as the engagement proxy.
- Bands: Unicorn ≥1.8× (+ strong funnel + volume) · Winning ≥1.25× · Steady 0.8–1.25× · Losing <0.8× or CTR<0.5% · Testing below the data gate (≥2000 impr, ≥4 days). Fatiguing needs ≥28 days of history so short ads aren't mislabeled.
- Ported to JS in `frontend.js` as `crVerdict()` / `crWeeklyTrend()` (+ `cdSmooth/cdMean/cdStd/cdSlope/cdClassify`).
