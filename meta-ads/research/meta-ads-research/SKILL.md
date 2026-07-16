---
name: meta-ads-research
description: Extrae ads activos de la Biblioteca de Anuncios de Meta para un brand (videos E imágenes), deduplica por SHA256, transcribe audio, extrae frames, hace OCR + análisis visual. Activar con /meta-ads-research o cuando el usuario pida "scrape ads de meta de X", "research creativo de Y", "trae los ads activos de Z", "auditar competidor en Meta" o similar. Output: JSON canónico + brand_brief.md, listos para agentes IA sin transformación adicional. Usa Apify + Deepgram + Anthropic vision + PaddleOCR + ffmpeg.
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
export APIFY_TOKEN=your_apify_token_here
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

# 5. Build canonical output
python3 run_audit.py --page-id <ID> --auto-confirm
python3 generate_brief.py --page-id <ID>
```

Output: `data/<page_id>/AUDIT.json` (envelope FireCrawl-shaped, schema v2.0) + `data/<page_id>/brand_brief.md` (companion agente-friendly, incluye billing block). Schema completo en `docs/SCHEMA.md`. Tiempo end-to-end: 1-5 min según tamaño.

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
