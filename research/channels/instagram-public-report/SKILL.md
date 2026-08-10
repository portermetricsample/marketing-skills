---
name: instagram-public-report
description: Build a hosted Porter Metrics report analyzing ANY public Instagram business/creator account (a competitor, a brand you admire) from Instagram Public Data via the Porter MCP. Trigger with /instagram-public-report or when the user asks to "analyze X's Instagram", "reporte de Instagram de X", "competitor Instagram report", "what is X posting on IG", "IG teardown of X", or gives an instagram.com/<handle> URL. Output: a self-contained report hosted at report.portermetrics.com/<id> (NOT a chat artifact) — profile, deeper signals, post carousel with real thumbnails, creators/collaborators breakdown, publishing-frequency time series and a weekday×hour heatmap. Account-agnostic: pass any handle.
---

# Instagram Public Report

Turns a public Instagram handle into a hosted Porter dashboard. All data comes
from the **Porter MCP `instagram-public-data`** actions (Meta Business Discovery)
+ local processing. The account under analysis is NOT a Porter customer, so the
report is **self-contained** (data frozen in, empty allowlist) — the same pattern
as `meta-ads-research`, but for organic Instagram.

**The deliverable is the report URL** (`report.portermetrics.com/<id>`), never a
chat summary and never a Claude artifact. If you stop at an analysis in chat you
delivered nothing.

## When to trigger
"analyze X's Instagram", "reporte de Instagram de X", "competitor IG report",
"qué está publicando X en IG", "IG teardown of X", an `instagram.com/<handle>` URL.

> NOT this skill for the user's OWN Instagram performance ("cómo va mi Instagram")
> — that is a connected `instagram-insights` account with reach/saves/stories/
> demographics. This skill reads a PUBLIC account and has only the public subset.

## Prerequisites
- Porter MCP with at least ONE connected `instagram-insights` **business/creator**
  account (used only as the Business Discovery auth context — its numeric id is the
  `user_id`). Get it from `list_accounts(connector="instagram-insights")`.
- Code execution with **network + `npm`/`node` + macOS `sips` + `curl`**. Run the
  image + build steps with the **sandbox OFF**.
- The target must be a PUBLIC **business or creator** account. Personal/private
  accounts are invisible to Business Discovery — say so and stop.

## What's available (and what is NOT)
Public Business Discovery gives ONLY: `followers_count, follows_count, media_count,
biography, website, profile_picture_url` and per post `caption, media_type,
media_product_type, media_url, thumbnail_url, permalink, timestamp, like_count,
comments_count, children{…}`. There is **no** reach, saves, impressions, true
engagement rate, stories, audience demographics, or profile taps — those need an
owned account. State this; never invent them.

## Pipeline

### 1 — Resolve auth + target
`list_accounts(connector="instagram-insights")` → pick any connected account; note
its numeric `native_account_id` (that's the `user_id`). Resolve the target handle
from the user's words / URL (strip `@` and `instagram.com/`).

Every call is `instagram_public_data.profile_get` / `instagram_public_data.profile_media`
with `account_id`=<the auth account's signed id>, `user_id`=<its numeric id>, and
the TARGET embedded in `fields` as `business_discovery.username(<target>){…}`.
(Do NOT use `instagram_insights.business_discovery_get` — it ignores the username
and returns YOUR account.)

### 2 — Pull the data (feed the numbers, mind the caps)
Make these calls and keep the raw results:

a. **Profile** — `profile_get`, fields
   `business_discovery.username(<t>){id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website}`.

b. **Frequency set (~100 posts, metadata only)** — `profile_media`, paginate with
   `media.limit(50){timestamp,media_type,media_product_type,like_count,comments_count}`
   then `media.limit(50).after(<cursor>){…}`. Metadata-only paginates fine to 100+.
   Map each to a simple `type`: `media_product_type==REELS → "Reel"`, else
   `CAROUSEL_ALBUM → "Carousel"`, `IMAGE → "Image"`, `VIDEO → "Video"`.

c. **Latest 12 (visuals)** — `profile_media`,
   `media.limit(12){caption,media_type,media_product_type,media_url,thumbnail_url,permalink,like_count,comments_count}`.
   Use `media_url` (image/carousel cover) or `thumbnail_url` (video/reel).

d. **Carousel depth** — `profile_media`, `media.limit(12){id,media_type,children{id}}`
   → slide count = `len(children.data)` per carousel.

e. **Creator captions (≤25)** — `profile_media`,
   `media.limit(25){permalink,caption,like_count,comments_count}` (first page only).
   ⚠️ **Caption pagination is broken** upstream: `media.limit(N).after(<cursor>)`
   WITH `caption` returns invalid JSON (a later caption with a stray backslash breaks
   the stream). So creator mining is capped at the **first ~25 captions** — report
   that as a limitation, do not claim full-history creators. (Bug filed with Porter.)

### 3 — Extract creators (you, from caption text)
Business Discovery **strips the `@`** — mentions arrive as plain tokens
("harpermurrayy", "jadepicon and tobjizzle"). Read the ≤25 captions and pick out
the real handles (you are good at this; a regex is not). For each post, list its
`creators[]`. Then build the ranked breakdown: one row per handle with `posts`
(how many of the sampled posts tag it) and `likes` (combined likes of those posts),
plus a short `type` label (Creator / Athlete · sport / Team account). This is the
one analyst-filled part — everything else is measured.

### 4 — Assemble `audit.json`
Write it to disk in this shape (see `examples/adidas.audit.json`):

```jsonc
{
  "brand": "adidas", "handle": "adidas", "generated": "Aug 6, 2026",
  "profile": { "followers": 29635828, "follows": 1060, "media_count": 1637,
               "bio": "…", "website": "https://…", "avatar_url": "<profile_picture_url>" },
  "windows": { "freq_n": 100, "eng_n": 50, "visuals_n": 12, "creator_posts_n": 25 },
  "posts":  [ { "ts": "2026-07-27T09:28:38", "type": "Carousel", "likes": 14698, "comments": 98 }, … ],
  "recent": [ { "code": "DbSp…", "type": "Carousel", "is_video": false, "caption": "…",
                "likes": 14702, "comments": 98, "date": "Jul 27", "slides": 8,
                "creators": ["spraguerrrr"], "img_url": "<media_url or thumbnail_url>" }, … ],
  "creators": [ { "handle": "tatemcrae", "type": "Creator · musician", "posts": 2, "likes": 531533 }, … ],
  "collab": { "tagged_posts": 11, "total_posts": 25, "unique_handles": 12, "hashtag": "#YouGotThis", "hashtag_pct": 50 }
}
```
`posts` = the ~100 for frequency/heatmap; the most-recent ones that carry `likes`
(≥ the latest 50) also drive engagement/format/viral. `recent` = the 12 with images.
Engagement/format/viral/median/conversation are all DERIVED by the generator — do
not pre-compute them.

### 5 — Generate the report
```
python3 scripts/generate.py <audit.json> <work_dir>     # sandbox OFF (downloads images)
```
Downloads + embeds the avatar and 12 thumbnails, computes every stat, writes
`report.html` (standalone preview) and `report_data.ts` (for the template). Sanity-
check the printed summary line (followers / posts / viral% / median / conv%).

### 6 — Publish to report.portermetrics.com
```
create_report(name="<Brand> · Instagram Public Report", connectors_used=[], accounts_used=[])
        → report_id + base_template_url          # EMPTY allowlist — nothing to query
python3 scripts/prepare_template.py <base_template_url> <work_dir>/report_data.ts <tpl_dir>
edit_report(report_id, operations=[{"action":"add_page","name":"__rebuild__"}])
        → upload_url
python3 scripts/publish.py <tpl_dir> <upload_url>         # sandbox OFF (npm build + POST)
```
A clean upload prints `status 200 · audit ok · errors 0` and the `report_url`.
Then `preview_report(report_id)` for a login-free `preview_url` to show the user.
Hand over BOTH. Never hand over the create-time URL before the 200.

The upload returns an advisory `design` verdict tuned for **live** dashboards
(wants a date picker, period-over-period deltas, time-series). This report is a
frozen public snapshot — those don't apply, exactly as the meta-ads-research recipe
warns. `design` is advisory and never blocks; do not invent metrics to satisfy it.
It also misreads "~" as "−" in vision — ignore "negative value" flags.

## Truthfulness rules (obligatory)
1. **State every sample size.** Frequency on N posts, engagement on the recent M,
   creators on ≤25 captions. Never imply full-history coverage.
2. **`@` is stripped** → creator extraction is best-effort text parsing. Say so on
   the creators section (the generator already prints this note).
3. **Times are UTC**, the brand's publishing clock — not audience-local.
4. **Public data has no reach/impressions** → engagement is likes+comments only;
   the rate is follower-based. Never present a reach/saves/impressions figure.
5. **Median leads, mean follows** — a viral cluster skews the mean; the generator
   already leads with the median.
6. **Business/creator accounts only.** Personal/private accounts can't be read.

## Gotchas
- Caption pagination bug caps creators at ~25 (§2e) — filed with Porter.
- fbcdn/cdninstagram URLs expire in hours AND must use the FULL signed URL verbatim
  (stripping params → 22-byte reject). The generator downloads + embeds so the
  published report never depends on them.
- `limit(100)` in one call 500s (Meta) — paginate `limit(50)` ×2.
- Rarely a `profile_media` call returns another tenant's data (cross-response glitch)
  — retry; it returns correct data.
- Pin the Next buildId (prepare_template.py does this): a random id starting with "-"
  makes the upload 422 `invalid_path`.

## Files
- `scripts/generate.py` — audit.json → report.html + report_data.ts (images + stats + render).
- `scripts/report_index.tsx` — the composition page dropped into the template's `pages/index.tsx`.
- `scripts/prepare_template.py` — download template, wire in data + page, pin buildId.
- `scripts/publish.py` — npm build + zip + POST to the upload gate.
- `assets/fonts/` — Bricolage Grotesque + Hanken Grotesk + IBM Plex Mono (inlined by the report).
- `examples/adidas.audit.json` — a real, complete sample dataset the generator renders truthfully.

## Out of scope
No paid Meta ads (that's `meta-ads-research`), no owned-account insights (reach/
stories/demographics), no cross-platform. Public organic Instagram only.
