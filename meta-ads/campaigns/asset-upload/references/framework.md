# Framework — Asset Upload validation (the brain)

Small skill, but the value is **rejecting bad assets before Meta does**. Validate, then transport.

## 1. Validate the source file (before any upload)
The source can be a **local file on disk**, a **Drive file**, or a **public URL**. Get `mime` + `size`
accordingly: Drive → `storage.get_file`; local → stat it (`file` / `ls -l` / python); public URL → trust
it (Meta validates on fetch).

| Check | Rule | If it fails |
|---|---|---|
| Type is a real image | `image/jpeg` or `image/png` | Reject. **WebP NOT supported** (Meta `1487411 FileTypeNotSupported`). GIF uploads but behaves as static — prefer jpg/png. |
| Not a native Google file | mime NOT starting `application/vnd.google-apps.` | Reject — `download_file` rejects these; export a Slide/Drawing to png/jpg first. |
| Size | See the size note below — do **NOT** trust `prepare_upload`'s `max_size_bytes`. | — |
| (Video) type | mime starts `video/` (MP4/MOV) | Route to `video_upload`; video processes **async**. |

**Size — the one rule to trust (validated 2026-07-15):** ignore the `max_size_bytes: 2097152` (2 MB)
that `prepare_upload` returns — it is **NOT enforced** (a 6 MB image and a 3.35 MB video uploaded fine).
The real ceiling is **Meta's** (a 29 MB image failed `1885355 "Resized Image Too Large"`). Files up to a
few MB go fine via the JSON POST; for very large files use the **`url`** transport (Meta fetches
server-side, no base64 inflation). The **30 MiB** figure applies ONLY to `storage.download_file` (the
Drive-download step), not to the Meta upload.

Fail loud and specific ("this is a Google Slide, export it to PNG first") — never pass a bad file to
Meta and let it throw a cryptic error.

## 2. Choose the transport — two working paths (validated 2026-07-15)
- **Already-public image URL** (CDN, etc.) → `image_upload(url=…)` via `execute_action`. Simplest; no
  bytes move through the agent. Meta fetches the URL server-side.
- **Local file (incl. from Drive) → `prepare_upload` + JSON POST** — the reliable path for local bytes:
  1. `prepare_upload(purpose="action", action="facebook_ads.image_upload", account_id=<signed ref>)`
     → returns `upload_url` (single-use, POST, ~2 MB cap).
  2. From **code** (Bash/curl — NOT the model), base64-encode the file locally and POST a **JSON body**:
     ```
     POST <upload_url>   Content-Type: application/json
     {"account_id":"act_XXXX","image_base64":"<local base64, no data: prefix>","filename":"creative.png","mime":"image/png"}
     ```
     `account_id` = the **native `act_…`** id (the presigned token already carries source_user/company).
     → HTTP 200 with `{images:{<filename>:{hash:…}}}`. Use that `hash` as `image_hash` in `ad_create`.
- ⚠️ **Never stream a large base64 through the model** (as an `execute_action image_base64` argument):
  it truncates and Meta rejects it ("Invalid image format"). Always encode in code and POST to the
  presigned URL. (Feedback gaps 37/39 — the presigned works; only the JSON-body shape was undocumented.)
- **Single-use token:** a failed POST (even a 400) burns the token — request a fresh one per attempt.
- Do NOT make a Drive file public to build a URL (that's a permission change the skill must not do) —
  use the `prepare_upload` path for Drive files instead.

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
1. mime validated (real image jpg/png / handled video, not native Google, not WebP)?
2. size sane (do NOT trust the 2 MB `max_size_bytes`; very large files → `url` transport)?
3. transport chosen (`prepare_upload`+JSON POST for local/Drive bytes; `url` only for genuinely public URLs)?
4. Meta account resolved as the SIGNED blob for `prepare_upload`/`execute_action` (but native `act_…` inside the JSON POST body)?
5. On a write throttle (2859015), back off — don't retry-storm.
