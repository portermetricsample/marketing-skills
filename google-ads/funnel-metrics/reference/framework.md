# Rubric: Funnel Metrics (SUMAS)

The skill's intelligence. `process.py` already computes the funnel and the deltas; this rubric
is for the **AI to narrate** with judgment. Google Ads only.

## The map (locked) — level × sub-metric × source
| Level (SUMAS) | Volume | Efficiency = cost | Effectiveness = rate |
|---|---|---|---|
| **Visibility** (gets SEEN) | Impressions (field) | **CPM** = cost/impr×1000 *(calc)* | **Impression Share** Top / Abs-Top (field, *approx at total*) |
| **Engagement** (CLICK) | Clicks (field) | **CPC** = cost/clicks *(calc)* | **CTR** = clicks/impr *(calc)* |
| **Conversion** (VALUE) | Conversions (field) · Value (field) | **CPA** = cost/conv *(calc)* · **ROAS** = value/cost *(calc, if value)* | **Conv. rate** = conv/clicks *(calc)* · AOV = value/conv *(if ecommerce)* |

**Visibility diagnostic** (why you're not seen): `lost_rank` (losing by rank/quality → raise
bids/QS) vs `lost_budget` (losing by budget → raise budget). This makes visibility actionable.

## Why everything is computed (not querying native rates)
The native rate/cost fields are **broken at the account aggregate** (validated: native
conversion rate = 0.0 with 100 conversions; native CTR 11.5% vs real 6.2%; native avg CPC $371
vs real $2.61). Only the base counts aggregate correctly → derive from them.

## How to narrate
1. **Headline**: in one line, is the funnel healthy or leaking, and at which level is the
   **worst drop vs the previous period**? (look at the largest-magnitude `better:false`).
2. **3 blocks** (Visibility / Engagement / Conversion): each with volume + cost + rate, each
   metric with its % vs previous (↑/↓). Never the cost without its rate next to it.
3. **Leak callout**: the worst level, with its cause. If visibility drops, say whether it's
   **rank** (quality/bid) or **budget**. If engagement drops, it's CTR (the ad). If conversion
   drops, it's conversion rate / CPA (offer/landing).

## Interpretation rules
- **Auto-detect business:** `business_model = ecommerce` → show ROAS and AOV; `lead-gen` →
  lead with CPA + conversion rate, no ROAS. Do not invent ROAS where there's no value.
- **Direction of change:** for CPM/CPC/CPA up = bad (🔴); for impressions/clicks/conversions/
  CTR/conv. rate/ROAS up = good (✅). The script already marks it; respect it when narrating.
- **Impression Share = approximate at account total.** Say so. For accuracy, per campaign
  weighted by impressions.
- **Conversions = primary** (= UI). Mention `all_conversions` only if the account counts
  calls/secondary actions as its real action.
- **Always vs previous period.** If the previous period is missing, say so; don't show fake deltas.
