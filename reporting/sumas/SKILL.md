---
name: sumas
description: Framework SUMAS completo (Porter Metrics + HubSpot) para analizar datos de marketing. Incluye los 5 pasos, el catalogo de +10 frameworks populares, tipos de metricas por canal, como anadir contexto, como segmentar, como disenar dashboards (principios de diseno, visualizaciones, IA) y como medir el ROI de marketing (escalera de madurez, pensar como CEO/CFO, unit economics). Usar cuando el usuario quiera analizar datos, elegir KPIs, disenar dashboards o reportes, medir ROI/rentabilidad, o entender metricas de marketing.
user_invocable: true
---

# Framework SUMAS - Como analizar datos de marketing

Framework creado por Porter Metrics y HubSpot para elegir, organizar y analizar metricas de marketing de forma consistente, sin importar la industria, el canal o el tipo de negocio.

Fuentes:
- PDF: Guia SUMAS (Porter + HubSpot)
- Web: https://portermetrics.com/en/tutorial/analyze/marketing-data/

---

## Problema que resuelve

La falta de claridad en metricas genera un ciclo vicioso:
1. Desconfianza en los resultados de marketing
2. Decisiones basadas en opinion (HIPPO: Highest-Paid Person Opinion)
3. Mas tiempo en reuniones que en ejecucion
4. Reportes manuales y paralisis por analisis
5. Solo se usan canales "faciles de medir" (ads)
6. Costos suben, ROI baja
7. Marketing pierde relevancia

El framework SUMAS rompe ese ciclo con un proceso de 5 pasos.

---

## Donde estan realmente los problemas de marketing

Solemos creer que los problemas se resuelven con herramientas visibles (un modelo de IA, un CRM, reportes avanzados). Pero los problemas mas complejos suelen estar en los **procesos** y la **cultura** del equipo:

- **Herramientas:** lo visible y tangible (dashboards, software). Es la punta del iceberg.
- **Procesos:** la manera en que haces las tareas. Mal proceso = implementar soluciones sin entender el problema.
- **Cultura:** valores, creencias y habitos del equipo. Mala cultura = actuar por incentivos equivocados (crear reportes para justificar decisiones en vez de buscar la verdad).

El proposito de SUMAS no es solo hacer mejores dashboards (lo visible), sino atacar la raiz: desarrollar **procesos y una cultura de datos** ("data-driven") que te permitan hacer marketing mas efectivo.

---

## Por que un framework y no una lista de KPIs

Si buscas "KPIs de marketing que deberias medir" en Google, ChatGPT o Perplexity, vas a encontrar listas de acronimos (CPC, CTR, CPM, ACV, AOV, CVR) que lucen mas sofisticados de lo que son.

El problema de memorizar listas de metricas es que **no te ayudan a entender como se relacionan entre si, ni como usarlas, ni si deberias hacerlo**.

SUMAS hace lo opuesto: en vez de darte una lista para memorizar, te da un framework para que **uses menos metricas, no mas**, y las analices de forma consistente sin importar si eres agencia, equipo in-house o freelance; si estas en B2B o E-commerce; o sea cual sea el canal o herramienta.

Un framework es abstracto, pero su resultado es tangible: los documentos, dashboards, reuniones y procesos con tu equipo (o cliente), y como consecuencia, una verdadera cultura data-driven.

---

## Catalogo de frameworks populares de marketing

SUMAS no reemplaza a otros frameworks; se apoya en ellos. La diferencia es que casi ningun framework existente esta disenado para **analizar y aplicar** metricas (la mayoria solo ayuda a definir o planear). Conocer estos te da contexto:

| Tipo | Frameworks | Para que sirven |
|------|------------|-----------------|
| **Embudos** | TOFU/MOFU/BOFU, Pirate Metrics (AAARRR), Funnel de marketing y venta, RACE, AIDA | Describir el recorrido del usuario y la conversion por etapas |
| **Matrices** | Matriz BCG, Ansoff, Mapa de posicionamiento, DOFA (SWOT) | Decisiones de portafolio, crecimiento, posicionamiento y diagnostico |
| **Flywheels y loops** | Flywheel de HubSpot, Flywheel de Amazon, SOSTAC, Hooked Model | Crecimiento compuesto y bucles de retencion/habito |
| **Diagramas** | 4Ps / 7Ps, 3Cs, STP, Driver trees | Estrategia, segmentacion y relaciones causa-efecto entre metricas |

SUMAS reutiliza varias de estas piezas internamente: las **3Cs** en Strategy, el **embudo** en Metrics, los **driver trees** en Metrics, y el **STP** en Segments.

---

## Los 5 pasos del Framework SUMAS

### 1. S - Strategy (Estrategia)

Antes de medir, entiende el contexto de negocio usando las **3Cs**:

**Company (Compania):**
- Que problema resuelve la empresa
- Productos y modelo de negocio
- Precio y presupuesto
- Objetivos de crecimiento vs rentabilidad

**Customer (Cliente):**
- Segmento de clientes, motivaciones, problemas
- "Jobs to Be Done"
- Tamano del mercado (TAM, SAM, SOM)

**Competitors (Competencia):**
- Competidores directos e indirectos
- Mapa de posicionamiento
- Diferenciacion

**Intersecciones clave:**
- Company + Customer = Go-to market (como conseguimos clientes)
- Company + Competitors = Ventaja competitiva (que nos hace diferentes)
- Customer + Competitors = Oportunidades y amenazas (que pasa en el mercado)
- Las 3 juntas = Posicionamiento

**7 preguntas para entender cualquier negocio:**
1. Que hacemos y como ganamos dinero?
2. A quien le vendemos?
3. Cuales son las alternativas?
4. Como conseguimos clientes?
5. Que nos hace diferentes?
6. Que esta pasando en el mercado?
7. Cual es nuestro posicionamiento?

**Implicaciones en metricas segun tipo de negocio:**

| Factor | Startup | Empresa madura |
|--------|---------|----------------|
| Prioridad | Crecimiento, Product-Market Fit | Rentabilidad |
| Metricas clave | Usuarios, activacion, retencion | Revenue, margins, LTV |

| Factor | B2B | E-commerce |
|--------|-----|------------|
| Conversiones | MQLs, SQLs en CRM | Ordenes y ventas |
| Ciclo de venta | Largo, excede ventana de atribucion | Corto, medible en ads |
| Unit economics | CAC alto, retencion >100% | Ciclos cortos, retencion ~90% |
| Ticket promedio | ACV (Average Contract Value) | AOV (Average Order Value) |

---

### 2. U - Use Cases (Casos de uso)

Los datos de marketing tienen 3 casos de uso principales:

| Caso de uso | Objetivo | Frecuencia | Usuario tipico |
|-------------|----------|------------|----------------|
| **Operaciones** | Analisis ad-hoc para tareas diarias | Diario | Analistas, media buyers, SEO |
| **Gestion de rendimiento** | Seguimiento de KPIs vs objetivos | Semanal, mensual | Account managers, lideres |
| **Influenciar decisiones** | Presentaciones para directivos/clientes | Mensual, trimestral | Ejecutivos, clientes |

**Ejemplos concretos de casos de uso:**

| Operativo (diario) | Analitico (semanal/mensual) | Estrategico (trimestral/anual) |
|--------------------|-----------------------------|-------------------------------|
| Budget pacing | Reportes cross-channel | Analisis de rentabilidad |
| Monitoreo de campanas | Analisis de embudo | Planes de marketing |
| Alertas | OKRs y "weeklies" | Definicion de presupuesto |
| Monitoreo de tendencias | Monitoreo de clientes | Presentaciones de clientes |
| Rendimiento de creativos | Calculadoras/Forecast | Unit economics |
| Investigacion de keywords | Investigacion de competencia | Auditorias |

**Principio clave:** Los reportes deben ser aspirina (resolver problemas), no vitamina (por rutina). Los mejores marketers usan los datos para iterar y ejecutar rapido, no para pasar horas en reportes.

**Feedback loop:** Planeas > Ejecutas > Analizas > Mejoras. Cada iteracion te da mas claridad. El ciclo genera marketing mas eficiente, defendible y diferenciado con el tiempo.

---

### 3. M - Metrics (Metricas)

Usa el **embudo de conversion** para organizar metricas en 3 tipos:

#### Visibilidad (el usuario VE tu contenido)
#### Engagement (el usuario INTERACTUA)
#### Conversion (el usuario HACE algo de valor)

**Metricas por canal:**

| Canal | Visibilidad | Engagement | Conversion |
|-------|-------------|------------|------------|
| PPC/Ads | Impresiones, Alcance | Clics, Engagements | Leads, Compras |
| Social Media | Impresiones, Alcance, Seguidores | Reacciones, Comentarios, Shares, Plays | Messenger, DMs, Leads |
| SEO | Impresiones, Keywords | Clics, CTR | Leads, Compras |
| Email | Envios, Recibidos | Aperturas, Clics | Leads, Compras |
| Website | Usuarios, Sesiones | Eventos | Leads, Compras |

#### Engagement: no todos son iguales

Mide la calidad del engagement con 3 dimensiones:
- **Cantidad:** vistas totales, engagements totales, seguidores
- **Frecuencia:** reproducciones por usuario, engagements por usuario
- **Intensidad:** tiempo de reproduccion, tiempo por sesion

#### Conversiones: 3 formas de expresarlas
- **Numero de conversiones:** descargas, compras, registros, leads
- **Usuarios unicos que convierten:** suscriptores, clientes, leads unicos
- **Valor monetario:** ventas totales ($)

#### Metricas de ventas

| | E-commerce | B2B |
|--|-----------|-----|
| Conversiones | Ordenes/compras | Negocios, contratos |
| Usuarios unicos | Clientes | Clientes, companias |
| Valor | Ventas, AOV | Ventas, ACV |
| Ordenes por cliente | Ordenes promedio | Negocios promedio por compania |

#### Driver trees (indicadores de entrada vs salida)
- **Lagging indicators (salida/output):** resultados que no controlas directamente (revenue, conversiones). Son tu norte, pero solos no son accionables.
- **Leading indicators (entrada/input):** acciones que puedes controlar y que influyen en los resultados (contenido publicado, ad spend, frecuencia de posts).

#### Priorizacion con Money Maps
Clasifica tus actividades de marketing segun el funnel:
- **Funcionando:** mantener y optimizar
- **Medio funcionando:** priorizar (fruta al alcance)
- **No funcionando:** requiere mas esfuerzo

Factores de priorizacion:
1. Experiencia e intuicion
2. Valor entregado al cliente
3. Esfuerzo requerido
4. Medibilidad
5. Diferenciacion (canales no saturados)
6. Defensibilidad (dificil de copiar a largo plazo)
7. Escalabilidad (rendimientos compuestos)

---

### 4. A - Add Context (Anade contexto)

Las metricas solas NO dicen nada. Necesitas compararlas para saber si van bien o mal.

#### Efectividad (que tan bien aprovechas tu potencial)
Compara resultados vs potencial/audiencia = TASAS

| Canal | Visibilidad | Engagement | Conversion |
|-------|-------------|------------|------------|
| PPC | Frecuencia (Alcance/Impresiones) | CTR (Clics/Impresiones) | Tasa de conversion (Conversiones/Visitas) |
| Email | Tasa de entrega (Entregados/Enviados) | Tasa de apertura, Tasa de clic | Tasa de conversion (Conversiones/Envios) |
| Website | Sesiones por usuario | Sesiones con interacciones | Tasa de conversion (Conversiones/Sesiones) |
| Social | Engagement rate | Frecuencia | - |

#### Eficiencia (que tan bien usas tu presupuesto)
Compara resultados vs gasto = COSTOS

| Nivel | Metrica | Formula |
|-------|---------|---------|
| Visibilidad | CPM (Costo por mil impresiones) | Gasto / (Impresiones/1000) |
| Engagement | CPC (Costo por clic) | Gasto / Clics |
| Conversion | CPA / CPL (Costo por adquisicion/lead) | Gasto / Conversiones |
| Revenue | ROAS (Retorno sobre gasto publicitario) | Revenue / Gasto |

#### Tiempo
Compara rendimiento a lo largo del tiempo:
- Por hora, dia (operativo/programatico)
- Semanal (SEO, feedback lento)
- Mensual (reuniones de equipo/cliente)
- Trimestral, anual (estrategico)

La frecuencia depende del canal: ads puede ser diario, SEO es semanal/mensual, planes estrategicos son trimestrales.

#### Objetivos (Goals)
Compara vs metas de negocio y OKRs. Las metas de marketing se vinculan a revenue y se definen por la estrategia, go-to market, y unit economics (CAC, LTV, Payback).

#### Benchmarks
Compara vs industria usando:
- Google Ads Keyword Planner
- Herramientas de competitive intelligence
- Databox Benchmarks

#### Metricas de conversion con contexto

| | E-commerce | B2B |
|--|-----------|-----|
| Eficiencia | ROAS (Revenue/Gasto) | Magic Number (equiv. ROI) |
| Ticket | AOV | ACV |
| Costo | Costo por orden | CPL (Costo por Lead) |

#### Costos totales de marketing
No solo ads. Incluye:
- Gasto publicitario
- Herramientas y software
- Salarios y servicios

---

### 5. S - Segments (Segmentos)

Datos generales NO sirven para tomar decisiones. Necesitas segmentar.

**Ejemplo:** Saber que vendiste $1M no dice que hacer. Saber que el 70% viene de un producto y el 30% del resto, si.

#### 7 formas de segmentar

1. **Campana:** por nombre de campana (el mas comun, engloba los demas)
2. **Negocio:** por cliente (agencia) o por producto/servicio (empresa)
3. **Canal:** por medio (SEO, Ads, Social) y fuente (Facebook, Google, TikTok)
4. **Objetivo:** por tipo (awareness, conversion, retention, upsell)
5. **Audiencia:** por intereses, comportamiento, demografia, geografia, tecnologia
6. **Contenido:** por tema, formato, creativo, hashtag, keyword, post
7. **Tiempo:** hora, dia, semana, mes, trimestre, ano

#### Marketing levers (palancas)
Variables que puedes influenciar en tus tacticas:

| Negocio | Contenido | Audiencia | Tiempo |
|---------|-----------|-----------|--------|
| Canales | Creativos | Demografia | Hora |
| Campanas | Formatos | Psicografia | Dia |
| Productos | Temas | Geografia | Semana |
| Marcas | Keywords | Tecnologia | Mes |
| Clientes | Hashtags | Comportamiento | Trimestre |
| Equipo | - | Idioma | Ano |
| Presupuestos | - | Ubicacion | - |
| Ofertas | - | Canal de adquisicion | - |

#### Priorizacion de segmentacion (cascada)
Ordena criterios de menos a mas segmentos:
- Pocos productos, muchos canales? Primero por producto, luego por canal.
- Muchos productos, pocos canales? Primero por canal, luego por producto.

#### 3 pasos para segmentar bien

1. **Definir:** Establece tus criterios de segmentacion (las palancas)
2. **Estandarizar:** Naming conventions para campanas, URLs, UTMs
3. **Combinar:** Unifica datos de CRM, Ads, Social, SEO, Email para metricas multicanal

**Error comun:** No tener naming conventions desde el principio. Usar "FB", "facebook", "meta" en UTMs hace imposible segmentar despues.

---

## Como disenar dashboards de marketing

> **Para GENERAR un dashboard/reporte concreto** (ej. "crea un reporte de Social Media / Ads / GA4"),
> usa el sub-skill enfocado **`dashboard-builder.md`** (en esta misma carpeta). Es una receta
> accionable con blueprints listos, sin el ruido de la teoria. Esta seccion es la base conceptual.

Una vez tienes claras tus metricas (los 5 pasos), el siguiente paso es comunicarlas. Aqui es donde el framework se vuelve visible.

### Informe vs Dashboard

| | Informe | Dashboard |
|--|---------|-----------|
| Que es | Presentacion con datos donde los insights y el analisis son explicitos con texto | Herramienta interactiva para explorar informacion en cualquier momento |
| Cuando | Para un periodo, campana o investigacion especifica | Monitoreo continuo |
| Audiencia | Cualquiera (los insights vienen escritos) | Usuarios familiarizados con las metricas y datos |

### El primer principio: elige metricas que le IMPORTEN a tu audiencia

"Lo que se mide, se gestiona; lo que se gestiona, se mide." Pero la variacion clave es: **lo que quieres mejorar, lo mides**.

La razon #1 por la que tus clientes o jefes no leen tus reportes es que las metricas que muestras **no les importan** — porque no las conectas con los KPIs de su trabajo. Ni el dashboard mas lindo se lee si no hay incentivo para mirarlo.

**Senal de alerta:** un dashboard no leido "porque no duele" predice que tu rol no es critico. Un cliente que no lee los reportes de su agencia es un predictor de churn; un manager que no lee los reportes de su equipo es un predictor de "no continuar en el rol".

### Output, Input y KPIs

Tres tipos de metricas para medir y gestionar resultados:

1. **Output metrics:** miden el resultado final (ventas, usuarios adquiridos, ingresos). Son el "que" queremos lograr.
2. **Input metrics:** miden las actividades que impulsan los resultados (leads generados, horas, presupuesto). Son el "como".
3. **KPIs:** las metricas clave que priorizas porque estan ligadas directamente a los objetivos del negocio. No todas las metricas son KPIs, pero todas aportan.

**Embudo de Growth** (la diferencia entre Growth y marketing): marketing genera demanda y clientes; Growth abarca marketing + producto + precio para adquirir, retener y monetizar:
- Adquisicion: trafico, usuarios nuevos, tasa de conversion
- Retencion: delinquent churn, voluntary churn, net revenue retention
- Monetizacion: clientes nuevos, revenue, ticket promedio, ingreso recurrente

### Piensa en tus metricas como en "cascada"

Entre mas especifica una metrica, mas accionable — pero tambien mas abrumadora si pierdes el enfoque. Las metricas muy generales son dificiles de accionar, aunque utiles para decisiones estrategicas.

- Ejemplo estrategico: reducir el abandono voluntario.
- Ejemplo tactico: aumentar conversiones desde LinkedIn Ads en Mexico.

**Regla de diseno:** empieza con metricas generales (contexto) y luego agrega detalle que las explique. Un dashboard efectivo tiene balance: pocas metricas dificultan la accion; demasiadas, el enfoque.

### Como construir el dashboard (ejemplo SEO)

1. **Hazlo interactivo:** permite segmentar y filtrar (de lo general a lo especifico, en cascada con tus marketing levers).
2. **Output + input metrics:** elige las que reflejen el resultado y las que lo expliquen.
3. **Anade contexto a cada grafico** (sin contexto, una metrica no dice si va bien o mal):
   - **Vs periodo anterior:** evalua si mejoro o empeoro.
   - **Vs objetivo:** la forma mas efectiva de motivar al equipo.
   - **Serie temporal:** comportamiento a lo largo del tiempo.
   - **Texto de ayuda:** lo obvio para el analista necesita explicacion para el publico no tecnico.

### Principios de diseno

- **Contraste:** destaca las metricas prioritarias con color y tamano.
- **Redundancia:** haz los insights obvios con colores, textos o anotaciones.
- **Jerarquia:** el tamano y la ubicacion deben reflejar la prioridad de cada metrica.
- **Consistencia:** colores, formatos y formas consistentes hacen el reporte "familiar".
- **Reduce la carga cognitiva:** usa formato condicional para indicar explicitamente si una metrica va bien o mal.

### Como elegir la visualizacion

| Visualizacion | Cuando usarla |
|---------------|---------------|
| **Serie temporal** | Tendencias en el tiempo (sube/baja). La forma mas accionable de evaluar rendimiento |
| **Tabla** | Comparar multiples metricas y dimensiones a la vez (la mas flexible) |
| **Grafico de barras** | Distribucion de datos ordinales (rangos de edad, dias de la semana) |
| **Grafico de pastel** | Distribucion/participacion de datos nominales sin orden (fuentes de adquisicion) |
| **Grafico de areas** | Distribucion y participacion a lo largo del tiempo (mejor contexto que el pastel) |
| **Gauge chart** | Comparar un KPI vs su objetivo (noción de progreso) |
| **Grafico de dispersion** | Relacion entre 2-3 metricas e identificar clusters |
| **Embudo** | Procesos de compra y puntos de abandono |

### Como usar IA para analizar datos de marketing

**El valor de la IA esta en lo invisible:** antes de pensar en prompts, necesitas tus datos organizados y centralizados en una "fuente de la verdad" (un CRM, un data warehouse o hasta un Excel — no importa cual). Sin datos limpios y unificados, ni el mejor prompt da buenos resultados.

Casos de uso de IA sobre tus datos:
- **Analisis de texto:** resumir y etiquetar reviews, comentarios, encuestas, chats, emails.
- **Limpiar y estandarizar:** categorizar textos para evitar reportes duplicados.
- **Enriquecer datos:** anadir campos a contactos para segmentar y personalizar mejor.
- **Generar informes:** crear graficos, resumenes, dashboards y presentaciones en lenguaje natural.
- **Generar campanas y contenido:** entrenar agentes con tus mejores campanas para producir ideas nuevas.
- **Consultas en lenguaje natural:** preguntar a un agente en tu idioma en vez de usar Excel o SQL.

---

## Como medir el "ROI" de marketing

El objetivo de (casi) todos los equipos de marketing es influenciar las ventas. Lo que diferencia a unos de otros es **que tan lejos llegan para medir esas ventas**. La interseccion entre metricas de marketing y de ventas esta en las conversiones.

**Importante:** usar tecnologia mas sofisticada y costosa NO te hace mejor marketer. La mejor implementacion es la que se ajusta a la madurez, revenue y presupuesto de tu empresa. Empieza con la solucion mas simple que funcione y escala solo cuando el negocio lo necesite.

### Escalera de madurez (6 etapas)

1. **"Vibes":** medicion solo con metricas de engagement y visibilidad. Alternativa: calcular el *Earned Media Value* (cuanto habrias pagado en ads por el alcance organico).
2. **Conversiones dentro de cada plataforma:** medidas por clicks y thank-you pages.
3. **Server-side tracking y atribucion multicanal:** sincronizar eventos del CRM a las plataformas via APIs de conversion o Google Tag Manager.
4. **Combinacion de datos:** unir datos de ads con ventas reales del CRM o e-commerce. La fuente mas precisa porque incluye devoluciones y el 100% de las conversiones reales.
5. **Bottom-line marketing analytics:** medir rentabilidad y unit economics desde marketing, segmentado por producto, campana, fuente, cohorte. Lo mas parecido a un P&L de marketing.
6. **Marketing Mix Modeling y Conversion Lift:** modelos probabilisticos para estimar la influencia del marketing en ventas. Solo para empresas con gran presupuesto y mucha data historica.

### Piensa como CEO y CFO

Obsesionarse con metricas de plataforma (CTR, CPC, CPM, Hook rate) mientras se ignoran ventas y rentabilidad es una trampa: limita tus opciones de optimizacion a ajustes marginales dentro de la plataforma.

Las mejores oportunidades estan **fuera** de la plataforma: tu **oferta, mercado y producto** pesan mas que cualquier ajuste tecnico. Un anuncio perfecto no salva un producto sin demanda; una oferta irresistible hace todo lo demas secundario.

Entender metricas de marketing + ventas + rentabilidad te da la vision holistica para identificar lo que realmente importa — y tu lugar en la mesa donde se toman las decisiones.

### Metricas de negocio que todo marketer debe entender

| Categoria | Metricas |
|-----------|----------|
| **Unit economics** | CAC, LTV, ARPU, Payback |
| **Rentabilidad** | Margenes brutos, Margen de contribucion |
| **Ventas** | Ventas, Clientes, AOV, ACV, MRR, Churn, Sales velocity |
| **Eficiencia** | MER, ROAS, CAC, CPL, CPA, Tasa de conversion |

**Precaucion:** buscar ROI en CADA actividad te sesga hacia estrategias conservadoras en canales saturados. Monitorea los indicadores de negocio como **outputs**, pero enfocate en controlar los **inputs** (visibility, engagement, conversion) y en entregar valor al usuario.

---

## Mapa completo de metricas

```
EMBUDO
  Visibilidad: Alcance, Impresiones, Seguidores, Usuarios, Sesiones
  Engagement: Clics, Reacciones, Shares, Tiempo, Eventos
  Conversion: Leads, Compras, Registros, Suscripciones

CONTEXTO
  Efectividad (vs potencial): CTR, Tasa de conversion, Engagement rate, Open rate
  Eficiencia (vs gasto): CPM, CPC, CPA, CPL, ROAS
  Tiempo: Por hora, dia, semana, mes, trimestre, ano

SEGMENTOS
  Campana > Canal > Producto > Audiencia > Contenido > Tiempo

RESULTADO FINAL (ROI)
  CAC, LTV, Retencion, Payback, ROAS, MER, Contribution Margin
```

Mapa de capitulos del framework:

```
1. Cultura > Procesos > Herramientas   (donde estan los problemas)
2. Framework, no lista de KPIs          (usa menos metricas, no mas)
3. SUMAS: Strategy > Use cases > Metrics > Add context > Segments
4. Dashboards: Informe vs Dashboard > Output/Input/KPIs > Cascada >
   Principios de diseno > Visualizaciones > IA
5. ROI: Escalera de 6 etapas > Pensar como CEO/CFO > Metricas de negocio
```

---

## Como usar este skill

Cuando el usuario necesite ayuda con datos de marketing, usa este framework para:
1. Hacer las preguntas correctas sobre su negocio (Strategy)
2. Entender para que necesita los datos (Use Cases)
3. Sugerir las metricas correctas organizadas en el funnel (Metrics)
4. Recomendar como darles contexto (Add Context)
5. Proponer como segmentar para encontrar insights (Segments)
6. Disenar el dashboard o reporte: elegir output/input/KPIs, ordenar en cascada, aplicar principios de diseno y elegir la visualizacion correcta (Dashboards)
7. Conectar marketing con ventas y rentabilidad: ubicar al usuario en la escalera de madurez de ROI y empujar hacia metricas de negocio (ROI)

Adapta las recomendaciones segun el tipo de negocio (B2B vs E-commerce), el canal (Ads, SEO, Social, Email), y el caso de uso (operativo, analitico, estrategico).

Principio rector en todo el framework: usa **menos** metricas pero mejor elegidas, ataca cultura y procesos (no solo herramientas), y trata los resultados de negocio como outputs mientras controlas los inputs.
