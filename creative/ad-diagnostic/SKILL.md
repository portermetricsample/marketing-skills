---
name: ad-diagnostic
description: Diagnostica por qué un ad, landing, email o pieza de copy no convierte usando el funnel de 4 etapas (capture → keep → click → convert). Basado en el Creative Strategy Bootcamp de Motion (Evan Lee, Wk5 + Wk1). Actívalo con /ad-diagnostic o cuando el usuario diga "este ad no funciona", "esta landing no convierte", "el CTR está bajo", "tengo Thumbstop alto pero CTR bajo", o pida una retro de performance creativo. Define el Diagnostic Cheatsheet, la Hypothesis Validation Framework, los 3 niveles de análisis (individual / campaign / macro 90-day), métricas y umbrales (3× CPA), y cuándo el problema NO es el creative (offer/landing/persona). Se complementa con `hook-writer`, `persona-research`, `bigquery` y `website-changes-monitor`.
---

# Ad Diagnostic

Sistema para diagnosticar **por qué** un ad / landing / email no convierte. No es "el ad está mal" — es **dónde** del funnel falló.

> Fuente: `repos/bootcamp/week-05/tuesday-evan-analyze.md` + `week-01/tuesday-evan-what-is-creative-strategy.md`

---

## 1. Regla #0 — todo creative es una hipótesis

> **"Every ad is a hypothesis. Analytics is proof of customer understanding."** — Evan Lee

Antes de mirar números, escribe la hipótesis:
> "Creo que **[audiencia X]** va a responder a **[hook Y]** porque **[razón Z]**, y eso va a moverse en **[métrica concreta]**."

Sin hipótesis, los números no significan nada — solo estás reportando un dashboard.

---

## 2. Hypothesis Validation Framework

Después de spend mínimo (ver §4), todo ad cae en una de 3 categorías:

| Resultado | Qué hacer |
|---|---|
| **Winner** ✅ | Validado. **Doblá la apuesta** — itera sobre ese ángulo, escala spend, adapta a más formatos |
| **Loser** ❌ | Invalidado. **NO iteres** sobre eso. Evita swings similares. Aprende y pasa página |
| **Middling** 🟡 | Inconclusivo. Más tiempo o aislá variables (cambia 1 cosa a la vez) |

**Anti-pattern crítico:** iterar sobre Losers "a ver si esta vez sí". Es plata quemada.

---

## 3. Diagnostic Cheatsheet — las 4 etapas del funnel

Cada etapa tiene una métrica reina y un fix distinto.

### Etapa 1 — Capture attention
- **Métrica:** Thumbstop %
- **Síntoma:** Thumbstop bajo (<2-3% en Meta)
- **Diagnóstico:** El primer frame no para el scroll
- **Fix:** Cambia visual del frame 1. Más contraste, rostro, movimiento, texto grande, color. → usa `/hook-writer` (capa Visual)

### Etapa 2 — Keep attention
- **Métrica:** Hold Rate (% que llega a 3s, 6s, 15s)
- **Síntoma:** Thumbstop alto, Hold bajo
- **Diagnóstico:** El hook funciona pero el body pierde a la gente
- **Fix:** Reescribe segundos 3-10. Trae el payoff antes. Acorta. No entierres el beneficio.

### Etapa 3 — Drive click
- **Métrica:** CTR outbound
- **Síntoma:** Hold alto, CTR bajo
- **Diagnóstico:** Vieron todo pero no clickearon. **Mismatch CTA o persona.**
- **Fix:**
  - Si CTA débil → fortalecer y subirlo antes
  - Si persona equivocada → revisar a quién le habla el ad (ver `/persona-research`)
  - Si video largo → acortar

### Etapa 4 — Convert and scale
- **Métrica:** CVR (% de clicks que compran/se registran), CPA
- **Síntoma:** CTR alto, conversión baja
- **Diagnóstico:** **El problema NO es el ad.** Es la landing, la oferta o el producto.
- **Fix:**
  - Landing no matchea el mensaje del ad → alinea hero copy de landing con hook del ad
  - Offer débil → mejora oferta, no el creative
  - Pricing / fricción de signup → revisa flow

> **"You don't always have a creative problem. Sometimes it's a landing page or offer problem."** — Evan Lee

---

## 4. Umbrales antes de juzgar

No declares ganador/perdedor antes de que Meta le dé chance:

- **Spend mínimo:** ~3× tu CPA objetivo o 3× tu AOV
- **Motion's rule:** ~$300 mínimo
- **No compares ads con spend muy distinto** ($5 vs $100K = ruido)

---

## 5. 3 niveles de análisis

Subir de altitud cuando un nivel se vuelve repetitivo:

| Nivel | Cuándo | Pregunta |
|---|---|---|
| **Individual** | Por defecto | ¿Por qué este ad ganó/perdió? |
| **Campaign / Producto** | Cuando tienes 5-10 ads del mismo SKU | ¿Qué patrones se repiten en los winners de este producto? |
| **Macro (90 días)** | Trimestral | ¿Qué hooks/personas/formatos dominan en los últimos 90 días? ¿Qué deberíamos retirar? |

---

## 6. "No siempre es un creative problem"

Antes de pedir más ads, descarta:

- **Landing** — ¿el hero copy refleja el hook del ad? ¿velocidad? ¿mobile?
- **Offer** — ¿es competitiva? ¿hay urgencia? ¿hay fricción extra?
- **Producto** — ¿el ad promete algo que el producto no entrega bien?
- **Targeting** — pre-Andromeda. Hoy en 2026, esto rara vez es el problema. Más probable es la **persona del ad**, no la audiencia de Meta.
- **Atribución** — ¿estás midiendo en plataforma o en backend (Shopify, GA4)? Pueden divergir.

---

## 7. Output esperado (cuando el usuario pide diagnóstico)

Entrega siempre así:

```markdown
## Diagnóstico: [nombre del ad / landing / email]

### Hipótesis original
> [Cuál era la hipótesis al lanzarlo. Si no hay, márcalo: "no había hipótesis explícita — primer red flag."]

### Métricas
| Métrica | Valor | Benchmark | Lectura |
|---|---|---|---|
| Spend | $X | 3× CPA = $Y | ✅ / ⚠️ insuficiente |
| Thumbstop | X% | 2-3%+ | ✅ / ❌ |
| Hold Rate | X% | depende de duración | ✅ / ❌ |
| CTR outbound | X% | 0.8-1.5%+ | ✅ / ❌ |
| CVR | X% | depende de oferta | ✅ / ❌ |

### Etapa donde falló
[Capture / Keep / Click / Convert]

### Diagnóstico
[1-2 párrafos explicando qué pasó. NO genérico.]

### Fix recomendado (priorizado)
1. [Fix #1 — el de mayor leverage]
2. [Fix #2]
3. [Fix #3 — si aplica]

### Veredicto
- [ ] Winner — doblar apuesta
- [ ] Loser — retirar y no iterar
- [ ] Middling — aislar variable + más tiempo

### Hipótesis siguiente (si aplica)
> [Nueva hipótesis a testear]
```

---

## 8. Anti-patterns

- **Reportar números sin perspectiva analítica** — "el CTR fue 0.5%" no es un diagnóstico
- **Quedarse en el detalle de un ad** sin subir a campaign / macro
- **Asumir que Hold alto + CTR bajo = problema de CTA** (puede ser duración, valor, persona)
- **Tirar más creative** cuando el problema es landing o oferta
- **Iterar sobre Losers** "ahora sí va a funcionar"
- **Comparar ads de spend muy distinto** — no es comparable
- **Optimizar para clicks** cuando la meta es LTV (alignment problem, ver `persona-research`)

---

## 9. Aplicación para Porter Metrics

| Pieza Porter | Métricas a mirar | Diagnóstico típico |
|---|---|---|
| **Landing de conector** | GSC: impressions / CTR / position. GA4: bounce / time on page / signup rate | CTR bajo en SERP = title débil. Bounce alto = hero no matchea intent |
| **Listicle "Best X"** | Position en SERP, CTR, clicks a templates | Position 5-10 con CTR bajo = title/meta débil. Clicks bajos a templates = grid no convence |
| **Email AC (broadcast)** | Open rate, CTR, conversión a trial | OR bajo = subject (usa `/hook-writer`). CTR bajo = cuerpo no entrega. CVR baja = landing |
| **Gallery de templates** | Pageviews, time on page, clicks a template individual | Clicks bajos = thumbnails / títulos débiles |
| **Video Remotion publicado** | Thumbstop (3s), Hold, CTR | Mismas 4 etapas que un ad de Meta |

**Fuentes de datos para Porter:**
- GSC, GA4, BigQuery → usa `/bigquery`
- Performance histórica de listicles → usa `/bigquery` con tabla de pages
- Comparativa con competidores → usa `/website-changes-monitor`

---

## 10. Quotes para anclar criterio

- "Every ad is a hypothesis."
- "Analytics is proof of customer understanding."
- "A good hook is not subjective — you can clearly measure if it did its job."
- "You don't always have a creative problem."
- "The metrics give you power. When you have numbers behind your work, it gives you power."
- "Once you start to stack winning ads, then it's worthwhile to dive deeper into the metrics."
