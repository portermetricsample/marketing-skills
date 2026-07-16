# Guion de entrevista — Meta Ads Onboarding

Preguntas **en orden**, en lenguaje claro (voz "tú"). Regla: una pregunta o grupo a la vez, **opción
recomendada primero + el porqué**, y valida antes de seguir (ver `framework.md`). No avances si una
respuesta rompe una regla — explícalo y ofrece alternativa.

---

## 0. Cuenta (setup, no se le pregunta todo al usuario)
- "¿En qué cuenta publicitaria montamos la campaña?" → resuelve con `list_accounts`.
- Por detrás: lee **moneda, zona horaria, mínimo diario, método de pago, píxeles y página** disponibles.
- 🚧 **Si NO hay método de pago → detente** y dile: "Esta cuenta no tiene método de pago; Meta no deja crear
  ad sets. Agrégalo en Ads Manager (no gasta nada) y seguimos." (subcode 2859015.)

## 1. Objetivo — ¿qué quieres lograr?
"¿Cuál es la meta de esta campaña?"
- **Vender / compras online** → `OUTCOME_SALES` (necesita píxel + evento).
- **Conseguir prospectos (leads)** → `OUTCOME_LEADS` (formulario o landing).
- **Llevar visitas a tu sitio** → `OUTCOME_TRAFFIC`.
- **Reconocimiento / alcance** → `OUTCOME_AWARENESS`.
- **Interacción (mensajes, video, likes)** → `OUTCOME_ENGAGEMENT`.
⚠️ Dile: **el objetivo NO se puede cambiar después** — si dudas, elige por "cómo se ve un resultado".

## 2. Nombre (naming) — propón, no preguntes en frío
- **Usa el skill [`meta-ads/naming-conventions`](../../../naming-conventions/SKILL.md)** como fuente de la
  convención (nomenclatura de campaña/ad set/anuncio + plantilla de UTMs). Si no está disponible, usa el
  default de `framework.md`.
- Propón el nombre con esa convención: `[Marca] · Objetivo · Audiencia/Geo · MesAño`.
  Ej.: **`Porter · Leads · CO · Jul2026`**.
- "Le puse este nombre para que sea fácil de encontrar y ordenar: `…`. ¿Lo dejamos o lo ajustas?"
- Deriva también el nombre del ad set (`Geo · Edad · Audiencia`) y del anuncio (`Formato · Gancho`).

## 3. Presupuesto
- "¿Cuánto quieres invertir? ¿Por día o un total?" → monto **en tu moneda real** (el skill convierte).
- "¿Un solo presupuesto para toda la campaña (recomendado, Meta lo reparte) o uno por audiencia?" → CBO sí/no.
- Valida ≥ mínimo de la cuenta; convierte a la unidad correcta por nivel (ver `framework.md`).

## 4. Estrategia de puja
- **"Que Meta gaste para máximos resultados"** (recomendado) → `LOWEST_COST_WITHOUT_CAP`.
- "Tengo un tope de costo por resultado" → `COST_CAP`/`BID_CAP` (pide el valor).
⚠️ Siempre se fija explícita (si no, Meta la deja inentregable).

## 5. Categoría especial (cumplimiento — obligatorio)
"¿Anuncias vivienda, empleo, crédito/préstamos o temas políticos?"
- **No** → `[]`. Sí → `HOUSING` / `EMPLOYMENT` / `CREDIT` / `ISSUES_ELECTIONS_POLITICS`.
⚠️ Declararlo mal hace que rechacen los anuncios.

## 6. Audiencia (targeting)
- **Ubicación (obligatoria):** "¿A qué país/ciudades le hablas?" → `geolocation_search`.
- **Edad / género:** "¿Rango de edad? ¿Algún género en particular?" (por defecto 18–65, todos).
- **Audiencia amplia o específica:**
  - **Advantage+ (Meta amplía)** → recomendado para empezar. ⚠️ Con Advantage+ **no puedes poner edad máxima < 65**.
  - **Manual** → respeta exactamente tu edad/intereses. Úsalo si el usuario quiere un tope de edad real.
- **Retargeting:** "¿Quieres re-impactar a clientes/visitantes?" → audiencias custom/lookalike (`audiences`).
- (Intereses por keyword están rotos hoy — si los pide, avísale y usa geo + amplia/custom.)

## 7. Placements (dónde aparece)
- **Automático (Advantage+)** → recomendado (feed, stories, reels…). 
- **Manual** → solo si quiere restringir. ⚠️ Si restringe, define qué **formatos de creativo** hará (1:1/9:16/4:5/16:9).

## 8. Promoted object (según objetivo)
- LEADS → **página** + se creará un **lead form** (pregunta qué datos pedir: nombre, email, teléfono, empresa…).
- SALES → **píxel** + **evento** (Compra, etc.) o una conversión personalizada.
- TRAFFIC/AWARENESS/ENGAGEMENT → página (el link va en el anuncio).

## 9. Destino y tracking
- TRAFFIC/SALES: "¿A qué página web mando el clic?" → `link` + **UTMs** (el skill los arma en `url_tags`).
- LEADS: el destino es el formulario; define la pantalla de gracias (a dónde lleva después).

## 10. Creativo
- "¿Qué vas a mostrar? ¿Una imagen, un video, un carrusel, o varias versiones (multi-formato)?"
- Si no tiene el archivo listo: se puede **generar** (HTML→PNG) o pedir la URL/archivo. → `asset-upload`.
- ⚠️ Multi-formato/DCA se decide ANTES (el ad set queda marcado `is_dynamic_creative`).

## 11. Copy
- "¿Cuál es el mensaje?" → arma `message` (~125), `headline` (~40), `description` (~30) y el **CTA** (botón)
  acorde al objetivo (Leads→Registrarte/Cotizar; Sales→Comprar; Traffic→Más información).

## 12. Resumen y confirmación
- Muestra la **ficha completa** (nombres, objetivo, puja, presupuesto con moneda, targeting, placements,
  promoted object, creativo, copy, UTMs) + las **trampas atendidas**.
- "¿Todo bien? Con tu OK creo la campaña completa en **PAUSED** (no gasta hasta que tú la actives)."

## 13. Crear y entregar
- Al OK: despacha ejecutores (ver `framework.md`), crea en PAUSED, y entrega el **link de Ads Manager**.
