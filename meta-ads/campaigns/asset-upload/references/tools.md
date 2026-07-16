# Tools — Meta Ads Asset Upload (Drive / URL → Meta)

Chain across TWO connectors: `storage` (Google Drive) to get the bytes, `facebook-ads` to register
them. Validated 2026-07-15.

> 🔌 Action ids/schemas are dynamic — confirm with `list_actions`. The Drive actions live under the
> **`storage`** connector namespace (the Porter `google-drive` connector). `storage.*` actions have
> `requires_account: false` (the single connected Drive account is implicit). The Meta actions need the
> **signed** ad-account blob from `list_accounts` (feedback gap 31).

## Tool plan (ordered)

| # | Tool | Kind | Args | Why |
|---|------|------|------|-----|
| 1 | `list_connectors` | read | `query="drive"` | (optional) confirm `google-drive` → `connected: true`. |
| 2 | `execute_action` `storage.list_files` | read | `q`, `pageSize`, `orderBy`, `fields` | Find the file id when given a name/folder. Drive query syntax, e.g. `q="name contains 'hero' and mimeType contains 'image/' and trashed = false"`. |
| 3 | `execute_action` `storage.get_file` | read | `file_id`, `fields="id,name,mimeType,size"` | Read mime + size to validate BEFORE downloading. |
| 4 | `execute_action` `storage.download_file` | read | `file_id` | Returns `{ base64 bytes, filename, mime_type }`. **30 MiB cap; native Google files rejected.** |
| 5 | `execute_action` `facebook_ads.image_upload` | **write** | `account_id`=<signed blob>, `image_base64`, `filename`, `mime` | Register the image → returns `image_hash`. |
| 5' | `execute_action` `facebook_ads.video_upload` | **write** | `account_id`, `video_base64` (or `url`), `filename`, `mime` | For video → returns `video_id`. Video is processed **async** — not usable in an ad until Meta finishes processing. |

## Two transports (pick one)
- **Drive file → base64** (the reliable default): steps 4 → 5. `download_file` gives base64; pass it as
  `image_base64`. Provide EXACTLY ONE of `image_base64` or `url` to `image_upload`.
- **Public URL → Meta fetches it**: skip Drive; call `image_upload(url="https://…")` directly. ⚠️ A
  Google Drive **share link is NOT a direct-image URL** — Meta cannot reliably fetch `drive.google.com`
  view links (interstitials/auth). So for Drive, use the base64 transport, NOT `share_file` + url.

## Meta `image_upload` params
`url` XOR `image_base64` (exactly one), `filename`, `mime`. Returns an `image_hash` used in
`ad_create` (`image_hash`, `image_hashes` for DCA, or per-card in `child_attachments`).

## Limits & gotchas (validated)
- **`storage.download_file`: 30 MiB cap.** Fine for images. Large videos exceed it and Drive has no
  clean direct-download URL → **this skill cannot move big videos; say so, don't truncate.**
- **Native Google files rejected** (`application/vnd.google-apps.*` — Docs/Sheets/Slides/Drawings). A
  "design" living as a Google Drawing/Slide must be exported to png/jpg first (out of scope here).
- **Meta image formats:** JPG/PNG for ads. GIF/WebP are generally not accepted as ad images — validate
  mime and reject early with a clear message.
- **Aspect ratio / resolution per placement** is NOT checked here — that's `ad-setup`'s job (it knows
  the placements). This skill only guarantees a valid, uploaded asset.
- **Throttle:** `image_upload`/`video_upload` are writes on the ad account; a rapid burst can hit
  `subcode 2859015` (temporary block). Back off, retry later.

## Not needed here
- `storage.share_file` / `upload_file` / `copy_file` / `delete_file` — not part of the ingest path.
- `query_data` / `list_fields` — reporting, unrelated.
