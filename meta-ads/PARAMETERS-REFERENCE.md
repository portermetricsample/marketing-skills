# Meta Ads — Referencia exhaustiva de parámetros y opciones (MCP de Porter)

> Todas las variables que puedes elegir en cada nivel, con sus valores válidos (enums) y qué significa
> cada uno en lenguaje de negocio. Sacado de los esquemas reales del conector `facebook-ads` (2026-07-16).
> Úsalo para la clase, para declararlo en los skills y para crear contenido.

**Dueño de cada bloque (qué skill lo implementa):** §1 Campaña → `campaign-setup` ✅ · §2 Ad set → `adset-setup` ✅ · §3 Anuncio + §7 UTMs → `ad-setup` (pendiente) · §8 Creativos → `asset-upload` ✅ · §4 Audiencias → `audiences` (pendiente) · §5 Lead form → `leadform` (pendiente) · §6 Insights → reporting (pendiente). Los bloques "pendientes" están mapeados aquí y se meterán en su skill cuando lo construyamos.

---

## 1. Campaña (`campaign_create`)

### `objective` — el objetivo (SE FIJA AL CREAR, irreversible)
| Valor | Para qué |
|---|---|
| `OUTCOME_SALES` | Ventas / compras online. Necesita píxel + evento. |
| `OUTCOME_LEADS` | Captar prospectos (formularios, registros). |
| `OUTCOME_ENGAGEMENT` | Interacción: mensajes, video views, likes, publicaciones. |
| `OUTCOME_TRAFFIC` | Llevar clics/visitas a un sitio o app. |
| `OUTCOME_AWARENESS` | Reconocimiento / alcance (top of funnel). |
| `OUTCOME_APP_PROMOTION` | Instalaciones y eventos en app. |

### `bid_strategy` — estrategia de puja
| Valor | Qué hace |
|---|---|
| `LOWEST_COST_WITHOUT_CAP` | Máximo volumen con tu presupuesto (default recomendado). |
| `COST_CAP` | Apunta a un costo promedio por resultado (requiere `bid_value`). |
| `BID_CAP` | Tope duro por puja de subasta (requiere `bid_value`). |
| `MINIMUM_ROAS` | Retorno mínimo sobre gasto (requiere `bid_value`). |

### `buying_type` — cómo se compra el inventario (SE FIJA AL CREAR)
`AUCTION` (subasta, lo normal) · `RESERVED` (alcance y frecuencia reservados).

### `special_ad_categories` — declaración legal (OBLIGATORIA)
Array. `["NONE"]` para ads estándar, o: `HOUSING` · `CREDIT` · `EMPLOYMENT` · `ISSUES_ELECTIONS_POLITICS`.

### Presupuesto y modelo
- `is_campaign_budget_optimization` (bool) — **CBO**: un presupuesto a nivel campaña, Meta lo reparte entre ad sets.
- `daily_budget_amount` / `lifetime_budget_amount` — el schema declara **unidad MAYOR** (el connector convierte; `300000` = 300.000 COP/día). ⚠️ Ojo: en pruebas el nivel campaña guardó el número crudo — **verificar con read-back** (el helper `_budget/budget.md` ya lo hace).
- `is_adset_budget_sharing_enabled` (bool) — el schema dice "incluir SIEMPRE" (ad sets comparten hasta 20% del presupuesto o no).
- `confirm_large_budget` (bool) — para presupuestos >5000× el mínimo.
- `status` — `PAUSED` (default, seguro) · `ACTIVE`.

---

## 2. Ad set (`adset_create`) — QUIÉN ve el anuncio y DÓNDE

### `optimization_goal` — qué optimiza (debe cuadrar con el objetivo)
`LEAD_GENERATION` · `OFFSITE_CONVERSIONS` (ventas) · `LINK_CLICKS` · `LANDING_PAGE_VIEWS` · `REACH` · `IMPRESSIONS` · `POST_ENGAGEMENT` · `THRUPLAY` (video) · `PAGE_LIKES`.

### `billing_event` — por qué pagas
`IMPRESSIONS` (el más común, sirve con todo) · `LINK_CLICKS` · `POST_ENGAGEMENT` · `THRUPLAY` · `PAGE_LIKES` · `APP_INSTALLS`.

### `destination_type` — a dónde manda
`WEBSITE` (tráfico/ventas) · `ON_AD` (lead form nativo) · `APP` · `MESSENGER` · `WHATSAPP`.

### Targeting — audiencia
- **Geo:** `targeting_countries` (`["CO"]`), `targeting_cities`/`_regions`/`_zips` (keys de `geolocation_search`). Al menos uno es obligatorio.
- **Demografía:** `targeting_age_min` / `_age_max` (18–65), `targeting_genders` (`[0]` todos · `[1]` hombres · `[2]` mujeres).
- **Intereses:** `targeting_interests` (ids de `interest_search` — ❌ roto, issue #10).
- **Audiencias:** `targeting_custom_audiences` / `targeting_excluded_custom_audiences` (ids de `customaudience_list`/`lookalike_create`).
- **Advantage+ audience:** `targeting_advantage_audience` `1` (Meta amplía) / `0` (manual). ⚠️ **Obligatorio enviarlo** (issue #9).

### Placements (dónde aparece)
- `targeting_publisher_platforms`: `facebook` · `instagram` · `messenger` · `audience_network`.
- `targeting_facebook_positions`: `feed` · `right_hand_column` · `marketplace` · `video_feeds` · `story` · `search` · `instream_video` · `facebook_reels` · `facebook_reels_overlay` · `groups_feed`.
- `targeting_instagram_positions`: `stream` · `story` · `explore` · `explore_home` · `reels` · `profile_feed` · `ig_search` · `shop` · `profile_reels`.
- `targeting_audience_network_positions`: `classic` · `rewarded_video`.
- `targeting_messenger_positions`: `messenger_home` · `story` · `sponsored_messages`.
- `targeting_device_platforms`: `mobile` · `desktop`.
- **Omitir todo = placements automáticos (Advantage+)**, lo recomendado por defecto. ⚠️ El placement define qué **formatos de creativo** necesitas (1:1 feed, 9:16 story/reels, 4:5, 16:9).

### `promoted_object` — según objetivo (obligatorio en varios)
- `promoted_object_page_id` — LEADS / AWARENESS / ENGAGEMENT.
- `promoted_object_pixel_id` + `promoted_object_custom_event_type` — SALES. Eventos: `PURCHASE` · `ADD_TO_CART` · `ADD_TO_WISHLIST` · `ADD_PAYMENT_INFO` · `INITIATED_CHECKOUT` · `LEAD` · `COMPLETE_REGISTRATION` · `CONTACT` · `CONTENT_VIEW` · `SEARCH` · `START_TRIAL` · `SUBMIT_APPLICATION` · `SUBSCRIBE` · `SCHEDULE` · `DONATE` · etc.
- `promoted_object_custom_conversion_id` — para una conversión personalizada específica (de `customconversion_list`).
- `promoted_object_lead_gen_form_id` — el lead form, a nivel ad set.

### Otros
- `is_dynamic_creative` (bool) — **fijo al crear**; ponlo `true` si el anuncio va a ser DCA/multi-formato.
- `start_time` / `end_time` (ISO 8601). Presupuesto lifetime necesita ventana.
- `frequency_cap_max` / `frequency_cap_interval_days` (p. ej. 2 cada 7 días).

---

## 3. Anuncio (`ad_create`) — el CREATIVO, COPY y destino

### Copy y destino
- `message` — texto principal (arriba del creativo).
- `headline` — título (negrita, debajo).
- `description` — descripción (texto chico).
- `link` — URL de destino (obligatoria en TRAFFIC/SALES).
- **`url_tags` — parámetros UTM** ⭐. Pasa el query string SIN `?`, p. ej. `utm_source=facebook&utm_medium=paid&utm_campaign=mcp_q3&utm_content={{ad.name}}`. Meta lo mantiene aparte y lo añade al hacer clic — **NO lo metas dentro de `link`**.
- `cta_type` — botón: `LEARN_MORE` · `SIGN_UP` · `SHOP_NOW` · `BUY_NOW` · `BOOK_TRAVEL` · `GET_QUOTE` · `SUBSCRIBE` · `APPLY_NOW` · `CONTACT_US` · `GET_OFFER` · `LIKE_PAGE` · `WATCH_MORE` · `DOWNLOAD`.
- `cta_link` — URL del botón (TRAFFIC/SALES). `lead_gen_form_id` — para LEADS.

### Tipos de creativo (formatos)
- **Imagen simple:** `image_hash` (subida) o `picture` (URL).
- **Video simple:** `video_id`.
- **Carrusel:** `child_attachments` (2–10 tarjetas) + `multi_share_optimized` / `multi_share_end_card`.
- **Dynamic Creative (DCA):** `image_hashes[]` + `dca_bodies[]` / `dca_titles[]` / `dca_descriptions[]` / `dca_call_to_action_types[]` / `dca_link_urls[]` / `dca_ad_formats[]`.
- **Multi-formato por placement:** `dca_images` / `dca_videos` (etiquetados) + `asset_customization_rules` (mapea 1:1/9:16/4:5/16:9 a cada placement).
- **Instagram:** `instagram_actor_id`.

---

## 4. Audiencias

### Crear (`customaudience_create`)
- `subtype`: `CUSTOM` (lo único aquí; para lookalike usa `lookalike_create`).
- `customer_file_source`: `USER_PROVIDED_ONLY` (datos propios) · `PARTNER_PROVIDED_ONLY` · `BOTH_USER_AND_PARTNER_PROVIDED`.

### Subir usuarios (`customaudience_add_users`) — qué datos puedes cargar
`schema` = tipos de columna en orden. Válidos: **`EMAIL` · `PHONE` · `FN`/`LN` (nombre/apellido) · `F5FIRST`/`F5LAST` · `FI` (inicial) · `CT` (ciudad) · `ST` (estado) · `ZIP`/`ZIP4` · `COUNTRY` · `DOB`/`DOBY`/`DOBM`/`DOBD` (fecha nac.) · `GEN` (género) · `MADID` (mobile ad id) · `EXTERN_ID`**. Todo se normaliza y hashea SHA-256 server-side (excepto `MADID`). `pre_hashed:true` si ya vienen hasheados.

### Lookalike (`lookalike_create`)
- `ratio` — tamaño vs población del país: `0.01` = 1% … máx `0.20` = 20%. Menor = más parecido.
- `type` — `similarity` (calidad de match) · `reach` (tamaño).
- `allow_international_seeds` (bool) · `is_financial_service` (bool).
- ❌ **Falta el parámetro de ubicación** → hoy no crea (issue #11).

### Qué puedes VER / extraer de una audiencia (`customaudience_get` / `object_read`)
`id`, `name`, `subtype`, `description`, `approximate_count` (tamaño estimado, cota inferior/superior), `operation_status` (code 200 = lista tras subir), `delivery_status` (lista para usar), `time_created`, `retention_days`, `rule` (para audiencias por reglas/website). **No hay** un endpoint de "Audience Insights"/demografía (Meta lo deprecó); para perfil demográfico usa los **breakdowns de `insights_get`** (§6).

---

## 5. Lead form (`leadform_create`)

- `questions` — tipos: `FULL_NAME` · `FIRST_NAME` · `LAST_NAME` · `EMAIL` · `PHONE` · `CITY` · `STATE` · `COUNTRY` · `ZIP` · `POST_CODE` · `DOB` · `GENDER` · `JOB_TITLE` · `COMPANY_NAME` · `WORK_EMAIL` · `WORK_PHONE_NUMBER` · `WEBSITE` · `CUSTOM` (con `key` + `label`). *(Usa `PHONE`, no `PHONE_NUMBER`.)*
- `privacy_policy_url` — obligatoria.
- `thank_you_button_type`: `VIEW_WEBSITE` · `CALL_BUSINESS` · `MESSAGE_BUSINESS` · `DOWNLOAD` · `SCHEDULE_APPOINTMENT` · `VIEW_ON_FACEBOOK` · `PROMO_CODE` · `NONE` · `WHATSAPP` · `P2B_MESSENGER` · `BOOK_ON_WEBSITE`.
- `is_optimized_for_quality` — Higher Intent (paso de revisión → leads de más calidad, menos volumen).
- Recuperar leads: `lead_list` (requiere token de Página).

---

## 6. Datos que puedes EXTRAER — Insights (`insights_get`)

- **Métricas (`fields`):** `spend` · `impressions` · `reach` · `clicks` · `cpc` · `cpm` · `ctr` · `frequency` · `actions` · `cost_per_action_type` · `conversions`.
- **Nivel (`level`):** `account` · `campaign` · `adset` · `ad`.
- **Rango (`date_preset`):** `today` · `yesterday` · `this_week_mon_today` · `last_7d` · `last_14d` · `last_30d` · `this_month` · `last_month` · `this_quarter` · `last_quarter` · `this_year` · `last_year` — o `time_range` custom `{"since","until"}`.
- **Breakdowns (segmentación):** `age` · `gender` · `country` · `region` · `dma` · `publisher_platform` · `platform_position` · `device_platform` · `impression_device`.
- **Filtros (`filtering`):** JSON, p. ej. `[{"field":"campaign.id","operator":"EQUAL","value":"123"}]`.

Con esto extraes rendimiento por **demografía, plataforma, posición, dispositivo y geografía** — el insumo para reportes y para decidir dónde escalar.

---

## 7. UTMs y URLs (para trackear conversiones)

- El destino va en `link` (anuncio) o `cta_link`.
- Los **UTMs van en `url_tags`** como query string sin `?`. Meta los añade al clic y los mantiene separados del `link`. Plantilla sugerida:
  `utm_source=facebook&utm_medium=paid_social&utm_campaign={campaña}&utm_content={ad}&utm_term={adset}`.
- Para SALES, la conversión se mide con **píxel + evento** (`promoted_object_pixel_id` + `custom_event_type`) o una **conversión personalizada** (`custom_conversion_id`). Para LEADS, con el **lead form**.

---

## 8. Especificaciones de creativos por formato (para producir los assets)

Referencia de Meta (verificar en la clase; Meta ajusta specs con el tiempo).

| Ubicación | Relación | Píxeles recomendados | Formato |
|---|---|---|---|
| Feed (FB/IG) cuadrado | 1:1 | **1080 × 1080** | JPG/PNG · video MP4/MOV |
| Feed vertical | 4:5 | **1080 × 1350** | idem |
| Stories / Reels | 9:16 | **1080 × 1920** | idem |
| Horizontal / video landscape | 16:9 (o 1.91:1) | **1920 × 1080** / 1200 × 628 | idem |
| Carrusel (cada tarjeta) | 1:1 | 1080 × 1080 | idem |

- **Imagen:** JPG/PNG, mínimo 600px de ancho, hasta ~30 MB. GIF/WebP no válidos para ads.
- **Video:** MP4/MOV/H.264, hasta 4 GB. Reels/Stories ≤ 90s (9:16); feed admite más largo. **Se procesa async** — el `video_id` no sirve hasta que Meta termina.
- **Límites de texto (recomendado):** `message` (texto principal) ~125 caracteres · `headline` ~40 · `description` ~30. Meta trunca lo que exceda según el placement.
- **Multi-formato en un solo anuncio:** subir una versión por relación (1:1, 4:5, 9:16, 16:9) y mapearlas a placements con `dca_images`/`dca_videos` + `asset_customization_rules` (ver §3).

---

## Notas de cobertura
- ✅ **Subir creativo: RESUELTO** — `image_upload(url=…)` público, o `prepare_upload` (`purpose=action`) + POST **cuerpo JSON** (`{account_id, image_base64, filename, mime}`) desde **código** (nunca base64 por el modelo, se trunca).
- ❌ **No expuesto:** duplicar campañas, reach estimate, reglas automatizadas, borrar audiencias, `object_story_id` (impulsar post existente), Audience Insights/demografía de audiencia.
- ❌ **Roto hoy:** `interest_search` (#10), `lookalike_create` (#11).
