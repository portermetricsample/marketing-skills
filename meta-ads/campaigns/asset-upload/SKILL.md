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
  size limits) BEFORE uploading, and picks the reliable transport — a public **URL**, or **`prepare_upload`
  + a JSON POST** for local/Drive bytes (NOT base64 streamed through the model, which truncates) — so the
  ad step never fails on a bad asset.

## Scope
- ✅ **Locate + validate** a Drive file (`storage.list_files` / `get_file`).
- ✅ **Upload** the bytes to Meta → return `image_hash` / `video_id`, via `prepare_upload` + a JSON POST
  (local/Drive bytes) or `image_upload`/`video_upload` with a public `url`. (For Drive, fetch bytes with
  `storage.download_file`, but POST them from code — never as a model argument.)
- ✅ Source can be a **local file on disk**, a **Drive file**, or a **public URL** — not only Drive.
  Local/Drive bytes go via `prepare_upload` + JSON POST; a public URL goes straight to Meta's `url` param.
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
3. **Transport** — the exact recipe is in [`references/tools.md`](references/tools.md) §"two transports":
   - **Public URL** → `facebook_ads.image_upload(url=…)` via `execute_action` (Meta fetches it).
   - **Local file / Drive bytes** → `prepare_upload` (SIGNED account ref) → then, in CODE, base64-encode
     and POST a **JSON body** (`account_id` = the **native `act_…`**, `image_base64`, `filename`, `mime`)
     to the returned `upload_url`. **Never** pass a large base64 as an `execute_action` argument — it truncates.
   - **Video** → same, via `facebook_ads.video_upload` / `video_base64`; video is processed **async**.
4. **Return** the `image_hash` / `video_id` for `meta-ads-ad-setup`.

**Emit** the payload in [`references/output.md`](references/output.md).

## Safety / limits
- **`account_id` — the two-place rule (the #1 failure point):** in `prepare_upload` / `execute_action`
  it's the **SIGNED blob** from `list_accounts` (never bare `act_…`); but inside the **JSON body POSTed
  to the presigned URL** it's the **native `act_…`** id. See [`references/tools.md`](references/tools.md).
- **Execution model:** the assistant runs the base64-encode + `curl` POST — a non-technical user only
  supplies the file and names the account. The presigned token is **single-use and ~600 s-lived**, so
  call `prepare_upload` immediately before the POST.
- **Size:** don't trust `prepare_upload`'s `max_size_bytes` (2 MB, not enforced — a 2.46 MB video and a
  6 MB image POSTed fine); the real upload cap is Meta's (~29 MB image = "too large"). The binding limit
  is UPSTREAM, on the Drive **download**: the standalone Google-Drive MCP `download_file_content`
  **hard-caps at 10 MB** (validated 2026-07-16; a 49 MB file errors *"over limit of 10 MB"*). Porter's
  `storage.download_file` connector caps higher (~30 MiB). **Either way, any Drive file too big to
  download must reach Meta by the `url` transport** — see the end-to-end recipe (share "Anyone with the
  link" + `drive.usercontent.google.com/download?id=…&export=download&confirm=t`) in
  [`../drive-to-meta/references/pipeline.md`](../drive-to-meta/references/pipeline.md).
- **Formats:** **WebP rejected** by Meta (`FileTypeNotSupported`); native Google files rejected by
  `download_file` — validate mime first.
- **Account disambiguation:** `list_accounts` can return the **same `native_account_id` more than once**
  (different `company_id` under the same `source_user_id`). Disambiguate by `source_user_id` **and**
  `company_id`, and prefer the `status:"connected"` row.
- **Meta write throttle** (`subcode 2859015`): back off and retry later — never retry-storm.

## Example (illustrative — NOT rules)
> "Sube `business-restaurantes.jpg` de mi Drive a la cuenta Acme POS." → `list_files` (find id) →
> `get_file` (image/jpeg, 109 KB ✓) → `download_file` (base64) → `image_upload` → `image_hash:
> abc123`. Report the hash + "ready to attach in ad-setup."
