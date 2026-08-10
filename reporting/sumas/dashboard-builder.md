# SUMAS Dashboard Builder (sub-skill de /sumas)

Sub-skill enfocado: convierte el framework SUMAS en una **receta accionable para generar
la especificacion de un dashboard o reporte de marketing** para cualquier canal.

Usa ESTE archivo (no todo el SKILL.md) cuando la tarea sea "crea un reporte/dashboard de X".
El SKILL.md tiene la teoria completa (3Cs, casos de uso, catalogo de frameworks, escalera de
ROI); para construir un dashboard NO la necesitas. Aqui esta solo lo que se aplica.

---

## Las 4 capas que necesita TODO dashboard

Un dashboard SUMAS se arma montando estas capas, en este orden:

1. **Embudo (metricas crudas):** Visibilidad -> Engagement -> Conversion. Son los numeros base.
2. **Contexto (les da sentido):** cada metrica del embudo se acompana de:
   - **Efectividad** = vs tu potencial -> *tasas* (CTR, tasa de conversion, ER, open rate)
   - **Eficiencia** = vs tu gasto -> *costos* (CPM, CPC, CPA/CPL, ROAS) — solo si hay $ invertido
   - **Tiempo** = vs periodo anterior
   - **Objetivo** = vs meta
3. **Segmentos (palancas/levers):** las dimensiones por las que se filtra y se desglosa.
4. **Bottom-line (negocio):** CAC, LTV, ROAS, margen — solo si el usuario mide revenue/rentabilidad.

Regla de oro: **menos metricas, mejor elegidas.** Pocas crean ceguera; demasiadas matan el enfoque.

---

## Receta de 6 pasos (sirve para cualquier canal)

**Paso 1 — Confirma 3 entradas con el usuario (si no las da, asume y avisa):**
- Tipo de negocio: **B2B** (leads, MQL/SQL, ACV) o **E-commerce** (ordenes, AOV, ROAS).
- Caso de uso -> define audiencia y frecuencia:
  - Operativo (diario): media buyer/analista -> budget pacing, alertas.
  - Analitico (semanal/mensual): manager -> seguimiento de KPIs.
  - Estrategico (trimestral): ejecutivo/cliente -> rentabilidad, decisiones.
- Objetivo / KPI principal del reporte (que decision se quiere tomar con el).

**Paso 2 — Elige las metricas de embudo del canal** (visibilidad / engagement / conversion).

**Paso 3 — Anade contexto a cada una:** tasa, costo (si hay gasto), vs periodo anterior, vs objetivo.

**Paso 4 — Elige los segmentos (levers)** relevantes para ese canal.

**Paso 5 — Ordena en CASCADA** (de general a especifico): scorecards -> serie temporal ->
desgloses por segmento -> tabla de detalle.

**Paso 6 — Aplica reglas de diseno:** contraste/jerarquia, formato condicional (verde/rojo),
texto de ayuda, y la visualizacion correcta por tipo de dato (ver cheat-sheet).

---

## Patron de layout (la cascada)

```
Fila 1 — SCORECARDS: 3-5 KPIs principales, cada uno con [vs periodo anterior] y [vs objetivo]
Fila 2 — SERIE TEMPORAL: tendencia del KPI principal (y un input metric que lo explique)
Fila 3 — DESGLOSE: 1-2 graficos por el segmento mas importante (canal, campana, formato...)
Fila 4 — TABLA DE DETALLE: todas las metricas x dimensiones, filtrable
Controles: filtros por cada lever (fecha, canal, campana, etc.)
Texto de ayuda: 1 linea por seccion explicando que mirar
```

Principio: arriba lo general (contexto), abajo lo especifico (accion).

---

## Cheat-sheet de visualizaciones

| Quiero mostrar... | Uso |
|-------------------|-----|
| Tendencia en el tiempo (sube/baja) | Serie temporal |
| Un KPI vs su objetivo | Scorecard con delta, o Gauge |
| Comparar muchas metricas x dimension | Tabla |
| Reparto de algo sin orden (fuentes, canales) | Pastel / Barras |
| Reparto a lo largo del tiempo | Grafico de areas |
| Distribucion ordinal (edad, dia, hora) | Barras |
| Proceso de compra y donde se cae la gente | Embudo |
| Relacion entre 2 metricas (ej. CPC vs conversiones) | Dispersion |

---

## Formato de salida que debe producir la IA

Cuando generes el dashboard, entrega una **spec** asi (no solo prosa):

```
DASHBOARD: [nombre]
Audiencia: [quien] | Frecuencia: [diaria/semanal/mensual] | Caso de uso: [operativo/analitico/estrategico]
KPI principal: [metrica + objetivo]
Filtros (levers): [lista de dimensiones para segmentar/filtrar]

WIDGETS:
1. [nombre] | metrica(s): [...] | contexto: [vs prior / vs goal / tasa / costo] | viz: [tipo] | por que: [...]
2. ...
```

Asi cada reporte sale consistente y trazable al framework.

---

## Blueprints listos

### A) Reporte de Social Media

- **Embudo:**
  - Visibilidad: impresiones, alcance, crecimiento de seguidores
  - Engagement: reacciones, comentarios, shares, guardados, reproducciones de video, ER
  - Conversion: clics al link, mensajes/DMs, leads (o compras si se trackean)
- **Contexto:** ER (engagement/alcance), tasa de crecimiento de seguidores, vs mes anterior, vs objetivo. CPM/CPC solo si hay pauta.
- **Segmentos:** red (IG/FB/TikTok/LinkedIn), formato (reel/carrusel/estatico/story), tema, post individual, dia/hora.
- **Layout sugerido:**
  - Scorecards: Alcance, ER, Crecimiento de seguidores, Conversiones (cada uno vs mes anterior)
  - Serie temporal: Alcance + ER en el tiempo
  - Desglose: por red (barras) y por formato (barras) — que formato rinde mejor
  - Tabla: top posts por ER y por alcance
  - Extra: mapa de calor de mejor dia/hora para publicar
- **Caso de uso:** analitico, semanal/mensual.

### B) Reporte de Ads (PPC)

- **Embudo:**
  - Visibilidad: impresiones, alcance
  - Engagement: clics, CTR
  - Conversion: conversiones (leads/compras), revenue
- **Contexto:** CTR, tasa de conversion; CPM, CPC, CPA/CPL, ROAS; budget pacing (gasto vs presupuesto); vs periodo anterior; vs objetivo (CPA/ROAS target).
- **Segmentos:** plataforma (Meta/Google/TikTok), campana, objetivo, audiencia, creativo/formato, dia.
- **Layout sugerido:**
  - Scorecards: Gasto, Conversiones, CPA, ROAS (cada uno vs objetivo)
  - Budget pacing: gasto acumulado vs presupuesto del periodo
  - Serie temporal: Gasto vs Conversiones (o ROAS) en el tiempo
  - Desglose: por campana (tabla/barras) y por creativo (que anuncio rinde mejor)
  - Tabla: audiencias por CPA y ROAS
- **Caso de uso:** operativo (pacing diario) + analitico (semanal). B2B: CPL/ACV. E-commerce: CPA/AOV/ROAS.

### C) Reporte de GA4 (website)

- **Embudo:**
  - Visibilidad: usuarios, sesiones, usuarios nuevos
  - Engagement: sesiones con interaccion, tasa de interaccion (engagement rate), eventos, tiempo medio de interaccion, paginas/sesion
  - Conversion: eventos clave (key events)/conversiones, tasa de conversion, revenue (si e-commerce)
- **Contexto:** engagement rate, tasa de conversion; vs periodo anterior; vs objetivo. (Eficiencia/costo solo si se cruza con datos de gasto.)
- **Segmentos:** canal (default channel grouping: organic/paid/social/direct/email), fuente/medio, landing page, dispositivo, pais/ciudad, campana (UTM).
- **Layout sugerido:**
  - Scorecards: Usuarios, Sesiones, Tasa de conversion, Conversiones/Revenue (vs periodo anterior)
  - Serie temporal: Sesiones + Conversiones en el tiempo
  - Desglose: adquisicion por canal (barras o tabla) — de donde viene el trafico que convierte
  - Tabla: top landing pages por sesiones y conversion
  - Extra: split por dispositivo y por pais
- **Caso de uso:** analitico, semanal/mensual.

---

## Recordatorio

Estos blueprints son el punto de partida, no una camisa de fuerza. Ajusta segun el tipo de
negocio (B2B vs E-commerce), el caso de uso (cadencia + audiencia) y el objetivo real del reporte.
Para teoria de fondo (por que estas metricas, las 3Cs, la escalera de ROI), remite a SKILL.md.
