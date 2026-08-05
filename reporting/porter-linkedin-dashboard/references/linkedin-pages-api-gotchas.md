# LinkedIn Pages via Porter — gotchas baked into the bundled code

These are the real constraints of the LinkedIn Company Pages API (as surfaced through the
PorterMetrics `linkedin-pages` connector) that shaped the bundled report. The
`assets/index.tsx` already handles all of them. Read this so you don't "fix" the code into
breaking, and so you can decode any `audit_failed` message.

## 1. `reauth_required` on every chart = incomplete LinkedIn authorization (NOT a bug)
This is the #1 cause of a failed LinkedIn upload/clone. If the audit fails with
`[reauth_required] component=linkedin-pages` on all charts, the Page's OAuth authorization
lapsed or was finished without granting Porter access to a Page asset. It is **not** a code
error — do not "fix" fields or report a bug. Send the user through:
```
connect_account(connector="linkedin-pages")   → open the authorization_url in a browser
```
On the LinkedIn consent screen the member must be an **administrator of the Company Page**
and must tick the Page asset. `list_accounts` also warns about this. After they finish,
retry the clone/upload. A `status:"available"` Page (vs `connected`) still needs a valid
authorization behind it — available only means Porter hasn't billed a query yet.

## 2. `linkedin` is ambiguous — always use `linkedin-pages`
`list_accounts(connector="linkedin")` errors: the slug maps to both `linkedin-ads` and
`linkedin-pages`. This report is organic Company-Page analytics → always
`linkedin-pages`. (`linkedin-ads` is paid-campaign data — a different report.)

## 3. Queries use the NATIVE Page id, not the signed token
`list_accounts` returns a signed `account_id` (a long JWT-ish string) **and** a
`native_account_id` (the numeric LinkedIn Page id, e.g. `64276106`). Use the signed one
only in `create_report`/`duplicate_report(accounts_used=…)`. The report is stored keyed by
the **native id** (`get_report → bundle_manifest.account_ids`). Because this report resolves
its account at runtime via `useAccounts()` (`porter.getAccounts()` → `[{id}]`), the query
plane re-resolves each id against the report's trusted `accounts_used` — so you never
assemble ids by hand. **Never hardcode an `ACCOUNTS` array** with a native id in the code:
that is what breaks cloning (a duplicate re-points `accounts_used`, not the source).

## 4. Total followers is a SNAPSHOT, not a sum
`linkedin_pages_totalFollowers` is a running total. Take the **max over the range**
(`maxRow`), never `sum` — summing a daily snapshot inflates it wildly. New followers
(`linkedin_pages_newOrganicFollowers`) IS a daily flow and is summed. The Overview card
delta uses the `max` aggregation for exactly this reason.

## 5. Audience demographics are current snapshots, one dimension per query
The Audience page metrics are all `linkedin_pages_totalFollowers` broken down by a
dimension: `seniority`, `jobFunction`, `industry`, `companySize`, `country` (also `region`).
Query **each dimension separately** (the bundled Audience page does). They are a current
snapshot of who follows the Page — they don't trend over the date range, so don't add a
`date` dimension to them. Seniority is ordered by a fixed rank
(Entry→Senior→Manager→Director→VP→CXO→Owner→Partner…); the others are shown top-10 by
follower count.

## 6. LinkedIn exposes no post-type field — format is inferred from the media
There is no "post is a video/image/text" field. The report infers it from
`linkedin_pages_postImageUrl` (`postFormat()`): a video-looking media path → Video, any
other media → Image, none → Text. Keep this heuristic; don't query a media-type field that
doesn't exist.

## 7. Post & page-view captions/markup need cleaning
LinkedIn post captions carry markup like `{hashtag|\#|Foo}` and `@[Name](urn:…)`. The
`cleanPostText()` helper normalizes these to `#Foo` / `Name`. Leave it in — raw captions
otherwise show LinkedIn's internal markup.

## 8. Image URLs & the LinkedIn CDN (media.licdn.com)
Post images (`postImageUrl`) and the Page logo (`companyLogoOriginalUrl`) are hosted on
`media.licdn.com`. The report only accepts real `http(s)` URLs (`mediaSrc()` rejects
anything else so the CSP never sees a bogus src). Two consequences:
- The **logo** falls back to the LinkedIn glyph via `onError` if the CDN image can't load,
  so the header never breaks.
- Post thumbnails render **in the live report** when the wrapper CSP allows the LinkedIn
  CDN; they do **not** render in the server-side `preview.jpg` (it never fetches external
  images). Always verify images in the live report, not the preview.
- Thumbnails are shown with `object-fit: contain` on a 4:5 frame so the **whole image**
  shows (never cropped), whatever its aspect ratio. Don't switch it back to `cover`.

## 9. Empty sections are warnings, not errors
A Page with no posts in range, no page-section (Discovery) views, or sparse demographics
returns 0 rows on those charts, which the upload audit reports as **warnings**
(`error_code:"empty"`), not errors. A published report with some empty charts is expected
and still valid.

## Field reference (the metrics the bundled report uses)
All fields are prefixed `linkedin_pages_`.
- **Overview:** `totalFollowers` (snapshot, take max), `newOrganicFollowers` (sum),
  `impressions`, `reach`, `engagements`, `reactions`, `comments`, `shares`, `clicks`,
  dimension `date`; post markers from a posts query (`postText`, `postCreationDate`,
  `postImageUrl`, `impressions`, `engagements`).
- **Posts (full range):** `impressions`, `engagements`, `reactions`, `comments`, `shares`,
  `clicks` (+ derived engagement rate = engagements/impressions×100); Top posts add
  `postText`, `postUrl`, `postImageUrl`, `postCreationDate`, `postUrn`; format mix =
  `postImageUrl` inferred; best-day = post impressions bucketed by weekday.
- **Audience (snapshot):** `totalFollowers` × each of `seniority`, `jobFunction`,
  `industry`, `companySize`, `country`.
- **Discovery (full range):** `pageViews`, `uniquePageViews`, `desktopPageViews`,
  `mobilePageViews`; page sections `overviewPageViews`, `aboutPageViews`,
  `careersPageViews`, `jobsPageViews`, `peoplePageViews`, `productsPageViews`, dimension
  `date`.
- **Header:** `companyName`, `companyWebsite`, `companyLogoOriginalUrl`.
