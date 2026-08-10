---
name: linkedin-post-scraper
description: Scrape SPECIFIC LinkedIn posts by URL into clean structured JSON (text, author, headline, followers, engagement + reaction breakdown, media, reshares) — via the Porter Metrics MCP web scraper, no keys, no cookies. Give it one or more LinkedIn post URLs. The LinkedIn sibling of meta-ads-research / tiktok-ads-research's scrape step. Trigger on "scrape this LinkedIn post", "pull these LinkedIn posts", "get the data for this LinkedIn URL", or a pasted linkedin.com/posts/... URL. Output: posts.json. For scrape+analysis in one run, use `linkedin-posts-research`.
---

# LinkedIn Post Scraper

Turns LinkedIn post URLs into a stable `posts.json` — the clean data contract the analysis + report steps consume. **It extracts, it doesn't opine.** Same discipline as the Meta/TikTok research scrapers.

**Runs on the Porter Metrics MCP.** No API keys, no cookies, nothing to install — Porter runs the scraper server-side.

## When to trigger

- "scrape this LinkedIn post" / "pull these LinkedIn posts" / "capture this URL"
- a pasted `linkedin.com/posts/...` or `linkedin.com/feed/update/...` URL
- as step 1 of `linkedin-posts-research` (the combined scrape → analyze → report skill)

## Run it — one prebuilt scraper through the MCP

```
# 1. run the LinkedIn post scraper (server-side; no token)
execute_action(action="web_scraping.run_web_scraper", params={
  "actor": "apimaestro/linkedin-post-detail",
  "input": { "post_urls": ["URL1", "URL2", ...] },
  "waitSecs": 60
})                                        → returns runId + datasetId

# 2. pull the results
execute_action(action="web_scraping.get_scraper_results", params={ "datasetId": "<from step 1>" })
```

If the run hasn't finished when step 1 returns, poll `web_scraping.get_scraper_run(runId)` until it's ready, then fetch results. Then **map each raw item to the `posts.json` schema below** and save it (plus the raw items as `raw.json` for an audit trail).

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

- `hook` = the first non-empty line of `text`; `char_count` = length of `text`.
- Keep one record per requested URL, in the order given — never silently drop one.

## Gotchas (verified 2026-08-06)

- **Actor + input shape:** `apimaestro/linkedin-post-detail`, input `{"post_urls":[...]}`. Reliable (~197k runs), no cookies. Passing `post_url` (singular) fails — it must be the `post_urls` array.
- **Blocked posts:** carousels, document/PDF posts, and restricted/deleted posts come back as `ok:false` with `error` set ("This post cannot be displayed"). No-cookie scraping can't read those — keep the record and flag it, never drop it. Text-and-image posts read fine.
- **followers** is often `null` from this actor even for readable posts — don't treat its absence as an error.
- **Reshares:** `is_reshared` + `reshared` {author, text} capture the quoted post.
- Cost is a few cents per run (metered by Porter), a handful of URLs is trivial.
