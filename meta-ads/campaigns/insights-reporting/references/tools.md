# Tools — Meta Ads Insights & Reporting

Read-only. `account_id` = SIGNED ref de `list_accounts`. Validado 2026-07-16.

## `insights_get` — esquema completo (validado)
`object_id` (act_… / campaign_id / adset_id / ad_id) + estos params:

| Param | Valores |
|---|---|
| `fields` | `spend, impressions, reach, clicks, cpc, cpm, ctr, frequency, actions, cost_per_action_type, conversions`. (Default = todos menos conversions.) **No** hay `campaign_name` aquí. |
| `date_preset` | `today, yesterday, this_week_mon_today, last_7d, last_14d, last_30d, this_month, last_month, this_quarter, last_quarter, this_year, last_year`. Usa esto **O** `time_range`, no ambos. |
| `time_range` | JSON: `{"since":"2026-01-01","until":"2026-01-31"}`. |
| `level` | `account` · `campaign` · `adset` · `ad` (devuelve una fila por objeto). |
| `breakdowns` | `age, gender, country, region, dma, publisher_platform, platform_position, device_platform, impression_device` (coma-separados). |
| `filtering` | JSON array, ej. `[{"field":"campaign.id","operator":"EQUAL","value":"123"}]`. |
| `limit` | filas (default 25). |

## Parsear resultados de conversión
`actions` y `cost_per_action_type` vienen como **arrays** de `{action_type, value}`. Ejemplos de `action_type`:
- `offsite_conversion.fb_pixel_purchase` (compras web) · `purchase` / `omni_purchase`
- `lead` / `offsite_conversion.fb_pixel_lead` / `onsite_conversion.lead_grouped` (leads)
- `link_click`, `landing_page_view`, `add_to_cart`, `initiate_checkout`
Toma el `action_type` que corresponde al objetivo; NO existe un número plano de "conversiones custom".
ROAS = `action_values` (valor de conversión) / `spend` cuando el píxel manda valor.

## Cómo pedir un ranking (mejor/peor performer) — alimenta clone-winner / rules-optimizer
`level=campaign` (o `adset`/`ad`) + ventana + fields con la métrica de resultado → ordena tú por
CPA (cost_per_action_type del evento) o ROAS. Une con nombres vía `object_read(id, fields="name")`.

## Gotchas
- `date_preset` mal escrito (`last_30_days`) → 400 con el enum válido en el hint.
- `campaign_name`/`adset_name` NO son fields de insights → únelos por id con `object_read`.
- `{data:[]}` = sin delivery en la ventana (no es error).
- Lecturas = 1 punto (rate limit) — baratas, pero no en ráfaga masiva.
