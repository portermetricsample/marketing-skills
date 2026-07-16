---
name: meta-ads-drive-to-meta
description: End-to-end orchestrator — take a creative sitting in Google Drive and turn it into a ready-to-launch (PAUSED) Meta/Facebook ad, in one guided flow. Use when the user says "sube este creativo de Drive a Meta y ármame el anuncio", "from Google Drive to Meta Ads", "publica (en pausa) este video/imagen de mi Drive", or wants the whole chain (asset → campaign → ad set → ad) from a Drive file without stitching the sub-skills by hand. It chains meta-ads-asset-upload → meta-ads-campaign-setup → meta-ads-adset-setup → meta-ads-ad-setup, adds the Drive-source resolution + transport decision that make it CONSISTENT, verifies, and (for tests) tears down. Everything is created PAUSED; activation is a human decision.
---

# Meta Ads — Drive → Meta (end-to-end orchestrator)

One job: **a file in Google Drive → a PAUSED, ready-to-review Meta ad**, reliably, for a
non-technical user. This skill does not re-document each step — it **sequences the existing skills**
and owns the two things that make the chain break: **getting the Drive bytes into Meta** (size/transport
decision) and **wiring the ids together** (account blob, page, creative hash, budget units).

> 🔒 **Safety contract (inherited):** everything is created **PAUSED**; **activation is human**.
> `account_id` for every MCP call = the **signed blob** from `list_accounts`, passed **verbatim**
> (one wrong character → `account_ref signature is invalid`). Budgets are **minor units** (×currency
> offset) with a per-account minimum the API enforces. See [`references/pipeline.md`](references/pipeline.md).

## The chain (what runs, in order)
1. **Resolve account + page** — `list_accounts` (signed blob) + discover the Page id.
2. **Asset from Drive → hash/id** — [`../asset-upload/`](../asset-upload/) + `scripts/drive_to_meta_upload.py`.
3. **Campaign** (PAUSED) — [`../campaign-setup/`](../campaign-setup/).
4. **Ad set** (PAUSED, targeting + budget) — [`../adset-setup/`](../adset-setup/).
5. **Ad** (PAUSED, creative = the Drive hash + copy + CTA) — [`../ad-setup/`](../ad-setup/).
6. **Verify** the ad's creative == the uploaded hash; **report** ids. (Tests: **tear down** with `campaign_delete`.)

The full ordered call sequence, params, and every validated gotcha live in
**[`references/pipeline.md`](references/pipeline.md)** — read it before running.

## What makes it CONSISTENT (the differentiator)
- **Transport decision is automatic, not guessed** (the #1 source of failures):
  - Drive file **≤ 10 MB** → pull bytes with the Google-Drive MCP (`download_file_content`) →
    **transport B**: `prepare_upload` + `scripts/drive_to_meta_upload.py` (base64 POSTed **in code**,
    never streamed through the model).
  - Drive file **> 10 MB** (all real videos) → the Drive MCP **cannot download it** →
    **transport A**: the file must be **link-shared** and passed as a public `url` to
    `facebook_ads.video_upload`. (Claude does NOT change Drive sharing — the user does; see pipeline.md.)
- **Currency-aware budget:** read the account currency, convert the user's real money to minor units,
  enforce the account minimum — the user always thinks in "$X/day", never in cents.
- **Video is async:** after `video_upload`, poll `object_read(video_id, fields="status")` until
  `ready` **before** `ad_create`, or Meta rejects the ad.

## Inputs (what to collect from the user)
| Input | Needed for | Notes |
|-------|-----------|-------|
| Ad account (name or id) | all | Resolved via `list_accounts` → signed blob. |
| Drive file (id or name) | asset | An **image** (JPG/PNG — WebP is rejected) or **video** (MP4/MOV). |
| Objective | campaign | `OUTCOME_TRAFFIC` / `LEADS` / `SALES` / `AWARENESS` / `ENGAGEMENT` / `APP_PROMOTION`. |
| Facebook Page | ad | Auto-discoverable: `object_read(act_…, fields="promote_pages{id,name}")`. Confirm with the user. |
| Budget (real money/day) | ad set | Converted to minor units; ≥ account minimum. |
| Geo (≥1 country) | ad set | Meta rejects targeting with no geo. |
| Copy: message / headline / link / CTA | ad | LEADS also needs a `lead_gen_form_id`. |

## Operate (happy path, image)
> "Sube `business-retail.jpg` de mi Drive a la cuenta Porter y ármame un anuncio de tráfico a
> portermetrics.com, $5/día, US, en pausa."
1. `list_accounts(query="Porter")` → signed blob. `object_read(act_…, "promote_pages{id,name}")` → Page.
2. Drive file ≤10 MB → `download_file_content` → `prepare_upload(image_upload)` →
   `python3 scripts/drive_to_meta_upload.py --kind image --from-drive-json --src <dl.json>
   --account act_… --upload-url <fresh> --filename business-retail.jpg --mime image/jpeg` → `image_hash`.
3. `campaign_create(objective=OUTCOME_TRAFFIC, special_ad_categories=[], status=PAUSED)`.
4. `adset_create(optimization_goal=LINK_CLICKS, billing_event=IMPRESSIONS, destination_type=WEBSITE,
   targeting_countries=["US"], daily_budget_amount=<minor≥min>, status=PAUSED)`.
5. `ad_create(page_id, image_hash, message, headline, link, cta_type=LEARN_MORE, status=PAUSED)`.
6. `object_read(ad_id, "creative{image_hash},status")` → confirm hash matches + PAUSED. Report ids.

**Validated end-to-end live 2026-07-16** (account Porter `act_794709130739347`, COP): Drive JPG →
hash `3b21ca91…` → campaign → ad set (min budget 3319 COP minor) → ad (creative == hash) → verified
PAUSED → deleted. See [`references/pipeline.md`](references/pipeline.md) for the video path + edge cases.

## Scope / boundary
- ✅ Orchestrates: Drive source → asset id → campaign → ad set → ad (PAUSED) → verify → (test) teardown.
- ❌ Does NOT re-implement targeting/objective/creative-format detail — that lives in the sub-skills
  (`campaign-setup`, `adset-setup`, `ad-setup`, `asset-upload`). This skill decides the **order,
  the transport, and the id plumbing**.
- ❌ Does NOT activate ads, change Drive sharing, or invent budgets/audiences.
