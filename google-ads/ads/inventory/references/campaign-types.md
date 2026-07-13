# Campaign-type nuances — where creative lives, and what's reachable

The single most important thing about Google Ads creative: **the data model changes with the
campaign type.** A skill that assumes "ad → headlines/descriptions" silently returns blanks for
half of a modern account. This file is the map. Search/RSA is built first; the rest is documented
so the inventory (and its consumers) know the boundary and route correctly.

`ad_group_ad.ad.type` and `campaign.advertising_channel_type` tell you which row you're in.

---

## SEARCH — Responsive Search Ads (RSA)  ✅ primary scope
- **Where copy lives:** `ad_group_ad` → `responsive_search_ad.headlines[]` / `.descriptions[]`.
  Per-asset performance + metrics via `ad_group_ad_asset_view`.
- **Shape:** up to **15 headlines (30 chars)** + **4 descriptions (90 chars)** per ad; Google
  mixes & matches at serve time. Assets can be **pinned** to a position (`pinned_field`).
- **Reachable:** text, pin, `performance_label` (LOW/GOOD/BEST), per-asset impr/clicks/conv/cost,
  `ad_strength` (POOR→EXCELLENT, ad-level), final URLs, suffix. **Everything the cluster needs.**
- **Mental model:** one ad = a *pool* of interchangeable assets, not a fixed line. "Which headline
  wins" is a real question here (and only here, at asset grain).

## Legacy — Expanded Text Ads (ETA) / Text Ads  ⚠️ flat fallback
- Sunset for creation in 2022 but **still serve if enabled**. `ad.type` = `EXPANDED_TEXT_AD` /
  `TEXT_AD`.
- **Where copy lives:** flat fields — `ad.expanded_text_ad.headline_part1/2/3`,
  `.description1/2`. **No asset rows, no pin, no performance_label.**
- **Handle as:** a flat 3-headline / 2-description ad; metrics only at ad level. Flag as legacy
  (a cleanup signal for `copy-hygiene`).

## PERFORMANCE MAX (PMax)  🔜 follow-up
- **No `ad_group_ad`.** Creative lives in **asset groups**: `asset_group` →
  `asset_group_asset` (one row per asset×role).
- **Roles (field_type):** `HEADLINE` (30), `LONG_HEADLINE` (90), `DESCRIPTION` (90),
  `BUSINESS_NAME` (25), plus images (`MARKETING_IMAGE`, `SQUARE_MARKETING_IMAGE`,
  `PORTRAIT_MARKETING_IMAGE`, `LOGO`), `YOUTUBE_VIDEO`. **No pinning.** Has a `performance_label`
  per asset (LOW/GOOD/BEST) and an asset-group `ad_strength`.
- **Reachable:** asset text + role + performance_label via `asset_group_asset`; metrics at
  **asset-group** grain (not clean per-text-asset clicks like Search). Search-slot impression
  share only partly reflects PMax reach.
- **Query when added:** `SELECT asset_group.name, asset_group_asset.field_type,
  asset_group_asset.performance_label, asset.text_asset.text FROM asset_group_asset`.
- **Mental model:** PMax = an asset *library* Google assembles across Search/Display/YouTube/
  Gmail/Discover. Long headlines and business name exist (Search RSA has neither). Treat its
  leaderboard as "asset performance label", not "per-headline CTR".

## DEMAND GEN (replaced Discovery, 2023)  🔜 later
- Asset-driven, visual-first (image/video carousels). `ad_group_ad` exists with
  `discovery_*`/`demand_gen_*` ad sub-types; text is short headline + description + business name.
- **Reachable:** asset text via the ad's asset fields / `ad_group_ad_asset_view`; placement
  reporting on YouTube/Gmail/Discover since Sept 2025. No keyword/search-term concept.

## DISPLAY — Responsive Display Ads  🔜 later
- `ad.type` = `RESPONSIVE_DISPLAY_AD`: multiple short + long headlines, descriptions, images,
  logos, optional video. Per-asset rows via `ad_group_ad_asset_view` (similar to RSA, plus images
  and a `LONG_HEADLINE`). No pinning.

## VIDEO (YouTube)  ⚠️ minimal text
- `ad.type` = `VIDEO_RESPONSIVE_AD` / in-stream / bumper. Creative = the **video** + companion
  banner + short CTA/headline. Text is thin; **CTR/CVR are not comparable to Search** (view-based).
  Inventory would capture the headline/description/CTA + the video asset reference, not rank copy.

## SHOPPING / Performance Max for retail  ❌ no ad copy
- There is **no headline/description creative** — the "creative" is the **product feed** (titles,
  images, price from Merchant Center). Inventory **skips** Shopping for copy; product-title
  analysis is a different skill/domain.

## APP (UAC / App campaigns)  ❌ low control
- You supply a pool of text/image/video/HTML assets; Google auto-combines. Asset-level reporting
  is limited and aggregated. Out of scope for copy ranking.

---

## What `inventory` does with non-Search types (v1)
- RSA + legacy ETA/Text → fully mapped into the tree/rollup.
- Any ad/campaign whose type is PMax / Demand Gen / Display / Video / Shopping / App → **not
  dropped silently**: recorded in `creative_graph.coverage.not_mapped` with the count, the type,
  and the reason ("creative lives in asset groups — see campaign-types.md"). This keeps the
  inventory honest about what it did and did not cover, and tells the user exactly what a
  follow-up build would add.
