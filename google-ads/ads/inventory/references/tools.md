# Tools — Creative Inventory

The ordered plan of MCP tool calls this skill makes. Saved/executable forms live in
[`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics (the 7 meta-tools, search → fetch/execute, dynamic catalog): see
> [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP (Jun 2026).

## ⚠️ Why this skill uses GAQL, not `query_data`
Every other skill pulls through `tool:porter-reporting:query_data` (the `google_ads_*` reporting
fields). **That path does NOT expose ad copy** — it has `google_ads_ad_group_ad_ad_name` (the ad's
internal *name*) but no headline/description *text* and no per-asset metrics. The actual creative
text + per-asset performance live only in the raw Google Ads API, reached via the connector
action **`report.query`** (GAQL = Google Ads Query Language). So this skill is the one place that
goes through `execute_connector_action`.

## Call shape (every query below)
```
execute  tool:porter-automations:execute_connector_action
{
  "connector": "google-ads",
  "action_id": "report.query",
  "source_user_id": "<from list_accounts>",
  "company_id":     "<from list_accounts>",
  "params": {
    "customer_id":       "<10 digits left of the dash in the account id>",
    "login_customer_id": "<10 digits right of the dash>",
    "query": "<GAQL>"
  }
}
```
- **Use `execute`, not `fetch`** — the portal rejects GAQL on `fetch` as `not_read_only` (it is a
  read, but the polymorphic action routes through `execute`).
- `customer_id` + `login_customer_id` are **required inside `params`** and are NOT in the action
  schema. A wrong `login_customer_id` → `403 USER_PERMISSION_DENIED`.
- Big results **auto-persist to a tool-results file** → keep the path, hand it to `process.py`;
  never read the blob into the chat.

## Tool plan (ordered)
| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"`, `query="<HINT>"` | Get the account **object** → `source_user_id`, `company_id`, and the `id` (split on `-` → customer_id, login_customer_id). |
| 2 | probe (GAQL) | `execute` | customer volume, below | Confirm the account is live (else stop — no creative to inventory). |
| 3 | **Q_CREATIVE** (GAQL) | `execute` | below | **Authoritative structure**: each ad's own ≤15 headlines / ≤4 descriptions (text + pin + perf label + approval). Builds the tree. |
| 4 | **Q_METRICS** (GAQL) | `execute` | below | Per-asset metrics ONLY, joined to the tree by text. |
| 5 | Q_EXT (GAQL) | `execute` | below | Extensions linked to campaigns. |

### Probe — is the account live?
```
SELECT metrics.impressions FROM customer WHERE segments.date DURING LAST_30_DAYS
```
~0 impressions → dormant; stop and tell the user.

### Q_CREATIVE — the AUTHORITATIVE structure (build the tree from this)
```
SELECT campaign.name, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type,
       ad_group_ad.ad_strength, ad_group_ad.ad.final_urls, ad_group_ad.ad.final_url_suffix,
       ad_group_ad.ad.responsive_search_ad.headlines,
       ad_group_ad.ad.responsive_search_ad.descriptions
FROM ad_group_ad
WHERE ad_group_ad.status = 'ENABLED' AND segments.date DURING LAST_30_DAYS AND metrics.impressions > 0
```
The `responsive_search_ad.headlines[]` / `.descriptions[]` arrays are the ad's **real current
creative** — each item is `{text, pinnedField, assetPerformanceLabel, policySummaryInfo.approvalStatus}`.
This is what the tree is built from (≤15 H / ≤4 D per ad). `ad_strength` + `final_urls` come on the
same rows. Legacy ads expose `ad.expanded_text_ad.headline_part1/2/3` + `description1/2` instead
(handled as a flat fallback).

### Q_METRICS — per-asset metrics ONLY (join by text)
```
SELECT ad_group_ad.ad.id, ad_group_ad_asset_view.field_type, asset.text_asset.text,
       metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros
FROM ad_group_ad_asset_view
WHERE segments.date DURING LAST_30_DAYS
  AND ad_group_ad_asset_view.field_type IN ('HEADLINE','DESCRIPTION')
  AND metrics.impressions > 0
```
`process.py` joins these onto the tree by `(ad_id, field, text)`; assets with no match get metrics
0 + `served:false`. **Do NOT use this query for the asset LIST** — see the churn gotcha below.

### Q_EXT — extensions
```
SELECT campaign.name, campaign_asset.field_type, asset.sitelink_asset.link_text,
       asset.callout_asset.callout_text, asset.structured_snippet_asset.header,
       asset.structured_snippet_asset.values
FROM campaign_asset
WHERE campaign_asset.status = 'ENABLED'
  AND campaign_asset.field_type IN ('SITELINK','CALLOUT','STRUCTURED_SNIPPET')
```

## The deterministic step (process.py)
Feed the saved Q_CREATIVE / Q_METRICS / Q_EXT result files (and optionally the account's
`account_profile.json`) to [`../scripts/process.py`](../scripts/process.py). It builds the tree
from the ad arrays, joins metrics by text, builds the rollup, attaches extensions, computes char
length / DKI, tags segments (with profile), and flags any campaign type it could not map (see
[`campaign-types.md`](campaign-types.md)). The model only writes the synthesis. See
[`output.md`](output.md) for the shape.

## Gotchas
- **⚠️ The asset view OVER-reports an ad's headlines — do not use it for the list.** `ad_group_ad_asset_view`
  returns churned + auto-created assets: a 15-headline RSA can show **40+** "enabled" asset rows
  (validated live on a real account: one RSA returned 41 rows in asset_view vs the **15** in its
  `responsive_search_ad` array). The ad's own `responsive_search_ad.headlines/descriptions` arrays are the truth. Use
  asset_view for **metrics only**, joined by text.
- **Two pulls, joined by text.** Q_CREATIVE has the structure but not per-asset metrics; Q_METRICS
  has the metrics but an unreliable asset list. Join on `(ad_id, field, text)`.
- **Ad type drives where copy lives.** RSA → `responsive_search_ad.*`; legacy `EXPANDED_TEXT_AD`/
  `TEXT_AD` → flat `ad.expanded_text_ad.*` (no labels); PMax/others → asset groups (not in
  `ad_group_ad` at all). See [`campaign-types.md`](campaign-types.md).
- **Asset metrics don't sum to the ad total** (several assets show per impression). Use the rollup
  for ranking, never to reconstruct ad-level totals.
- **Inventory lists the live ad's assets; it does NOT drop zero-impression ones.** Each asset is
  tagged `served` (impr > 0). The "exclude zero-impression/zero-spend from the math" rule is
  applied downstream by `performance`, not here — an inventory must show the whole live ad.
- **Catalog is dynamic** — if a field name errors, reconfirm via `search` / the Google Ads API field
  reference; don't hardcode blindly.
