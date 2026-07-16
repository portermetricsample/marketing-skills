# Meta Ads — Auditoría de cobertura (qué falta para que el skill sea perfecto)

Escaneo del surface completo del conector `facebook-ads` (Porter MCP, 2026-07) vs. lo que las skills
cubren. Objetivo: mapear los faltantes de **skills** y los **gaps de capacidad** del MCP.

## A. Surface COMPLETO de acciones `facebook-ads` (lo que el MCP SÍ expone)
| Área | Acciones |
|---|---|
| Campaña | `campaign_create/update/delete/list` |
| Ad set | `adset_create/update/delete/list` |
| Anuncio | `ad_create/update/list` |
| Creativo | `image_upload`, `video_upload` |
| Lectura | `object_read`, `insights_get` |
| **Audiencias** | `customaudience_create` · `customaudience_add_users` (CSV, hash SHA-256, chunking >10k) · `customaudience_get/list/update/delete` · `lookalike_create` |
| **Lead forms** | `leadform_create/update/list` · **`lead_list`** (bajar leads: nombre/email/teléfono) |
| Targeting helpers | `interest_search`, `geolocation_search` |
| Config (solo lectura) | `pixel_list`, `customconversion_list` |

## B. Cobertura por skill
| Caso de uso | Skill | Estado |
|---|---|---|
| Crear campaña | `campaigns/campaign-setup` | ✅ |
| Crear ad set (targeting/placements/promoted object) | `campaigns/adset-setup` | ✅ |
| Crear anuncio (imagen/video/carrusel/DCA) | `campaigns/ad-setup` | ✅ |
| Subir creativo (imagen/video, url/presigned) | `campaigns/asset-upload` | ✅ (endurecido por eval) |
| Presupuesto por moneda | `campaigns/_budget` | ✅ |
| Lead forms + bajar leads | `campaigns/leadform` | ✅ |
| Mapa de parámetros | `campaigns/PARAMETERS-REFERENCE.md` | ✅ |
| Análisis de creativos | `meta-ads/creative_performance` | ✅ |
| Research de competidores | `meta-ads/meta-ads-research` | ✅ |
| Dashboard/reporte | `meta-ads/porter-meta-ads-dashboard` | ✅ |

## C. SKILLS que FALTAN (recomendado construir, en orden de valor)
1. **`campaigns/audiences`** 🔴 alto — no hay skill para el bloque de audiencias, que YA está expuesto:
   crear custom audience → subir CSV de clientes (`add_users`) → crear lookalike → usar en targeting +
   exclusiones/retargeting. Es la base de casi toda campaña seria. **Falta y es fácil de mapear.**
2. **`campaigns/insights-reporting`** 🟠 — un skill de "leer resultados" con `insights_get`
   (breakdowns por edad/género/placement/región/día, niveles campaign/adset/ad). Hoy hay dashboard y
   creative_performance, pero falta el paso operativo "dime cómo va y por qué" que alimenta las decisiones.
3. **`campaigns/rules-optimizer`** 🟠 — reglas "pausar/ajustar por CPA/ROAS": el agente lee insights →
   decide → `adset_update`/`ad_update`. (Ver gap D1: Meta tiene reglas automáticas nativas pero el MCP
   NO las expone, así que la lógica va en el skill.)
4. **`campaigns/clone-winner`** 🟠 — clonar el mejor performer: leer estructura (`*_list`+`object_read`)
   → recrear con los `*_create`. (No hay acción `duplicate` nativa — ver gap D2.)
5. **`campaigns/lead-crm-sync`** 🟢 — `lead_list` → exportar/empujar a CRM (ActiveCampaign, etc.).

## D. GAPS de capacidad del MCP (NO expuesto — candidatos a feedback/roadmap)
1. **Reglas automáticas nativas** (`adrules_library`) — no expuestas. Sin esto, la optimización por reglas
   se simula en el skill (query→decide→update), sin la ejecución server-side de Meta.
2. **Duplicar** campaña/ad set/anuncio — no hay acción; clone = leer + recrear.
3. **A/B split test** (`ab_test`/`split_test`) — no expuesto.
4. **Crear** custom conversion / pixel — solo hay `list`. Para SALES no se puede crear el píxel/conversión desde el MCP.
5. **Saved audience** (audiencia guardada de targeting) — solo custom + lookalike.
6. **Budget scheduling por calendario** (`high_demand_periods`) / dayparting avanzado — no expuesto (sí hay start/end time).
7. **Ajustes de cuenta** (spend_cap, límites) — no hay acción de escritura.
8. **Delivery/reach estimate** — no hay acción de estimación previa.
9. **Listar Páginas** — no hay `page_list` en facebook-ads (workaround: `object_read(act_…, fields="promote_pages{id,name}")`).

## E. Casos de uso "de negocio" aún sin skill (más allá de acciones sueltas)
- **Onboarding/checklist** (wizard que arma la ficha de campaña validada) — pendiente.
- **Account-safety** (evitar baneos / conectar seguro) — 🔴 en construcción (ver `meta-ads/account-safety/`).
- **Lanzamiento completo end-to-end** (campaña→adset→creativo→anuncio en un flujo guiado) — los ejecutores existen; falta el orquestador.

## Recomendación
Prioridad inmediata: **`audiences`** (capacidad ya expuesta, alto valor, fácil) y **`account-safety`**
(en curso). Luego `insights-reporting` + `rules-optimizer` (juntos habilitan la optimización). Los gaps
de la sección D van al repo de feedback como roadmap (varios ya deberían loguearse).
