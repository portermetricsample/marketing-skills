# Tools — Meta Ads Asset Upload (image & video → Meta)

How to get a creative file INTO a Meta ad account and get back the `image_hash` / `video_id` an ad
needs. **Everything here is live-validated (2026-07-15) against the `facebook-ads` connector.**

> 🔑 Golden rule: **never stream a large base64 through the model.** It truncates and Meta rejects it
> ("Invalid image format", subcode 2446496). Encode in CODE and use one of the two transports below.

## The two transports

### A) Public URL (simplest) — `image_upload` / `video_upload` with `url`
If the asset is already at a public URL, pass it to `execute_action`:
```
execute_action(action="facebook_ads.image_upload", account_id=<SIGNED ref>,
  params={"url":"https://…/creative.jpg", "filename":"creative.jpg", "mime":"image/jpeg"})
→ {images:{<filename>:{hash:"…", width, height}}}
```
Meta fetches the URL server-side — no size worry on our side (up to Meta's own limits). Same for
`video_upload` with `url`. ⚠️ The URL must be **publicly reachable and passed VERBATIM** — if it's a
signed Meta CDN URL (scontent…), do NOT edit any query param or you get `403 failed to download`.

### B) Local file → `prepare_upload` + JSON POST (the validated recipe for local bytes)
1. Reserve a single-use upload URL:
```
prepare_upload(purpose="action", action="facebook_ads.image_upload", account_id=<SIGNED ref>)
→ { upload_url, method:"POST", headers:{}, max_size_bytes, input_schema }
```
2. From **code** (Bash/curl — NOT the model), base64-encode locally and POST a **JSON body**:
```
POST <upload_url>    Content-Type: application/json
{"account_id":"act_XXXXXXXXXXXX", "image_base64":"<local base64, NO data: prefix>",
 "filename":"creative.png", "mime":"image/png"}
→ {"status":200,"body":{"images":{"creative.png":{"hash":"…"}}}}
```
Reference curl:
```bash
python3 -c "import base64,json;json.dump({'account_id':'act_XXXX','image_base64':base64.b64encode(open('f.png','rb').read()).decode(),'filename':'f.png','mime':'image/png'},open('p.json','w'))"
curl -s -X POST -H "Content-Type: application/json" --data-binary @p.json "<upload_url>"
```
For **video**: same, but `action="facebook_ads.video_upload"` and the field is **`video_base64`**
(`mime` `video/mp4` or `video/quicktime`). Returns `{"body":{"id":"<video_id>"}}`.

## ⚠️ `account_id` — the #1 thing that makes people fail (validated error → fix)
- In **`prepare_upload`** and in **`execute_action`**, `account_id` = the **SIGNED blob** from
  `list_accounts` (feedback gap 31).
- In the **JSON body POSTed to the presigned URL**, `account_id` = the **native `act_…` id** (the
  token already carries source_user/company).
- **The error you'll hit if you get the POST shape wrong:** `HTTP 502 → "missing URL parameter
  account_id"`. It appears if you POST multipart form-data, raw binary, or put account_id in the query
  string. **Fix: POST a JSON body** with `account_id` + `image_base64`/`video_base64` as above. (Gap 39.)

## Format support (live-tested)
| Type | Result |
|---|---|
| JPG, PNG | ✅ upload |
| GIF | ✅ accepted at upload (behaves as static at ad level) |
| **WebP** | ❌ `subcode 1487411 "FileTypeNotSupported"` — convert to JPG/PNG first |
| Video MP4, MOV | ✅ upload (video processed **async** → `video_status` goes to `ready`) |
| Any aspect ratio (1:1, 9:16, 4:5, 1.91:1, 16:9) | ✅ upload — ratio is validated at the AD/placement step, not here |
| Tiny (100×100) | ✅ upload — Meta does not enforce a minimum here (it does at ad level) |

## Size — the `max_size_bytes` (2 MB) is MISLEADING (validated, feedback gap 40)
`prepare_upload` returns `max_size_bytes: 2097152` (2 MB) but it is **NOT enforced**: a **6 MB image**
and a **3.35 MB video** uploaded fine via the JSON POST. The real ceiling is **Meta's** — a 29 MB image
failed with `subcode 1885355 "Resized Image Too Large"`. Guidance: for very large files prefer the
**`url`** transport (no base64 inflation); base64-via-presigned is fine well past 2 MB but not for
tens of MB.

## Cross-account reuse (validated)
To republish a creative from another account you have access to: read its creative's media URL
(`ad_list` → `object_read` on the ad → `creative`), then `image_upload(url=…)` into the target account.
- ✅ Works — but pass the source URL **verbatim** (editing a signed CDN URL → 403).
- ⚠️ **SHARE-type creatives** (built from a page post via `object_story_id`) only expose a **64×64
  `thumbnail_url`**, not full-res media. For full quality read the underlying post's `full_picture` /
  attachments (deeper), or the ad account's `adimages` full URL.

## Single-use token gotcha
The presigned token is **single-use and burns on ANY POST, even a failed one (400)**. On a failure,
request a fresh `prepare_upload` — don't reuse the URL.

## Chain to discover a Drive file (when the source is Google Drive)
`storage.list_files`/`get_file` (validate mime/size; native Google files rejected) →
`storage.download_file(file_id)` gives base64 → but **don't pass that base64 through the model**;
write it to a file in code and use transport **B** (or, if you can get a public URL, transport A).
