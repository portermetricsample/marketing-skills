# Brainstorm — 2026-07-05

> Notas dictadas y organizadas automáticamente por categoría de contenido.
> Las categorías se crean/ajustan según vayan llegando las ideas.

## Tareas de la próxima semana / Custom Reports

- Entregar 2 Custom Reports:
  - Motiva USA
  - Brighton (Google Ads)
- Asegurarse de que el resultado quede terminado en sus tareas respectivas.

## Admin / Producto (UX para IA)

- Cambiar la experiencia de usuario del Admin para acomodarla más al producto de IA.

### Ideas concretas para el Admin

1. **Pestaña "Create" desorganizada**: actualmente muestra "dashboard", "look at studio", "export", "google search and query", "cloud". Limpiarla para que quede simplemente con 4 ítems.
2. **Quitar el toggle "blendable" / "single"** en la lista de "data sources": este toggle dejaba elegir el tipo de cuenta (si se convertía o no), pero esa lógica ya no existe, así que el toggle ya no es necesario. Quitarlo deja la vista más limpia.
3. **Pestaña de conexión (puntos verdes)**: hoy muestra con puntos verdes si una cuenta está conectada a tu estudio, Google Sheets y Bitcoin. Ya no tiene tanto sentido tal cual — es confuso porque no refleja cómo se conectan los MCPs. Falta esa lista/vista de conexión a MCPs.

### Próximo paso

- Definir/rediseñar la lógica de dos pestañas relacionadas:
  - **"Data sources"**
  - **"Connections"**
- Pendiente: una vez definida esa lógica, pensar cómo resolverlo mejor (a desarrollar).

### Rediseño: "Data Sources" → "Integrations"

- **Renombrar** la pestaña "Data Sources" a **"Integrations"**.
  - Razón: "Data Sources" da a entender que solo son fuentes de datos para conectar reportes, pero ya hay más que eso: integraciones tipo Gmail, Google Drive, Slack; destinos como Google BigQuery, Google Sheets, Power BI, Cloud, SMCP.
- En la nueva pestaña **Integrations** se van a agregar todas las integraciones existentes, por ejemplo:
  - Gmail
  - BigQuery
  - Data Studio
  - (y en general todos los destinos actuales)
- También debe vivir ahí la selección de Data Sources: es decir, cuando un usuario hace onboarding y va a conectar sus fuentes de datos, ese flujo de onboarding debe mostrar las integraciones...
- (Idea cortada aquí — "debe mostrar las integraciones ah..." quedó incompleto, falta continuar.)

### Nota de priorización

- El usuario señaló que se estaba yendo "por las ramas" — lo siguiente es la prioridad real dentro del proyecto de Admin: **empezar por el Home**.

### Home del Admin

- El Home es la navegación principal de todo lo que el usuario puede hacer con Porter Metrics.
- En el área principal, destacar la **integración con Cloud (MCP)** y sus casos de uso — este es el **call to action principal** de la página (el producto más destacado).
- Debajo del destacado principal, poner accesos para:
  - Conectar a Cloud
  - Conectar a Data Studio
  - Conectar a Google Sheets
  - Conectar a BigQuery
- Estos CTAs de "Conectar a X" deben ser **secundarios** frente al CTA principal del MCP.
- Debajo de todo eso: link items hacia tutoriales, webinars, skills, etc.
- **Jerarquía propuesta**:
  1. CTA principal → MCP / Cloud (producto más destacado).
  2. CTAs secundarios → "Conectar" cada destino (llevan a la ruta de onboarding específica de cada destino).
  3. Link items → tutoriales, webinars, skills.
- Falta hoy: en la interfaz actual, con los destinos ya listados, no existe un botón/CTA de "Conectar" para cada uno.
- El onboarding de cada destino tiene diferencias y matices propios — hay que ajustarlos individualmente.

### Onboarding de Integraciones (vista actual muy confusa)

Problemas a corregir:
- **Single connections**: aparece un problema generalizado con la extensión de Google Sheets — esa extensión manda al usuario a la extensión oficial de la galería de Google Sheets, cuando ya no debería porque los usuarios conectan Google Sheets desde la interfaz propia de Porter.
- **Vista "Integraciones" (columna derecha)**: hay un wireframe completamente inútil ahí. La idea es que esa vista no tenga wireframe y que todas las integraciones queden visibles directamente.
- **Regla de integraciones condicionales**: según el destino, se muestran o no ciertas integraciones (ej. Gmail o Google Drive). Posible mejora: destacarlas mejor cuando se trata de integrar fuentes de información.

### Onboarding — conexiones "single" (toggle Looker/Data Studio)

> Nota: el dictado por voz registró "LUCEL STUDIO ON SITS" — probablemente se refiere a **"Looker Studio"** (posible glitch de transcripción). Revisar/confirmar el nombre exacto al volver.

1. Renombrar de vuelta a **"Studio"** en toda la interfaz (tanto el logo como el nombre), donde hoy aparece como "Looker/Lucel Studio ON SITS" en el toggle.
2. **Quitar el toggle** de ese "Looker/Lucel Studio ON SITS" en la vista de onboarding de conexiones single (data studio) — no se necesita, y quitarlo limpia la interfaz.

### Onboarding — vista de integraciones (ajustes adicionales)

1. Añadir las integraciones de **Gmail** y **Drive** en las vistas de IAE (revisar a qué se refiere "IAE" al volver — posible glitch de transcripción).
2. Quitar el toggle de "Data Studio" / "Looker Studio" en las conexiones single — solo debe figurar "Studio".
3. Quitar el wireframe/mockup de la derecha para que las integraciones tengan más visibilidad.
4. Bajar el peso/grosor del texto para que quepan más integraciones visibles en la misma pantalla — hoy cada caja ocupa demasiado espacio (ancho y alto), obliga a hacer scroll, y el padding se ve mal en pantallas más pequeñas.

### Vista de Billing / Suscripción

> Nota: el dictado registró "Beelink" — probablemente se refiere a **"Billing"** (posible glitch de transcripción, revisar al volver).

- La parte de "comprar suscripción" / gestionar suscripción está muy mal (dicho literalmente: "asquerosa").
- Hay que trabajarla con mucho cuidado/dedicación ("con harto amor").
- (Falta detalle específico de qué cambiar — pendiente de que el usuario profundice.)

## Marketing (retomar de lleno)

- Después de las tareas de Admin/reports, volver de lleno a marketing.

## Soporte / Producto — Automatización y sincronización

- Sincronizar los tickets de soporte y el feedback de producto en un repositorio de GitHub.
- Que el equipo de soporte automatice más la gestión de: tickets, bugs y feature requests.
- Que todo esto quede mejor sincronizado con el equipo (marketing/producto).

### El embudo de soporte — aristas

El sistema de soporte tiene varias aristas, funciona como un embudo. Hay que automatizar desde el inicio:

1. **Chats que llegan** (entrada del embudo).
2. **Triaje** de esos chats, por tipo:
   - Chats de spam
   - Chats de navegación / preguntas de pricing
   - Chats de ayuda para montar reportes
   - Chats de "books"
   - Chats de request (feature requests)
   - Chats de gestión de licencia
3. Automatizar caso de uso por caso de uso, incrementalmente.

Otras aristas del sistema:
- Gestión de tickets
- Gestión de "books"
- Gestión de chats

### Prioridad crítica: gestión del Product Roadmap

- La arista que el usuario considera **más crítica**: la gestión real de "books" y de feature requests → alimenta el **Product Roadmap**.
- Problema actual: se está perdiendo mucho feedback valioso que llega por llamadas, chats y emails, y que no llega rápido a los desarrolladores.
- La forma en que ese feedback se ingiere, se recibe y se prioriza hoy es **muy manual**.
- Próximo paso: en esta sesión de brainstorming, planear y mapear mejor cómo mejorar la gestión de este proyecto (ingesta → priorización → roadmap).

### Caso de uso: discrepancias de información — arquitectura con Gleap + MCP de Porter Metrics

> Nota: el dictado registró "Glyph" — casi seguro se refiere a **Gleap** (la plataforma de tickets/chat de soporte, ya disponible como MCP en esta sesión). Confirmar nombre al volver.

- **Paso 1 — recibir los chats de Gleap**: conectar Gleap al MCP de Claude para poder recibir los mensajes.
  - Preocupación: Gleap no funciona por webhook (o al menos no de forma confiable para esto) — hay que hacer requests de forma proactiva a los últimos chats.
  - Posible solución: un loop/cron que chequee periódicamente (ej. cada 10 minutos o cada hora) los últimos N tickets (ej. últimos 10) y gestione lo que corresponda.
  - Alternativa a explorar: ver si Gleap sí tiene webhook y puede enviar eso directo a una IA que haga el procesamiento.

- **Paso 2 — información que se necesita del usuario** (para el caso de uso de discrepancias de datos):
  - La query y los parámetros de la query
  - Qué data espera
  - Qué métrica espera
  - Qué filtros espera
  - En qué destino está corriendo
  - Cuál es la cuenta exacta y el data source exacto

- **Paso 3 — validación vía MCP de Porter Metrics**:
  - Si el dato está relacionado con query o con licencias — algo que el MCP de Porter Metrics pueda detectar — el MCP va a intentar replicar lo que el usuario está intentando hacer desde su lado.
  - Esto permite validar: problemas de licencia, discrepancias de datos, o bugs de la información.

- **Paso 0 (antes de todo) — asegurar información completa**: hay que resolver que el usuario entregue toda la información necesaria, evitando el sesgo de que falten datos. Solo así el flujo completo funciona: chat de Gleap → Claude → MCP de Porter Metrics → validación de la query.

- **Paso 4 — resultado de la validación**, dos caminos posibles:
  1. Responder directo al cliente explicando el problema.
  2. Si es un error del lado del producto (bug): notificar al equipo de desarrollo — debe crearse tanto un issue en **GitHub** como un ticket nuevo en **Jira** o **Slack**.

### Pendientes de permisos/acceso para el flujo de Gleap + Porter MCP

> (El usuario dijo "dos puntos más" pero dictó tres — se registran los tres tal cual.)

1. **Permisos de Gleap**: Gleap debe solicitar/declarar permiso al usuario para que Porter tenga acceso a sus datos y pueda hacer las validaciones.
2. **Acceso por defecto del correo de soporte**: el correo `juanjose@portermetrics.com` debe tener por defecto accesos y permisos a los datos de los usuarios, para poder ejecutar el request de validación en su nombre.
3. **Bug de "source companies" / "source users"**: cuando se comparte una licencia a un usuario, se rompen esas tablas — se rompe el "source user" y el request no se puede hacer, apareciendo un error de autenticación. Hay que corregir este bug.

**Advertencia/riesgo señalado**: si se hacen estas conexiones (dar acceso al correo de soporte / a Gleap), eso **deshabilita** que el mismo MCP de Porter Metrics pueda retornar y responder preguntas para los usuarios directamente. (Pendiente de resolver este trade-off.)

## Bugs de producto

### Visibilidad de cuentas para usuarios invitados/conectados

- Escenario: un usuario dueño de la licencia comparte la licencia con otro usuario.
- Ese usuario invitado, al listar cuentas, ve solo **las cuentas que él mismo conectó**, no las cuentas totales de la licencia.
- Esto es extremadamente confuso — es un problema de visibilidad de cuentas en Porter Metrics.

### Falta capa de inteligencia/skills para autonomía

- Una vez esté conectado Gleap con el MCP de Porter Metrics, se abren opciones de autonomía (que el sistema actúe solo en ciertas situaciones).
- Problema: faltan los **skills** o la **capa de inteligencia** que sepa qué hacer en cada situación — sin eso, la autonomía no es viable todavía.

<!-- Las ideas se irán agregando aquí, agrupadas por categoría -->
