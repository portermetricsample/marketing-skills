# Pipeline — Drive → Meta (exact call sequence + validated gotchas)

Everything here is **live-validated 2026-07-16** against the `facebook-ads` connector, account
**Porter `act_794709130739347`** (currency **COP**), unless marked otherwise. All objects PAUSED.

> Golden rules (inherited, all validated):
> 1. `account_id` for `prepare_upload` / `execute_action` = the **signed blob** from `list_accounts`,
>    **verbatim**. One altered char → `account_ref signature is invalid (tampered or forged)`.
> 2. In the **JSON body POSTed to the presigned URL**, `account_id` = the **native `act_…`** (not the blob).
> 3. Budgets = **minor units** (× currency offset); the API enforces a per-account **minimum**.
> 4. Never stream large base64 through the model — encode in code (the helper script does this).

## 0) Resolve account + page
```
list_accounts(connector="facebook-ads", query="<account name>")
  → pick the row; use its signed account_id blob VERBATIM everywhere below.
  ⚠️ the same native act_ can appear twice (different company_id) — disambiguate by
     company_id / source_user_id and prefer status:"connected".
execute_action("facebook_ads.object_read", account_id=<blob>,
  params={"object_id":"act_<id>", "fields":"name,promote_pages{id,name,link}"})
  → promote_pages.data[].id is the page_id for ad_create. Confirm which page with the user.
```
(Verified: Porter account → page "Porter Metrics" `1413728975526476`.)

## 1) Asset from Drive → hash / id  — pick the transport by SIZE

### Decision
```
get file metadata (Drive MCP get_file_metadata OR storage.get_file) → mimeType + size
  WebP?                       → STOP: convert to JPG/PNG (Meta: FileTypeNotSupported).
  size ≤ 10 MB                → TRANSPORT B (bytes)   ← works for images + short videos
  size > 10 MB                → TRANSPORT A (public url)  ← the only path for real videos
```
Why 10 MB: the Google-Drive MCP `download_file_content` **hard-caps at 10 MB** (measured — a 49 MB
file returns *"File too large for download, over limit of 10 MB"*). Above it you cannot get the bytes
at all, so the file must reach Meta by URL.

### Transport B — bytes (Drive ≤10 MB, or any local file)
```
1. Drive MCP: download_file_content(fileId) → JSON {content:<base64>, mimeType, title}.
   (Large results are auto-saved to a file by the harness — keep them ON DISK, out of context.)
2. prepare_upload(purpose="action", action="facebook_ads.image_upload"|"facebook_ads.video_upload",
                  account_id=<SIGNED blob>) → upload_url (single-use, ~600 s).
3. scripts/drive_to_meta_upload.py --kind image|video --from-drive-json --src <saved json>
     --account act_<id>  --upload-url <fresh>  --filename f.jpg --mime image/jpeg
   → {image_hash} or {video_id}.
```
- `max_size_bytes:2097152` (2 MB) from prepare_upload is **advisory, NOT enforced** — a **2.46 MB**
  video (and per asset-upload a 6 MB image) POSTed fine. The effective ceiling is the 10 MB Drive cap
  upstream, then Meta's own (~29 MB image = `Resized Image Too Large`).
- Presigned token is **single-use, burns on any POST incl. a 400** → on failure, call `prepare_upload`
  again and re-run. (Validated: a first bad POST returned `409 presigned_token_already_used` on reuse.)

### Transport A — public url (Drive >10 MB, e.g. real videos)
```
execute_action("facebook_ads.video_upload", account_id=<SIGNED blob>,
  params={"url":"<public direct-download URL>", "filename":"promo.mp4", "mime":"video/mp4"})
  → {id:<video_id>}   (Porter fetches server-side; no size cap on our side, ~4 GB Meta max)
```
Getting a public URL for a **private** Drive file (the user does the share step — **Claude never
changes Drive sharing**):
1. User sets the file to **"Anyone with the link"** in Drive.
2. Build a **direct-download** URL (the normal `/view` link serves HTML, not bytes):
   `https://drive.usercontent.google.com/download?id=<FILE_ID>&export=download&confirm=t`
   (the `&confirm=t` skips the virus-scan interstitial that large files otherwise return).
3. Pass it verbatim as `params.url`. ⚠️ Do NOT edit any query param of a signed URL → `403 failed to download`.
Validated: the `url` path works end-to-end (a 1 MB public MP4 → `video_id 1060923979708093`). A private
Drive link was NOT tested (requires the user to share); the mechanism (Porter fetch → Meta) is proven.

### Video is ASYNC — gate the ad on it
```
poll execute_action("facebook_ads.object_read", params={"object_id":<video_id>,"fields":"status"})
  until status == "ready"  → only then ad_create with video_id.
```

## 2) Campaign (PAUSED)
```
execute_action("facebook_ads.campaign_create", account_id=<blob>, params={
  "name":"…", "objective":"OUTCOME_TRAFFIC"|…, "special_ad_categories":[],
  "status":"PAUSED", "is_campaign_budget_optimization":false, "is_adset_budget_sharing_enabled":false})
  → {id:<campaign_id>}
```
- `objective` and `buying_type` are **frozen at create** — wrong objective = delete + recreate.
- `special_ad_categories` is **required** (`[]` = none; else HOUSING/EMPLOYMENT/CREDIT/…).
- CBO: if `is_campaign_budget_optimization:true`, put the budget HERE and NOT on the ad set.

## 3) Ad set (PAUSED)
```
execute_action("facebook_ads.adset_create", account_id=<blob>, params={
  "name":"…", "campaign_id":<id>, "billing_event":"IMPRESSIONS",
  "optimization_goal":"LINK_CLICKS", "destination_type":"WEBSITE",
  "targeting_countries":["US"], "daily_budget_amount":<minor ≥ account min>, "status":"PAUSED"})
  → {id:<adset_id>}
```
- **Budget minor units + minimum** (validated): a COP account rejected `500` with
  *"daily budget 500 COP is below the account minimum (3319 COP in minor units); raise it"* — read the
  minimum from that error and resend. Convert the user's real money via [`../../_budget/budget.md`](../../_budget/budget.md).
- `(objective, optimization_goal, billing_event, destination_type)` must be a valid **triple** or Meta
  returns subcode 1772103 — see the connector's "valid triples" knowledge entry.
- **≥1 geo is mandatory.** DCA/multi-format ad later ⇒ set `is_dynamic_creative:true` HERE.
- LEADS/AWARENESS/ENGAGEMENT need `promoted_object_page_id`; SALES needs `promoted_object_pixel_id`.

## 4) Ad (PAUSED)
```
execute_action("facebook_ads.ad_create", account_id=<blob>, params={
  "name":"…", "adset_id":<id>, "page_id":<page>, "status":"PAUSED",
  "image_hash":<hash>            # OR "video_id":<id> (ready) OR carousel/DCA (see ad-setup)
  "message":"…","headline":"…","description":"…","link":"…","cta_type":"LEARN_MORE","url_tags":"utm_…"})
  → {id:<ad_id>}
```
- `image_hash` / `picture` / `video_id` are **mutually exclusive** — one creative route per ad.
- LEADS requires `lead_gen_form_id`. UTMs go in `url_tags` (no leading `?`), NOT inside `link`.

## 5) Verify (+ teardown for tests)
```
execute_action("facebook_ads.object_read", params={"object_id":<ad_id>,
  "fields":"name,status,effective_status,creative{id,image_hash,thumbnail_url}"})
  → assert creative.image_hash == the uploaded hash, status=="PAUSED".
  (Right after create effective_status may be "IN_PROCESS" — creative still processing; normal.)

# tests only — cascade-deletes ad set + ad:
execute_action("facebook_ads.campaign_delete", account_id=<blob>, params={"campaign_id":<id>})
```

## Failure playbook (validated errors → fix)
| Error | Cause | Fix |
|-------|-------|-----|
| `account_ref signature is invalid` | edited/truncated the signed blob | re-copy the blob from `list_accounts` verbatim |
| `Object with ID '<blob>' does not exist` | put the signed blob in the presigned POST body | body `account_id` = native `act_…` |
| `409 presigned_token_already_used` | reused a single-use token | new `prepare_upload`, re-POST |
| `daily budget N below account minimum (M …)` | budget < account min / wrong units | send ≥ M minor units |
| `subcode 1772103` | invalid objective/opt-goal/billing/destination triple | consult the valid-triples matrix |
| `subcode 1885998` | DCA ad on a non-DCA ad set | `is_dynamic_creative:true` at adset create |
| `subcode 2859015` | Meta write throttle | back off, retry later — never retry-storm |
| `403 failed to download` (url path) | edited a signed URL / not public | pass URL verbatim; ensure link-shared + `confirm=t` |
| video ad rejected right after upload | `video_id` not `ready` yet | poll `object_read(video_id,"status")` first |
