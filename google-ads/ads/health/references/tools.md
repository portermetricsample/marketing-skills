# Tools — Creative Health

Inputs per account: one GAQL pull + a live URL check. Loop over accounts for a portfolio scan.
Saved/executable form: [`../scripts/query.json`](../scripts/query.json).

> 🔌 Portal mechanics: [`../../../../_framework/porter-mcp-calls.md`](../../../../_framework/porter-mcp-calls.md).
> Like the rest of the `creative/` cluster this uses the **GAQL `report.query`** connector action
> (not `query_data`) — call shape + the `customer_id`/`login_customer_id`-in-`params` gotcha are in
> [`../../inventory/references/tools.md`](../../inventory/references/tools.md).

## Step 1 — discover accounts
`fetch tool:porter-accounts:list_accounts {component_name:"google-ads"}` → for each account keep
`source_user_id`, `company_id`, and `id` (split on `-` → customer_id, login_customer_id). Loop the
rest per account.

## Step 2 — one GAQL pull per account (all enabled ads)
```
SELECT campaign.name, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type,
       ad_group_ad.ad.final_urls, ad_group_ad.policy_summary.approval_status
FROM ad_group_ad
WHERE ad_group_ad.status = 'ENABLED'
```
- **No metrics / date filter on purpose** — we want EVERY enabled ad, including ones not currently
  serving, so latent broken URLs (the worst kind — they fire the moment the ad serves) are caught.
- `policy_summary.approval_status` ✅ live-verified: returns `APPROVED` / `DISAPPROVED` / `UNKNOWN`
  (and `APPROVED_LIMITED`). `UNKNOWN` is common on legacy text ads — treat as OK, not a finding.
- Save as `ads.json` per account.
- (Optional urgency enrichment) a second pull `SELECT ad_group_ad.ad.id, metrics.cost_micros FROM
  ad_group_ad WHERE ... segments.date DURING LAST_30_DAYS` to mark broken/disapproved ads that are
  actively spending. Not required for the scan.

## Step 3 — live URL check (foreground)
Collect the unique `final_urls` from `ads.json`, then check each:
```
curl -sSL -o /dev/null --max-time 25 -w "%{http_code}" -A "creative-health-bot" "<url>"
```
Write `url_health.json` = `{ "<url>": <code> }` (code `0` = no response / dead domain). Broken =
code `0` or `>= 400`.

## Step 4 — process
Build a `manifest.json` listing each account + its `ads.json` + `url_health.json`, then:
```
python3 ../scripts/process.py manifest.json > findings.json
```
It joins URL → status and reads approval, aggregates per account, and rolls up the portfolio. See
[`output.md`](output.md).

## Gotchas
- **Check ALL enabled ads, not just served ones** — the highest-value catch (a 404 on an ad that
  isn't spending yet) is invisible if you filter by impressions.
- **`UNKNOWN` ≠ disapproved.** Only `DISAPPROVED` / `APPROVED_LIMITED` are findings.
- **Dedupe URLs before curl** — the same landing page is reused across many ads; check each once.
- **PMax / Shopping** ads don't appear in `ad_group_ad`; this scan is Search/Display/Video text ads.
