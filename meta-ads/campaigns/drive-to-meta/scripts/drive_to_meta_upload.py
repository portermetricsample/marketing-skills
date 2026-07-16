#!/usr/bin/env python3
"""
drive_to_meta_upload.py — Transport B helper for the drive-to-meta skill.

Moves creative BYTES into a Meta ad account via Porter's presigned upload URL,
WITHOUT streaming base64 through the model (which truncates → Meta rejects it).

It does ONE thing: given a local file (or a Google-Drive MCP download JSON) plus a
presigned upload_url, it base64-encodes in code and POSTs the JSON body Meta wants,
then prints Meta's response ({image_hash} or {video_id}).

What it does NOT do (those are MCP calls the assistant makes, not this script):
  - prepare_upload           → the assistant calls it and passes --upload-url here
  - facebook_ads.*_upload url → the URL transport (transport A) is a plain execute_action
  - campaign/adset/ad create  → assistant-driven execute_action steps

Validated live 2026-07-16 (account Porter, act_794709130739347):
  JPG + PNG images, a 115 KB mp4, and a 2.46 MB mp4 all uploaded via this exact POST.

------------------------------------------------------------------------------------
USAGE
  # 1) Assistant calls prepare_upload(purpose="action", action="facebook_ads.image_upload",
  #    account_id=<SIGNED blob>) and gets back upload_url.
  # 2) Assistant runs this:
  python3 drive_to_meta_upload.py \
      --kind image \
      --src ./creative.png \
      --account act_794709130739347 \
      --upload-url "https://mcp.portermetrics.com/presigned/....." \
      --filename creative.png --mime image/png

  # Drive source: the Google-Drive MCP download_file_content result is JSON
  # {content: <base64>, mimeType, title}. Point --src at that saved .txt/.json file
  # and add --from-drive-json; the script reads .content and (if present) .mimeType.
  python3 drive_to_meta_upload.py --kind video --from-drive-json \
      --src /path/to/download_file_content-result.txt \
      --account act_794709130739347 --upload-url "https://..." --filename promo.mp4
------------------------------------------------------------------------------------

GOTCHAS baked in (all validated):
  * account_id in THIS POST body = the NATIVE act_<id>, never the signed Porter blob.
    (The signed blob is only for prepare_upload / execute_action. Wrong one → Meta
    "Object with ID '<blob>' does not exist".)
  * The presigned token is SINGLE-USE and burns even on a failed POST (400). On any
    failure, the assistant must call prepare_upload again for a fresh URL and re-run.
  * Porter's max_size_bytes (2 MB) is advisory, NOT enforced (2.46 MB video went through).
    The real byte ceiling is the Google-Drive MCP's 10 MB download cap upstream, then
    Meta's own (~29 MB image = "Resized Image Too Large"). Bigger → use transport A (url).
  * WebP is rejected by Meta (FileTypeNotSupported) — convert to JPG/PNG first.
"""
import argparse, base64, json, os, sys, urllib.request, urllib.error

IMAGE_FIELD, VIDEO_FIELD = "image_base64", "video_base64"
DRIVE_MCP_DOWNLOAD_CAP = 10 * 1024 * 1024   # hard cap, measured 2026-07-16
META_IMAGE_SOFT_CAP     = 28 * 1024 * 1024  # ~29 MB image failed "Resized Image Too Large"


def load_bytes(src, from_drive_json):
    """Return (raw_bytes, detected_mime_or_None)."""
    if from_drive_json:
        with open(src) as f:
            d = json.load(f)
        b64 = d.get("content", "")
        if b64.startswith("data:"):                 # strip any data: prefix
            b64 = b64.split(",", 1)[1]
        return base64.b64decode(b64), d.get("mimeType")
    with open(src, "rb") as f:
        return f.read(), None


def main():
    ap = argparse.ArgumentParser(description="Transport B: bytes → Meta via presigned POST.")
    ap.add_argument("--kind", choices=["image", "video"], required=True)
    ap.add_argument("--src", required=True, help="Local file, or Drive-MCP JSON if --from-drive-json.")
    ap.add_argument("--from-drive-json", action="store_true",
                    help="--src is a download_file_content result: {content(base64), mimeType, title}.")
    ap.add_argument("--account", required=True, help="NATIVE act_<id> — NOT the signed Porter blob.")
    ap.add_argument("--upload-url", required=True, help="upload_url from a FRESH prepare_upload call.")
    ap.add_argument("--filename", default=None)
    ap.add_argument("--mime", default=None)
    ap.add_argument("--timeout", type=int, default=300)
    a = ap.parse_args()

    if not a.account.startswith("act_"):
        sys.exit(f"ERROR: --account must be the native act_<id> (got '{a.account[:24]}…'). "
                 "The signed Porter blob belongs in prepare_upload/execute_action, not here.")

    raw, drive_mime = load_bytes(a.src, a.from_drive_json)
    size = len(raw)
    field = IMAGE_FIELD if a.kind == "image" else VIDEO_FIELD
    filename = a.filename or (os.path.basename(a.src) if not a.from_drive_json else f"creative.{ 'mp4' if a.kind=='video' else 'png'}")
    mime = a.mime or drive_mime or ("video/mp4" if a.kind == "video" else "image/png")

    if mime == "image/webp":
        sys.exit("ERROR: Meta rejects WebP (FileTypeNotSupported). Convert to JPG/PNG first.")
    if size > DRIVE_MCP_DOWNLOAD_CAP:
        print(f"WARN: {size/1e6:.1f} MB exceeds the 10 MB Drive-MCP download cap — if this came "
              "from Drive it could not have been pulled by the MCP. Use transport A (public url).",
              file=sys.stderr)
    if a.kind == "image" and size > META_IMAGE_SOFT_CAP:
        print(f"WARN: {size/1e6:.1f} MB image is near/over Meta's ~29 MB reject threshold.", file=sys.stderr)

    body = json.dumps({"account_id": a.account, field: base64.b64encode(raw).decode(),
                       "filename": filename, "mime": mime}).encode()
    print(f"POST {a.kind} '{filename}' ({size/1e6:.2f} MB, {mime}) → presigned URL")
    req = urllib.request.Request(a.upload_url, data=body,
                                headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=a.timeout) as r:
            payload = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode()
        if e.code == 409:
            sys.exit("ERROR 409 presigned_token_already_used — tokens are single-use; call "
                     "prepare_upload again for a FRESH url and retry.")
        sys.exit(f"ERROR HTTP {e.code}: {detail}")

    # Normalize the id out of Meta's two response shapes.
    b = payload.get("body", payload)
    result_id = None
    if a.kind == "image":
        imgs = b.get("images", {})
        if imgs:
            result_id = next(iter(imgs.values())).get("hash")
        print(json.dumps({"ok": True, "image_hash": result_id, "raw": payload}, indent=2))
    else:
        result_id = b.get("id")
        print(json.dumps({"ok": True, "video_id": result_id,
                         "note": "video processes async — poll object_read(video_id, fields='status') until 'ready' before ad_create",
                         "raw": payload}, indent=2))
    if not result_id:
        sys.exit("ERROR: no hash/id in response — inspect 'raw' above.")


if __name__ == "__main__":
    main()
