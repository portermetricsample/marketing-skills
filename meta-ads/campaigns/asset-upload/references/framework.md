# Framework — Asset Upload validation (the brain)

Small skill, but the value is **rejecting bad assets before Meta does**. Validate, then transport.

## 1. Validate the source file (before any download)
From `storage.get_file` (`mimeType`, `size`):

| Check | Rule | If it fails |
|---|---|---|
| Type is a real image | `mimeType` ∈ {`image/jpeg`, `image/png`} | Reject. GIF/WebP not accepted as Meta ad images; ask for jpg/png. |
| Not a native Google file | `mimeType` NOT starting `application/vnd.google-apps.` | Reject — `download_file` rejects these. A Slide/Drawing must be exported to png/jpg first. |
| Size within cap | `size` ≤ 30 MiB | Reject — `download_file` cap. For big video, see below. |
| (Video) type | `mimeType` starts `video/` | Route to `video_upload`; warn about the 30 MiB cap + async processing. |

Fail loud and specific ("this is a Google Slide, export it to PNG first") — never pass a bad file to
Meta and let it throw a cryptic error.

## 2. Choose the transport — ⚠️ base64-through-agent does NOT work for real images (validated 2026-07-15)
- **Already-public image URL** (CDN, etc.) → `image_upload(url=…)`. **This is the only reliable path
  today.** No bytes pass through the agent.
- **Drive file → base64** (`download_file` → `image_upload(image_base64)`) → **fails for real images.**
  A ~28 KB PNG arrived at Meta TRUNCATED to ~11 KB (subcode 2446496 "Invalid image format"): a large
  base64 cannot be shuttled reliably by the agent / the param is capped. Only works for tiny (<~10 KB)
  images. **Do not rely on it.** (Feedback gap 37.)
- **Blocked alternatives:** a Drive share link is not a direct-image URL (Meta can't fetch it); and
  making the Drive file public is a permission change the skill must NOT perform — direct the user to
  do it, or host the image at a public URL first.
- **Correct fix pending upstream:** a native Drive→Meta transfer (file_id → Meta, server-side) or a
  `prepare_upload` handle accepted by `image_upload` (gap 37). Until then, require a public URL.

## 3. Video reality check
- `download_file` caps at 30 MiB, so only small videos survive the base64 path. Most ad videos are
  larger → **this skill can't move them from Drive today.** Options to surface: host the video on a
  public URL and use `video_upload(url=…)`, or wait for a larger-file transport. Don't pretend it worked.
- Video is processed **asynchronously** after upload: a returned `video_id` is not immediately usable in
  an ad. `ad-setup` must wait for processing to finish before creating the video ad.

## 4. One asset vs many
- For a **carousel** or **DCA / multi-format** ad, this skill runs once per file and returns a LIST of
  `image_hash`es (and/or `video_id`s). `ad-setup` maps them to cards / placements. Keep filenames so the
  buyer can tell which hash is which.

## 5. What this skill does NOT decide
- Which placements need which aspect ratio, and whether the image fits → `ad-setup`.
- The ad's copy, CTA, link, lead form → `ad-setup`.
- Editing/resizing/converting the image → out of scope (do it in Drive/design first).

## Safety gate
1. mime validated (real image / handled video, not native Google)?
2. size ≤ 30 MiB?
3. transport chosen (base64 for Drive, url only for genuinely public URLs)?
4. Meta account resolved as the SIGNED blob?
5. On a write throttle (2859015), back off — don't retry-storm.
