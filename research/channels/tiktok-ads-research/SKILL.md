---
name: tiktok-ads-research
description: Full competitor teardown on TikTok Ads from just a brand name — runs on the Porter Metrics MCP (no account, no API keys). Pulls a brand's ads from the public TikTok Commercial Content Library, dedupes by video, transcribes audio and builds a hosted Porter report. The TikTok twin of meta-ads-research; shares its analysis contract. Trigger on "scrape X's TikTok ads", "TikTok creative research on Y", "audit Z on TikTok", "what TikTok ads is X running", or a library.tiktok.com URL.
---

# TikTok Ads Research

Clean, deduplicated extraction of a brand's TikTok Ad Library creatives → structured audit → a hosted Porter report. Same contract as `meta-ads-research`: **we extract and classify, we don't opine.**

**Runs on the Porter Metrics MCP.** No connected account, no API keys — Porter runs the scraper and the transcription server-side, and the Ad Library is public. There are no tokens to expose.

## When to trigger

- "scrape {brand}'s TikTok ads" / "what TikTok ads is {brand} running"
- "TikTok creative research on {brand}" / "audit {brand} on TikTok"
- a pasted `library.tiktok.com/ads?...` URL — use the advertiser's NAME as the query

## Why this exists (Porter gap)

Porter's native `tiktok-ads` / `tiktok-insights` connectors read the user's OWN account. There is **no native connector for a COMPETITOR's public TikTok ads** (unlike Meta, which has the native `meta_ads_research.*` flow). So this skill assembles the teardown from the MCP's generic building blocks. Two things Meta gets natively are not yet available here — see **Known limits** below.

## Pipeline (all Porter MCP, no keys)

`<BRAND>` = display name · `<QUERY>` = the advertiser NAME searched.

### 1. Scrape the TikTok Ad Library

```
execute_action(action="web_scraping.run_web_scraper", params={
  "actor": "data_xplorer/tiktok-ads-library-fast",
  "input": { "region": "all", "query": "<ADVERTISER NAME>", "queryType": "2", "maxAds": 40, "fetchDetails": true },
  "waitSecs": 90
})                                        → runId + datasetId
execute_action(action="web_scraping.get_scraper_results", params={ "datasetId": "<from run>" })
```

- **`query` + `queryType:"2"` is the working path.** Passing a biz-id as `advertiserBizId` FAILS ("Invalid search parameters"). Use the advertiser NAME.
- **`fetchDetails:true`** is needed for CTA / external URL / objective — without it `Ad Details` come back empty.
- `maxAds` caps the scrape (metered) — keep it conservative; raise only if the user agrees.

### 2. Dedupe by video

Extract the `VideoID=` token from each ad's preview/media URL — it's stable across the many `ad_id`s that reuse one video (measured: 40 ads → 9 unique). Fall back to `ad_id` when absent. For a byte-true check, pass the media URLs to `media.probe_media_batch` (returns `sha256`, `has_audio_stream`, `duration_s`) — that also tells you which uniques have real audio. **Report `unique_creative_count`, never the ad count.**

### 3. Transcribe the voiced videos

```
execute_action(action="audio.transcribe_url", params={ "url": "<mp4 url of a voiced unique>" })
```

Returns the transcript + `detected_language` + word-level timings. Only run it on uniques with `has_audio_stream:true` (from step 2) — music-only / silent videos get no transcript, that's expected. **You are the translation step**: write the narrative fields in English, rendering the source faithfully (see `meta-ads-research` → "Writing the narrative").

### 4. Classify + write the narrative, then publish the report

Analysis contract, narrative schema (the 5 keys) and the fact/judgment discipline are **shared with `meta-ads-research` — read that SKILL** and apply it identically. Numbers come only from the audit; the AI writes only qualitative attributes.

Publish via the generic Porter reports flow (there is no native TikTok `publish_report`): `create_report(name="<Brand> · TikTok Ads teardown", connectors_used=[], accounts_used=[])` → `edit_report(report_id, add_page)` → build the page from the audit data + narrative using the **static-SPA report recipe** (`get_knowledge(queries=["create a hosted static SPA report", …])`). Give it a TikTok skin (near-black bg, cherry `#FE2C55` + cyan `#25F4EE` accents). The deliverable is the hosted URL.

## Known limits (honest — vs Meta's native flow)

1. **No frame-by-frame extraction.** Meta's `meta_ads_research.view_creative` returns video frames as pixels; there is no generic MCP action that samples frames from an arbitrary TikTok video. The visual read leans on the scraped **cover/thumbnail** + the transcript. Frame-by-frame is a gap → BACKLOG (a native `tiktok_ads_research` connector, or a generic frame-sampler / `view` action).
2. **No one-call report.** Meta has `publish_report`; TikTok goes through the generic `create_report` + static-SPA path (more steps, same result).

## EU-only disclosure (the big caveat — say it to the user)

Spend, impressions and demographic targeting are disclosed by TikTok **only for EU/EEA/UK ads** (DSA law). For non-EU advertisers those fields stay empty even with `fetchDetails:true`. The report **leads with creative** because the teardown (transcript, copy, angles) works for every region; the spend/reach tables are mostly empty outside Europe. State how many creatives actually had disclosure data.

Objective is read as a **Meta-ODAX proxy** (same classifier discipline as Meta), NOT TikTok's native objective set → directional. TikTok UTMs often carry `__CAMPAIGN_NAME__` placeholders → objective often "Undetermined". Note it.

## Organic (social) mode — same MCP blocks, real metrics

The organic twin tears down a brand's normal TikTok posts (not ads). Its edge: **engagement is public** (views/likes/comments/shares), so the report ranks real winners instead of inferring. Scrape with `web_scraping.run_web_scraper(actor="clockworks/tiktok-scraper", input={...})`, dedupe + probe with `media.probe_media_batch`, transcribe with `audio.transcribe_url`, and lead the report with the top-viewed posts (add a "Which posts actually performed?" ranked-by-views section).

## Analysis contract

Identical to `meta-ads-research` — read that SKILL for the narrative deep-dive format, the fact/judgment boundary (numbers only from the audit), the proxy-variable discipline (longevity/variants = investment proxy, never a performance verdict), the segmentation 2×2 and the vocabulary rules. TikTok hides all performance (views/CTR/spend outside EU) for a competitor, so every "what works" read is inference from public signals — same discipline as Meta. **A complete analysis ALWAYS includes the narrative deep-dives.**
