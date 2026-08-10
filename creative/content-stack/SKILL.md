---
name: content-stack
description: Estructura cualquier pieza de contenido usando la cascada de 8 elementos en 3 fases (Audience · Offer → Topic · Concept · Angle → Format · Hook · CTA). Actívalo con /content-stack o cuando el usuario quiera estructurar una idea de contenido, planear posts para social orgánico, descomponer un ad/post de un competidor, escalar una idea en muchas variaciones coherentes, o cuando diga "no sé por dónde empezar este contenido", "esto no me cierra", "arma el brief", "descompón este ad", "dame ángulos". Sirve para cualquier canal (social orgánico, ads, blog, email) pero está afinado para social orgánico. Se apoya en `persona-research` (Audience), `hook-writer` (Hook) y `ad-diagnostic` (cuando algo no convierte).
---

# Content Stack

Sistema para **estructurar contenido de arriba hacia abajo**: de la estrategia a la ejecución, en una sola cascada de 8 elementos. La idea central no es definir cada elemento por separado — es que **cada elemento herede del de arriba**. Cuando esa cadena se rompe, el contenido "no pega" aunque cada pieza suelta se vea bien.

> Base: framework de estrategia de contenido en 3 fases (Fundación → Ideación → Ejecución).

---

## 1. La cascada de 8 elementos

Piénsalo como una pirámide. Arriba lo **durable** (casi no cambia), abajo lo **variable** (haces muchas versiones).

### Fase 1 — Fundación estratégica *(durable: se define una vez por trimestre/campaña)*

1. **Audience** — el grupo exacto al que le hablas, definido por sus **deseos, miedos y dolores** profundos. No "PYMEs" — "el dueño de agencia que a fin de mes arma reportes a mano a las 11pm y odia esa parte".
2. **Offer** — la solución / trato / intercambio de valor específico que resuelve ese dolor. Qué gana y qué tiene que hacer para obtenerlo.

### Fase 2 — Ideación creativa *(semi-durable: pocas por mes)*

3. **Topic** — el tema amplio, categoría o nicho del que hablas (ej: "reportería de marketing", "ahorro de tiempo").
4. **Concept** — el gran vehículo creativo o "universo" que enmarca el mensaje: un sketch de comedia, un falso documental, un breakdown científico, un "día en la vida", un antes/después. Es el *formato narrativo grande*, no el técnico.
5. **Angle** — el punto de vista narrativo o gatillo emocional específico dentro de ese Concept, dirigido a una **rebanada** de la audiencia. Un mismo Concept puede tener 5 Angles distintos (miedo, envidia, alivio, estatus, curiosidad).

### Fase 3 — Ejecución táctica *(variable: muchas versiones por semana)*

6. **Format** — el medio y estructura técnica: Reel, carrusel de imágenes, post de solo texto, video TikTok, thread. *(Es lo que la gente confunde con "Concept" — no lo son.)*
7. **Hook** — los primeros 3 segundos del video o la primera línea del texto. Su trabajo es **parar el scroll**. → Para escribirlo/auditarlo bien, usa el skill `hook-writer`.
8. **CTA** — la instrucción explícita y directa de qué hacer ahora para acceder a la Offer.

---

## 2. La regla de coherencia *(el corazón del skill)*

Cada elemento debe poder responder **"¿de dónde vengo?"** señalando al de arriba. Recorre la cadena de abajo hacia arriba y valida:

- ¿El **CTA** entrega la **Offer**? (si el CTA es "sígueme" pero la Offer es una demo, hay fuga)
- ¿El **Hook** dramatiza el **Angle**?
- ¿El **Angle** vive dentro del **Concept**?
- ¿El **Concept** habla del **Topic**?
- ¿El **Topic** le importa a esta **Audience**?
- ¿La **Offer** resuelve el dolor de esta **Audience**?

**Síntoma de ruptura clásico:** un Hook genial que no conecta con la venta = *hook slop* (lo dispara `hook-writer`). O un Concept divertidísimo sobre un Topic que a la Audience le da igual. Si un eslabón no hereda, **no lo maquilles: reescríbelo o baja un nivel**.

Al final de cada brief, incluye un **semáforo de coherencia**:

```
Audience  → Offer     🟢
Offer     → Topic      🟢
Topic     → Concept    🟡  (el concept es gracioso pero se aleja del topic)
Concept   → Angle      🟢
Angle     → Hook       🟢
Hook      → CTA        🔴  (el hook promete X, el CTA pide Y)
```

🟢 hereda limpio · 🟡 se estira, revisar · 🔴 roto, reescribir.

---

## 3. La palanca: fan-out desde una fundación fija

El error caro en social orgánico es tratar cada pieza como un proyecto nuevo. No lo es. **Fija lo de arriba una vez y abre en abanico lo de abajo.**

Con **una** Audience + Offer + Topic puedes generar:

```
Topic: "reportería de marketing sin perder el domingo"
│
├── Concept A: "confesiones de un dueño de agencia"
│     ├── Angle 1 (vergüenza): "lo que nadie admite de sus reportes"
│     │     └── 3 Hooks × 2 Formats = 6 piezas
│     └── Angle 2 (alivio): "el día que dejé de armarlos a mano"
│
└── Concept B: "mock tutorial exagerado"
      └── Angle 3 (absurdo): "cómo perder 6 horas armando un reporte, paso a paso"
```

**Regla práctica:** de 1 fundación → 2-3 Concepts → 2-3 Angles c/u → 2-3 Hooks c/u. Eso es un mes de contenido coherente desde una sola decisión estratégica. Todas las piezas se sienten de la misma marca porque comparten los eslabones de arriba.

---

## 4. Dos modos de uso

### Modo A — CONSTRUIR (idea fresca → plan)

Cuando el usuario trae una idea, un lanzamiento o "necesito contenido para X".

1. **Fija la Fundación primero.** Pregunta (o infiere del contexto) la Audience y la Offer. Si la Audience está floja o suena a AI genérico ("emprendedores ocupados"), **detente y usa `persona-research`** — todo lo de abajo se construye sobre esto.
2. **Define Topic.** Uno, claro.
3. **Abre en abanico** Concepts → Angles → (Formats + Hooks + CTA) según la sección 3.
4. **Corre el semáforo de coherencia** en cada pieza.
5. Entrega el **brief estructurado** (sección 5).

### Modo B — DESCOMPONER (pieza existente → patrón reusable)

Cuando el usuario pega un ad/post de un competidor o uno propio: "descompón esto", "por qué funciona este ad".

1. Etiqueta los **8 elementos** desde lo que ves (a veces la Audience/Offer se infieren — márcalo como inferencia).
2. Nombra el **Concept** explícitamente — es lo más valioso y lo que la gente no ve.
3. Guarda como fila en un **swipe file** (sección 5) para reusar el Concept/Angle con otra Audience/Offer.

> Descomponer alimenta a Construir: los Concepts que ves funcionando son munición para tu próximo fan-out.

---

## 5. Formatos de salida

Entrega siempre un doc estructurado vertical (markdown). Elige la plantilla según el modo.

### Plantilla CONSTRUIR — Brief de contenido

```markdown
# Content Stack — [nombre de la campaña/idea]

## Fundación (fija)
- **Audience:** [quién exacto + su dolor/deseo en una frase]
- **Offer:** [qué resuelve + qué tiene que hacer]
- **Topic:** [el tema amplio]

## Piezas
### Pieza 1
| Elemento | Contenido |
|----------|-----------|
| Concept  | [el vehículo creativo] |
| Angle    | [gatillo emocional + a qué rebanada] |
| Format   | [Reel / carrusel / texto...] |
| Hook     | [primera línea / primeros 3s] |
| CTA      | [acción exacta] |

**Coherencia:** Audience→Offer 🟢 · Offer→Topic 🟢 · Topic→Concept 🟢 · Concept→Angle 🟢 · Angle→Hook 🟢 · Hook→CTA 🟢

### Pieza 2 …
```

### Plantilla DESCOMPONER — Swipe file

```markdown
# Swipe — [marca/fuente] · [link]

| Elemento | Lo que veo |
|----------|-----------|
| Audience | [inferida] |
| Offer    | [inferida] |
| Topic    | ... |
| Concept  | ← lo más importante, nómbralo |
| Angle    | ... |
| Format   | ... |
| Hook     | [transcrito literal] |
| CTA      | [literal] |

**Por qué funciona:** [1-2 frases sobre qué eslabón carga el peso]
**Cómo lo robo:** [Concept/Angle aplicado a MI Audience/Offer]
```

---

## 6. Errores a matar

- **Confundir Concept con Format.** "Un Reel" no es un concepto; "un falso documental de terror sobre el reporte del lunes" sí. El Format es el envase; el Concept es la idea.
- **Angles que son el mismo Angle.** Si tus 5 "ángulos" dicen lo mismo con otras palabras, no son ángulos. Un ángulo real cambia el **gatillo emocional** o la **rebanada de audiencia**.
- **Saltarse la Fundación.** Empezar por el Hook es empezar por el final. Un hook brillante sobre una Offer que a nadie le importa no vende nada.
- **Audience de talla única.** "Todos" no es audiencia. Si el hook no descalifica a alguien, no está calificando a nadie.
- **CTA implícito.** "Espero que te sirva" no es CTA. Di la acción exacta.

---

## 7. Cuándo saltar a otro skill

- Audience floja o genérica → **`persona-research`** (define bien antes de seguir).
- Escribir o auditar el Hook a fondo → **`hook-writer`** (5 formatos canónicos, anti hook-slop).
- La pieza ya salió y **no convierte** → **`ad-diagnostic`** (funnel capture→keep→click→convert).
- Necesitas producir el video/animación → **`porter-remotion-animation`** / **`hyperframes`**.
- Es un email, listicle o landing → **`porter-writing-email` / `porter-writing-listicle` / `porter-writing-landing`**.

Este skill es el **orquestador de arriba**: decide la estructura y la coherencia; los otros ejecutan cada eslabón.
