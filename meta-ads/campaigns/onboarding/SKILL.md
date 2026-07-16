---
name: meta-ads-campaign-onboarding
description: The guided wizard/checklist that walks a (non-technical) user through EVERY decision needed to launch a complete, correctly-configured Meta Ads campaign — naming, objective, bidding, budget, targeting, placements, promoted object, creative, copy, tracking — validating each answer against the account and Meta's rules, explaining the options and trade-offs in plain language, then producing a validated "campaign spec", showing a summary for the user's OK, and creating everything PAUSED via the executor skills. Use whenever the user wants to launch/set up a Meta campaign but isn't sure what to choose, asks "help me set up a campaign", "what do I need to run ads", "guide me", or when a campaign request lacks the required parameters. This is the BRAIN; campaign-setup / adset-setup / asset-upload / ad-setup are the executors it dispatches.
---

# Meta Ads — Campaign Onboarding (el wizard/checklist)

El **cerebro** que convierte "quiero anunciar" en una campaña completa y bien configurada. Entrevista al
usuario en lenguaje claro, **valida cada respuesta** contra la cuenta y las reglas de Meta, **le explica
las opciones y las trampas**, arma una **ficha de campaña validada**, se la muestra para su OK, y recién
ahí **crea todo en PAUSED** llamando a los skills ejecutores. Pensado para usuarios **no técnicos**.

## Goal (job-to-be-done)
Que alguien sin experiencia en Ads Manager pueda, **solo desde el chat**, montar una campaña con TODOS
los parámetros correctos — sin saberse de memoria objetivos, pujas, placements ni las trampas del API.

- **Alcance:** lanzamiento COMPLETO — campaña → ad set → anuncio. No solo el nivel campaña.
- **Cierre:** ficha validada → **resumen para tu OK** → crea en PAUSED. Nunca activa (eso es humano).
- **Diferenciador:** no ejecuta en silencio. Cada decisión se explica; cada trampa (objetivo irreversible,
  Advantage+ vs edad, presupuesto en centavos, categorías especiales, cuádrupla válida…) se previene ANTES,
  no se descubre con un error.

## Cómo opera (el flujo)
1. **Entrevista** al usuario siguiendo el guion ordenado de [`references/interview.md`](references/interview.md)
   (cuenta → objetivo → naming → presupuesto → puja → categoría → audiencia → placements → promoted object →
   destino/tracking → creativo → copy). Una pregunta (o grupo) a la vez, en lenguaje claro, con la **opción
   recomendada primero** y el porqué.
2. **Valida** cada respuesta con [`references/framework.md`](references/framework.md): contra la cuenta
   (moneda, mínimo, método de pago, píxel/página disponibles) y contra las reglas de Meta (cuádrupla válida,
   Advantage+/edad, presupuesto por nivel, etc.). Si algo no da, **lo explica y ofrece alternativa** — no adivina.
3. **Arma la ficha** en el esquema de [`references/spec.md`](references/spec.md) — todos los parámetros resueltos.
4. **Muestra el resumen** (naming + todos los settings + trampas atendidas) y **pide OK explícito**.
5. **Crea en PAUSED** despachando los ejecutores en orden:
   `campaign-setup` → (`audiences`/`leadform` si aplica) → `adset-setup` → `asset-upload` → `ad-setup`.
   Al final entrega el **link de Ads Manager** para validar.

## Reglas duras
- **Nunca crea nada sin el OK del resumen.** Nunca activa (todo PAUSED).
- **Bloquea si la cuenta no tiene método de pago** (si no, Meta rechaza el ad set — subcode 2859015).
- **No adivina el objetivo, el presupuesto ni la categoría especial** — si falta, pregunta.
- Cuenta = ref firmado de `list_accounts`.

## Componentes
- **Guion de entrevista:** [`references/interview.md`](references/interview.md) — las preguntas, en orden, con opciones y defaults.
- **Validación + defaults + naming + despacho:** [`references/framework.md`](references/framework.md).
- **Ficha de campaña (output):** [`references/spec.md`](references/spec.md).
- 📖 Opciones/enum completos: [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md).

## Ejemplo
> Usuario: "Ayúdame a lanzar una campaña para el MCP." → el wizard pregunta objetivo (→ Leads), propone el
> nombre `Porter · Leads · CO · Jul2026`, valida presupuesto en COP ≥ mínimo, elige LEAD_GENERATION+ON_AD+página+form,
> arma el lead form, sube el creativo, escribe el copy con UTMs, muestra el resumen, y al OK crea todo PAUSED
> + link de Ads Manager.
