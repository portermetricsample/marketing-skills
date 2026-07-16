---
name: meta-ads-asset-upload
description: Get a creative asset (image or video) INTO a Meta ad account and return the image_hash / video_id that an ad needs — sourcing the file from Google Drive (via the Porter storage/google-drive connector) or a public URL. Use whenever the user wants to upload an image/video from Drive to Meta/Facebook Ads, "subir una imagen de Drive a Meta", turn a Drive asset into an ad creative, or prepare creatives for an ad. Scope: the ingest step only (file → hash/id); assembling the ad (copy, CTA, placements, formats) belongs to meta-ads-ad-setup.
---

# Meta Ads — Asset Upload (Drive / URL → Meta)

Take a creative file and register it on a Meta ad account so an ad can use it. Meta ads reference
uploaded assets by **`image_hash`** (images) or **`video_id`** (videos), not by file — this skill
produces those ids. Primary source: **Google Drive** (already connected via the Porter `storage` /
`google-drive` connector). Also supports a public URL. Account-agnostic (resolve the ad account from
`list_accounts`; never hardcode).

## Goal (job-to-be-done)
"Use this image from my Drive as the ad creative" → a validated `image_hash` on the right ad account,
ready for `meta-ads-ad-setup`.

- **Who:** marketer / media buyer assembling ads from assets stored in Drive. **When:** before creating
  an ad, or in bulk when preparing a set of creatives.
- **Decision it drives:** which concrete asset id(s) the ad will use.
- **The differentiator:** it validates the file (real image type, not a native Google file, within the
  size cap) BEFORE uploading, and picks the reliable transport (base64), so the ad step never fails on
  a bad asset.

## Scope
- ✅ **Locate + validate** a Drive file (`storage.list_files` / `get_file`).
- ✅ **Download** its bytes (`storage.download_file` → base64) and **upload** to Meta
  (`facebook_ads.image_upload` / `video_upload`) → return `image_hash` / `video_id`.
- ✅ Also accept a **public URL** source (pass straight to Meta's `url` param).
- ❌ **Ad assembly** (copy, headline, CTA, link, placements, per-placement formats, carousel/DCA
  structure) → `meta-ads-ad-setup`.
- ❌ Image editing / resizing / format conversion.

## Components (read as needed)
- **📖 Mapa exhaustivo de TODOS los parámetros y opciones (todos los niveles):** [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md) — incluye **§8 Especificaciones de creativos por formato** (relaciones, píxeles, límites de peso/texto), que es lo que esta skill produce/sube.
- **Tools / chain:** [`references/tools.md`](references/tools.md) — the exact 3-step call chain + limits.
- **Framework / validation:** [`references/framework.md`](references/framework.md) — what to accept,
  reject, and which transport to use.
- **Output:** [`references/output.md`](references/output.md) — the hash/id payload for ad-setup.

## Operate
**Input:** the ad account (name/id) + the source — a Drive `file_id` (or a name to search), or a public
image URL.

**Process:**
1. **Resolve the asset:** if given a name, `storage.list_files` to find the `file_id`; `get_file` for
   `mimeType` + `size`.
2. **Validate** (see [`references/framework.md`](references/framework.md)): supported image type
   (`image/jpeg`, `image/png`) or a video within limits; NOT a native Google type; size ≤ 30 MiB.
3. **Transport:**
   - Drive file → `storage.download_file(file_id)` → base64 → `facebook_ads.image_upload(image_base64,
     filename, mime)`.
   - Public URL → `facebook_ads.image_upload(url=…)` directly (skip Drive).
   - Video → `facebook_ads.video_upload` (base64 or url); remember video is processed **async**.
4. **Return** the `image_hash` / `video_id` for `meta-ads-ad-setup`.

**Emit** the payload in [`references/output.md`](references/output.md).

## Safety / limits
- **Account-agnostic:** the Meta `account_id` is the SIGNED blob from `list_accounts`, never `act_…`.
- **30 MiB cap** on `storage.download_file` — images fine; large videos are NOT downloadable this way
  (Drive gives no clean direct-download URL either → flag as a limitation, don't silently truncate).
- **Native Google files rejected** by `download_file` — validate mime first.
- **Meta write throttle** (`subcode 2859015`): if `image_upload` returns a temporary block, back off
  and retry later — never retry-storm.

## Example (illustrative — NOT rules)
> "Sube `business-restaurantes.jpg` de mi Drive a la cuenta Acme POS." → `list_files` (find id) →
> `get_file` (image/jpeg, 109 KB ✓) → `download_file` (base64) → `image_upload` → `image_hash:
> abc123`. Report the hash + "ready to attach in ad-setup."
