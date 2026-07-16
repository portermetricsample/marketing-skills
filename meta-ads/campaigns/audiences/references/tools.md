# Tools — Meta Ads Audiences

`account_id` = SIGNED ref de `list_accounts`. Validado 2026-07-16.

## Acciones
| Acción | Tipo | Params clave |
|--------|------|--------------|
| `customaudience_create` | write | `name`, `subtype` (`CUSTOM`), `customer_file_source` (`USER_PROVIDED_ONLY` / `PARTNER_PROVIDED_ONLY` / `BOTH_USER_AND_PARTNER_PROVIDED`), `description` |
| `customaudience_add_users` | write | `audience_id`, `schema` (array de tipos de columna, ver abajo), `csv_base64` **o** `csv_url`, `csv_has_header`, `pre_hashed` |
| `customaudience_get` | read | `audience_id`, `fields="id,name,subtype,approximate_count,operation_status,delivery_status,retention_days,time_created"` |
| `customaudience_list` | read | `fields="id,name,subtype"`, `limit` (⚠️ NO pidas `approximate_count` en list → 400) |
| `customaudience_update` | write | `audience_id`, `name`/`description` |
| `lookalike_create` | write | `name`, `origin_audience_id`, `ratio` (0.01–0.20), `type` (`similarity`/`reach`), `allow_international_seeds`, `is_financial_service` — ⚠️ **falta location → roto (#11)** |

## `schema` — tipos de columna para subir (`customaudience_add_users`)
`EMAIL` · `PHONE` · `FN`/`LN` (nombre/apellido) · `F5FIRST`/`F5LAST` · `FI` (inicial) · `CT` (ciudad) · `ST` (estado) · `ZIP`/`ZIP4` · `COUNTRY` · `DOB`/`DOBY`/`DOBM`/`DOBD` · `GEN` (género) · `MADID` (mobile ad id, NO se hashea) · `EXTERN_ID`. Orden = orden de columnas del CSV.
- `csv_has_header:false` si no hay fila de encabezado. `pre_hashed:true` si ya vienen en SHA-256 hex (64 chars, minúsculas).
- CSVs >10.000 filas se parten en sesión encadenada automáticamente.

## Qué puedes LEER de una audiencia (`customaudience_get`)
`approximate_count` (tamaño estimado, cota inf/sup), `operation_status` (200 = lista tras subir), `delivery_status` (lista para usar), `retention_days`, `time_created`, `subtype`, `rule` (para audiencias por website/reglas). **No hay** endpoint de demografía de audiencia (Meta deprecó Audience Insights) → usa `insights_get` con breakdowns.

## Gotchas
- **No existe `customaudience_delete`** → borrar en Ads Manager.
- **Lookalike bloqueado** (#11): no acepta país/ubicación y Meta lo exige para audiencias standalone.
- `add_users` con muy pocos usuarios crea la audiencia pero será demasiado chica para usar/lookalike (Meta pide ~100+).
