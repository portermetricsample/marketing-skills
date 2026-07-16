---
name: meta-ads-leadform
description: Create and manage Meta Instant lead-generation forms on a Facebook Page, and retrieve the leads submitted — for OUTCOME_LEADS campaigns. Build the form (questions, privacy policy, thank-you screen), list forms on a Page, and pull the collected contacts. Use whenever the user wants a lead form, an instant form, to capture leads on Facebook/Instagram, or to download the leads, even if they don't say "Porter". Scope: the lead form + leads; wiring it into an ad is meta-ads-ad-setup (lead_gen_form_id), and the campaign/ad set setup is the campaign/adset skills.
---

# Meta Ads — Lead Form (formularios instantáneos)

Create the **native lead form** used by `OUTCOME_LEADS` ads (the user submits without leaving Facebook/
Instagram) and retrieve the leads. Lives on a **Facebook Page**. Account-agnostic.

> 📖 Opciones completas: [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md) §5 (tipos de
> pregunta, botones de gracias, Higher Intent). Esta skill es su dueña.

## Goal
Un formulario que capture los datos correctos con fricción mínima, conectado a una landing/gracias, y del
que puedas **sacar los leads** para tu CRM.

## Scope
- ✅ **Crear** `leadform_create` (preguntas, privacidad, pantalla de gracias, Higher Intent).
- ✅ **Listar** `leadform_list` (formularios de una Página).
- ✅ **Recuperar leads** `lead_list` (requiere page access token).
- ⚠️ **Actualizar/archivar** `leadform_update` → **roto hoy** (bug de page-token, [issue #12](https://github.com/portermetricsample/porter-mcp-feedback/issues/12)); archiva en Ads Manager.
- ❌ **Usar el form en un anuncio** (`lead_gen_form_id`) → `meta-ads-ad-setup` / `adset-setup`.

## Components
- **Tools / actions:** [`references/tools.md`](references/tools.md).
- **Framework:** [`references/framework.md`](references/framework.md) — qué preguntas pedir, calidad vs volumen.

## Operate
1. **Necesitas la Página:** sácala de `facebook-insights` → `list_accounts` (native id = page_id).
2. **Crear:** `leadform_create(page_id, name, questions, privacy_policy_url, thank_you_*)`. El gateway resuelve el token de la Página solo.
3. **Confirmar:** `leadform_list(page_id)`.
4. **Leads:** `lead_list(form_id, access_token)` → nombre/email/teléfono + fecha.
5. **Entregar** el `leadform_id` a `ad-setup` (para `lead_gen_form_id`).

## Safety
- `privacy_policy_url` obligatoria. `ARCHIVED` es one-way. Account = ref firmado.

## Example
> Form "Demo del MCP" con FULL_NAME + WORK_EMAIL + COMPANY_NAME, privacidad de Porter, gracias → "Visitar sitio".
> Luego `ad-setup` lo referencia con `lead_gen_form_id`.
