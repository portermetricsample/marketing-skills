---
name: hook-writer
description: Escribe y diagnostica hooks (primer frame de un ad, headline de landing, asunto de email, intro de listicle, opening de video). Basado en el Creative Strategy Bootcamp de Motion (Evan Lee, Wk1 + Wk5). Actívalo con /hook-writer o cuando el usuario pida escribir/auditar hooks, headlines, subject lines, o el primer frame de un video. Define los 5 formatos canónicos (Confession, Bold Claim, Relatability, Contrast, Curiosity), las 3 jobs de un hook, las 3 capas de análisis, el funnel analytics para validarlo, y reglas anti "hook slop". Se complementa con `porter-writing-listicle`, `porter-writing-email`, `porter-remotion-animation` y `porter-writing-connector-landing`.
---

# Hook Writer

Sistema para escribir hooks que paran el scroll, califican audiencia y conectan con la venta. Basado en datos de **$1.3B de gasto** en Meta analizados por Motion.

> Fuente: `repos/bootcamp/week-01/tuesday-evan-what-is-creative-strategy.md` + `week-05/tuesday-evan-analyze.md`

---

## 1. Las 3 Jobs de un Hook (Evan Lee)

Todo hook que escribas debe cumplir las 3:

1. **Generar reacción emocional** — corta el ruido del feed
2. **Calificar y descalificar** — habla a una audiencia específica (no a "todos")
3. **Conectar naturalmente con el sales story** — si no conecta, es **hook slop**

> **"El hook es el 80% del juego."** — Evan Lee

**Anti-pattern:** disparar un cohete para vender maquillaje. Llama atención pero no conecta = hook slop.

---

## 2. Top 5 formatos de hook (canónicos)

Estos 5 dominan en cuentas que gastan $1M+/mes:

| Formato | Qué hace | Cuándo usarlo | Ejemplo Porter |
|---|---|---|---|
| **Confession** | Admite algo incómodo o vergonzoso en primera persona | Audiencias cínicas, scrollers cansados de ads | "Pasé 6 horas haciendo un reporte que Porter resuelve en 30 segundos." |
| **Bold Claim** | Afirmación contundente, casi atrevida | Cuando tienes proof o data fuerte | "El reporte de Meta Ads más usado en Looker Studio." |
| **Relatability** | Describe una situación que el lector vive a diario | TOF, awareness | "Cuando el cliente pide el reporte y tú todavía no abres Meta Ads Manager." |
| **Contrast** | Antes vs después, ellos vs nosotros, viejo vs nuevo | Comparación, diferenciación | "Sin Porter: 3 horas. Con Porter: 3 minutos." |
| **Curiosity** | Abre un loop, no resuelve | Cuando puedes pagar el payoff rápido | "El error #1 que comete el 80% de las agencias en sus reportes de Meta." |

**Regla:** elige formato según **psicología de la audiencia**, no según lo que está trending.

---

## 3. Las 3 capas de un hook (análisis)

Todo hook (tuyo o de competidor) tiene 3 capas. Analiza cuál carga el peso:

1. **Visual** — ¿Qué hace que el ojo pare? (color, movimiento, rostro, texto grande, contraste)
2. **Audio + Textual** — ¿Cómo refuerza el visual? (caption, VO, sonido)
3. **Psicológica** — ¿Qué táctica mental usa? (uno de los 5 formatos arriba)

**Regla del Hook Component Trio:** los 3 elementos (visual / VO / caption) deben **complementarse, no duplicarse**. Si los 3 dicen lo mismo, estás desperdiciando la atención del usuario.

---

## 4. Hook Analytics Funnel (cómo saber si funcionó)

Un hook bueno **no es subjetivo** — se mide:

```
Spend          → ¿Meta le dio chance? (mín ~$300 o 3× CPA)
  ↓
Thumbstop %    → ¿Paró gente? (Capture attention)
  ↓
Hold Rate      → ¿Siguieron viendo? (Keep attention)
  ↓
CTR outbound   → ¿Hicieron click? (Drive click)
  ↓
Conversión     → ¿Compraron / se registraron? (Convert)
```

**Diagnóstico por etapa:**

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| Thumbstop bajo | Hook visual flopó | Cambia primer frame |
| Thumbstop alto, Hold bajo | Hook funciona pero el body pierde | Reescribe segundos 3-10 |
| Hold alto, CTR bajo | Ven todo pero no clickean | CTA débil o desalineado con persona |
| CTR alto, conversión baja | Landing no matchea ad | Revisa landing, no el ad |

> **"No siempre tienes un creative problem. A veces es la landing o la oferta."** — Evan Lee

---

## 5. Workflow para escribir hooks (output esperado)

Cuando el usuario te pida hooks, entrega así:

1. **Pregunta primero (si falta info):** ¿Qué pilar / producto? ¿Qué micro-momento del cliente? ¿Qué emoción? ¿Etapa de funnel (TOF / MOF / BOF)?
2. **Genera 5 hooks** — uno por cada formato canónico (Confession / Bold Claim / Relatability / Contrast / Curiosity)
3. **Para cada hook, anota:**
   - Formato
   - A quién descalifica (audiencia que NO debería clickear)
   - Cómo conecta con el sales story (en 1 línea)
4. **Recomienda 1 favorito** y por qué (no dejes al usuario eligiendo solo)

---

## 6. Reglas duras (anti-patterns)

- **No copies formatos trending** sin pasar por la psicología del cliente. "Lo que funciona en TikTok beauty no funciona en B2B SaaS."
- **No entierres el payoff.** Si tu hook promete algo, demuéstralo en los primeros 3 segundos. (Ej Descript: esperaba 12s para mostrar la feature; perdía a la gente.)
- **No escribas hooks genéricos.** "Boring", "Complexity", "CPM Hell", "No clear UVP" son los 4 síntomas de un hook genérico.
- **No dupliques las 3 capas.** Si el caption dice lo mismo que el VO y el visual, simplifica.
- **No hagas A/B microvariantes** post-Andromeda. Meta ya no premia eso. Premia **hooks distintos** (formato distinto, ángulo distinto, persona distinta).

---

## 7. Aplicación para Porter Metrics

| Pieza Porter | Cómo aplicar | Skill que se conecta |
|---|---|---|
| **Headline H1 de landing de conector** | Bold Claim o Contrast (autoridad de categoría) | `porter-writing-connector-landing` |
| **Intro de listicle "Best X templates"** | Relatability o Curiosity (abre loop con el problema) | `porter-writing-listicle` |
| **Subject line de email AC** | Confession o Curiosity (lo que mejor performa en inbox) | `porter-writing-email` |
| **Primer frame de Remotion video** | Visual primero, luego texto. Bold Claim funciona si hay número | `porter-remotion-animation` |
| **Hero copy de gallery de templates** | Contrast (sin Porter vs con Porter) | `porter-writing-template-gallery` |

---

## 8. Quotes para anclar criterio

- "El hook es la variable creativa de mayor leverage."
- "Un hook bueno no es subjetivo — se mide."
- "Hacé ads que se parezcan a lo que tu cliente consume." (Barry Hott)
- "Andromeda quiere contenido hyper-específico, no variantes."
- "Un click no es un cliente."
