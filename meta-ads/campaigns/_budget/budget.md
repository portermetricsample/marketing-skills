# Shared helper — Currency-aware budget for Meta Ads

**Single source of truth** for turning a user's real-money budget ("$30/día", "30.000 COP/día") into
the correct value for every Meta write action. `campaign-setup`, `adset-setup`, `onboarding` (and any
skill that sets a budget or bid) MUST use these rules — never hand-roll budget math.

## La regla (VERIFICADA en vivo, 2026-07-16 — read-back real)
> **En AMBOS niveles (campaña y ad set), `daily_budget_amount` / `lifetime_budget_amount` van en
> UNIDADES MÍNIMAS de la moneda (centavos). El connector NO convierte en ningún nivel. TÚ multiplicas
> el monto real del usuario por el offset de la moneda.**

Pruebas (cuenta COP, offset 100), enviado → leído de vuelta con `object_read`:
- Campaña: enviado `50000` → `daily_budget: "50000"` = **500,00 COP** (crudo, sin convertir).
- Ad set:  enviado `12345` → `daily_budget: "12345"` = **123,45 COP** (crudo, sin convertir).

⚠️ **El schema del MCP MIENTE en el ad set:** dice "MAJOR unit, el connector convierte, no multipliques
×100". **Es falso** — el ad set guarda el número crudo igual que la campaña. Seguir el schema haría
gastar 100× mal. (Feedback gap 35 — corregido con esta prueba.)

## Paso 1 — obtén la moneda y su offset (nunca asumas)
```
object_read(object_id="act_<digits>", fields="currency")   // "COP", "USD", "JPY", …
```
Offset (unidades mínimas por unidad mayor), específico por moneda:
- **La mayoría: offset 100** (2 decimales). Validado: **COP = 100**, USD/EUR/MXN/BRL = 100.
- **Monedas sin decimales: offset 1** — `JPY`, `KRW`, `VND`, `CLP`, `ISK`. Para estas `¥1000` = `1000`.
- Si dudas, léelo de la tabla de monedas de Meta; no adivines por los decimales del uso diario
  (COP casi no usa centavos, pero Meta le pone offset 100).

## Paso 2 — convierte (IGUAL para los dos niveles)
`amount` = número del usuario en moneda real (puede tener decimales). `offset` = del paso 1.

| Acción | Qué mandas | Fórmula |
|---|---|---|
| `campaign_create/update` (daily/lifetime) | **minor units, entero** | `round(amount * offset)` |
| `adset_create/update` (daily/lifetime) | **minor units, entero** | `round(amount * offset)` |
| `adset` `bid_value` | **minor units, entero** | `round(amount * offset)` |

Ejemplos (verifica siempre con el read-back del paso 5):
- `$30.00/día` USD (offset 100): campaña **y** ad set → `3000`.
- `30.000 COP/día` (offset 100): campaña **y** ad set → `3000000`.
- `¥5000/día` JPY (offset 1): campaña **y** ad set → `5000`.

**El error de ceros más común:** mandar `30000` creyendo "30.000 COP" cuando en realidad son `3000000`
(30.000 × 100). Con COP hay que agregar **dos ceros** al número que el usuario dice.

## Paso 3 — respeta el mínimo de la cuenta
Meta rechaza por debajo de un mínimo por cuenta y lo reporta en el error, en minor units
(`"…below the account minimum (3319 COP in minor units)"`). Compara tu valor minor contra él y da un
mensaje claro ("el mínimo es ~33,19 COP/día").

## Paso 4 — guarda contra el error de 100×
- `confirm_large_budget: true` SOLO tras confirmar con el usuario un monto inusualmente alto
  (el connector rechaza >5000× el mínimo sin este flag).
- Si el valor minor calculado se ve ~100× o ~1/100 del gasto que el usuario quiere, **detente** — casi
  seguro olvidaste (o repetiste) el ×offset.

## Paso 5 — self-check DESPUÉS de crear (obligatorio con dinero)
Lee el presupuesto de vuelta y verifica que coincida con la intención:
```
object_read(object_id=<id>, fields="daily_budget")   // minor units, string, p.ej. "3000000"
assert int(daily_budget) == round(amount * offset)    // si no coincide → PARA y arregla
```
Con dinero, este read-back NO es opcional.

## Reportar al usuario
Muestra SIEMPRE la cifra en **moneda real** con sus decimales ("$30,00/día", "30.000 COP/día") — nunca
el entero crudo en centavos. Formatea decimales por moneda (0 para offset-1, 2 para offset-100).

## Related
- Feedback gap 33 (minor units + mínimo no documentado) y gap 35 (schema del ad set dice "major/convierte"
  pero en realidad es minor/crudo — corregido con read-back 2026-07-16). Si algún día el connector SÍ
  empieza a convertir, este helper lo detecta en el paso 5 (self-check) antes de que cueste plata.
