# Tools — Demographics Segmentation

The ordered plan of MCP tool calls this skill makes to acquire its inputs. The "query" is the
**arguments of `query_data`**, nested in the steps below — not a separate thing.

> 🔌 Portal mechanics (fetch vs execute, tool-ids, the 7 meta-tools): see
> [`../../../../../_framework/porter-mcp-calls.md`](../../../../../_framework/porter-mcp-calls.md).
> Validated against the `google-ads` connector of the Porter MCP.

## Tool plan (ordered)

| # | Tool | Meta-tool | Args | Why |
|---|------|-----------|------|-----|
| 1 | `tool:porter-accounts:list_accounts` | `fetch` | `component_name="google-ads"` | Discover the account **object** (not just the id). Never invent the id. |
| 2 | `tool:porter-fields:list_fields` | `fetch` | `component_name="google-ads"` | **Availability pre-check** — confirm `google_ads_age` / `google_ads_gender` exist before querying. |
| 3 | `tool:porter-reporting:query_data` | `execute` | AGE pull — see below | Per-age-range base counts, report **and** comparison period. |
| 4 | `tool:porter-reporting:query_data` | `execute` | GENDER pull — see below | Per-gender base counts, report **and** comparison period. |
| 5 | `tool:porter-reporting:query_data` | `execute` | COVERAGE pull — see below | Account-total `cost_micros` (no dimension) → the coverage % denominator. |

> Run age (step 3) and gender (step 4) as **two separate queries**. Do **not** request
> `google_ads_age` × `google_ads_gender` together — the cross is too sparse.

## Step 3 — AGE `query_data` args (this is "the AGE query")
- **Dimension:** `google_ads_age` — values `AGE_RANGE_18_24` … `AGE_RANGE_65_UP` +
  `AGE_RANGE_UNDETERMINED`.
- **Base counts** (everything else is derived from these — never ask for native rate fields):
  `google_ads_impressions`, `google_ads_clicks`, `google_ads_cost_micros`,
  `google_ads_conversions`, `google_ads_conversions_value`.
- **`accounts`** = the full object from step 1.
- **Period:** the report period **and** its comparison period (vs-previous-period attribution).
  Use **≥ 4–8 weeks** so the thin demographic sample has volume.

## Step 4 — GENDER `query_data` args (this is "the GENDER query")
Identical to step 3 but **dimension = `google_ads_gender`** — values `MALE` / `FEMALE` /
`UNDETERMINED`.

## Step 5 — COVERAGE `query_data` args
- **No dimension.** Pull account-total `google_ads_cost_micros` for the report period.
- Coverage % = (sum of demographic-segment spend) ÷ (account-total spend). State it up front.

## Tools NOT needed here (keep it minimal)
- `scrape` / `crawl` — not used. This is count-only segmentation.
- `list_custom_fields` — only if a field name fails and needs re-validation.

## Minimal, exact fields
Two dimensions (one per query) + five base counts. Nothing else feeds the verdict. Every
rate/cost (CPC, CPA, ROAS, conv-rate) is **computed** from the base counts downstream.

## Gotchas
- **Partial coverage is the headline gotcha** — demographics are reported only for some campaign
  types (validated ≈13% of spend on Acme Golf). Always compute and state coverage %; scope every
  claim "within demographic-eligible campaigns…" when low.
- **`UNDETERMINED` is often the largest bucket** — keep it in the pull and the output; never
  optimize on it.
- **Compute every rate/cost from base counts** — native ratio fields are wrong at the aggregate.
- **Ratios don't sum across segments** — attribute via numerator/denominator counts.
- **`google_ads_cost_micros` arrived already in currency** (~$ per row), not raw micros, on the
  validated pull — sanity-check CPC before dividing by 1e6.
- **Don't cross age × gender** — the sample is too thin; run two separate queries (steps 3 & 4).
- **`parental status` and `household income` are NOT exposed** by google-ads via Porter (0 fields).
