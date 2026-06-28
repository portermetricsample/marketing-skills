---
name: google-ads-changelog
description: Build an exhaustive, human-readable Google Ads CHANGE HISTORY / changelog for a Porter-connected account — what changed, when, by whom, translated into plain English (the exact negative keyword, the budget before→after, the tCPA/tROAS, the paused campaign), grouped by day and change type, and overlaid against the daily CPA so you can see which performance moves followed which edits. Use when the user asks "what changed in my Google Ads account", "change history", "changelog", "account audit log", "who changed what", "qué cambios se hicieron en la cuenta", "historial de cambios", or wants to correlate account edits with CPA/performance. Runs on the Porter Metrics MCP (google-ads connector). One account at a time. Google retains only the last 30 days of change history.
---

# Google Ads Changelog

Turn the Google Ads `change_event` resource (the account's audit log) into an
exhaustive, plain-English change history — and overlay it against the daily CPA
curve so a marketer can SEE which performance moves followed which edits.

The endpoint only gives you a *pointer* to each change. The value of this skill
is the **translation**: resolving IDs → names, parsing the before→after of each
change, and saying exactly what happened ("Added EXACT negative keyword
`free trial` to campaign «Brand – Search»"), not just "a criterion was
updated".

A deterministic engine (`scripts/translate_changes.py`) does the parsing,
classification, name-resolution, grouping and CPA overlay. You (the model) run
the MCP queries, feed the engine, then add the judgment layer (opportunities,
correlations, recommendations).

---

## Hard limits (state these up front, every time)

- **30 days only.** Google Ads `change_event` cannot return anything older than
  30 days. A start date 31 days back errors with *"The requested start date is
  too old."* — and the `last_30_days` preset trips this by one day, so always use
  an **explicit range ending today and starting ≤29 days ago**.
- **10,000 rows max per query.** High-velocity accounts will hit this. Page by
  splitting the window into chunks (e.g. weekly) and merge the rows.
- **`change_event` is a Google Ads API quirk:** some change details only appear
  on CREATE/REMOVE, never on UPDATE (see "the UPDATE blind spot" below).
- **Zero changes** in the window is normal (a dormant/stable account) — report
  "no changes in the last N days", don't treat it as an error.
- **Deactivated / no-permission account** errors with *"…not yet enabled or has
  been deactivated"* — tell the user the account is inactive; don't fail silently.

---

## The data surface (verified field names)

All under the `google-ads` connector, discoverable via
`list_fields(data_source_name="google-ads", search="change")`:

| Field (suffix) | Meaning |
|---|---|
| `google_ads_change_event_change_date_time` | `YYYYMMDDHHMMSS` string (NOT ISO) |
| `google_ads_change_event_change_date` | `YYYYMMDD` (use to group by day) |
| `google_ads_change_event_change_resource_type` | CAMPAIGN, AD_GROUP, AD_GROUP_AD, AD_GROUP_CRITERION, CAMPAIGN_CRITERION, CAMPAIGN_BUDGET, CAMPAIGN_ASSET, AD_GROUP_ASSET, ASSET, BIDDING_STRATEGY, … |
| `google_ads_change_event_resource_change_operation` | CREATE / UPDATE / REMOVE |
| `google_ads_change_event_changed_fields` | comma list field mask (`status`, `keyword.text`, `maximizeConversionValue.targetRoas`, …) |
| `google_ads_change_event_old_resource` | value BEFORE (only changed fields populated) |
| `google_ads_change_event_new_resource` | value AFTER (only changed fields populated) |
| `google_ads_change_event_user_email` | who made the change |
| `google_ads_change_event_client_type` | GOOGLE_ADS_WEB_CLIENT, GOOGLE_ADS_EDITOR, GOOGLE_ADS_SCRIPTS, GOOGLE_ADS_BULK_UPLOAD, GOOGLE_ADS_API, … |
| `google_ads_change_event_change_resource_name` | `customers/{cid}/{collection}/{ids}` — the pointer with embedded IDs |

### Gotchas that WILL bite you
1. **`old_resource` / `new_resource` are Python-literal strings**, not JSON:
   `{'campaign': {'status': 'PAUSED'}}` with single quotes / `True` / `None`.
   Parse with `ast.literal_eval`, never `json.loads`. (The engine handles this.)
2. **Porter REORDERS columns** vs the `fields` you requested. Always read the
   response by the returned `columns` array, never by request order. (Engine
   handles this — it indexes by column name.)
3. **`query_data` runs via `execute`, not `fetch`** (it is flagged
   `read_only:false`). `fetch` returns `not_read_only`; retry the identical args
   on `execute`.
4. **`accounts` wants the full account OBJECT**, not the id string. Pass the
   object returned by `list_accounts` (at minimum `id`, `component_name`,
   `source_user_id`).
5. **The UPDATE blind spot:** on an UPDATE the resources hold ONLY the changed
   field. A keyword flipped to negative shows `{'negative': True}` with NO
   `keyword.text`. The exact text is available only on CREATE/REMOVE. To label an
   UPDATE-flip you must resolve the criterion id separately (often these are
   shared negative-list members — note that and move on unless the user insists).
6. **Don't trust the change↔campaign_name join for completeness.** Porter CAN
   attach `google_ads_campaign_name` to a change query, but that join may drop
   account-level changes that have no campaign. Pull changes WITHOUT joins, and
   resolve names client-side from separate id→name maps (below).
7. **A `sort` field must also be in `fields`.** Sorting by
   `change_event_change_date_time` requires it to be selected, else
   *"Sort field must be included in fields."*
8. **Budget changes don't carry the campaign.** `change_resource_name` for a
   budget is `campaignBudgets/{budgetId}` — NOT a campaign id. On CREATE the
   budget's embedded `name` usually equals the campaign name (engine uses it);
   on UPDATE you only get `amountMicros`, so build a budget_id→campaign map
   (step 3c) to name them, or the engine falls back to `budget {id}`.

---

## Procedure

### 1 — Resolve the account
```
fetch(tool_id="tool:porter-accounts:list_accounts",
      args={"component_name":"google-ads","query":"<name the user gave>"})
```
Keep the full account object for the connected (`connection_status:"connected"`)
row. If several match and the user was vague, ask which one.

### 2 — Pull the change history (authoritative, no joins)
Use `execute`. Window = today back to ≤29 days. Sort by datetime desc. Request
all nine change_event fields:
```
execute(tool_id="tool:porter-reporting:query_data", args={
  "accounts":[<full account object>],
  "fields":[
    "google_ads_change_event_change_date_time",
    "google_ads_change_event_change_resource_type",
    "google_ads_change_event_resource_change_operation",
    "google_ads_change_event_changed_fields",
    "google_ads_change_event_old_resource",
    "google_ads_change_event_new_resource",
    "google_ads_change_event_user_email",
    "google_ads_change_event_client_type",
    "google_ads_change_event_change_resource_name"],
  "date_range":{"date_from":"<today-29d>","date_to":"<today>"},
  "limit":10000,
  "sort":[{"field":"google_ads_change_event_change_date_time","direction":"desc"}]
})
```
If `returned_rows` hits the cap, split the window (e.g. two ~14-day halves) and
concatenate the `rows` (keep one `columns` array — it's identical across calls).
Optional focus filters on `change_event_change_resource_type` (OR group) when the
user only wants, say, budget + keyword changes.

### 3 — Pull the id → name maps (so IDs become real names)
First scan the change rows and collect the **distinct ids actually referenced**
(campaign ids, ad-group ids, budget ids) from `change_resource_name` and the
embedded `campaign`/`adGroup` refs. Big accounts have 1,000+ ad groups — do NOT
pull the whole account; pull only the referenced ones.

```
# 3a campaigns — usually few (<50), the whole list is fine
execute(query_data, fields=["google_ads_campaign_id","google_ads_campaign_name","google_ads_impressions"], date_range=<same window>, limit=500)
# 3b ad groups — FILTER to referenced ids (OR group of equals), else you pull thousands
execute(query_data, fields=["google_ads_ad_group_id","google_ads_ad_group_name","google_ads_impressions"],
        filters=[[{"field":"google_ads_ad_group_id","operator":"equals","value":"<id1>"},{"field":"google_ads_ad_group_id","operator":"equals","value":"<id2>"}, ...]],
        date_range=<same window>, limit=2000)
# 3c budget → campaign map (needed to NAME budget changes AND to attribute them)
execute(query_data, fields=["google_ads_campaign_budget_id","google_ads_campaign_id","google_ads_campaign_name","google_ads_impressions"], date_range=<same window>, limit=500)
```
Use `impressions` (not `cost_micros`) as the carrier metric so paused / zero-spend
entities are NOT silently dropped by the automatic `cost_micros > 0` filter.
Feed 3a→`campaigns`, 3b→`ad_groups`, 3c→`budgets` blocks of the engine input.
(Confirm the `google_ads_campaign_budget_id` field name with
`list_fields(search="budget")` for the account; if absent, rely on the CREATE
embedded budget name and the `budget {id}` fallback.)

### 4 — Pull the daily CPA series (for the overlay)
```
execute(query_data, fields=["google_ads_date","google_ads_cost_micros","google_ads_conversions","google_ads_cost_per_conversion"], date_range=<same window>, limit=60, sort=[{"field":"google_ads_date","direction":"asc"}])
```
`cost_per_conversion` IS the CPA. (`cost_micros` here is already account currency,
not micros — Porter converts it.)

### 4b — Pull PER-CAMPAIGN daily metrics (for impact attribution)
Only if the user wants the impact layer (which change moved which metric). One
query, daily granularity, base metrics only (derive the rates yourself):
```
execute(query_data, fields=["google_ads_date","google_ads_campaign_id","google_ads_cost_micros","google_ads_impressions","google_ads_clicks","google_ads_conversions","google_ads_conversions_value"], date_range=<same window>, limit=2000, sort=[{"field":"google_ads_date","direction":"asc"}])
```
Feed it as the engine's `campaign_metrics` block. The engine then attributes each
change to the campaign it touched (budget changes get their campaign via the 3c
map). Account-total CPA (step 4) is for the headline overlay; per-campaign metrics
(4b) are for isolating a single change's effect.

### 5 — Run the engine
Write one JSON file with the raw blocks (each block = the `{columns, rows}` Porter
returned, verbatim) and run:
```
{
  "account": "<label>", "currency": "$",
  "changes":   {"columns":[...],"rows":[...]},   // step 2 (merged if paged)
  "campaigns": {"columns":[...],"rows":[...]},   // step 3a
  "ad_groups": {"columns":[...],"rows":[...]},   // step 3b (referenced ids only)
  "budgets":   {"columns":[...],"rows":[...]},   // step 3c (optional; include campaign_id)
  "cpa":       {"columns":[...],"rows":[...]},   // step 4
  "campaign_metrics": {"columns":[...],"rows":[...]}  // step 4b (optional — enables impact attribution)
}
```
```
python3 scripts/translate_changes.py --in data.json --md changelog.md --json changelog.json
# add --html report.html for a self-contained, shareable HTML report
#   (timeline + CPA bar chart + impact cards; Chart.js + Tabler icons via CDN).
#   Open it directly in a browser — no server needed. See scripts/sample_report.html.
```
It prints (and saves) a Markdown changelog: header + change-type breakdown +
day-by-day timeline with CPA & day-over-day delta + exact negative-keyword ledger
+ budget/bidding ledger. The `--json` is the structured record per change.

### 6 — Add the judgment layer
The deterministic output is the spine. On top of it, write:
- **What the operator was clearly doing** (the story): e.g. "Over two days the
  manager ran a negative-keyword cleanup (added several brand/irrelevant blocks,
  removed stale ones), then later paused a batch of underperforming test
  campaigns." Describe the pattern you actually see — never invent specifics.
- **Change → performance correlation, stated honestly.** Point at days where CPA
  moved sharply (use the DoD deltas) within ~0–2 days of a change, and name the
  candidate cause — but say *correlation, not proof*, and respect the learning
  period (tCPA/tROAS and budget changes reset Google's learning for ~1–2 weeks,
  so same-day CPA noise is expected).
- **Opportunities / flags** (see below).

---

## Opportunities heuristics (the "do it better" layer)

Scan the structured records + CPA and surface, when present:
- **Bid-strategy churn:** multiple tCPA/tROAS edits on the same campaign within a
  short window → the account is being over-tuned; Google never finishes learning.
- **Pauses without a follow-up:** campaigns paused but budget not reallocated, or
  paused right before a CPA spike elsewhere (spend pushed into worse campaigns).
- **Negative-keyword waves with no measured effect:** big add/remove batches —
  check whether CPA/CTR actually improved after; if not, the list may be too
  broad or mis-scoped.
- **UPDATE-flip negatives with no text:** if there are many, recommend pulling the
  criterion list to label them (the event alone can't).
- **Automation vs human:** lots of `GOOGLE_ADS_SCRIPTS` / `_BULK_UPLOAD` /
  `_API` changes → an automated layer is editing the account; make sure the human
  knows what it's doing.
- **Change-free CPA spikes:** CPA jumped on a day with NO changes → the cause is
  external (auction, seasonality, tracking), not an edit. Saying this is as
  valuable as finding a culprit.
- **No-op / empty-field rows:** `changed_fields` blank → skip; don't invent a story.

---

## Change impact attribution (the "did it work" layer)

When `campaign_metrics` (4b) is supplied, the engine adds a **candidate
attribution** section: it matches each change to the ONE metric it most plausibly
moves, reads that metric on the change's campaign in the 7 days before vs after,
and reports the move with guardrails. The mapping:

| Change | Metric read | Expected | Speed |
|---|---|---|---|
| Budget ↑ / ↓ | spend (also impressions, clicks) | follows the direction | fast |
| tCPA ↓ / ↑ | CPA | follows the target | slow |
| tROAS ↑ | ROAS | up | slow |
| Max-CPC ceiling ↑ | CPC | up | fast |
| Pause / enable campaign | spend | down / up | fast |
| Negative keyword added | CPA | down | slow |
| IP exclusion | conv. rate | up | slow |
| Ad / RSA edit | CTR | up | fast |
| Keyword / product group added | clicks | up | fast |

**This is ASSOCIATIVE, never causal — say so.** The engine is deliberately
conservative and prints these guards, which you must preserve in the narrative:
- **Confound flag** — if ≥1 other attributable change hit the same campaign within
  the ±7-day window, it says "can't isolate". Honour it; don't pin the move on one
  change when several cluster.
- **Learning + lag** — bidding/budget reset Google's learning ~1–2 weeks, and
  conversions lag clicks by days; slow-metric reads are tagged "provisional".
- **Volume guard** — too few conversions/clicks/impressions → "inconclusive", not a
  fake verdict.
- **Recency guard** — a change <~5 days old has no real post-window → "too recent".
- **A change-free metric move is a finding too** — if CPA jumped on a day with no
  change, the cause is external (auction/seasonality/tracking), not an edit.

Frame results as *leads to investigate*, with the numbers, not as proof. The honest
"✗ moved opposite to expectation" and "can't isolate" reads are the most valuable —
they stop the user from over-crediting a change.

Limitation: ad-group-scoped changes (keyword/ad edits) only attribute when the row
carries a campaign id; pure ad-group changes without one are listed but not scored.

## Output contract
- Lead with the 30-day-limit caveat and the window actually pulled.
- Plain English, exact values, real entity names. Never show a raw ID when a name
  is resolvable; never show micros — show currency.
- Group by day (primary) and by change type (secondary). Always include the
  exact negative-keyword ledger and the budget/bidding ledger.
- Keep correlation claims epistemically honest (candidate cause, learning period).
- One account per run. If the user wants a hosted Porter report page instead of a
  chat answer, pivot to the report skills and render this as a "Change Log" page
  (time series of CPA + a changes table) — this skill supplies the data + logic.

### Real-account behaviour (learned from live runs)
- **Bulk collapse (automatic).** Active accounts apply one action to many entities
  at once (an IP block across every campaign, a 30-keyword negative list). The
  TIMELINE collapses these into one line — "Blocked 7 IP addresses across 6
  campaigns (42 exclusions)" — and shows "1 of 42 edits" so volume isn't hidden.
  The ledgers and the breakdown keep every exact value. Budget/bidding/status stay
  expanded. A raw active-account month can be 100s of rows → don't dump them.
- **Spend fallback.** Many accounts have ~no conversions in the window (awareness,
  or conversions not tracked in Porter). The overlay auto-switches from CPA to
  daily **spend** then, so you never print a misleading "CPA $0.00". CPA arrows are
  red-when-up (bad); spend arrows are neutral.
- **Context blow-up.** A full-fidelity change pull for an active account can exceed
  the model's context (Porter saves it to a file instead). Process that file with
  python/jq and feed it to the engine — never transcribe rows into context.
- **Automation tell.** Off-hours, high-frequency, single-actor edits (esp. IP
  blocks via `GOOGLE_ADS_SCRIPTS`) mean a script is running — say so.
```
```
