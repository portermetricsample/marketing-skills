---
name: meta-ads-audiences
description: Create and manage Meta custom audiences and lookalikes on any Porter-connected ad account — create a seed audience, upload your customer/lead data (email, phone, etc., hashed), poll until ready, build a lookalike to scale, and list/read existing audiences for retargeting. Use whenever the user wants to build a custom audience, upload a customer list, create a lookalike, set up retargeting, or see what audiences exist, even if they don't say "Porter". Scope: audiences only; using them in an ad set (targeting) belongs to meta-ads-adset-setup.
---

# Meta Ads — Audiences (custom + lookalike)

Build and manage the **audiences** you target with: custom audiences (from your own data) and lookalikes
(to scale from your best customers). Account-agnostic. Reading is safe; creating is additive.

> 📖 Opciones completas: [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md) §4 (tipos de
> columna para subir, `customer_file_source`, opciones de lookalike, qué puedes leer). Esta skill es su dueña.

## Goal
Turn a customer/lead list into a usable Meta audience, and scale it with a lookalike — then hand the ids to
`meta-ads-adset-setup` for targeting.

## Scope
- ✅ **Custom audience:** `customaudience_create` → `_add_users` (subir datos hasheados) → `_get` (poll estado).
- ✅ **Lookalike:** `lookalike_create` (⚠️ hoy bloqueado — falta parámetro de ubicación, [issue #11](https://github.com/portermetricsample/porter-mcp-feedback/issues/11)).
- ✅ **Leer / retargeting:** `customaudience_list` / `_get` para reusar audiencias existentes.
- ✅ `customaudience_update` (nombre/descripción).
- ✅ **Borrar audiencia:** `customaudience_delete` (destructive; borra también sus lookalikes) — validado 2026-07-16 (también en Ads Manager).
- ❌ **Usar la audiencia en un ad set** → `meta-ads-adset-setup` (`targeting_custom_audiences`).

## Components
- **Tools / actions:** [`references/tools.md`](references/tools.md).
- **Framework:** [`references/framework.md`](references/framework.md) — qué datos subir, tamaños mínimos, privacidad.

## Operate
1. **Crear semilla:** `customaudience_create` (`subtype:CUSTOM`, `customer_file_source`).
2. **Subir datos:** `customaudience_add_users` — `schema` = tipos de columna en orden (EMAIL, PHONE, …); el connector normaliza y **hashea SHA-256** server-side.
3. **Verificar:** `customaudience_get` → `operation_status.code==200` = lista (300 = updating, sigue polleando); `delivery_status` dice si es usable (`300` = demasiado chica, <~100). ⚠️ NO pidas `approximate_count` (da `#100 nonexisting field`).
4. **Escalar (cuando #11 se arregle):** `lookalike_create` desde la semilla (ratio 1–20%, similarity/reach).
5. **Entregar** los ids a `adset-setup`.

## Safety / privacidad
- Los datos de clientes se **hashean** antes de enviarse (excepto `MADID`). Nunca subir datos sin consentimiento (cumplimiento de la política de datos de clientes de Meta).
- Account = ref firmado de `list_accounts`.

## Example
> "Sube mis clientes actuales y crea un lookalike 1% Colombia." → `customaudience_create("Clientes actuales")`
> → `add_users(schema:["EMAIL"], csv)` → `get` (poll) → `lookalike_create(ratio:0.01, target CO)` *(bloqueado hoy por #11)*.
