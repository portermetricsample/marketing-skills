# Tools — Meta Ads Ad Setup

Read the ad set, then one `execute_action facebook_ads.ad_create`. Validated 2026-07-16.

> `account_id` = the SIGNED blob from `list_accounts` (gap 31). Full `ad_create` schema echoes on a param mismatch.

## Tool plan
| # | Tool | Kind | Why |
|---|------|------|-----|
| 1 | `object_read` (adset_id) | read | Get `objective`, `destination_type`, `is_dynamic_creative`, `promoted_object`. |
| 2 | (asset) `meta-ads-asset-upload` | — | Get `image_hash` / `video_id` first (upload is NOT this skill). |
| 3 | `facebook_ads.ad_create` | **write** | Create the ad, `status:"PAUSED"`. |
| 4 | `object_read` (ad_id) | read | Verify creative + status. |

## `ad_create` — the param map (required: name, adset_id, page_id)

### Copy + destino (todos los tipos)
- `message` — texto principal (~125). `headline` — título (~40). `description` — (~30).
- `link` — URL destino (TRAFFIC/SALES). `cta_type` — botón (enum, ver §3 de la referencia). `cta_link` — URL del botón.
- **`url_tags` — UTMs** como query string SIN `?`: `utm_source=facebook&utm_medium=paid_social&utm_campaign=…&utm_content=…`. Meta lo añade al clic; **NO lo metas dentro de `link`**.
- `lead_gen_form_id` — OBLIGATORIO para OUTCOME_LEADS.

### Por tipo de creativo (elige UNA ruta)
| Tipo | Params | Nota |
|------|--------|------|
| Imagen simple | `image_hash` (o `picture` = URL) | Mutuamente excluyente con video. |
| Video simple | `video_id` | Debe estar `ready` (async). |
| Carrusel | `child_attachments` (2–10: `{link,name,description,image_hash,call_to_action}`) + `multi_share_optimized`/`multi_share_end_card` | Subir cada imagen antes. |
| Dynamic Creative (DCA) | `image_hashes[]` + `dca_bodies[]`/`dca_titles[]`/`dca_descriptions[]`/`dca_call_to_action_types[]`/`dca_link_urls[]`/`dca_ad_formats[]` (exactamente 1 formato) | ⚠️ el ad set debe tener `is_dynamic_creative:true`. |
| Multi-formato por placement | `dca_images`/`dca_videos` (etiquetados) + `asset_customization_rules` (mapea 1:1/9:16/4:5/16:9 a placements; una regla catch-all) | ⚠️ requiere `is_dynamic_creative:true`; Meta valida cobertura estricta. |
| Instagram | `instagram_actor_id` | Para placements de IG. |

## Gotchas (validados)
- **DCA/multi-formato sin `is_dynamic_creative` en el ad set** → subcode 1885998. Coordinar con `adset-setup`.
- **Video async:** crear el anuncio antes de que el `video_id` esté `ready` falla. Poll `object_read(video_id, fields="status")`.
- **LEADS sin `lead_gen_form_id`** → Meta rechaza.
- `image_hash` / `picture` / `video_id` son mutuamente excluyentes.
- Todo PAUSED; activar es humano.

## Update / delete
- `ad_update` — `ad_id` + `status`/`name`/creativo/copy.
- `ad_delete` — `ad_id` (destructivo; solo test).
