# Prompt para Claude Chat — Dashboard de Google Analytics 4 como artifact (datos maskeados)

Pegar cualquiera de los dos bloques (inglés o español) en Claude Chat. **No necesita
el conector de Porter**: es un artifact self-contained con datos ficticios (marca
`Acme Analytics`), pensado para demos, video y screenshots — réplica del dashboard GA4
maskeado `730c1424`. Los dos bloques producen el mismo resultado.

---

## English

```
Build me a single interactive analytics dashboard as an artifact — a faithful, working
recreation of a Google Analytics 4 report. Use ONLY fictional, synthetic data (this is a
masked sample): invent a company called "Acme Analytics" on the domain acmeanalytics.io.
Do not use or ask for any real account. Make it feel like a real analytics tool, not a
flat report.

## Fake data — how to generate it
Generate ONE canonical daily series and derive everything from it, so every KPI reconciles
across the four pages (total sessions on one page must match the same metric aggregated on
another). Make it deterministic (seed each day by its date) so the numbers are stable and
period-over-period deltas fall out naturally.

- Base ~1,180 sessions per day, ×0.62 on weekends, with a gentle upward trend across the
  year, plus small ±10-16% per-day jitter.
- Derive per day: active users = 0.80×sessions · total users = 0.86×sessions · new users =
  0.58×active users · engaged sessions = 0.63×sessions · views = 2.4×sessions · event count
  = 6.2×sessions · key events = 0.072×sessions · engagement duration = 82s×sessions.
- Default range = last 30 days (so sessions ≈ 35.7K, active users ≈ 28.5K, views ≈ 86.9K,
  key events ≈ 2.6K — numbers of that order).
- For each breakdown, distribute the range total across the listed values by fixed shares.
  Key events use a SEPARATE share vector (channels/pages/events convert at different rates
  than they get traffic). Every label must be unique. Coherent ratios everywhere.

## How it looks
A clean Google Analytics look, LIGHT theme by default with a dark-mode toggle. Blue accent
(GA blue), Roboto/system font, white cards with subtle borders and rounded corners. Top app
bar: the Google Analytics tri-bar logo mark + "Google Analytics", and on the right the
property label "Acme Analytics — GA4 (sample)" with a small subline "GA4 property · masked
sample data". A left navigation rail like the GA4 UI with four items, each with an icon:
Conversions · Audiences · Content · Time matrix. Controls bar under the page title: a date-
range control (Today, Yesterday, Last 7/14/28/30/90 days, Last 12 months, this/last
week/month/quarter/year, custom — default Last 30 days), compare pills (none · previous
period · last year — default previous period), and the theme toggle. A discreet footer line:
"Masked sample dashboard · figures are synthetic and do not represent any real property ·
rates are derived client-side from base counts." Big numbers bold and compact (2.6K, 35.7K,
221.9K), tooltips on hover, no decorative emojis. Rates (engagement rate, key event rate)
are always derived client-side from the base counts, never shown as a queried metric.

## Page 1 — Conversions (Key events)
KPI cards (each with a % delta vs the comparison period, green up / red down): Key events ·
Session key event rate (%) · Sessions · Event count (all events).
Charts:
- "Key events over time": a trend chart with a metric switcher (Key events / Sessions / Key
  event rate / Event count). Show the current period as a filled line and the previous
  period as a faint dotted line when compare is on.
- "Key events by event name": a table (event name · key events · % of total · vs prev.) with
  a subtle in-row bar behind the name. Only events that actually convert appear —
  generate_lead (~72%) and sign_up (~28%).
- "Key events by default channel group": a horizontal bar chart over Organic Search, Direct,
  Paid Search, Organic Social, Referral, Email, Display, Paid Social.
- "Key events by session source / medium": a table (source/medium · sessions · key events ·
  key event rate) over google / organic, (direct) / (none), google / cpc, bing / organic,
  newsletter / email, linkedin.com / referral, t.co / referral, facebook / cpc,
  chatgpt.com / referral, duckduckgo / organic.
- An "Insights" block: 2-4 sentences reading off the data (totals, biggest mover, top source).

## Page 2 — Audiences
KPI cards: Total users · New users · Active users · Engagement rate.
Section "Geography": a horizontal bar chart "Active users by country" (United States, United
Kingdom, India, Germany, Canada, Australia, Brazil, France, Spain, Netherlands, Mexico,
Italy — descending) and a table "Top cities" (city · country · active users) for New York,
London, San Francisco, Toronto, Bengaluru, Berlin, Sydney, Paris, Madrid, Amsterdam.
Section "Demographics": bar "Active users by age" (18-24, 25-34, 35-44, 45-54, 55-64, 65+,
with 25-34 largest) · donut "Active users by gender" (male/female, drop unknown) · bar
"Active users by language" (en-us, en-gb, es-es, de-de, fr-fr, pt-br, en-in, nl-nl) · bar
"Active users by interests" (Technology/Analytics, Business/Marketing, Media & Entertainment,
Shoppers, Software, Finance/Investing, Travel).
Section "Technology": donut "device category" (desktop 62% / mobile 33% / tablet 5%) · bar
"browser" (Chrome, Safari, Edge, Firefox, Samsung Internet, Opera) · bar "operating system"
(Windows, macOS, iOS, Android, Linux) · donut "new vs returning" (new 58% / returning 42%).
Section "Audiences": a table "Active users by audience" (audience · active users · sessions)
for All Users, New users, Returning users, Engaged sessions, Recently active users,
Purchasers. Close with an "Insights" block.

## Page 3 — Content
KPI cards: Views · Active users · Views per active user · Avg. engagement time (m s).
Charts:
- "Views over time": a trend chart with a metric switcher (Views / Active users / Sessions),
  current + faint previous period.
- "Pages and screens": a large table with a search-by-path box. Columns: page path · views ·
  active users · avg. engagement time · key events · views vs prev. Paths: /, /pricing,
  /features, /blog, /integrations, /blog/analytics-guide, /about, /contact, /signup, /login,
  /templates, /docs, /customers, /blog/marketing-reports, /dashboard. Key events concentrate
  on /signup and /pricing.
- A two-up grid: table "Landing pages" (landing page · sessions · engagement rate · new
  users) for /, /pricing, /blog/analytics-guide, /features, /integrations, /signup,
  /templates, /blog, /docs, /customers; bar "Views by page title" (Home, Pricing, Features,
  Blog, Integrations, About, Contact, Sign up, Templates, Docs); table "Site search terms"
  (term · events) for pricing, templates, api, integrations, ga4, dashboard, export pdf,
  looker studio, support, webhook. Close with an "Insights" block.

## Page 4 — Time matrix
- "Key metrics by period": a breakdown matrix where rows are metrics (Active users, New
  users, Sessions, Engaged sessions, Engagement rate, Views, Key events, Session key event
  rate) and columns are time periods newest-first with a leading Total column. Per-row heat
  shading on a blue ramp (darker = higher within that row). A granularity toggle
  Day / Week / Month / Quarter, default Week.
- "Sessions by day of week and hour": a 7-row (Monday–Sunday) × 24-column (hours) heatmap,
  blue intensity by sessions, peaking in business hours mid-week, with a low→high legend.
- An "Insights" block: strongest single day, and the peak traffic hour.

## Details that matter to me
All four tabs must feel like one product. Show skeleton placeholders while things settle —
no layout jumps. If a section has no data, say so honestly instead of breaking. It must look
right on a large screen and on mobile. Light theme by default with a working dark toggle, and
it should print/export cleanly (all pages stacked).
```

---

## Español

```
Armáme un único dashboard de analítica interactivo como artifact — una recreación fiel y
funcional de un reporte de Google Analytics 4. Usá SOLO datos ficticios y sintéticos (esto es
una muestra maskeada): inventá una empresa llamada "Acme Analytics" en el dominio
acmeanalytics.io. No uses ni pidas ninguna cuenta real. Que se sienta una herramienta de
analítica de verdad, no un reporte plano.

## Datos ficticios — cómo generarlos
Generá UNA serie diaria canónica y derivá todo de ahí, para que cada KPI cuadre entre las
cuatro páginas (el total de sesiones de una página tiene que coincidir con la misma métrica
agregada en otra). Hacelo determinístico (seed de cada día por su fecha) para que los números
sean estables y los deltas contra el periodo anterior salgan naturales.

- Base ~1.180 sesiones por día, ×0,62 los fines de semana, con una leve tendencia creciente
  a lo largo del año, más un jitter chico de ±10-16% por día.
- Derivá por día: usuarios activos = 0,80×sesiones · usuarios totales = 0,86×sesiones ·
  usuarios nuevos = 0,58×activos · sesiones con interacción = 0,63×sesiones · vistas =
  2,4×sesiones · recuento de eventos = 6,2×sesiones · eventos clave = 0,072×sesiones ·
  duración de interacción = 82s×sesiones.
- Rango por defecto = últimos 30 días (así sesiones ≈ 35.7K, usuarios activos ≈ 28.5K, vistas
  ≈ 86.9K, eventos clave ≈ 2.6K — números de ese orden).
- Para cada desglose, repartí el total del rango entre los valores listados por proporciones
  fijas. Los eventos clave usan un vector de proporciones SEPARADO (canales/páginas/eventos
  convierten a tasas distintas de las que reciben tráfico). Cada etiqueta debe ser única.
  Ratios coherentes en todos lados.

## Cómo se ve
Estética limpia de Google Analytics, tema CLARO por defecto con un toggle a modo oscuro.
Acento azul (azul GA), fuente Roboto/system, tarjetas blancas con bordes sutiles y esquinas
redondeadas. Barra superior: el logo de tres barras de Google Analytics + "Google Analytics",
y a la derecha el label de la propiedad "Acme Analytics — GA4 (sample)" con un subtítulo chico
"GA4 property · masked sample data". Un panel de navegación a la izquierda como la UI de GA4
con cuatro ítems, cada uno con su ícono: Conversions · Audiences · Content · Time matrix.
Barra de controles debajo del título: un selector de rango de fechas (Hoy, Ayer, Últimos
7/14/28/30/90 días, Últimos 12 meses, esta/última semana/mes/trimestre/año, personalizado —
por defecto Últimos 30 días), pills de comparación (ninguna · periodo anterior · año anterior
— por defecto periodo anterior), y el toggle de tema. Una línea discreta en el pie: "Masked
sample dashboard · figures are synthetic and do not represent any real property · rates are
derived client-side from base counts." Los números grandes en negrita y con formato corto
(2.6K, 35.7K, 221.9K), tooltips al pasar el mouse, nada de emojis de decoración. Las tasas
(engagement rate, key event rate) siempre se derivan del lado del cliente a partir de los
conteos base, nunca se muestran como métrica consultada.

## Página 1 — Conversions (Eventos clave)
Tarjetas de KPI (cada una con % de cambio vs el periodo de comparación, verde sube / rojo
baja): Eventos clave · Tasa de eventos clave por sesión (%) · Sesiones · Recuento de eventos
(todos los eventos).
Gráficos:
- "Key events over time": un gráfico de tendencia con selector de métrica (Eventos clave /
  Sesiones / Tasa de eventos clave / Recuento de eventos). El periodo actual como línea con
  relleno y el periodo anterior como línea punteada tenue cuando la comparación está activa.
- "Key events by event name": una tabla (nombre del evento · eventos clave · % del total · vs
  ant.) con una barra sutil detrás del nombre. Solo aparecen los eventos que convierten:
  generate_lead (~72%) y sign_up (~28%).
- "Key events by default channel group": barras horizontales sobre Organic Search, Direct,
  Paid Search, Organic Social, Referral, Email, Display, Paid Social.
- "Key events by session source / medium": una tabla (fuente/medio · sesiones · eventos clave
  · tasa de eventos clave) sobre google / organic, (direct) / (none), google / cpc,
  bing / organic, newsletter / email, linkedin.com / referral, t.co / referral,
  facebook / cpc, chatgpt.com / referral, duckduckgo / organic.
- Un bloque "Insights": 2 a 4 frases que lean los datos (totales, mayor variación, top fuente).

## Página 2 — Audiences
Tarjetas de KPI: Usuarios totales · Usuarios nuevos · Usuarios activos · Engagement rate.
Sección "Geography": barras horizontales "Active users by country" (United States, United
Kingdom, India, Germany, Canada, Australia, Brazil, France, Spain, Netherlands, Mexico, Italy
— descendente) y una tabla "Top cities" (ciudad · país · usuarios activos) para New York,
London, San Francisco, Toronto, Bengaluru, Berlin, Sydney, Paris, Madrid, Amsterdam.
Sección "Demographics": barras "Active users by age" (18-24, 25-34, 35-44, 45-54, 55-64, 65+,
con 25-34 el mayor) · dona "Active users by gender" (male/female, descartar unknown) · barras
"Active users by language" (en-us, en-gb, es-es, de-de, fr-fr, pt-br, en-in, nl-nl) · barras
"Active users by interests" (Technology/Analytics, Business/Marketing, Media & Entertainment,
Shoppers, Software, Finance/Investing, Travel).
Sección "Technology": dona "device category" (desktop 62% / mobile 33% / tablet 5%) · barras
"browser" (Chrome, Safari, Edge, Firefox, Samsung Internet, Opera) · barras "operating system"
(Windows, macOS, iOS, Android, Linux) · dona "new vs returning" (new 58% / returning 42%).
Sección "Audiences": una tabla "Active users by audience" (audiencia · usuarios activos ·
sesiones) para All Users, New users, Returning users, Engaged sessions, Recently active users,
Purchasers. Cerrá con un bloque "Insights".

## Página 3 — Content
Tarjetas de KPI: Vistas · Usuarios activos · Vistas por usuario activo · Tiempo medio de
interacción (m s).
Gráficos:
- "Views over time": gráfico de tendencia con selector de métrica (Vistas / Usuarios activos /
  Sesiones), actual + periodo anterior tenue.
- "Pages and screens": una tabla grande con buscador por path. Columnas: page path · vistas ·
  usuarios activos · tiempo medio de interacción · eventos clave · vistas vs ant. Paths: /,
  /pricing, /features, /blog, /integrations, /blog/analytics-guide, /about, /contact, /signup,
  /login, /templates, /docs, /customers, /blog/marketing-reports, /dashboard. Los eventos
  clave se concentran en /signup y /pricing.
- Una grilla a dos columnas: tabla "Landing pages" (landing page · sesiones · engagement rate
  · usuarios nuevos) para /, /pricing, /blog/analytics-guide, /features, /integrations,
  /signup, /templates, /blog, /docs, /customers; barras "Views by page title" (Home, Pricing,
  Features, Blog, Integrations, About, Contact, Sign up, Templates, Docs); tabla "Site search
  terms" (término · eventos) para pricing, templates, api, integrations, ga4, dashboard,
  export pdf, looker studio, support, webhook. Cerrá con un bloque "Insights".

## Página 4 — Time matrix
- "Key metrics by period": una matriz de desglose donde las filas son métricas (Usuarios
  activos, Usuarios nuevos, Sesiones, Sesiones con interacción, Engagement rate, Vistas,
  Eventos clave, Tasa de eventos clave por sesión) y las columnas son periodos, del más nuevo
  al más viejo, con una columna Total al inicio. Sombreado de calor por fila en una rampa azul
  (más oscuro = más alto dentro de esa fila). Un toggle de granularidad Día / Semana / Mes /
  Trimestre, por defecto Semana.
- "Sessions by day of week and hour": un mapa de calor de 7 filas (lunes a domingo) × 24
  columnas (horas), intensidad azul según sesiones, con pico en horario laboral entre semana,
  con leyenda de menos a más.
- Un bloque "Insights": el día individual más fuerte y la hora pico de tráfico.

## Detalles que me importan
Que las cuatro pestañas se sientan un mismo producto. Que mientras cargan se vean placeholders
tipo skeleton — nada de saltos de layout. Si una sección no tiene datos, que lo diga
claramente en vez de romperse. Que se vea bien en pantalla grande y en el celular. Tema claro
por defecto con un toggle a oscuro que funcione, y que imprima/exporte limpio (todas las
páginas apiladas).
```
