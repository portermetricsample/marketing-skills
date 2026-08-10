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
- **Transport decision is automatic, not guessed** (the #1 source of failures). It keys off the
  **standalone Google-Drive MCP**, whose `download_file_content` hard-caps at **10 MB** — so 10 MB is
  the cutoff *in this setup*. (If instead you reach Drive through Porter's `storage.download_file`
  connector, its bytes ceiling is ~30 MiB — raise the cutoff accordingly; see asset-upload.)
  - Drive file **≤ 10 MB** → pull bytes (`download_file_content`) → **transport B**:
    `prepare_upload` + `scripts/drive_to_meta_upload.py` (base64 POSTed **in code**, never streamed
    through the model).
  - Drive file **> 10 MB** (all real videos) → the Drive MCP **cannot download it** →
    **transport A**: the file must be **link-shared** and passed as a public `url` to
    `facebook_ads.video_upload`. (Claude does NOT change Drive sharing — the user does, and can
    re-privatize once Meta has its copy; see pipeline.md.)
- **Currency-aware budget:** read the account currency, convert the user's real money to minor units,
  enforce the account minimum — the user always thinks in "$X/day", never in cents.
- **Video is async:** after `video_upload`, poll `object_read(video_id, fields="status")` until
  `ready` **before** `ad_create`, or Meta rejects the ad.

## Inputs (what to collect from the user)
| Input | Needed for | Notes |
|-------|-----------|-------|
| Ad account (name or id) | all | Resolved via `list_accounts` → signed blob. |
| Drive file (id or name) | asset | An **image** (JPG/PNG — WebP is rejected) or **video** (MP4/MOV). |
| Objective | campaign | **All carry the `OUTCOME_` prefix** (frozen at create): `OUTCOME_TRAFFIC` / `OUTCOME_LEADS` / `OUTCOME_SALES` / `OUTCOME_AWARENESS` / `OUTCOME_ENGAGEMENT` / `OUTCOME_APP_PROMOTION`. |
| Facebook Page | ad | Auto-discoverable: `object_read(account_id=<signed blob>, object_id="act_…", fields="promote_pages{id,name}")`. Confirm with the user. |
| Budget (money/day, **in the ACCOUNT'S currency**) | ad set | The Porter account is **COP**, not USD — read the account currency first and take the user's number in THAT currency. Convert to minor units (×offset), enforce the account minimum. Never treat "$5" as 5 account-currency units. |
| Geo (≥1 country) | ad set | Meta rejects targeting with no geo. |
| Copy: message / headline / link / CTA | ad | **LEADS** also needs a `lead_gen_form_id` → get it first via the sibling **[`../leadform/`](../leadform/)** skill (`leadform_create` / `leadform_list`); the orchestrator does not create the form. **Video ads:** omit `description` (Meta rejects it on video). |

## Operate (happy path, image)
> "Sube `business-retail.jpg` de mi Drive a la cuenta Porter y ármame un anuncio de tráfico a
> portermetrics.com, COP 20.000/día, US, en pausa." (Budget is in the account currency — Porter is COP.)
1. `list_accounts(query="Porter")` → signed blob (+ read the account **currency**).
   `object_read(account_id=<blob>, object_id="act_…", fields="promote_pages{id,name}")` → Page.
2. **Get the file's size + mime first** (`get_file_metadata`). WebP → stop (convert). ≤10 MB →
   `download_file_content` → `prepare_upload(image_upload)` → `python3
   scripts/drive_to_meta_upload.py --kind image --from-drive-json --src <dl.json> --account act_…
   --upload-url <fresh> --filename business-retail.jpg --mime image/jpeg` → `image_hash`.
3. `campaign_create(objective=OUTCOME_TRAFFIC, special_ad_categories=[], status=PAUSED)`.
4. `adset_create(optimization_goal=LINK_CLICKS, billing_event=IMPRESSIONS, destination_type=WEBSITE,
   targeting_countries=["US"], daily_budget_amount=<minor≥account min>, status=PAUSED)`.
   ↳ if Meta returns **subcode 1870227 "Advantage Audience Flag Required"** (some objectives/targeting),
   resend with `targeting_advantage_audience: 0` (manual) or `1` (Advantage+, needs `age_max`=65).
5. `ad_create(page_id, image_hash, message, headline, link, cta_type=LEARN_MORE, status=PAUSED)`.
   (For a **video** ad use `video_id` instead of `image_hash`, and **omit `description`**.)
6. `object_read(ad_id, "creative{image_hash},status")` → confirm hash matches + PAUSED. Report ids.

**Validated end-to-end live 2026-07-16** (account Porter `act_794709130739347`, COP): Drive JPG →
hash `3b21ca91…` → campaign → ad set (`optimization_goal=LINK_CLICKS`, budget above the 3319 COP-minor
minimum, **no advantage-audience flag needed for plain US geo**) → ad (creative == hash) → verified
PAUSED → deleted. See [`references/pipeline.md`](references/pipeline.md) for the video path + edge cases.

## Scope / boundary
- ✅ Orchestrates: Drive source → asset id → campaign → ad set → ad (PAUSED) → verify → (test) teardown.
- ❌ Does NOT re-implement targeting/objective/creative-format detail — that lives in the sub-skills
  (`campaign-setup`, `adset-setup`, `ad-setup`, `asset-upload`). This skill decides the **order,
  the transport, and the id plumbing**.
- ❌ Does NOT activate ads, change Drive sharing, or invent budgets/audiences.
