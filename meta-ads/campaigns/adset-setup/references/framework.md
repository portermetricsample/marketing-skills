# Framework — Meta Ads Ad Set Setup (the brain)

The ad set answers **who**, **where**, and **how it optimizes**. Every choice must be consistent with
the campaign objective above it, or Meta rejects the create.

## 1. Match optimization + destination + promoted object to the objective
Read the campaign first (`object_read` → `objective`). Then:

| Campaign objective | optimization_goal | destination_type | promoted object REQUIRED |
|---|---|---|---|
| OUTCOME_LEADS | `LEAD_GENERATION` | `ON_AD` | `promoted_object_page_id` (+ `lead_gen_form_id`) |
| OUTCOME_SALES | `OFFSITE_CONVERSIONS` | `WEBSITE` | `promoted_object_pixel_id` + `custom_event_type` (e.g. PURCHASE) |
| OUTCOME_TRAFFIC | `LINK_CLICKS` or `LANDING_PAGE_VIEWS` | `WEBSITE` | — (link lives on the ad) |
| OUTCOME_AWARENESS | `REACH` or `IMPRESSIONS` | omit | `promoted_object_page_id` |
| OUTCOME_ENGAGEMENT | `POST_ENGAGEMENT` / `THRUPLAY` / `PAGE_LIKES` | omit | `promoted_object_page_id` |

A mismatch (e.g. `OFFSITE_CONVERSIONS` on a TRAFFIC campaign, or no pixel on SALES) is a hard reject.
For the common **conversion/lead** cases (our priority): LEADS needs a Page + lead form; SALES needs
a Pixel + event. If those don't exist on the account yet, that is a blocker to surface, not to guess.

## 2. Budget placement — the CBO rule
- **Campaign is CBO** → the budget lives on the campaign. **Do NOT put a budget on the ad set.**
- **Campaign is NOT CBO** → set the ad-set budget (⚠️ **MINOR units** — ×offset yourself; the connector does NOT convert, verified 2026-07-16; use `../_budget/budget.md`) AND an explicit
  `bid_strategy` (`LOWEST_COST_WITHOUT_CAP` unless the user has a CPA/ROAS target).
Read the campaign's CBO flag before deciding — never assume.

## 3. Targeting — a sane default, then narrow
- **Geo:** required. Start from the business's market (country, or cities via `geolocation_search`).
- **`targeting_advantage_audience` es OBLIGATORIO (`0` ó `1`)** — omitirlo → Meta rechaza (subcode 1870227). **Explícaselo al usuario** como una elección: `1` = Advantage+ (Meta amplía tu audiencia) · `0` = manual (respeta exactamente lo que definas).
- **Age/gender:** narrow only with a real reason; over-narrowing starves delivery. ⚠️ **Validado (2026-07-16):** con **Advantage+ (`1`) NO puedes poner `age_max` < 65** (subcode 1870189 — lo trata como "sugerencia"). Si el usuario quiere un tope de edad real (p. ej. 25–55), usa targeting **manual (`0`)**. Dile este trade-off antes de decidir.
- **Broad vs detailed:** for a new account with no signal, **broad + let Meta's Advantage+ audience
  learn** usually beats hand-picked interests. Layer `targeting_interests` only when there's a clear,
  proven audience. (This is where the *clone-winner* skill's empirical audience beats a guess.)
- **Retargeting/lookalike:** `targeting_custom_audiences` with ids from `customaudience_list` /
  `lookalike_create` — a separate ad set from prospecting, not mixed in.

## 4. Placements — and the creative coupling
- **Automatic (Advantage+) placements** (omit the placement params) is the safe default: Meta spreads
  across feed, stories, reels, etc.
- **Manual placements** only when you deliberately restrict (e.g. stories-only). ⚠️ Placements decide
  which **creative aspect ratios** the ad will need (1:1 feed, 9:16 stories/reels, 4:5, 16:9). If you
  restrict placements here, tell `meta-ads-ad-setup` which formats are required.

## 5. Dynamic creative — decide NOW (frozen at create)
`is_dynamic_creative` is structural and cannot be changed after create. Set it `true` **only if** the
ad you'll attach is a DCA / multi-format ad (multiple images/videos via `asset_feed_spec`). A normal
single-image or carousel ad set leaves it off (false). Getting this wrong means deleting and
recreating the ad set. Coordinate with the creative decision before creating the ad set.

## 6. Safety gate (before writing)
1. Read the campaign: objective, CBO, bid_strategy known?
2. optimization_goal + destination_type + promoted object match the objective?
3. Budget placed on the right level (campaign if CBO, ad set if not), in **MINOR units** (×offset, verified by read-back)?
4. At least one geo set?
5. `is_dynamic_creative` decided per the coming creative?
6. `status: "PAUSED"`, account resolved from `list_accounts`?
If the campaign's bid_strategy is a `*_CAP`, either fix it on the campaign or provide `bid_value` here
(else Meta blocks the create — gap 32).

## 7. La combinación (objetivo · optimization · billing · destination) debe ser VÁLIDA
Meta solo acepta ciertas **cuádruplas** `(objective, optimization_goal, billing_event, destination_type)`.
Una combinación inválida → rechazo con **subcode 1772103**. La tabla del §1 cubre los casos comunes; ante
la duda, `billing_event: IMPRESSIONS` es el más compatible. No inventes combinaciones "creativas".

## Regla de comunicación — MUÉSTRALE al usuario las decisiones y trampas
Este skill no debe ejecutar en silencio. Antes de crear el ad set, **dile al usuario en lenguaje claro**:
- El objetivo → qué optimization/destination implica (y qué promoted object necesita).
- La elección Advantage+ vs manual (y el límite de edad si aplica).
- Dónde va el presupuesto (campaña si CBO, ad set si no) y en qué unidad.
- Que se crea **PAUSED** y activar es decisión suya.
Así el usuario entiende qué está eligiendo, no solo qué se creó.

## Out of scope
- Campaign objective/CBO/budget-model → campaign-setup. Creative/copy/CTA → ad-setup.
