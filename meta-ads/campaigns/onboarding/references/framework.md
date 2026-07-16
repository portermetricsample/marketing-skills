# Framework — Meta Ads Onboarding (validación, defaults, naming, despacho)

## Convención de nombres → usa el skill `naming-conventions`
La fuente canónica de nomenclatura + UTMs es el skill [`meta-ads/naming-conventions`](../../../naming-conventions/SKILL.md).
Refiérelo desde aquí; el default de abajo es solo el fallback si ese skill no está.

### Default Porter (fallback — el usuario puede sobreescribir)
- **Campaña:** `[Marca] · [Objetivo] · [Audiencia/Geo] · [MesAño]` → `Porter · Leads · CO · Jul2026`.
- **Ad set:** `[Geo] · [Edad] · [Audiencia]` → `CO · 25-55 · Broad`.
- **Anuncio:** `[Formato] · [Gancho]` → `1x1 · Pregúntale a tus datos`.
- Objetivo corto: Sales→`Ventas`, Leads→`Leads`, Traffic→`Tráfico`, Awareness→`Marca`, Engagement→`Interacción`.
- Consistencia > creatividad: nombres escaneables en Ads Manager. Nunca "Campaña nueva 1".

## Defaults inteligentes (qué poner cuando el usuario no sabe)
| Decisión | Default recomendado |
|---|---|
| Puja | `LOWEST_COST_WITHOUT_CAP` |
| Presupuesto | CBO **on**, diario |
| Categoría especial | `[]` (ninguna) — salvo que el rubro lo exija |
| Edad/género | 18–65, todos |
| Audiencia | Advantage+ (`targeting_advantage_audience:1`) para arranque en frío |
| Placements | Automáticos (Advantage+) |
| Optimización | por objetivo (ver tabla abajo) |
| Status | siempre `PAUSED` |

## Validación (contra la cuenta y contra Meta)
1. **Cuenta:** `object_read(fields="currency,funding_source,account_status")`. Sin `funding_source`/método de pago → **STOP** (2859015).
2. **Cuádrupla válida** (objetivo · optimization_goal · destination_type · promoted_object):
   | Objetivo | optimization_goal | destination_type | promoted_object |
   |---|---|---|---|
   | LEADS | `LEAD_GENERATION` | `ON_AD` | página + lead form |
   | SALES | `OFFSITE_CONVERSIONS` | `WEBSITE` | píxel + evento |
   | TRAFFIC | `LINK_CLICKS` / `LANDING_PAGE_VIEWS` | `WEBSITE` | — (link en el anuncio) |
   | AWARENESS | `REACH` / `IMPRESSIONS` | — | página |
   | ENGAGEMENT | `POST_ENGAGEMENT`/`THRUPLAY`/`PAGE_LIKES` | — | página |
   Combinación inválida → subcode 1772103. `billing_event: IMPRESSIONS` es el más compatible.
3. **Advantage+ vs edad:** con `1` no se permite `age_max` < 65 (1870189) → si el usuario quiere tope de edad, cambia a manual (`0`).
4. **Presupuesto:**
   - **Campaña (CBO):** `campaign_create.daily_budget_amount` va en **unidades MÍNIMAS** (centavos: 5000 = 50.00). Convierte `monto × offset`.
   - **Ad set (no CBO):** `adset_create.daily_budget_amount` va en **unidades MÍNIMAS** también (×offset; el connector NO convierte — verificado 2026-07-16 por read-back; el schema del ad set MIENTE al decir "unidad mayor").
   - Valida ≥ mínimo de la cuenta (Meta lo reporta en el error). Haz **read-back** para confirmar (gap 33/35).
5. **bid_strategy** siempre explícita (si no, queda `WITH_BID_CAP` inentregable — gap 32).
6. **special_ad_categories** siempre presente (`[]` o la categoría).
7. **is_dynamic_creative** se fija al crear el ad set según el creativo (multi-formato/DCA → `true`).
8. **LEADS** requiere lead form; **SALES** requiere píxel + evento — si no existen, **es un bloqueo que se explica**, no se adivina.

## Despacho a los ejecutores (al recibir el OK)
Crea en PAUSED, en orden, pasando la ficha:
1. `meta-ads-campaign-setup` → campaña (objetivo, CBO, presupuesto, puja, categoría, naming).
2. Si LEADS: `meta-ads-leadform` → crea el form (guarda `leadform_id`). Si retargeting: `meta-ads-audiences`.
3. `meta-ads-adset-setup` → ad set (optimization, destino, targeting, placements, promoted object, advantage_audience).
4. `meta-ads-asset-upload` → sube/genera el creativo → `image_hash`/`video_id`.
5. `meta-ads-ad-setup` → anuncio (creativo + copy + CTA + link + UTMs / lead form).
6. Verifica con `object_read` y entrega el link de Ads Manager:
   `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=<digits>&selected_campaign_ids=<id>`.

## Regla de comunicación
No ejecutes en silencio. En cada paso dile al usuario **qué está eligiendo y por qué**, y avísale de cada
trampa (objetivo irreversible, presupuesto en centavos, Advantage+/edad, categoría especial). El valor del
skill es que el usuario **entienda** su campaña, no solo que se cree.

## Fuera de scope
- Activar (ACTIVE) → humano. Optimizar por rendimiento después → futuro `clone-winner` / reglas.
