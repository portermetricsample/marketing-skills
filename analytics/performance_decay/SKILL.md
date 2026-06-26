---
name: performance_decay
description: >
  Analiza el rendimiento real de páginas, contenido o anuncios a lo largo del tiempo
  (performance / content decay) sobre datos de Google Search Console (clics), Google
  Analytics 4 (sesiones) o cualquier export con entidad + período + métrica. Clasifica
  cada entidad por tendencia leída COMO EL OJO HUMANO — no por simple variación
  porcentual: Winning, New, Healthy, Volatile, Losing, Crashing, Crashed. Úsalo cuando el
  usuario pida saber qué páginas/anuncios SUBEN o BAJAN de rendimiento, content decay,
  detectar caídas a tiempo, tendencias SEO por página/categoría, alertas proactivas de
  rendimiento, o validar visualmente curvas de tráfico. Pensado para correr a escala
  (miles de páginas) y como disparador de agentes que alertan o actúan.
---

# Performance Decay

Motor source-agnostic que lee la **forma** de cada curva semanal como lo haría una
persona mirando un gráfico (no una sola ventana fija ni una variación porcentual) y
clasifica cada página/anuncio/entidad por tendencia. Validado contra inspección visual
curva por curva; corre igual sobre GSC (clics) y GA4 (sesiones).

**Por qué existe:** pedirle a la IA "dime qué páginas están cayendo" produce un análisis
perezoso y superficial que se confunde con el ruido normal del tráfico. Este skill es un
algoritmo real (Python) afinado por horas para empatar el criterio humano. Ahorra ese
trabajo: ya está resuelto y validado.

## Cuándo usarlo
- "¿Qué páginas/anuncios están ganando o perdiendo rendimiento?"
- Detectar **a tiempo** cuando una página/anuncio crítico empieza a caer.
- Análisis de decay por URL y por categoría (3–6 meses, semanal).
- Validar a ojo si la clasificación de tendencias es correcta.
- Como **disparador de agentes**: vigilar a escala, alertar y/o proponer cambios.

## Flujo (4 pasos)

### 1) Traer los datos (Porter MCP `porter-reporting.query_data`)
Guarda el resultado como `data/<archivo>.json` en formato `{columns, rows}`.
Para website-only en GA4, filtra por `hostName` (excluye subdominios app/help).

- **GSC** (~6 meses, semanal): fields `google_search_console_page`,
  `google_search_console_week`, `google_search_console_clicks`,
  `google_search_console_impressions`. ⚠️ Rango largo × `week` hace timeout — usar 3–6 meses.
- **GA4** (~90 días, diario): fields `google_analytics_4_pagePath`,
  `google_analytics_4_date`, `google_analytics_4_sessions`; filtro
  `hostName in [dominio, www.dominio]`. Usar `limit` alto (≥300000) para NO truncar
  la cola — un tope ordenado por la métrica crea caídas falsas.

El resultado del MCP suele exceder el contexto y se vuelca a un archivo; extrae solo
`{columns, rows}` con un script corto y guárdalo (no lo metas al contexto).

### 2) Analizar
```bash
cd scripts
CD_SOURCE=gsc python3 analyze.py            # o CD_SOURCE=ga4
CD_RULES=porter CD_SOURCE=ga4 python3 analyze.py   # opcional: agrupación por sitio
```
Genera `data/analysis.json`.

### 3) Graficar
```bash
python3 render.py        # charts/categories.png, pages_decay.png, pages_grow.png, view.html
python3 social.py        # charts/social_decay.png — versión anonimizada para redes
```

### 4) Auto-QA visual (recomendado)
```bash
python3 qa.py            # charts/qa_<label>.png — una imagen por etiqueta, sospechosos primero
```

### 5) Drill-down jerárquico (sub-skill) — RECOMENDADO para "explicar la tendencia"
En vez de una lista plana de cientos de páginas, lee el resultado como un árbol
top-down (Idioma → Categoría → Tema) y baja solo donde hay señal:
```bash
python3 segment.py                 # árbol completo
CD_FOCUS=ES python3 segment.py     # expande solo un idioma
```
Cuándo usarlo: cuando el usuario pregunte **por qué** sube/baja algo, o cuál palanca
mueve el total. Ver `reference/hierarchical-segmentation.md` (protocolo de lectura +
cómo personalizar la jerarquía para cualquier sitio).

### 6) Capa de impacto absoluto (top 20) — léela SIEMPRE junto con lo anterior
El % sobre-pondera páginas chicas. Esta capa rankea por **volumen** y por **cambio
absoluto** (Δ/sem) — las que de verdad mueven la aguja:
```bash
python3 top.py            # top por volumen + top ganadoras/perdedoras en absoluto
```
**% = forma, absoluto = tamaño de la apuesta.** Empieza por los top movers absolutos y
usa la jerarquía (paso 5) para explicar por qué.

> Nota de fuente: en GSC/GA4 la segmentación usa URL/slug; en **ads** usa convención de
> nombres de campaña y **UTM** — los niveles del árbol son funciones sobre la entidad, así
> que solo se reapuntan a esos tokens (ver doc del sub-skill).
Luego MIRA cada imagen y compara la etiqueta vs. la forma de la curva. Si algo no cuadra,
ajusta la regla en `analyze.py` (`classify`) y repite el loop hasta que concuerde. Así se
calibró originalmente — es el corazón del skill.

## Configuración (sin editar código)
| Env var | Default | Qué hace |
|---|---|---|
| `CD_SOURCE` | `gsc` | `gsc` / `ga4` / `custom` |
| `CD_MIN_SHARE` | `0.0002` | conserva entidades con ≥ esta **fracción** del tráfico total (relativo → se adapta a cualquier sitio) |
| `CD_CATEGORIZE` | `path1` | agrupa por segmento de URL (`path1`) o `none` |
| `CD_RULES` | — | carga `categories_<nombre>.py` (ej. `porter`) para agrupación por sitio |
| `CD_CRASH_PCTILE` | `85` | alertas de crash solo en entidades sobre este percentil de volumen |
| `CD_KEEP_PARTIAL` | — | `1` para NO recortar semanas de borde incompletas (por defecto sí se recortan en fuentes diarias) |

## Etiquetas
Crashing (caída súbita desde base sana), Crashed (en ~cero), New (emergente),
Losing (caída real sostenida), Winning (subida sostenida), Volatile (volátil sin tendencia),
Healthy (estable, default).

**Discriminador clave `vs_base`** = nivel actual ÷ nivel inicial. Separa una pérdida real
(vuelve a/por debajo de su base, `vs_base < 0.75`) de un ganador que descansa tras un pico
(sigue muy por encima, `vs_base ≫ 1`). Es lo que evita falsos positivos.

## Notas importantes (gotchas)
- **Semana incompleta de borde**: datos diarios cuyo último bucket tiene <7 días se ven
  como "crash" de todo el sitio → el motor recorta esas semanas (date-based).
- **Umbrales relativos**: no hay conteos de clics absolutos hardcoded.
- **Categorización**: el default es genérico; `categories_porter.py` es solo un EJEMPLO.
- **No truncar el pull**: ordenar por métrica + tope bajo crea caídas falsas en la cola.

Detalle del método y señales: `reference/METHODOLOGY.md`.

## Archivos
- `scripts/decay_core.py` — matemática validada compartida (señales + clasificación)
- `scripts/analyze.py` — motor por entidad → `data/analysis.json`
- `scripts/segment.py` — **drill-down jerárquico** (Idioma → Categoría → Tema)
- `scripts/top.py` — **capa de impacto absoluto** (top por volumen y por Δ/sem absoluto)
- `scripts/render.py` — gráficos publicados + `view.html`
- `scripts/qa.py` — grillas de auto-verificación por etiqueta
- `scripts/social.py` — imagen anonimizada para redes sociales
- `scripts/categories_porter.py` — ejemplo de agrupación + jerarquía por sitio (opcional)
- `reference/METHODOLOGY.md` — método, señales y definiciones
- `reference/hierarchical-segmentation.md` — sub-skill de drill-down (protocolo + personalización)

## Requisitos
Python 3 con `numpy` y `matplotlib` instalados.

## Exponer en el MCP (para el equipo de dev)
El motor es una función pura (entidad + período + métrica → etiquetas + señales), sin
estado ni dependencia de un sitio. Para exponerlo como tool del MCP: envolver `analyze.py`
recibiendo `{columns, rows}` + config y devolviendo `analysis.json`.
