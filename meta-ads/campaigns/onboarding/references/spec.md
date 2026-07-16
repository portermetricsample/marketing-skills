# Output — La "ficha de campaña" validada

El wizard produce este objeto (todos los parámetros resueltos y validados). Se muestra al usuario como
resumen ANTES de crear, y es lo que los ejecutores consumen. Emitir datos puros; el resumen al usuario va
en lenguaje claro (no este JSON crudo).

## Esquema
```json
{
  "account": { "name": "…", "id": "act_…", "currency": "COP", "min_daily": 3319, "has_payment": true },
  "naming": { "campaign": "Porter · Leads · CO · Jul2026", "adset": "CO · 25-55 · Broad", "ad": "1x1 · Pregúntale a tus datos" },
  "campaign": {
    "objective": "OUTCOME_LEADS",
    "special_ad_categories": [],
    "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
    "is_campaign_budget_optimization": true,
    "budget": { "type": "daily", "amount_major": 50000, "currency": "COP", "level": "campaign" },
    "status": "PAUSED"
  },
  "adset": {
    "optimization_goal": "LEAD_GENERATION",
    "billing_event": "IMPRESSIONS",
    "destination_type": "ON_AD",
    "targeting": { "countries": ["CO"], "age_min": 25, "age_max": 55, "genders": [0], "advantage_audience": 0,
                   "interests": [], "custom_audiences": [], "excluded_audiences": [] },
    "placements": "automatic",
    "promoted_object": { "page_id": "…", "pixel_id": null, "custom_event_type": null, "lead_gen_form_id": "…" },
    "is_dynamic_creative": false,
    "status": "PAUSED"
  },
  "creative": {
    "type": "single_image | single_video | carousel | dca | multi_format",
    "source": "generated_html | url | drive | upload",
    "assets": [ { "role": "1x1", "image_hash": null } ]
  },
  "ad": {
    "copy": { "message": "…", "headline": "…", "description": "…" },
    "cta_type": "SIGN_UP",
    "destination": { "link": "https://portermetrics.com", "url_tags": "utm_source=facebook&utm_medium=paid_social&utm_campaign=…", "lead_gen_form_id": "…" },
    "status": "PAUSED"
  },
  "validations": [
    "✅ cuenta con método de pago",
    "✅ cuádrupla objetivo/optimization/destination/promoted_object válida",
    "✅ advantage_audience explícito; edad compatible",
    "✅ presupuesto ≥ mínimo, unidad correcta por nivel",
    "✅ bid_strategy explícita; special_ad_categories presente"
  ],
  "warnings": []
}
```

## Reglas
- **Todo `status: PAUSED`.** El resumen SIEMPRE dice que no gasta hasta que el usuario active.
- `budget.amount_major` = lo que dijo el usuario (moneda real); la conversión a la unidad de cada acción
  la hace el ejecutor vía [`../_budget/budget.md`](../_budget/budget.md) — no metas centavos aquí.
- `validations` lista lo que se verificó (para que el usuario vea que está bien armado).
- `warnings` lista lo que quedó pendiente/limitado (p. ej. "intereses no disponibles hoy", "video en proceso").
- Tras crear, adjunta los ids reales (campaign/adset/ad) + el link de Ads Manager.

## Resumen al usuario (ejemplo, en lenguaje claro)
> "Listo para crear (todo en PAUSA, $0 hasta que actives):
> • Campaña «Porter · Leads · CO · Jul2026» — objetivo Leads, presupuesto 50.000 COP/día, Meta reparte (CBO).
> • Audiencia: Colombia, 25–55, targeting manual. Formulario: nombre + email + empresa.
> • Anuncio: imagen 1:1 «Pregúntale a tus datos», botón 'Registrarte', con seguimiento UTM.
> ¿Le doy y la creo?"
