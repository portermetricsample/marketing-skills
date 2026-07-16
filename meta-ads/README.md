# Meta Ads — skills sobre el MCP de Porter Metrics

Skills para **automatizar y analizar Meta Ads** (conector `facebook-ads`) desde Claude/ChatGPT con el
MCP de Porter Metrics. Organizado por **dominio** (igual que `../google-ads/`): cada carpeta agrupa
skills de un mismo tipo de trabajo.

## Estructura

```
meta-ads/
├── campaigns/            ← construir y gestionar campañas (build/write)
│   ├── campaign-setup/   adset-setup/   ad-setup/
│   ├── asset-upload/     audiences/     leadform/
│   ├── _budget/          (helper de presupuesto currency-aware)
│   └── README.md
├── creative_performance/ ← análisis de rendimiento de creativos (Unicorn/Winning/…)
├── meta-ads-research/    ← extracción de ads de la competencia (Ad Library)
├── porter-meta-ads-dashboard/ ← dashboard de Meta Ads
│
├── MASTER-CHECKLIST.md   ← flujo en orden + estado de las 30 acciones del MCP + trampas
└── PARAMETERS-REFERENCE.md ← todas las variables y opciones (objetivos, pujas, targeting, CTA, UTMs, audiencias, insights, specs de creativos)
```

## Por dónde empezar
1. **[campaigns/README.md](campaigns/README.md)** — los skills de creación de campañas y su orden de uso.
2. **[MASTER-CHECKLIST.md](MASTER-CHECKLIST.md)** — el flujo completo y qué está validado/bloqueado.
3. **[PARAMETERS-REFERENCE.md](PARAMETERS-REFERENCE.md)** — el diccionario de todos los parámetros.

## Convenciones
- Todos los skills de escritura crean en **PAUSED**; activar es decisión humana.
- El `account_id` es el **ref firmado** de `list_accounts`, nunca el `act_` crudo.
- Bugs/gaps del MCP se documentan en el repo [`porter-mcp-feedback`](https://github.com/portermetricsample/porter-mcp-feedback) (gaps 31–42 / issues #2–#12).

## Nota de consistencia (roadmap)
Para igualar el patrón de `google-ads/` (todo bajo paraguas por función), los skills sueltos
(`creative_performance`, `meta-ads-research`, `porter-meta-ads-dashboard`) deberían moverse a
paraguas hermanos de `campaigns/` (p. ej. `analysis/`, `research/`, `dashboard/`). Pendiente de
confirmar por ser skills preexistentes.
