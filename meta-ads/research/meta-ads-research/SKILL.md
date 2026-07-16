---
name: meta-ads-research
description: Análisis completo de competidor en Meta Ads a partir del solo nombre. Extrae ads activos de la Biblioteca de Anuncios de Meta para un brand (videos E imágenes), deduplica por SHA256, transcribe audio, extrae frames, hace OCR + análisis visual, y arma un REPORTE VISUAL Porter (HTML autocontenido). Activar con /meta-ads-research o cuando el usuario pida "scrape ads de meta de X", "research creativo de Y", "trae los ads activos de Z", "auditar competidor en Meta", "analiza al competidor X" o similar. Output: JSON canónico + brand_brief.md + reporte HTML estilo Porter. Usa Apify + Deepgram + Anthropic vision + PaddleOCR + ffmpeg.
---

# Meta Ads Research

Pipeline de extracción limpia y deduplicada de creativos activos en la Biblioteca de Anuncios de Meta. Output: JSON consumible directo + companion en markdown.

## Cuándo activar

- "scrape ads de Meta de {brand}"
- "research creativo de {brand}"
- "trae los ads activos de {brand}"
- "qué ads tiene corriendo {brand}"
- "auditar {brand} en Meta"
- "comparar {brand A} vs {brand B}"

## Credenciales

```bash
export APIFY_TOKEN=apify_api_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export DEEPGRAM_TOKEN=your_deepgram_token_here
# ANTHROPIC_API_KEY ← pendiente para vision pass
```

## Scope

Procesa **videos E imágenes** por igual. Estado actual:
- ✅ Videos con voz: transcripción (Deepgram) + frames (ffmpeg)
- ❌ Imágenes: OCR + vision **pendiente (ver gap 1 abajo)**
- ❌ Videos silentes (motion graphics, animaciones sin voz): solo dedup, sin valor analítico hasta que vision pass esté implementado (ver gap 1)
- ❌ OCR + vision sobre frames de video **pendiente (ver gap 1 abajo)**

## Pipeline

Ubicación: `/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/scripts/`

```bash
# 1. Identificar page_id (skip si ya lo tienes de la URL del Ad Library)
python3 01_identify_page.py "<brand_name|website|facebook_url>"

# 2. Scrape
python3 02_scrape_ads.py --page-id <ID> --max-items 500

# 3. Dedup (SHA256 sobre bytes de media)
python3 03_dedup_creatives.py --page-id <ID>

# 4. Enrich (default: enrich-all, customer paga por completeness)
python3 04_enrich_creatives.py --page-id <ID> --top-n 999

# 5. Build canonical output — --formats all es OBLIGATORIO
#    (default es 'summary' → AUDIT.json sin hooks/creatives/media → reporte vacío)
python3 run_audit.py --page-id <ID> --auto-confirm --formats all
python3 generate_brief.py --page-id <ID>   # run_audit NO genera el brief; correrlo aparte

# 6. Reporte visual Porter (HTML autocontenido) — ver sección abajo
#    --brand SIEMPRE (con --page-id directo, page_name viene null → header "—")
python3 generate_report.py --page-id <ID> --brand "<Name>" --narrative data/<ID>/narrative.json
```

### Gotchas verificados (test PolicyMe, 2026-07-16)

- **`--formats all` obligatorio** en run_audit. Sin él, el AUDIT.json solo trae `summary` y el reporte queda sin creativos ni ángulos.
- **`--brand "<Name>"` obligatorio** en generate_report cuando entrás por `--page-id` (el pipeline no resuelve `page_name` → sale null). Usar el nombre que dio el usuario.
- **run_audit NO corre generate_brief.** Son pasos separados. El brief es la fuente para escribir `narrative.json`.
- **Ángulos:** el clasificador (`generate_brief.py` → `ANGLE_RULES`) es rule-based bilingüe EN+ES. Si una marca nueva cae mucho en `uncategorized`, expandir `ANGLE_RULES` con sus patrones (es la fuente compartida por AUDIT.json y brief). DCO sin copy real → etiqueta `DCO — sin copy`, no uncategorized.
- **Costo real PolicyMe:** 80 ads → 45 únicos → 31 videos enriquecidos ≈ $3.38. Regla: avisar si un run va a pasar $5.

Output: `data/<page_id>/AUDIT.json` (envelope FireCrawl-shaped, schema v2.0) + `data/<page_id>/brand_brief.md` (companion agente-friendly, incluye billing block) + `dist/<slug>/index.html` (reporte visual Porter). Schema completo en `docs/SCHEMA.md`. Tiempo end-to-end: 1-5 min según tamaño.

## Reporte visual Porter (paso final)

`generate_report.py` convierte `AUDIT.json` en un `index.html` autocontenido (imágenes en base64, se abre sin internet) con el sistema de diseño Porter. Es la entrega presentable para el cliente. **El reporte se renderiza en INGLÉS por default** (labels, secciones y narrativa).

**Dos capas:**
- **Datos (automático):** KPIs, ángulos de hook, elegibilidad por plataforma, grid de top-24 creativos con thumbnail + modal (hook + transcript), landings (host + path, para que se vean páginas distintas), transparencia. Sale del `AUDIT.json` sin intervención.
- **Narrativa cualitativa (Claude la escribe):** subtítulo, patrones transversales, deep-dive por creativo (script + capa visual + estrategia) y hallazgos accionables. Van en `narrative.json` opcional. SIN él, el reporte sale completo, solo omite esas secciones.

**Flujo obligatorio para el deep-dive (así queda consistente y NO inventado):**
1. LEER `data/<ID>/brand_brief.md` y los transcripts en `AUDIT.json → scripts[]`.
2. Para cada creativo del deep-dive, **ABRIR sus 3 frames** con la tool Read (imágenes): `data/<ID>/thumbs/<fingerprint>_hook.jpg`, `_mid.jpg`, `_end.jpg`. Describir actores, setting y qué muestra cada frame a partir de lo que se VE — nunca inventar.
3. Escribir `data/<ID>/narrative.json` con esta forma (inglés):

```json
{
  "subtitle": "One line thesis of the brand's Meta strategy (HTML inline ok).",
  "patterns": [
    {"title": "3-6 word pattern", "body": "1-2 sentences on what repeats across every ad."}
  ],
  "deep_dives": [
    {
      "fingerprint": "<full fingerprint from AUDIT>",
      "title": "Concept name",
      "format": "e.g. UGC selfie + product screen",
      "hook_type": "e.g. Bold numeric price claim",
      "angle": "e.g. price anchor",
      "funnel_stage": "TOF | MOF | BOF (+ short label)",
      "persona": "who it targets",
      "actors": "who APPEARS in the video (grounded on the frames)",
      "copy_levers": ["lever1", "lever2"],
      "delivery": {"voice": "Yes", "music": "optional"},
      "script_stages": [
        {"stage": "HOOK", "time": "0-3s", "text": "…"},
        {"stage": "BODY", "time": "3-15s", "text": "…"},
        {"stage": "CTA",  "time": "15-19s", "text": "…"}
      ],
      "frame_notes": {"hook": "what's on screen", "mid": "…", "end": "…"},
      "why_it_works": "1-2 sentences"
    }
  ],
  "findings": [
    {"title": "Actionable finding", "body": "Implication for a competitor of this brand."}
  ]
}
```

- **`duration` y `pace` (w/s) se calculan solos** en el generador desde `scripts[]` — NO los escribas.
- Default: **6-8 deep_dives** (los de más `variants_total` con transcript). El grid + modal cubren el resto. Para brands con muchos creativos NO hagas los 30+ a mano: top 6-8 y listo.
- 3-6 patterns, 3-5 findings.
- Reglas de honestidad: SOLO afirmar lo que brief/AUDIT/frames respaldan. Meta NO expone performance (CTR/spend/impresiones) → nunca inventarlas (ver Limitations).

**Colores:** default toda la paleta Porter (violeta/aqua/rosa). Para teñir el acento con el color del competidor: `--accent "#hex"`. El resto se mantiene Porter.

**Por qué HTML y no dashboard de report.portermetrics.com:** esos dashboards se alimentan de conectores Porter (cuenta del cliente vía API). Estos datos vienen de la Biblioteca pública de Meta vía Apify — no son un conector, así que no pueden ser un dashboard nativo. El HTML Porter autocontenido es la vía correcta.

## Reglas de comportamiento (obligatorias)

1. **Sample size explícito.** Reportar siempre `enriched N de M unique`. NUNCA implicar análisis exhaustivo cuando es muestra.
2. **No autoseleccionar page_id ambiguo.** Si script 01 devuelve múltiples candidatos → pedir al usuario que confirme.
3. **No inventar datos faltantes.** Si un creativo no tiene transcript ni OCR, su análisis es null. No deducir.
4. **Reportar caps alcanzados.** Si `--max-items` se llenó, el brand tiene más → dejarlo en `limitations[]`.
5. **Avisar costos >$5 backend.** Si el run lo va a superar, avisar al usuario antes de proceder.
6. **Brands con creativos sin audio = facturación parcial.** Mientras el gap 1 no esté arreglado, imágenes y videos silentes (motion graphics) NO se facturan. Ejemplo: brand con 102 videos pero 71 silentes solo factura los 31 con voz. Dejarlo explícito al customer.
7. **Brands grandes (>50 unique creatives) → sugerir slicing.** El brief crece linealmente con creatives. Para brands así, sugerir al customer usar `formats=['summary','hooks','landings']` por default para mantener output <3K tokens. Bold ejemplo: 149 unique → 239 líneas / 7K tokens en brief completo.

## Gaps críticos pendientes

Evidencia, fix y acceptance tests detallados en `docs/HANDOFF.md` (Phase 1).

1. **Image + silent-video enrichment** → imágenes y videos sin voz (motion graphics) reciben $0 de valor. Fix: PaddleOCR + Claude Opus 4.8 vision sobre imágenes Y frames de video silente.
2. **Angle classifier sin cobertura completa** → brands EN/PT caen en `"uncategorized"`, y narrativas POV en español también (Bold: 20/31 hooks en español uncategorized). Fix: expandir `ANGLE_RULES` con (a) patterns EN + PT, (b) nueva categoría `ask your data`, (c) categorías ES narrativas: `narrative POV` ("yo soy", "mi negocio"), `social struggle` ("es difícil", "me quedé sin"), `transactional surprise` ("recibiste X pesos").
3. **Country hint null para B2B sin utm geo** → fallback cascade: `transcript_language` → body language detection → landing path + nuevo field `country_hint_method`.
4. **Sequential downloads en script 03 Y script 04** → ambos descargan media one-at-a-time. Bancolombia: dedup tomaba 7+ horas. **Script 03 ya tiene parallel prefetch (10 workers) — ahora corre en 5 min.** Script 04 todavía secuencial — necesita el mismo fix. Sin esto, brands en CDN edges lentos siguen siendo bottleneck en enrichment. Fix igual al de script 03: ThreadPoolExecutor con 10 workers, timeout 15s por download, cachear fallos para no re-intentar.

## Limitations estructurales (comunicar al customer)

Estas son límites del dataset público de Meta, no del pipeline. Cuando el customer pregunte por ellas, surfacear honestamente:

- No performance metrics (CTR, clicks, engagement, spend) para ads comerciales
- `platforms` = eligibility, NO delivery share (no se puede responder "IG vs FB share")
- Country/age/interest targeting no expuesto
- Killed tests filtrados por `active_only=true` (excluidos del audit por default)

## Fuera de scope

Análisis temporal, monitoring/diff over time, narrativa de análisis, presentaciones, ads de otras redes (TikTok/LinkedIn/YouTube) → **no son parte de este skill**. Ver roadmap en `docs/HANDOFF.md` o usar skills separados.

## Referencias

- Pipeline + scripts: `/Users/juan/repos/mobile/workspace/use-cases/meta-ads-pipeline/`
- **HANDOFF al dev team:** `docs/HANDOFF.md` (arquitectura, costos, pricing, roadmap, acceptance tests, brands de QA)
- Schema canónico: `docs/SCHEMA.md`
- Historia de decisiones: `docs/ITERATION_LOG.md`
- PRD del producto: `/Users/juan/repos/mobile/workspace/use-cases/competitor-monitoring-meta-ads.md`
