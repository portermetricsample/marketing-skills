# TikTok Insights — API & report gotchas

Everything here is already handled by the bundled report code. Read it before you
"simplify" anything — most of these are the reason a chart renders at all, and the
cloud upload audit will reject a build that regresses them.

## 1. Free plan = 30 days of history (the #1 publish blocker)
Porter's Free plan serves only the **last 30 days** of TikTok data for an account.
A default range that reaches further back — or period comparison, which fetches the
**previous** equal-length window on top of the current one — makes the time-series
charts fail the cloud audit with:

> You've reached your limit 🚧 … 30 days of historical data … upgrade to a paid plan.

The bundled build defaults to a **rolling 30-day window with comparison OFF**, which
publishes for any account. Turn comparison on (or widen the range) only when the
account has enough history (paid plan). Verify with a quick `query_data` before
committing to a wider default.

## 2. Never hardcode the account (this is what makes cloning work)
The report resolves its source account at **runtime** via `useAccounts()` →
`porter.getAccounts()` (bounded by the report's `accounts_used`). Nothing about the
account is baked into the bundle — no id, no name, no avatar. That is exactly why a
one-call `duplicate_report(..., accounts_used=[<new account>])` re-points cleanly.
If you replace this with a literal `const ACCOUNTS = [{ id: '…' }]`, cloning breaks:
the copy keeps querying the ORIGINAL account and every chart returns
`account_not_allowed`. (The first version of this dashboard had that bug — the fix was
this migration.)

## 3. `reauth_required` on a clone is a data-source issue, not a report bug
If a freshly cloned report shows `reauth_required` errors for the target account, that
TikTok connection's token has expired. Re-authorize it in Porter
(`app.portermetrics.com/porter-auth?component=tiktok-insights`), then re-preview. The
report is fine; the account just needs reconnecting.

## 4. Viewer types are TWO overlapping splits — never one donut
TikTok returns viewer composition as two independent binary splits that EACH sum to
~100%: follower vs non-follower, AND new vs returning. Rendered as a single donut they
would sum to ~200% and read as nonsense. The report draws them as **two split bars**
(`ViewerTypeSplits`). Keep it that way.

## 5. daily_new_followers is often ALL ZEROS — derive from followers_count
For many accounts TikTok returns `tiktok_insights_daily_new_followers` (and
`daily_lost_followers` / `daily_total_followers`) as **0 for every day**, which flatlines
the Overview "New followers — annotated" chart and its KPI. But
`tiktok_insights_followers_count`, queried WITH the date dimension, comes back as a real
climbing per-day series. The report handles this: it adds `followers_count` to the trend
query and, when `daily_new_followers` is all-zero, derives the daily gain from the
day-over-day **difference** of the total-followers series (and uses that same series for
the "Total followers" sparkline). Keep this fallback — without it the whole Overview reads
as "0 new followers" even for an account that clearly grew. (`lost_followers` can't be
derived from a total, so it may legitimately stay 0.)

## 6. Per-video deep-dive queries need a FLAT filter array
Retention, per-video impression sources and per-video viewer types are queried one video
at a time with a filter shaped as a **flat** array:
`[{ fieldName: 'tiktok_insights_video_id', operator: 'equals', values: [id] }]`.
The template's nested `Filter[][]` shape is rejected by the production query plane.

## 7. Fractions and durations
Percentage fields (`full_video_watched_rate`, `audience_*_percentage`,
`video_impression_sources`, `video_audience_types_percentage`) arrive as **0..1
fractions** — multiply by 100 for display. Watch time and duration are **seconds** —
format as `1m 12s` / `8.4s`.

## 8. Scheme-less media URLs + preview blanks
Thumbnail/avatar URLs sometimes come without the `https://` scheme; the `mediaSrc`
helper prepends it. Also: the server-side `preview_report` image does NOT fetch external
images, so thumbnails and the avatar look blank in the preview yet load fine in the live
report. Don't chase that as a bug.

## 9. Local-audit false green (charts: 0)
Because the report asks for its accounts first, the stock `scripts/audit.mjs` mock —
which only answers the `query` RPC — never hands the report an account, so every chart
skips and `npm run audit` prints a green **0 errors** over **charts: 0**. Run
`scripts/patch_local_audit.py <project>` so the mock also answers the `accounts` RPC.
(The bundled `assets/porter-tiktok-project.zip` already has this patch applied.)
