# Framework — Meta Ads Audiences

## Tipos de audiencia y para qué
- **Custom (datos propios):** clientes/leads que subes (CRM). Base para retargeting y para lookalikes.
- **Website/Pixel:** visitantes (se crean con reglas de píxel; el MCP las lista pero no las crea por reglas hoy).
- **Lookalike:** modela nuevos usuarios parecidos a una semilla. `ratio` 1% = más parecido/menos alcance; 20% = más alcance/menos preciso. `similarity` (calidad) vs `reach` (tamaño).

## Buenas prácticas
- **Sube todos los identificadores que tengas** (EMAIL + PHONE + FN/LN + ZIP + COUNTRY) → mayor match rate. Meta hashea todo menos MADID.
- **Tamaño:** una semilla útil necesita ~100+ usuarios reales; con menos, la audiencia existe pero no sirve para entregar ni para lookalike.
- **Separar prospecting de retargeting** en ad sets distintos (no mezclar en el mismo).
- **Exclusiones:** excluir clientes actuales del prospecting con `targeting_excluded_custom_audiences` (en `adset-setup`).

## Privacidad / cumplimiento
- Solo sube datos con **consentimiento**. `customer_file_source` declara el origen (propio vs partner).
- Nunca loguear ni exponer los datos crudos; el hashing es server-side.

## Qué NO hace esta skill
- Segmentar el ad set con la audiencia → `adset-setup`. Borrar audiencias → Ads Manager (no hay acción MCP).
