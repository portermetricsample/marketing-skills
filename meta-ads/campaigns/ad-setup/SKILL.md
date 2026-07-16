---
name: meta-ads-ad-setup
description: Create the AD (the creative + copy + CTA + destination) inside a Meta ad set — routing by creative type (single image, video, carousel, dynamic creative, per-placement multi-format), wiring the copy, the CTA button, the destination link with UTM tracking, and the lead form for LEADS. Use whenever the user wants to build/create a Meta ad, attach a creative to an ad set, write the ad copy/headline/CTA, or launch the actual advertisement, even if they don't say "Porter". Scope: the ad object only; uploading the asset is meta-ads-asset-upload, targeting/placements is meta-ads-adset-setup.
---

# Meta Ads — Ad Setup (el anuncio)

Create the **ad**: the visible unit = creative + copy + CTA + destination. It sits under an ad set and
references an already-uploaded asset (`image_hash` / `video_id` from `meta-ads-asset-upload`). This skill
is a **router by creative type** and wires the copy, CTA, link + **UTMs**, and (for LEADS) the lead form.
Account-agnostic; created **PAUSED**.

> 📖 Opciones completas de este nivel: [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md)
> §3 (Anuncio: copy, CTA, formatos), §7 (UTMs) y §8 (specs de creativo por formato). Esta skill es su dueña.

## Goal (job-to-be-done)
"Attach this creative with this copy and CTA, pointing to the landing with UTM tracking" → a correctly
structured, PAUSED ad ready for a human to turn on.

- **Who:** media buyer / marketer assembling the ad. **When:** after the ad set exists and the asset is uploaded.
- **Decision it drives:** the exact creative + message the audience sees, and where the click goes (tracked).
- **The differentiator:** it picks the right creative STRUCTURE for what the user has (one image vs a set of
  formats vs a carousel vs DCA), keeps `url_tags` (UTMs) separate from the link, and matches the CTA +
  destination to the campaign objective.

## Scope
- ✅ **Create the ad**: creative structure, `message`/`headline`/`description`, `cta_type`, `link` + `url_tags`,
  `lead_gen_form_id` (LEADS), status PAUSED.
- ✅ **Route by creative type**: single image · single video · carousel · dynamic creative (DCA) · per-placement multi-format.
- ✅ Update an existing ad (`ad_update`) and delete a test ad (`ad_delete`).
- ❌ **Uploading the file** (getting the `image_hash`/`video_id`) → `meta-ads-asset-upload`.
- ❌ **Targeting / placements / budget** → `meta-ads-adset-setup`.

## Components
- **Tools / actions:** [`references/tools.md`](references/tools.md) — the full `ad_create` param map per creative type.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the creative router, copy rules, CTA + UTM logic.
- **Output:** [`references/output.md`](references/output.md).

## Operate
**Input:** the parent `adset_id` (+ its objective, destination_type, and `is_dynamic_creative` flag), the
`page_id`, the uploaded asset(s), and the copy/CTA/link.

**Process:**
1. **Read the ad set** (`object_read`) → objective, destination_type, `is_dynamic_creative`. These decide the
   creative structure and the required fields.
2. **Route by creative type** (see [`references/framework.md`](references/framework.md)): one `image_hash` /
   one `video_id` / `child_attachments` (carousel) / `image_hashes`+`dca_*` (DCA) / `dca_images`+`asset_customization_rules` (multi-format).
   ⚠️ DCA/multi-format REQUIRE `is_dynamic_creative:true` on the ad set (else Meta rejects, subcode 1885998).
3. **Wire copy + destination:** `message`/`headline`/`description` (⚠️ no `description` on video ads — subcode 1443050); `link` is required for **all image/link ads including LEADS** (subcode 2061015 if missing), plus `lead_gen_form_id` for LEADS;
   `cta_type`; and **`url_tags` for UTMs — never baked into `link`**.
4. **Create** `facebook_ads.ad_create` with `status:"PAUSED"`. Verify with `object_read`.

**Emit** the summary in [`references/output.md`](references/output.md).

## Safety rules
- **Always PAUSED.** Account = SIGNED ref from `list_accounts`.
- **Video is async:** don't create a video ad until the `video_id` is `ready`.
- **LEADS ads require `lead_gen_form_id`** or Meta rejects.
- **Copy limits** (Meta trunca): `message` ~125, `headline` ~40, `description` ~30.

## Example
> Ad set is TRAFFIC/WEBSITE. Asset uploaded → `image_hash: abc`. → `ad_create(page_id, image_hash:"abc",
> message:"…", headline:"Porter Metrics MCP", link:"https://portermetrics.com", url_tags:"utm_source=facebook&utm_medium=paid&utm_campaign=mcp", cta_type:"LEARN_MORE", status:"PAUSED")` → report id + preview.
