---
name: tiktok-ads-research
description: Full competitor teardown on TikTok Ads from just a brand name. Pulls a brand's ads from the TikTok Commercial Content Library (library.tiktok.com) via Apify, dedupes by TikTok VideoID, transcribes audio (Deepgram), extracts frames, reads on-screen text (OCR), and builds a self-contained Porter visual report — the TikTok twin of meta-ads-research, reusing its enrichment + report engine. Trigger on "scrape X's TikTok ads", "TikTok creative research on Y", "audit Z on TikTok", "what TikTok ads is X running", or a library.tiktok.com URL. Output: canonical AUDIT.json + Porter HTML report.
---

# TikTok Ads Research

Clean, deduplicated extraction of a brand's TikTok Ad Library creatives → structured JSON → a Porter visual report. Same contract as `meta-ads-research`: **we extract and classify, we don't opine.** This skill is the TikTok front-end; the enrichment, OCR, and report engine are the SAME shared scripts as the Meta pipeline.

## When to trigger

- "scrape {brand}'s TikTok ads" / "what TikTok ads is {brand} running"
- "TikTok creative research on {brand}" / "audit {brand} on TikTok"
- a pasted `library.tiktok.com/ads?...` URL (the advertiser is `adv_biz_ids=`; use its NAME as `--query`)

## Why this exists (Porter gap)

Porter's native TikTok connectors (`tiktok-ads`, `tiktok-insights`) read the user's OWN account. There is NO native connector for a COMPETITOR's public TikTok ads. This skill fills that gap via Apify, exactly as `meta-ads-research` does for Meta.

## Credentials

Reuses the Meta pipeline's gitignored `.env` (same `APIFY_TOKEN` + `DEEPGRAM_TOKEN`):

```bash
cd /Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts
set -a; source ./.env; set +a
```

## Pipeline

Scripts live in the Meta pipeline scripts folder (shared infra, `data/`, `dist/`):
`/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts/`

`<PAGE_ID>` = the advertiser biz-id (folder key). `<BRAND>` = display name. `<QUERY>` = advertiser NAME searched.

**One-command path (the analogue of Meta's `run_audit.py`):** `tt_run.py` chains scrape → normalize → enrich → build_audit → intel, then stops so you write the narrative (same handoff as run_audit).

```bash
python3 tt_run.py --mode ads --page-id <PAGE_ID> --brand "<BRAND>" --query "<QUERY>" --region all --max 40
# then write data/<PAGE_ID>/narrative.json and run generate_report.py (below)
```

Or run each step explicitly:

```bash
# 1. Scrape the TikTok Ad Library (Apify data_xplorer/tiktok-ads-library-fast)
python3 tt_scrape.py --page-id <PAGE_ID> --query "<BRAND>" --region all --max-ads 40 --fetch-details true
# 2. Normalize raw TikTok ads → canonical unique_creatives.json (dedup by VideoID)
python3 tt_normalize.py --page-id <PAGE_ID> --brand "<BRAND>" --region all
# 3. REUSED: download MP4s → 3 frames → Deepgram transcript
python3 04_enrich_creatives.py --page-id <PAGE_ID> --top-n <N>       # N = video_unique from step 2
# 4. Assemble AUDIT.json (reuses build_canonical_output, patches TikTok links/limitations)
python3 tt_build_audit.py --page-id <PAGE_ID> --brand "<BRAND>" --query "<BRAND>" --region all
# 5. REUSED intel layers
python3 parse_utm.py         --page-id <PAGE_ID>
python3 funnel_classifier.py --page-id <PAGE_ID>
python3 ocr_creatives.py     --page-id <PAGE_ID>
# 6. Write narrative.json (see meta-ads-research SKILL → "Writing the narrative"), then:
python3 generate_report.py --page-id <PAGE_ID> --brand "<BRAND>" --narrative ../data/<PAGE_ID>/narrative.json
```

Output: `data/<PAGE_ID>/AUDIT.json` + intel layers + `dist/<slug>/index.html` (self-contained, base64 images, opens offline). End-to-end ~2–4 min for ~40 ads.

## Verified recipe & gotchas (built + tested 2026-08-06 on BOLD & BRAVE)

- **Actor:** `data_xplorer/tiktok-ads-library-fast`. Input that works: `{region:"all", query:"<ADVERTISER NAME>", queryType:"2", maxAds:N, fetchDetails:true}`. Passing the biz-id as `advertiserBizId` FAILS ("Invalid search parameters") — advertiser NAME + `queryType:"2"` is the working path. The biz-id is only the folder key.
- **fetchDetails:true** is needed for CTA / external URL / objective. Without it `Ad Details` come back empty.
- **EU-only disclosure (the big caveat):** spend, impressions, and demographic targeting are disclosed by TikTok ONLY for EU/EEA/UK ads (DSA law). For non-EU advertisers those fields stay empty even with fetchDetails on — `tt_build_audit` reports how many creatives had spend data in `metadata.eu_disclosure_creatives`. The report LEADS WITH CREATIVE because the teardown (transcript, frames, OCR, angles) works for every region; the "media intelligence" spend/reach tables are mostly empty outside Europe. Say this to the user.
- **Dedup by VideoID:** `tt_normalize` extracts the `VideoID=` token from the preview/media URL — stable across the many ad_ids that reuse one video (BOLD & BRAVE: 40 ads → 9 unique). Falls back to ad_id when absent.
- **Objective is a Meta-ODAX proxy** (reused `funnel_classifier`), NOT TikTok's native objective set — read as directional. TikTok UTMs often carry `__CAMPAIGN_NAME__` placeholders → objective often "Undetermined". Fine; note it.
- **Report is platform-aware:** `generate_report.py` relabels "Meta Ad Library" → "TikTok Ad Library" etc. ONLY when `AUDIT.metadata.platform != "meta"` (set by `tt_build_audit`). The Meta output stays byte-identical.
- Warn the user before any run projected to cost > $5 backend (Apify per-result + Deepgram per-minute). A ~40-ad / ~10-video run is a few cents.

## The report & analysis contract

Identical to `meta-ads-research` — read that SKILL for: the narrative deep-dive format (`narrative.json`), the fact/judgment boundary (numbers only from AUDIT, AI writes only qualitative attributes), the proxy-variable discipline (longevity/variants = investment proxy, never a performance verdict), the segmentation 2×2, and the vocabulary rules. **A complete analysis ALWAYS includes the narrative deep-dives.**

TikTok-specific note: TikTok hides all performance (views/CTR/spend outside EU) for a competitor, so every "what works" read is inference from public signals — same discipline as Meta.

## Organic (social) mode — same engine, real metrics

Built + tested 2026-08-06 on @boldandbraveofficial. The ORGANIC twin tears down a brand's normal TikTok posts (not ads). Its edge over the ads mode: **engagement is public** (views/likes/comments/shares), so the report can rank real winners instead of inferring.

**One-command path:** `python3 tt_run.py --mode social --page-id <HANDLE> --brand "<BRAND>" --handle <HANDLE> --max 18` (then write the narrative + run generate_report). Or step-by-step:

```bash
# 1. Scrape organic posts (clockworks/tiktok-scraper). shouldDownloadVideos MUST be true
#    (default in the script) — otherwise no MP4 comes back, only cover + subtitle links.
python3 tt_social_scrape.py --page-id <HANDLE> --handle <HANDLE> --max 18
python3 tt_social_normalize.py --page-id <HANDLE>          # → unique_creatives.json + social_meta.json
python3 04_enrich_creatives.py --page-id <HANDLE> --top-n <N>   # REUSED (downloads Apify KV video)
python3 tt_social_build_audit.py --page-id <HANDLE> --brand "<BRAND>"   # sets content_type=organic + engagement_summary
python3 ocr_creatives.py --page-id <HANDLE>
# write narrative.json (lead with the top-viewed posts), then:
python3 generate_report.py --page-id <HANDLE> --brand "<BRAND>" --narrative ../data/<HANDLE>/narrative.json --out ../dist/<slug>-organic/index.html
```

Organic gotchas:
- clockworks returns NO direct MP4 unless `shouldDownloadVideos:true` → then `mediaUrls[0]` is an **Apify KV-store URL that 403s without the token**. `04_enrich_creatives.download_file` now appends `?token=$APIFY_TOKEN` for `api.apify.com/v2/key-value-stores/` URLs (shared fix, benefits the YouTube twin too).
- `tt_social_build_audit` writes `data.engagement_summary` {followers, total_views, median_views, top_views, avg_engagement_rate, top_posts[]} and sets `metadata.content_type="organic"`. The report then swaps to organic KPIs, adds a "Which posts actually performed?" ranked-by-views section, and relabels "Ads"→"Social", ad-library→profile.
- Music-only posts (no speech) get no transcript — expected; they still get frames + OCR.

## TikTok visual theme

`generate_report.py` auto-applies a **TikTok skin** (near-black `#08090a` bg, cherry `#FE2C55` + cyan `#25F4EE` accents) whenever `AUDIT.metadata.platform=="tiktok"` — via `TIKTOK_THEME_CSS` appended after `build_css` (later `:root` wins) and a default accent swap in `main()`. Meta reports keep Porter purple. Add a `youtube` branch to the theme map + relabel dict for the YouTube twin.

## Roadmap

- Content-dedup by downloaded video bytes (current dedup is VideoID/ad_id — good, but a re-encode would slip through).
- Optional TikTok Creative Center pull (`doliz/tiktok-creative-center-scraper`) for category "top ads" discovery.
- YouTube twin (`streamers/youtube-scraper` + comments + subtitles) — same enrichment + report engine, another Porter gap (Porter YouTube is own-channel only). Organic YouTube also has public view/like counts → reuse the engagement_summary path.
