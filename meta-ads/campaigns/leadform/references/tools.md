# Tools — Meta Ads Lead Form

`account_id` = SIGNED ref. Los lead forms viven en una **Página**; el `page_id` sale de `facebook-insights` → `list_accounts` (native id). Validado 2026-07-16.

## Acciones
| Acción | Tipo | Params clave |
|--------|------|--------------|
| `leadform_create` | write | `page_id`, `name`, `questions` (array de tipos), `privacy_policy_url`, `thank_you_title`/`_body`/`_button_type`/`_website_url`/`_button_text`, `follow_up_action_url`, `is_optimized_for_quality` |
| `leadform_list` | read | `page_id`, `fields`, `limit` |
| `lead_list` | read | `form_id`, `access_token` (token de Página), `fields`, `filtering`, `limit` |
| `leadform_update` | write | `leadform_id`, `name`/`status`/`tracking_parameters` — ⚠️ **roto (#12)**: falla en el lookup del page-token |

## `questions` — tipos válidos
`FULL_NAME` · `FIRST_NAME` · `LAST_NAME` · `EMAIL` · `PHONE` (¡no `PHONE_NUMBER`!) · `CITY` · `STATE` · `COUNTRY` · `ZIP` · `POST_CODE` · `DOB` · `GENDER` · `JOB_TITLE` · `COMPANY_NAME` · `WORK_EMAIL` · `WORK_PHONE_NUMBER` · `WEBSITE` · `CUSTOM` (con `key` + `label`).
Formato: `[{"type":"FULL_NAME"},{"type":"EMAIL"}]`.

## `thank_you_button_type` — enum
`VIEW_WEBSITE` · `CALL_BUSINESS` · `MESSAGE_BUSINESS` · `DOWNLOAD` · `SCHEDULE_APPOINTMENT` · `VIEW_ON_FACEBOOK` · `PROMO_CODE` · `NONE` · `WHATSAPP` · `P2B_MESSENGER` · `BOOK_ON_WEBSITE`.

## Gotchas (validados)
- **`leadform_create` resuelve el token de la Página solo** (no pasas access_token). ✅
- **`leadform_update` está roto** (#12): "nonexisting field access_token" en el lookup → archiva en Ads Manager.
- Tras publicar, Meta congela `questions`, `privacy_policy_url` y la pantalla de gracias — para cambiarlos, crea un form nuevo.
- `is_optimized_for_quality` (Higher Intent) = paso de revisión extra → leads de más calidad, menos volumen.
