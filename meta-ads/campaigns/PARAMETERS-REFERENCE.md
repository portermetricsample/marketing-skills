# Meta Ads — Mapa exhaustivo de parámetros (todos los niveles)

Referencia única de TODOS los parámetros y opciones del pipeline de Meta Ads sobre el **Porter MCP**
(`facebook-ads`), validada en vivo (2026-07). Cada skill es dueña de una sección:
`campaign-setup` → §1 · `adset-setup` → §2 · `ad-setup` → §3 · `asset-upload` → §4/§6.

> **Regla transversal de `account_id`:** en `prepare_upload` / `execute_action` = el **blob FIRMADO** de
> `list_accounts` (nunca `act_…` pelado). SOLO dentro del **cuerpo JSON POSTeado al presigned** = el
> **`act_…` nativo**. Confundirlos es el error #1 (`missing account_id`).

---

## §1 — Campaña (`facebook_ads.campaign_create` / `_update`)
| Param | Valores / notas |
|---|---|
| `name` | Nombre visible en Ads Manager. |
| `objective` | `OUTCOME_AWARENESS` · `OUTCOME_TRAFFIC` · `OUTCOME_ENGAGEMENT` · `OUTCOME_LEADS` · `OUTCOME_APP_PROMOTION` · `OUTCOME_SALES`. **Congelado al crear.** |
| `special_ad_categories` | `[]` (ninguna) · `["HOUSING"]` · `["EMPLOYMENT"]` · `["CREDIT"]` · `["ISSUES_ELECTIONS_POLITICS"]`. **Requerido siempre.** |
| `status` | Enviar **`"PAUSED"`** siempre. |
| `is_campaign_budget_optimization` | `true` = CBO (presupuesto en la campaña) · `false`/omitir = presupuesto en el ad set. |
| `daily_budget_amount` / `lifetime_budget_amount` | ⚠️ **MINOR units** aquí (centavos): en CBO, `20000` = 200,00 COP. Ver §5. |
| `bid_strategy` | **Enviar SIEMPRE explícito** → `LOWEST_COST_WITHOUT_CAP` por defecto. Omitirlo deja `WITH_BID_CAP` sin tope = inentregable (gap 32). |
| `buying_type` | `AUCTION` (default) · `RESERVED`. **Congelado al crear.** |
| `confirm_large_budget` | `true` solo tras confirmar un monto grande. |

## §2 — Ad set (`facebook_ads.adset_create` / `_update`)
| Param | Valores / notas |
|---|---|
| `campaign_id`, `name`, `status:"PAUSED"` | — |
| `optimization_goal` | Debe calzar con el objetivo: `LEAD_GENERATION` (LEADS) · `LINK_CLICKS`/`LANDING_PAGE_VIEWS` (TRAFFIC) · `OFFSITE_CONVERSIONS` (SALES) · `REACH`/`IMPRESSIONS` (AWARENESS) · `POST_ENGAGEMENT`/`THRUPLAY`/`PAGE_LIKES` (ENGAGEMENT). |
| `billing_event` | `IMPRESSIONS` (default, sirve para todos) · `LINK_CLICKS` · `THRUPLAY` · … |
| `destination_type` | `ON_AD` (LEADS) · `WEBSITE` (TRAFFIC/SALES) · omitir (AWARENESS/ENGAGEMENT). |
| `daily_budget_amount` / `lifetime_budget_amount` | ⚠️ **MAJOR units** aquí (el connector convierte): `300000` = 300.000 COP. Solo si la campaña NO es CBO. Ver §5. |
| `bid_strategy` + `bid_value` | Explícito para presupuesto de ad set; `COST_CAP`/`BID_CAP`/`MINIMUM_ROAS` requieren `bid_value` (MAJOR units). |
| `targeting_advantage_audience` | **`0` (manual) o `1` (Advantage+). OBLIGATORIO** — omitirlo → `1870227 "Advantage Audience Flag Required"` (gap 38). |
| `targeting_countries` / `_cities` / `_regions` / `_zips` | ≥1 geo obligatorio. Ciudades/regiones = keys de `geolocation_search`. |
| `targeting_age_min` / `_age_max` / `_genders` | 18–65 · `[0]` todos / `[1]` H / `[2]` M. |
| `targeting_interests` / `_custom_audiences` / `_excluded_custom_audiences` | ids de `interest_search` / `customaudience_list`. |
| `targeting_publisher_platforms` | `facebook` · `instagram` · `messenger` · `audience_network`. |
| `targeting_facebook_positions` | `feed` `story` `reels` `marketplace` `video_feeds` `right_hand_column` `search` `instream_video` `facebook_reels` … |
| `targeting_instagram_positions` | `stream` `story` `reels` `explore` `explore_home` `profile_feed` `ig_search` `shop` … |
| `promoted_object_page_id` | Requerido para LEADS / AWARENESS / ENGAGEMENT. Obtener del account: `object_read(act_…, fields="promote_pages{id,name}")` (no hay acción `page_list`). |
| `promoted_object_pixel_id` + `_custom_event_type` | SALES. Event: `PURCHASE`, `LEAD`, `ADD_TO_CART`, … · o `promoted_object_custom_conversion_id`. |
| `promoted_object_lead_gen_form_id` | LEADS (form a nivel ad set). |
| `is_dynamic_creative` | `true` = ad set DCA. **Congelado al crear.** Requerido para ads con `image_hashes`/`asset_feed_spec`. ⚠️ un ad set DCA admite **1 solo anuncio** (`1885553`). |
| `start_time` / `end_time` / `frequency_cap_max` / `_interval_days` | ISO 8601 · frecuencia (ej. 2 cada 7 días). |

## §3 — Anuncio + creativo (`facebook_ads.ad_create` / `_update`)
**Requerido:** `name`, `adset_id`, `page_id`. (Para TRAFFIC/SALES: `link`. Para LEADS: `lead_gen_form_id`.)

| Tipo de creativo | Params |
|---|---|
| **Imagen simple** | `image_hash` (subida) **o** `picture` (URL pública). + `message` (texto principal), `headline`, `description`, `link`, `cta_type`, `cta_link`, `url_tags` (UTMs sin `?`). |
| **Video simple** | `video_id` (subido, esperar `video_status:ready`). `image_hash` opcional = thumbnail. |
| **Carrusel** | `child_attachments`: 2–10 tarjetas `{link,name,description,image_hash,call_to_action:{type,value:{link}}}`. + `multi_share_optimized`, `multi_share_end_card`. |
| **DCA (multi-imagen que Meta optimiza)** | Ad set con `is_dynamic_creative:true`. `image_hashes:[…]` + `dca_bodies`/`dca_titles`/`dca_descriptions`/`dca_call_to_action_types`/`dca_link_urls:[{website_url}]` + `dca_ad_formats:["SINGLE_IMAGE"]` (**exactamente 1**). |
| **Multi-formato por placement** | `dca_images:[{hash,adlabels:[{name}]}]` (etiquetadas) + `asset_customization_rules:[{customization_spec:{…placements…},image_label:{name}}, {customization_spec:{}, image_label:{name}, is_default:true}]`. **Requiere una regla default con `customization_spec` VACÍO** (`1885923`), CTA (`1487664`) y `dca_link_urls` (`1885373`). Frágil: puede dar `2446485 "uncoverable error"` opaco — más confiable DCA estándar o un ad set por placement. |
| **CTA `cta_type`** | `LEARN_MORE` `SHOP_NOW` `SIGN_UP` `BUY_NOW` `GET_QUOTE` `SUBSCRIBE` `APPLY_NOW` `CONTACT_US` `GET_OFFER` `DOWNLOAD` `BOOK_TRAVEL` `WATCH_MORE` `LIKE_PAGE`. |
| `instagram_actor_id` | Cuenta IG para placements de Instagram. |

`image_hash` / `picture` / `video_id` son **mutuamente excluyentes**. `status:"PAUSED"` siempre. Ad nuevo queda `effective_status: IN_PROCESS` (revisión de Meta, normal).

## §4 — Subir creativo (asset-upload)
Dos transportes: (A) `image_upload`/`video_upload` con **`url`** público; (B) local/Drive → **`prepare_upload` + POST JSON** (`account_id` nativo + `image_base64`/`video_base64` generado en código). **Nunca** base64 grande como argumento de `execute_action` (se trunca). Detalle completo: [`asset-upload/references/tools.md`](asset-upload/references/tools.md).

## §5 — Presupuesto por moneda (helper compartido)
Campaña = **minor units** (tú multiplicas × offset). Ad set = **major units** (el connector convierte).
Leer moneda de la cuenta + offset (COP=100 validado; JPY/KRW/etc=1). El `max_size_bytes`/mínimos: ver
[`_budget/budget.md`](_budget/budget.md). Mínimo por cuenta lo reporta el error de Meta.

## §6 — Especificaciones de creativo por formato (Meta)
| Placement | Ratio | Píxeles recomendados |
|---|---|---|
| Feed (FB/IG) | 1:1 | 1080×1080 |
| Feed vertical | 4:5 | 1080×1350 |
| Stories / Reels | 9:16 | 1080×1920 |
| Landscape / instream | 16:9 | 1920×1080 |
| Enlace/landscape link | 1.91:1 | 1200×628 |
Formatos: **JPG/PNG** (WebP NO). Video: **MP4/MOV**. Tamaño: el tope real es de Meta (~imagen de 29 MB = "too large"); el `max_size_bytes:2MB` del presigned **no se enforce**.

## §5b — Gotchas validados (subcodes)
`1815857` bid amount required (campaña con `*_CAP`) · `2859015` cuenta restringida/throttle (backoff; suele ser sin método de pago) · `1870227` falta advantage_audience · `1885998` ad DCA en ad set no-DCA · `1885553` ad set DCA admite 1 ad · `1487411` WebP no soportado · `1885355` imagen muy grande · `2446496` base64 truncado / formato inválido · `1885923`/`1487664`/`1885373`/`2446485` cadena de requisitos del multi-formato por placement.
