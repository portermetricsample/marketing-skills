# Meta Ads con el MCP de Porter — Checklist maestro (clase)

> Todo lo que hay que tener presente para automatizar Meta Ads desde Claude con el MCP de Porter Metrics,
> **en orden de ejecución**. Estado validado en vivo el 2026-07-16 sobre la cuenta `act_794709130739347` (COP, con método de pago).
> Leyenda: ✅ validado en vivo · ⚠️ funciona con salvedad · ❌ roto/bloqueado (con # de issue).

---

## 0. Prerrequisitos (antes de tocar nada)

- [ ] **Cuenta publicitaria con método de pago.** Sin tarjeta, Meta bloquea crear ad sets/audiencias (`subcode 2859015`, aunque la cuenta esté activa). Verificar con `object_read(fields="funding_source,account_status")` → debe traer `funding_source` y `HAS_VALID_PAYMENT_METHODS`.
- [ ] **Página de Facebook conectada** (para anuncios y lead forms). Sacarla de `facebook-insights` → `list_accounts`.
- [ ] **Píxel** (para campañas de conversión). `pixel_list` ✅.
- [ ] **Conversión personalizada / evento** definido (para SALES/optimización). `customconversion_list` ✅.
- [ ] **URL de política de privacidad** (obligatoria para lead forms).
- [ ] **Landing / destino** con UTMs (para tráfico/ventas).
- [ ] **Creativo en una URL pública** — hoy es la ÚNICA vía que funciona para subirlo (ver §7).

---

## 1. Flujo de ejecución (el orden correcto)

| # | Paso | Acción MCP | Skill | Estado |
|---|------|-----------|-------|--------|
| 1 | Resolver la cuenta (ref firmado, NO `act_`) | `list_accounts` | — | ✅ |
| 2 | Elegir objetivo + estrategia de puja + categoría especial | (decisión) | `meta-ads-campaign-setup` | ✅ |
| 3 | **Crear campaña** (PAUSED, `bid_strategy` explícito, `special_ad_categories`) | `campaign_create` | `campaign-setup` | ✅ |
| 4 | **Crear ad set** (optimization+destination+promoted_object por objetivo; `advantage_audience` explícito; budget según CBO; ≥1 geo) | `adset_create` | `meta-ads-adset-setup` | ✅ |
| 5 | Targeting: geo | `geolocation_search` | `adset-setup` | ✅ |
| 5b | Targeting: intereses | `interest_search` | `adset-setup` | ❌ **#10** |
| 6 | Audiencias: crear semilla → subir usuarios → verificar | `customaudience_create` → `_add_users` → `_get` | (futuro `audiences`) | ✅ |
| 6b | Audiencias: lookalike | `lookalike_create` | — | ❌ **#** (gap 41) |
| 7 | Lead form (si objetivo LEADS) | `leadform_create` → `leadform_list` | (futuro `leadform`) | ✅ |
| 8 | **Subir creativo** (imagen/video) | `image_upload` / `video_upload` | `meta-ads-asset-upload` | ✅ 2 vías: `url` pública, o `prepare_upload` + POST **cuerpo JSON** (`account_id`+`image_base64`) desde código. NUNCA base64 por el modelo. |
| 9 | **Crear anuncio** (page_id + creativo + copy + CTA + link) | `ad_create` | (futuro `ad-setup`) | ✅ |
| 10 | Verificar | `object_read` / `insights_get` | — | ✅ |
| 11 | **Activar** (pasar a ACTIVE) | — decisión HUMANA, nunca automática | — | — |
| 12 | Gestión: pausar / editar / borrar | `*_update` / `*_delete` | — | update ✅ · delete ⚠️ (validar en teardown) |

---

## 2. Mapa de endpoints (30 acciones) — estado

**Campaña:** `campaign_create` ✅ · `campaign_update` ✅ · `campaign_delete` ⚠️ · `campaign_list` ✅
**Ad set:** `adset_create` ✅ · `adset_update` ✅ · `adset_delete` ⚠️ · `adset_list` ✅
**Anuncio:** `ad_create` ✅ · `ad_update` ⚠️ · `ad_delete` ⚠️ · `ad_list` ✅
**Assets:** `image_upload` ✅ (`url` pública, o `prepare_upload`+POST JSON desde código) · `video_upload` ⚠️(mismo transporte; el video se procesa async)
**Audiencias:** `customaudience_create` ✅ · `_add_users` ✅ · `_get` ✅ · `_list` ✅ · `_update` ⚠️ · `lookalike_create` ❌
**Lead gen:** `leadform_create` ✅ · `leadform_list` ✅ · `leadform_update` ⚠️ · `lead_list` ⚠️(requiere page token)
**Lectura:** `object_read` ✅ · `insights_get` ✅
**Targeting/descubrimiento:** `pixel_list` ✅ · `customconversion_list` ✅ · `geolocation_search` ✅ · `interest_search` ❌

**No soportado por el MCP (huecos):** duplicar/copiar · reach estimate · reglas automatizadas · listar ad-creatives · **borrar audiencias** (`customaudience_delete` no existe) · promocionar post existente (`object_story_id`) · listar Páginas (solo vía `facebook-insights`).

---

## 3. Gaps que BLOQUEAN la automatización (todos con issue en GitHub)

| # | Bloqueo | Impacto | Issue |
|---|---------|---------|-------|
| ~~37+39~~ | ✅ **RESUELTO** — subir creativo funciona (`url` o `prepare_upload`+JSON POST desde código). Solo queda: no streamear base64 por el modelo. | — | #3 (docs) |
| 40 | `interest_search` 500 | Sin targeting por intereses | #10 |
| 41 | `lookalike_create` sin location | Sin lookalikes | (gap 41) |
| 36 | Sin `object_story_id` | No se puede impulsar un post orgánico existente | #2 |
| 31,32,33,35,38 | Doc/defaults engañosos (account_id, bid_strategy, budget, advantage_audience) | Rompen la creación en silencio si no se conocen | #4,#5,#6,#8,#9 |

---

## 4. Trampas a tener SIEMPRE presente (el "cheat sheet")

- [ ] **account_id = ref firmado de `list_accounts`**, nunca el `act_` crudo (gap 31).
- [ ] **Presupuesto: campaña en unidades MÍNIMAS (centavos), ad set en unidad MAYOR** (gaps 33/35). Usar el helper `_budget/budget.md`.
- [ ] **`bid_strategy` explícito** (`LOWEST_COST_WITHOUT_CAP`); si no, queda inentregable y bloquea el ad set (gap 32).
- [ ] **`special_ad_categories` obligatorio** (`[]` o HOUSING/EMPLOYMENT/CREDIT/POLITICS).
- [ ] **`targeting_advantage_audience` explícito (0 o 1)** o el ad set no se crea (gap 38).
- [ ] **CBO on → presupuesto en la campaña, NO en el ad set.**
- [ ] **Objetivo y buying_type son irreversibles** (se fijan al crear).
- [ ] **promoted_object por objetivo:** LEADS→page+lead_form · SALES→pixel+evento · TRAFFIC→link en el anuncio.
- [ ] **Todo se crea PAUSED.** Activar es decisión humana.
- [ ] **Video: procesamiento asíncrono** (el `video_id` no sirve hasta que Meta termine).
- [ ] **Throttle de Meta (`2859015`): backoff, nunca reintentar en ráfaga.**
- [ ] **Las audiencias NO se borran por MCP** — hay que borrarlas en Ads Manager.

---

## 5. Skills (estado + orden de construcción)

- [x] `meta-ads-campaign-setup` — nivel campaña ✅
- [x] `meta-ads-adset-setup` — nivel ad set ✅
- [x] `meta-ads-asset-upload` — subir creativo (Drive/URL → hash) ⚠️ (depende de fix #3)
- [x] `_budget/budget.md` — helper de presupuesto currency-aware ✅
- [ ] `meta-ads-ad-setup` — nivel anuncio (router de creativo: imagen→video→carrusel→multi-formato→DCA) — PENDIENTE
- [ ] `meta-ads-audiences` — custom + add_users + lookalike (bloqueado por gap 41)
- [ ] `meta-ads-leadform` — lead form + lead_list
- [ ] `meta-ads-onboarding` — wizard/checklist (el cerebro)
- [ ] `meta-ads-clone-winner` — defaults empíricos del mejor performer

---

## 6. Para la clase (qué está listo para demostrar)

- ✅ **Crear una campaña completa en vivo** (campaña→ad set→anuncio), todo PAUSED, con el MCP — YA VALIDADO en `act_794709130739347`.
- ✅ Audiencias (crear + subir clientes) y lead forms — validado.
- ✅ Lecturas (listar, insights, píxeles, conversiones) — validado.
- ✅ **Subir el creativo propio funciona** (`url` pública, o `prepare_upload` + POST JSON desde código). Para la demo se genera el creativo HTML→PNG y se sube en vivo.
- ❌ Intereses y lookalikes: mostrar como "en el roadmap / issues abiertos".

---

## 7. Objetos de prueba creados (para limpiar)

En `act_794709130739347`: campaña `120249064692710607` · ad set `120249064698120607` · anuncio `120249082734000607` · audiencia `120249082608070607` (NO borrable por MCP) · lead form `1052737270600920`. Borrar campaña/ad set/anuncio con `campaign_delete`; audiencia y lead form desde Ads Manager.
