---
name: website-changes-monitor
description: "Analiza los cambios y la huella SEO de CUALQUIER sitio web (competidor, referencia, el propio). Usa sitemaps XML + Wayback Machine para detectar URLs nuevas/modificadas/rebuilds, las clasifica por línea de contenido, tipo de página e intención comercial, y cruza cada página con su rendimiento REAL (volumen, dificultad, tendencia y tráfico orgánico que ya captura) vía el MCP de Porter Metrics. Herramienta genérica y sin sesgo de marca. Usa /website-changes-monitor seguido del dominio (ej: /website-changes-monitor clickup.com) y opcionalmente el período (ej: 'último mes', 'últimos 7 días', 'desde 2026-04-01')."
user_invocable: true
---

# Website Changes Monitor — Sitemap + Wayback + rendimiento real

Mapea lo que un sitio publicó/modificó en un período, lo **clasifica con criterios consistentes** (línea de contenido, tipo de página, intención comercial) y lo cruza con su **rendimiento real de búsqueda** (volumen, dificultad, tendencia, tráfico que ya captura). El insight central: **publicar ≠ rankear** — cruzar "qué construyeron" con "qué rankean de verdad" revela lo que el sitemap solo no dice.

**Herramienta genérica y sin sesgo.** El usuario pone un dominio cualquiera. Nada aquí asume una marca, competidor o industria concreta. Si el usuario da su propio dominio, se puede añadir un cruce de intersección (qué keywords comparten) — opcional, nunca obligatorio.

## Dos lentes sobre el mismo crawl

El mismo corpus descargado en Fase 0 responde dos preguntas. El tiempo se usa al revés en cada una:

- **Lente A — Cambios (default).** Tiempo = filtro (`lastmod` en el período). Pregunta: *"¿qué shipeó el sitio ahora y hacia dónde apunta?"*. Señal = recencia. **Join clave:** cada URL cambiada ↔ ¿ya rankea (doblar apuesta) o es apuesta nueva sin tráfico? (Fase 3B).
- **Lente B — Huella/oportunidades (modo 2).** Tiempo = irrelevante (corpus completo). Pregunta: *"de TODO lo que rankea, ¿dónde está el tráfico y qué intenciones tienen potencial?"*. Salida = **tabla cruda** con datos al lado (volumen, intención, KD, tendencia, tráfico real). **Sin scoring/índice compuesto** — el usuario lee y decide.

---

## ⚠️ REGLAS CRÍTICAS — leer primero
Existen porque fallé en versiones anteriores. Si las violás, alucinás y mentís.

1. **NUNCA WebFetch para parsear sitemaps XML** — resume y trunca; te dirá "no hay nada" como hecho. Siempre `curl` + `python3` con regex.
2. **Seguí el sitemap_index a TODOS los sub-sitemaps** — suele haber 5-30. Si solo leés el índice, te perdés el 95%.
3. **Contá, no estimes** — todo número sale de un `len()` real.
4. **Diff de contenido con Wayback CDX o el MCP, no WebFetch.**
5. **Cuando algo te parezca raro, bajá el HTML raw y mirá con `head` antes de afirmar.**
6. **EL SITEMAP MIENTE SOBRE LAS FECHAS — perfilalo (Fase 0):**
   - `lastmod` puede **no existir** (solo `changefreq`). Sin fecha NO podés datar → decí "no datable", nunca "sin cambios".
   - `lastmod` puede ser un **rebuild global** (un deploy reescribe la fecha de un sitemap entero). Eso NO son ediciones. **Test mecánico obligatorio.**
   > Caso real (ClickUp): 24/27 sitemaps sin `lastmod`; y uno mostraba 1.526 URLs "modificadas" un mismo día = rebuild. El titular honesto no era 1.526 sino 122 (solo el blog tenía fechas reales).
7. **Resultados MCP grandes revientan el contexto** — `ranked_keywords` sin filtro devuelve 100k+ filas y se guarda a un archivo en `tool-results/`. Parsealo con **`python3` (NO hay `jq`)**, o filtrá del lado del servidor (`rank_group<=20` + `limit`), o parsealo en un **subagente**.

---

## Dependencias
- **`curl` + `python3`** (siempre).
- **Porter Metrics MCP** para (a) scrape de H1/meta y (b) datos SEO (volumen, dificultad, intención, tráfico). Requiere cuenta conectada. Acciones verificadas contra el MCP en vivo abajo (ninguna pide `account_id`). Descubrí/resolvé cualquier acción con `list_actions(connector="seo")`. Sin MCP, corre hasta T0 y marca el enriquecimiento como "pendiente MCP".
- **(Opcional)** Si el usuario tiene su propia taxonomía de contenido/awareness en un repo o archivo, se puede leer para clasificar con su vocabulario. Si no, el skill usa la taxonomía genérica embebida abajo. **No hay dependencia de ningún repo de marca.**

---

## PIPELINE

### FASE 0 — Perfilado + decisión de costo (SIEMPRE primero)

**0.1 Descubrir y bajar todos los sitemaps**
```bash
D=/tmp/cr-{domain}; mkdir -p $D; rm -f $D/*.xml
curl -s https://{domain}/robots.txt | grep -i sitemap
for sm in $(curl -s https://{domain}/sitemap.xml | grep -oE 'https://[^<]+\.xml' | sort -u); do
  curl -s "$sm" -o "$D/$(echo "$sm" | sed 's|https://||; s|/|_|g')"
done
```

**0.2 Perfilar: #URLs, #lastmod, test de rebuild (share del día top)**
```python
import re, glob, collections, os
for f in sorted(glob.glob('/tmp/cr-{domain}/*.xml')):
    xml=open(f).read(); urls=len(re.findall(r'<loc>',xml)); lms=re.findall(r'<lastmod>([^<]{10})',xml)
    ts=0
    if lms:
        c=collections.Counter(d[:10] for d in lms); ts=c.most_common(1)[0][1]/len(lms)
    tag='SIN FECHA' if not lms else ('REBUILD' if ts>=0.70 else 'datable')
    print(f'{urls:7} urls  {len(lms):7} lastmod  top-day={ts:.0%}  [{tag}]  {os.path.basename(f)}')
```
Reglas del gate: `#lastmod==0` → **SIN FECHA** (excluir del análisis temporal). `top_share≥0.70` → **REBUILD** (reportar como deploy, no como N cambios). Resto → **datable**.

**0.3 Normalizar locale** — colapsar variantes de idioma (`/es/x`, `/fr/x` → una entidad), locale como columna, no fila.

**0.4 Mini-plan obligatorio (2-4 líneas)** antes de gastar en scrape/MCP: qué es datable, qué se excluye, qué tiers se corren, dónde se enriquece. Default del gate: **profundidad selectiva** (pocas URLs a T2).

### FASE 1 — Entries datables + histograma
Parsear `<loc>+<lastmod>` solo de sitemaps 'datable'. Filtrar por período. Histograma diario. Identificar días pico (un día con ~100% de un sitemap = rebuild colado).

### FASE 2 — Clasificación consistente: escalera T0 → T1 → T2

Taxonomía **genérica embebida** (universal, no de marca):

**Awareness / intención comercial** (Eugene Schwartz — universal):
| Señal en URL/H1 | Awareness | Funnel |
|---|---|---|
| `X-vs-Y`, `X-alternatives`, `X-pricing`, `X-demo` | Product / Most-aware | **BOFU** |
| `best-X`, `X-tools`, `X-software`, `top-X` | Solution-aware | **MOFU** |
| `what-is-X`, `how-to-X`, `X-guide`, `X-examples` | Problem / Unaware | **TOFU** |

**Tipos de página** (universal): comparación · alternative · listicle · template · feature/product · pricing · use-case (`for-{vertical}`) · guía/how-to · glosario.
**Línea de contenido:** derivar del propio sitio (primer/segundo segmento del path + tema del slug). Es la taxonomía DEL SITIO, no una lista fija.

- **T0 — Estructural (gratis, todas las URLs).** Solo con la URL: `content_line`, `page_type`, awareness aprox (marcado "inferido"), `is_new` (por ID numérico en la URL si existe, si no por diff vs snapshot).
- **T1 — Semántico (1 scrape, solo las relevantes).** H1 + title + meta vía MCP (`web_scraping.firecrawl_scrape` / `seo.on_page_content_parsing`). Confirma awareness real, angle, keyword objetivo. **La intención nativa que devuelve el MCP de Porter (Fase 3) manda sobre la inferida del slug.**
- **T2 — Profundo (top 5-10).** Teardown de secciones, positioning, objeciones. Métricas a nivel URL individual.
> Clasificá siempre con una etiqueta real; una etiqueta sin criterio es una adivinanza. No inventes lo que la página no muestra.

### FASE 3 — Enriquecimiento: volumen / intención / dificultad / tendencia (nivel CLUSTER)
⚠️ Nunca pegues keyword-tools por URL a escala (rate limits). Métrica a nivel de **cluster/keyword-cabeza**; solo T2 recibe métricas por URL.

**Acciones del MCP de Porter (verificadas en vivo, `connector="seo"`).** El grueso del enriquecimiento de cluster sale de `keyword_overview` (hasta 700 kw/llamada, `{keywords:[...], location_name:"United States", language_code:"en"}`):
| Campo que devuelve | Columna |
|---|---|
| `keyword_info.search_volume` | `search_volume` |
| `keyword_info.search_volume_trend.{monthly,quarterly,yearly}` | `trend_m/q/y` |
| `search_intent_info.main_intent` (commercial/informational/navigational/transactional) | `intent` (fuente primaria de intención) |
| `keyword_info.cpc` · `keyword_info.monthly_searches` (12m) | `cpc` · curva estacional |

- **Dificultad (KD 0-100):** NO viene en `keyword_overview` — se pide aparte con `bulk_keyword_difficulty` (hasta 1.000 kw). No confundir con `competition` (eso es competencia de Ads, no KD).
- **Alternativa liviana:** `seo.ke_get_keyword_data` (nombre limpio de Porter, hasta 100 kw) devuelve volumen + CPC + competencia + tendencia en una llamada, sin intención ni KD.
- **Tendencia visual a 12m:** `seo.ke_get_keyword_trend_data`.

Sin MCP → columnas "pendiente MCP".

### FASE 3B — Join a rendimiento REAL (¿publicar = rankear?) — el corazón
Acciones del MCP de Porter (título de la acción; resolvé la ruta exacta con `list_actions(connector="seo")`):
| Acción del MCP | Devuelve | Uso |
|---|---|---|
| `ke_get_domain_keywords` (`domain`) | keywords del dominio, posición, volumen, tráfico estimado — **nombre limpio de Porter** | ganadores de tráfico a nivel dominio |
| `ke_get_domain_traffic` (`domain`) | tráfico orgánico mensual estimado del dominio — **nombre limpio de Porter** | tamaño de tráfico del dominio |
| `google_ranked_keywords` (`target`=dominio o URL) | keywords que rankea a nivel URL, posición, volumen, etv, con `filters`/`order_by` | qué targetea cada URL y en qué posición (join por URL) |
| `bulk_traffic_estimation` (hasta 1.000 targets) | tráfico estimado por URL en 1 llamada | **puntuar una lista de URLs barato** |
| `bulk_keyword_difficulty` | KD real 0-100 | dificultad (¡`competition` NO es KD! — es competencia de Ads) |
| `google_domain_intersection` (`target1`,`target2`) | keywords que rankean AMBOS dominios | **opcional**: sitio vs el propio dominio del usuario |

Reglas (siempre filtrar en el servidor): `filters:[["ranked_serp_element.serp_item.rank_group","<=",20]]`, `order_by:["ranked_serp_element.serp_item.etv,desc"]`, `limit` chico. Agrupá por `relative_url`, mejor posición por página. Volúmenes ±2-3× (direccionales).

**El join (Lente A):** por cada URL cambiada, tres estados:
- **Doblar apuesta** — ya rankea top-20 y la actualizó (refresh defensivo).
- **Apuesta nueva** — la creó/cambió pero aún no rankea (posición >20 o ausente, tráfico ~0).
- **Decayendo** — rankeaba y baja (`is_down`) → la tocan para recuperar.
> **Prueba real (ClickUp):** publicó 20+ posts de "claude" → rankea TODOS en posición 25-92, tráfico ~0. Publican mucho y no ganan. El insight salió del join, no del sitemap.

### FASE 3C — Lente B (corpus completo, modo 2)
Embudo para no reventar costo: **A** pre-filtro estructural gratis (dedup por slug/topic, colapsar locales y patrones programáticos → shortlist de keywords-cabeza; si el usuario dio temas/su dominio, filtrar por relevancia) → **B** enriquecer la shortlist (`keyword_overview` + `relevant_pages`/`ranked_keywords`) → **C** presentar **tabla cruda** ordenada por lo que el usuario pida (volumen / tráfico / brecha) + read ≤5 frases. **No inventar índice compuesto.**

### FASE 4 — Diff Wayback (solo páginas estratégicas, opcional)
Snapshot al inicio del período vs actual, diff de oraciones en Python. Distinguir cosmético (theme/nav/footer) de editorial. Priorizar: pricing, home, comparaciones, top landings.

### FASE 5 — Redirects 301 (rename vs eliminación)
`curl -s -o /dev/null -w "%{http_code} → %{redirect_url}\n"`. 301 = rebrand; 404 = eliminaron.

### FASE 6 — Snapshot para mes-a-mes (esto lo vuelve un *monitor*)
Guardar SIEMPRE el set datable completo. En la próxima corrida, diff vs snapshot anterior → "nuevo desde la última vez" + velocidad por cluster (la derivada, más accionable que el nivel).

---

## OUTPUT

### TSV enriquecido (artefacto pivotable)
Por URL: `url · post_id · locale · lastmod · is_new · content_line · page_type · awareness · funnel · angle · etv_real`.
Por cluster: `cluster · search_volume · intent · trend_y · kd · cpc`.

### Reporte markdown (narrativa)
1. **Resumen ejecutivo** — volumen HONESTO (excluye rebuild/sin-fecha), 3 movimientos, 1 lectura.
2. **Perfilado (Fase 0)** — tabla de sitemaps [datable/rebuild/sin-fecha]. Transparencia de qué se pudo datar.
3. **Números + histograma** de la señal real.
4. **Clasificación** — tabla content_line × funnel × trend.
5. **Join (Lente A)** — doblar apuesta vs apuesta nueva vs decayendo, con tráfico real.
6. **Huella / oportunidades (Lente B)** si se pidió — tabla cruda.
7. **Renames/301** · **Diff estratégico** si aplica.
8. **Lectura estratégica** — qué construyen, hacia dónde, qué gana y qué es peso muerto. **Neutral, sobre el sitio analizado — sin referencia a ninguna marca del usuario salvo que la pida explícitamente.**

### Storage
`~/website-changes-monitor/{domain}-{YYYY-MM-DD}.md` (reporte) · `.tsv` (crudo) · `-snapshot-{fecha}.tsv` (para MoM).

---

## Gotchas (reales)
1. No reportar "sin cambios" sin Fase 0. Sin `lastmod` = "no datable".
2. Un día con ~100% de un sitemap = rebuild, no N ediciones.
3. No truncar listas. Iterar todo.
4. `lastmod` (modificación) ≠ `datePublished` (publicación). Para "nuevo" usar ID/scrape, no `lastmod`.
5. Diff: separar cosmético (theme global) de editorial.
6. Intención del slug es ruidosa hasta confirmar con H1 / datos del MCP de Porter.
7. No métricas de keyword por URL a escala — cluster-level.
8. `competition` ≠ KD. KD real = `bulk_keyword_difficulty`.
9. Resultados MCP grandes → archivo → parsear con python (no jq).

## Ejemplos de invocación
```
/website-changes-monitor clickup.com
/website-changes-monitor stripe.com último mes
/website-changes-monitor https://example.com/sitemap.xml últimos 7 días
```
