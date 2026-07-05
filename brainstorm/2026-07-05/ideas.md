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

<!-- Las ideas se irán agregando aquí, agrupadas por categoría -->
