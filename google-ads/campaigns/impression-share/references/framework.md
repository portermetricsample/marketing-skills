# Framework: Impression Share Trend & Driver Diagnosis

Built on [`../../../_framework/ad-rank-and-impression-share.md`](../../../_framework/ad-rank-and-impression-share.md)
(the rank-vs-budget split) and the validated `performance_decay` trend engine (vendored as
`scripts/decay_core.py`). This skill reads **both** one period's **cap** (the snapshot mode, incl. top-of-page) **and** the
**curve over time** with the **driver of its movement** — the unified impression-share view.

## 1. Business question
> Per Search campaign: is our impression share trending **up / flat / down** over time — and when it
> falls, is the cause **budget** (money, fundable) or **rank** (auction — bid/Quality)?

## 2. The signals (all 0-1 fractions at daily grain — verified)
Per campaign per day, weighted by `impressions`:
- `search_impression_share` — reach you **got**.
- `search_rank_lost_impression_share` — reach **missed to rank** (bid/Quality).
- `search_budget_lost_impression_share` — reach **missed to budget** (money).
- `impressions` — the weight for daily→weekly aggregation and for ranking by impact.

> At single-day grain `got + rank_lost + budget_lost = 1.0` (verified). That identity is why daily is
> the only safe grain — it sidesteps the multi-day aggregation bug (#15) entirely.

## 3. The method (what `process.py` does — deterministic)
1. **Drop non-Search rows** — Display/Demand Gen come back with all three IS fields = 0; remove them.
2. **Aggregate daily → weekly, impression-weighted** — weekly IS = Σ(is_d × impr_d) ÷ Σ(impr_d); same
   for rank_lost and budget_lost. Weekly is the grain `decay_core` was calibrated on.
3. **Trim partial edge weeks** — drop any ISO week the data doesn't fully cover (its Monday < first
   data day, or its Sunday > last data day). **This is mandatory:** a 2-day trailing week reads as a
   ~50% IS drop and fakes a "Crashing" label (observed in testing before the fix). Trimming removes the
   leading and trailing stubs only; interior weeks are kept.
4. **Classify the weekly IS curve** with `decay_core.signals()` + `classify()` → one trajectory label.
   `crash_min_volume = 0` (the series is IS, not volume; volume is handled by the impact ranking + the
   thin flag, not the crash gate).
5. **Tag the driver** — over the recent window (last ~3 weeks, impression-weighted) compare `rank_lost`
   vs `budget_lost`: `rank` (rank > budget, ≥ 0.10), `budget` (budget > rank, ≥ 0.10), `mixed` (both
   ≥ 0.20), `none` (little loss either way).
6. **Rank by `impressions`** (impact layer) — a 5-pt slip on a 90k-impression campaign outranks a 20-pt
   swing on a 200-impression test. `% = shape, impressions = size of the bet`.

## 4. Reading the labels (trajectory) + the level (capped?)
| Label | Curve shape | Typical read |
|---|---|---|
| `Winning` | sustained up | gaining reach — protect the lever that's working; the driver shows the remaining headroom |
| `Healthy` | stable | steady — but **read the LEVEL**: flat at 82% = fine; flat at 10% with high rank loss = **stuck against a ceiling**, not fine |
| `Volatile` | swings, no trend | noisy — usually thin volume; soften any call |
| `Losing` | sustained down | real decline — act, routed by the driver |
| `Crashing` | sharp drop from a healthy baseline | urgent — act now |
| `Crashed` | near zero | reach gone — investigate (paused? disapproved? budget zeroed?) |
| `New` | emerging from ~0 | just ramped — watch, don't judge yet |

> **The flat-low nuance:** the trend word alone is not the verdict. A `Healthy` campaign at low IS with
> a high rank or budget loss is "flattening against a cap" — the user's "flattening" case. Always pair
> the **label** with the **current IS level** and the **driver**.

## 5. The driver → the lever (the hard rule from the primer)
| Driver of the decline | Lever |
|---|---|
| `budget` | **Raise the daily budget** — proven demand it can't afford (money recovers reach). |
| `rank` | **Fix bid / Quality / relevance** — money will NOT help; it's losing the auction. |
| `mixed` | **Fix rank first** (cheaper clicks), *then* fund. |
| `none` | No material loss — keep. |

**Cardinal error:** a `rank`-driven decline must never be routed to "raise budget". This is the same
rule `spend-allocation` and `impression-share` enforce — rank loss is a bid/Quality fix.

## 6. Sanity-checks / traps (mandatory)
- **Always eyeball the `series` vs the label.** The engine is calibrated but not infallible; if the curve
  and the word disagree, adjust the threshold in `decay_core`/`process.py`, never hand-edit the label.
- **Edge-week trim is non-negotiable** — without it, every campaign looks like it's crashing on the last
  (partial) week. Verified failure mode in testing.
- **Thin history / low volume** — a campaign with < ~6 trimmed weeks, or below the low-volume impression
  floor, gets `low_volume=true`; soften the verdict (don't alarm on a noisy micro-campaign).
- **Search-only, campaign grain** — no Display/DG/Video (dropped), no per-keyword IS (not exposed).
- **Estimates** — Google models eligible impressions; small campaigns are noisy.
- **Competitor "why" is out of reach** — you can say budget vs rank, but NOT which rival is taking the
  rank loss (Auction Insights is unavailable). Don't imply competitor causation.

## 7. When it applies / when it does NOT
- **Applies to:** SEARCH campaigns with ~6+ weeks of history.
- **Does NOT:** the current-period snapshot (→ `account-audit/impression-share`); the deeper rank cause
  — Quality Score pillars / CPC inflation (→ `keyword-ad-landing/metrics`; deferred phase 2); competitor
  attribution (unavailable). Keep the boundary: this skill says *up/down + budget/rank*, nothing it can't see.
