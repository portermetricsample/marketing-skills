# Meta Ads — Campaigns (skills de automatización)

Skills para **automatizar la creación y gestión de campañas de Meta Ads** con el MCP de Porter Metrics
(conector `facebook-ads`), desde Claude/ChatGPT. Cada skill es agnóstico a la cuenta (resuelve la cuenta
con `list_accounts`) y crea todo en **PAUSED**.

> 📋 **Empieza por el [checklist maestro](../MASTER-CHECKLIST.md)** — el flujo en orden, el estado
> validado de las 30 acciones del MCP, las trampas y qué está bloqueado.

## Skills en este folder

| Skill | Nivel | Qué hace | Estado |
|-------|-------|----------|--------|
| [`campaign-setup/`](campaign-setup/) | Campaña | Objetivo, CBO, presupuesto, puja, categoría especial. | ✅ validado |
| [`adset-setup/`](adset-setup/) | Ad set | Optimización, targeting, placements, promoted object, schedule. | ✅ validado |
| [`asset-upload/`](asset-upload/) | Asset | Imagen/video desde Drive/URL → `image_hash`/`video_id`. | ⚠️ solo por URL (subida propia bloqueada por [issue #3](https://github.com/portermetricsample/porter-mcp-feedback/issues/3)) |
| [`_budget/budget.md`](_budget/budget.md) | Helper | Presupuesto currency-aware (campaña=centavos, ad set=unidad mayor). | ✅ |

## Orden de uso (el flujo)

1. `campaign-setup` → crea la campaña (PAUSED).
2. `adset-setup` → crea el ad set (targeting, presupuesto, promoted object).
3. `asset-upload` → sube el creativo (hoy: desde una URL pública).
4. `ad-setup` *(pendiente)* → arma el anuncio (creativo + copy + CTA).

## Pendientes (roadmap)

- [ ] `ad-setup` — router de creativo (imagen → video → carrusel → multi-formato → DCA).
- [ ] `audiences` — custom + add_users + lookalike *(lookalike bloqueado, [issue #11](https://github.com/portermetricsample/porter-mcp-feedback/issues/11))*.
- [ ] `leadform` — lead form + recuperación de leads.
- [ ] `onboarding` — wizard/checklist que valida todo antes de escribir (el "cerebro").
- [ ] `clone-winner` — defaults empíricos clonando la mejor campaña existente.

## Convenciones (compartidas por todos los skills)

- **Cuenta:** el `account_id` es el **ref firmado** de `list_accounts`, nunca el `act_` crudo.
- **Seguridad:** todo se crea **PAUSED**; activar es decisión humana.
- **Presupuesto:** siempre vía [`_budget/budget.md`](_budget/budget.md).
- **Feedback de bugs del MCP:** repo [`porter-mcp-feedback`](https://github.com/portermetricsample/porter-mcp-feedback) (gaps 31–41 / issues #2–#11).
