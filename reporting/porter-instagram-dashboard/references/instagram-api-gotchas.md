# Instagram Insights via Porter — API gotchas baked into the bundled code

These are the real constraints of the Instagram Graph API (as surfaced through the
PorterMetrics `instagram-insights` connector) that shaped the bundled report. The
`assets/index.tsx` already handles all of them. Read this so you don't "fix" the code
into breaking, and so you can decode any `422 audit_failed` message.

## 1. Queries must use the NATIVE account id, not the signed token
`list_accounts` returns a signed `account_id` (a long JWT-ish string) **and** a
`native_account_id` (a 17-digit IG id, e.g. `1784100000000000`). Use the signed one only in
`create_report(accounts_used=…)`. The report is stored keyed by the **native id**
(`get_report → bundle_manifest.account_ids`), and every `porter.query({accounts:[{id}]})`
in the report must pass that **native id**. Using the signed token in a query →
`account_not_allowed` on every chart. This is the #1 cause of a failed upload.

## 2. Account-level metrics are limited to the last 30 days
`follower_count` (new followers), `reach`, and other account metrics only return data
for roughly the **last 30 days** (`follower_count` in particular hard-errors on older
ranges). So the **Overview page always queries a rolling 30-day window** anchored at
the end of the selected range (`windowEnding(range, 30)`), regardless of what the user
picks in the date control. Post, Story, and Audience data are NOT limited this way —
they work over long ranges (e.g. 6 months).

## 3. "Unique/reach" fields over >31 days need a date dimension
Reach-type account fields over a >31-day range require the `instagram_insights_date`
dimension in the query. The Overview daily query includes it. (Combined with #2, the
Overview stays inside 30 days anyway.)

## 4. Several profile metrics are DEPRECATED by Instagram (hard errors)
These are still listed by `list_fields` but Instagram's API now **rejects** them
("metric must be one of …"): `impressions` (profile-level), `email_contacts`,
`text_message_clicks`, `get_directions_clicks`, `phone_call_clicks`. **Never query
them** — it fails the whole chart. The bundled Overview shows the 4 "Taps" cards as a
static `0` with an honest note, precisely because email/message/directions can't be
fetched.

## 5. `profile_views` and `website_clicks` need `metric_type=total_value`
These exist but only as a single total (`metric_type=total_value`); they don't support
a daily breakdown, and the raw `query_data` MCP tool can't send that parameter (so it
errors). The report bridge (porter-blend) may handle them, but for safety the bundled
Overview does **not** depend on them. If a user wants "Profile Views"/"Website Taps"
live, test it through an upload first — if the audit 422s on the field, drop it.

## 6. Follower demographics need a SHORT window, one metric per query
`audience_gender` and `audience_age` are current snapshots. Querying them over a long
window (>~28 days) or combining gender + age in one query returns a generic error. The
bundled Audience page queries each demographic **separately** over a **7-day window**
(`windowEnding(range, 7)`). Keep it that way.

## 7. Image URLs arrive scheme-less
`media_url` and `profile_picture_url` come back **without `https://`** (e.g.
`scontent-….cdninstagram.com/…` or `…fbcdn.net/…`). Prepend `https://` before putting
them in an `<img src>` (the bundled `imgSrc()` helper does this and rejects non-URL
values so the CSP never sees a bogus src). The report CSP allows Instagram/Meta media
hosts, so they render **in the live report**. They do **not** render in the server-side
`preview.jpg` (it doesn't fetch external images) — verify images in the live report,
not the preview.

## 8. Stories are often empty — that's fine
Many accounts have no Stories in the range. The Story charts then return 0 rows, which
the upload audit reports as **warnings, not errors**. A published report with empty
Story charts is expected and still valid.

## Field reference (the metrics the bundled report uses)
- **Overview (30-day window):** `followers_count` (total followers, take latest),
  `follower_count` (new followers, sum), `reach` (profile reach, sum), dimension
  `instagram_insights_date`; markers from a posts query (`timestamp`, `media_url`,
  `caption`, `like_count`, `engagement`).
- **Posts (full range):** `engagement`, `post_impressions`, `like_count`, `saved`,
  `comments_count` (+ derived engagement rate = engagement/post_impressions×100);
  Top posts add `media_type`, `permalink`, `caption`, `media_url`, `timestamp`,
  `post_reach`; post types = `media_type` × `post_count`; heatmap =
  `week_day_timestamp` × `timestamp_hour` × `engagement`.
- **Stories (full range):** `story_impressions`, `story_reach`, `replies`, `exits`,
  `story_timestamp`, `story_media_type`.
- **Audience (7-day window):** `audience_gender_related` × `audience_gender`;
  `audience_age_related` × `audience_age`.
- **Header:** `profile_picture_url` (avatar), `profile_username`.
