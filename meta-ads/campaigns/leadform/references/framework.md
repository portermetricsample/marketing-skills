# Framework — Meta Ads Lead Form

## Diseño del formulario (calidad vs volumen)
- **Menos preguntas = más volumen, menos calidad.** Empieza con lo mínimo accionable (nombre + email o teléfono).
- **B2B:** `WORK_EMAIL` + `COMPANY_NAME` + `JOB_TITLE` filtran mejor que EMAIL genérico.
- **Higher Intent (`is_optimized_for_quality:true`):** añade un paso de revisión → sube calidad, baja volumen. Úsalo cuando el costo por lead basura sea alto.
- **Preguntas `CUSTOM`:** para calificar (presupuesto, tamaño de empresa, timeline) con `key`+`label`.

## Pantalla de gracias = puente a la conversión real
- El lead form capta el dato, pero la conversión suele completarse fuera. Usa `thank_you_button_type` para llevar a la landing (`VIEW_WEBSITE`/`BOOK_ON_WEBSITE`), a WhatsApp, o a agendar (`SCHEDULE_APPOINTMENT`).
- `thank_you_website_url` con **UTMs** para atribuir el tráfico post-form.

## Seguimiento de leads
- `lead_list` trae los contactos; conéctalos rápido (la velocidad de respuesta define la conversión).
- Idealmente sincroniza a tu CRM/ActiveCampaign (fuera de esta skill).

## Cumplimiento
- `privacy_policy_url` obligatoria y visible. Declara qué datos pides y para qué.

## Qué NO hace esta skill
- Poner el form en el anuncio (`lead_gen_form_id`) → `ad-setup`. Optimizar el ad set a `LEAD_GENERATION` → `adset-setup`.
