# Meta Ads — Campaigns (skills de automatización)

Skills para **automatizar la creación y gestión de campañas de Meta Ads** con el MCP de Porter Metrics
(conector `facebook-ads`), desde Claude/ChatGPT. Cada skill es agnóstico a la cuenta (resuelve la cuenta
con `list_accounts`) y crea todo en **PAUSED**.

> 📋 **Empieza por el [checklist maestro](../MASTER-CHECKLIST.md)** — el flujo en orden, el estado
> validado de las 30 acciones del MCP, las trampas y qué está bloqueado.
>
> 📖 **[Referencia exhaustiva de parámetros](../PARAMETERS-REFERENCE.md)** — TODAS las variables y opciones
> (objetivos, pujas, optimización, placements, CTA, UTMs, audiencias, insights, specs de creativos). Cada
> skill enlaza a su bloque; los bloques sin skill aún (ad-setup, audiences, leadform, reporting) ya están mapeados ahí.

## Skills en este folder

| Skill | Nivel | Qué hace | Estado |
|-------|-------|----------|--------|
| [`onboarding/`](onboarding/) | 🧠 **Wizard** | **Empieza aquí.** Entrevista al usuario, valida, explica opciones/trampas, arma la ficha, pide OK y crea todo en PAUSED (despacha los ejecutores). | ✅ |
| [`drive-to-meta/`](drive-to-meta/) | 🔗 **Orquestador** | **Google Drive → anuncio en PAUSA**, de punta a punta (asset→campaña→adset→ad). Decide el transporte por tamaño (bytes ≤10 MB vs `url`) y cablea los ids. | ✅ validado 2026-07-16 (create→verify→delete) |
| [`campaign-setup/`](campaign-setup/) | Campaña | Objetivo, CBO, presupuesto, puja, categoría especial. | ✅ validado |
| [`adset-setup/`](adset-setup/) | Ad set | Optimización, targeting, placements, promoted object, schedule. | ✅ validado |
| [`asset-upload/`](asset-upload/) | Asset | Imagen/video desde Drive/URL → `image_hash`/`video_id`. | ✅ (url o `prepare_upload`+JSON POST) |
| [`ad-setup/`](ad-setup/) | Anuncio | Creativo + copy + CTA + link/UTMs + lead form. Router por tipo de creativo. | ✅ validado |
| [`audiences/`](audiences/) | Audiencia | Custom + subir clientes + lookalike + retargeting. | ✅ (lookalike bloqueado #11) |
| [`leadform/`](leadform/) | Lead form | Formulario instantáneo + recuperar leads. | ✅ (update bloqueado #12) |
| [`_budget/budget.md`](_budget/budget.md) | Helper | Presupuesto currency-aware (**ambos niveles = centavos; ×offset; el connector NO convierte**). | ✅ |

## Orden de uso (el flujo)

1. `campaign-setup` → crea la campaña (PAUSED).
2. `adset-setup` → crea el ad set (targeting, presupuesto, promoted object).
3. `audiences` / `leadform` → según objetivo (retargeting / captación de leads).
4. `asset-upload` → sube el creativo (URL pública o `prepare_upload`+JSON POST).
5. `ad-setup` → arma el anuncio (creativo + copy + CTA + UTMs).
6. Verificar y (humano) activar.

Toda la cadena **campaña → ad set → anuncio** + audiencias + lead form + borrado está **validada en vivo** (2026-07-16, cuenta Porter, PAUSED). Ver [checklist maestro](../MASTER-CHECKLIST.md).

> 🧠 Para el usuario no-técnico, el punto de entrada es **`onboarding/`** — hace toda la entrevista y
> luego llama a los ejecutores de arriba. Los ejecutores también sirven sueltos si ya sabes qué quieres.

## Pendientes (roadmap)

- [ ] `clone-winner` — defaults empíricos clonando la mejor campaña existente.
- [ ] skill de reporting/insights (jalar rendimiento + breakdowns).

## Convenciones (compartidas por todos los skills)

- **Cuenta:** el `account_id` es el **ref firmado** de `list_accounts`, nunca el `act_` crudo.
- **Seguridad:** todo se crea **PAUSED**; activar es decisión humana.
- **Presupuesto:** siempre vía [`_budget/budget.md`](_budget/budget.md).
- **Feedback de bugs del MCP:** repo [`porter-mcp-feedback`](https://github.com/portermetricsample/porter-mcp-feedback) (gaps 31–41 / issues #2–#11).
