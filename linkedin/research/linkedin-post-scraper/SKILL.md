---
name: linkedin-post-scraper
description: Scrape SPECIFIC LinkedIn posts by URL into clean structured JSON (text, author, headline, followers, engagement + reaction breakdown, media, reshares). Give it one or more LinkedIn post URLs you want to capture. Uses Apify (apimaestro/linkedin-post-detail, no cookies). The LinkedIn sibling of meta-ads-research / tiktok-ads-research's scrape step. Trigger on "scrape this LinkedIn post", "pull these LinkedIn posts", "get the data for this LinkedIn URL", or a pasted linkedin.com/posts/... URL. Output: posts.json. For scrape+analysis in one run, use `linkedin-posts-research` instead.
---

# LinkedIn Post Scraper

Turns LinkedIn post URLs into a stable `posts.json` — the clean data contract that the analysis + report steps consume. **It extracts, it doesn't opine.** Same discipline as the Meta/TikTok research scrapers.

## When to trigger

- "scrape this LinkedIn post" / "pull these LinkedIn posts" / "capture this URL"
- a pasted `linkedin.com/posts/...` or `linkedin.com/feed/update/...` URL
- as step 1 of `linkedin-posts-research` (the combined scrape → analyze → report skill)

## Run it

```bash
cd /Users/juan/marketing-skills/linkedin/research/linkedin-post-scraper/scripts
python3 li_scrape.py --out <OUTDIR> "URL1" "URL2" ...
# or a file with one URL per line:
python3 li_scrape.py --out <OUTDIR> --urls urls.txt
```

Writes `<OUTDIR>/raw.json` (audit trail) and `<OUTDIR>/posts.json` (the contract).

## Credentials

`APIFY_TOKEN` from the environment, or it falls back automatically to the shared meta pipeline `.env` (`/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts/.env`) — the same token the meta/tiktok research skills use. No setup needed on this machine.

## posts.json schema (one object per requested URL)

```jsonc
{
  "url": "...", "id": "7490...", "ok": true, "error": null,
  "type": "text", "created_at": "2026-08-05 18:00:35",
  "text": "full post copy...", "hook": "first non-empty line", "char_count": 1078,
  "author": { "name": "...", "headline": "...", "followers": 1234, "profile_url": "..." },
  "stats": { "reactions": 35, "comments": 7, "shares": 2,
             "reaction_breakdown": { "like": 32, "empathy": 2, "appreciation": 1, ... } },
  "media": [ { "type": "image", "url": "..." } ],
  "is_reshared": false, "reshared": null
}
```

## Gotchas (verified 2026-08-06)

- **Actor:** `apimaestro/linkedin-post-detail`, input `{"post_urls":[...]}`. Reliable (~197k runs), no cookies. Passing `post_url` (singular) fails — it must be the `post_urls` array.
- **Blocked posts:** carousels, document/PDF posts, and restricted/deleted posts come back as `ok:false` with `error` set ("This post cannot be displayed"). No-cookie scraping simply can't read those — the record is kept and flagged, never silently dropped. Text-and-image posts read fine.
- **followers** is often `null` from this actor even for readable posts — don't treat its absence as an error.
- **Reshares:** `is_reshared` + `reshared` {author, text} capture the quoted post.
- Cost is a few cents per run (Apify per-result). A handful of URLs is trivial.
