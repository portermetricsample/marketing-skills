# Framework: Search Term Insights (the dollar roll-up)

## Mission
Join the cluster's axis outputs into the dashboard's **insights card** — one row per criterion, each
in dollars, led by a total. A **synthesis**, not a new judgment: relevance lives in `relevance`, money
in `performance`, opportunity in `intent-discovery`. This layer only does the **dollar math + the join**.

## The lanes and their formulas (per term, summed per lane)
| Lane | Formula | basis | Data caveat |
|---|---|---|---|
| **Irrelevant** | Σ `cost` of terms with a relevance `leak` verdict | measured | real spend; the clean leak you stop |
| **Wasteful** | Σ `dollars_at_risk` (waste spend) of terms that are NOT `leak` | measured | real spend; relevant terms losing money |
| **Duplicate** | Σ `cost × (non_owner_kw / total_kw)` over cannibalized terms | **estimated** | per-keyword spend split is **not exposed** → proxy by keyword count |
| **Competitor** | Σ `cost` of competitor-class terms | measured | real spend; "reallocate", not strictly "recover" |
| **Branded** | Σ `cost × (1 − brand_cpa / cur_cpa)` (leaking brand terms) | **estimated** | needs `brand_cpa`; without it, a flat `branded_default_savings` (0.30) assumption |
| **Opportunity · intents** | Σ `clicks × account_conv_rate × benchmark_cpa` | **estimated** | a forecast of untapped value, not booked spend |
| **Opportunity · angles** | Σ `clicks × lift_proxy × benchmark_cpa` | **estimated** | rough creative-lift proxy |

## Measured vs estimated (the doctrine)
Three of seven lanes are **forecasts**. Presenting them in the same headline as money-already-spent
would lie about certainty. So:
- Each row is flagged `basis: measured | estimated`.
- `measuredPotential` = Σ measured rows = **the number to lead with** (you can act on it today).
- `totalPotential` = Σ all rows = the full opportunity incl. forecasts (the spec's single total).
- The rationale states the **assumption** for every estimated lane (e.g. "assumes a 30% lower brand CPA").

This is a deliberate, documented divergence from the downloaded spec, which had one blended total. The
spec itself says "tune to your model"; the split is the honest tuning.

## Inputs / wiring
`process.py labeling.json performance.json [intent.json] [context.json]`. It joins on the **search
term**. `labeling` supplies the tags + per-term cost; `performance` supplies the money verdict (which
terms are `waste`) and `meta.account_conv_rate` / `meta.benchmark_cpa` for the opportunity projection;
`intent-discovery` (optional) supplies richer opportunity clusters — without it, the Opportunity lane
falls back to labeling's `hand_to_content` / `needs_own_keyword` handoffs.

`context.json`: `brand_cpa` (makes Branded exact), `branded_default_savings` (default 0.30),
`competitor_policy` (`reallocate` | `negative`).

## Boundaries
- A lane appears **only** when it has members (no $0 rows).
- A term is in **Irrelevant** XOR **Wasteful**, never both (leak → block; relevant+waste → fix).
- It emits **pure data** — the big-number styling, the est. marker, the chips are `porter-reporting`.
