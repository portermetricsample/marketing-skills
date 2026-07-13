# Tools — Negative Keywords

Negatives are **config, not metrics** → NOT in `query_data`. They are read via the **connector-action
GAQL path**. Saved calls live in [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics: [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Live-verified on the `google-ads` connector (2026-06-23).

## Tool plan (ordered)

| # | Tool | Meta-tool | What |
|---|------|-----------|------|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | Discover the account → `source_user_id`, `company_id`, and the `<customer_id>-<login_customer_id>` id. |
| 2–5 | `tool:porter-automations:execute_connector_action` (`action_id: "keyword.list"`) | **`execute`** | Four GAQL reads (below). |

## The reads — `keyword.list` with a raw GAQL `query`
`keyword.list` is a generic GAQL pass-through. Call `execute_connector_action` with
`connector="google-ads"`, `action_id="keyword.list"`, `source_user_id`, `company_id`, and
`params = { customer_id, login_customer_id, query }`:

1. **Campaign-level negatives**
   `SELECT campaign.name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign_criterion.status FROM campaign_criterion WHERE campaign_criterion.type = 'KEYWORD' AND campaign_criterion.negative = TRUE`
2. **Ad-group-level negatives**
   `SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = TRUE AND ad_group_criterion.status != 'REMOVED'`
3. **Shared negative lists**
   `SELECT shared_set.name, shared_set.type, shared_criterion.keyword.text, shared_criterion.keyword.match_type FROM shared_criterion`
4. **Shared-set → campaign links** (which campaigns use which list)
   `SELECT campaign.name, shared_set.name FROM campaign_shared_set`

5. **Active positive keywords** *(only for the conflict audit)* — same action, `negative = FALSE`:
   `SELECT campaign.name, ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.negative = FALSE AND ad_group_criterion.status = 'ENABLED'`

Assemble the responses into one `negatives_raw.json`:
`{ "campaign": <#1 body>, "ad_group": <#2 body>, "shared": <#3 body>, "links": <#4 body>, "positive_keywords": <#5 body> }`.

## Gotchas (the important ones)
- **Reads route through `execute`, not `fetch`.** `execute_connector_action` is a polymorphic
  dispatcher flagged destructive; `fetch` rejects it with `not_read_only`. A `*.list` is non-mutating,
  but you still call it via the `execute` meta-tool. (`get_action_schema` confirms per-action
  `read_only`.)
- **Account params go in `params`**, not the top level: `customer_id` (+ `login_customer_id` for an
  MCC). `source_user_id` + `company_id` come from `list_accounts`.
- **No date range / no metrics.** This is the CURRENT live exclusion list — exactly what "what's
  already negatived" needs; it can't tell you a negative's historical impact.
- **`negative = TRUE`** is the filter that separates negatives from positive keywords on the same
  criterion resource. Omit it and you get positive keywords.
- **Where this is NOT in the reporting catalog:** `list_fields("negative")` returns nothing — that is
  expected (config, not a reporting metric), NOT evidence the data is unavailable.
