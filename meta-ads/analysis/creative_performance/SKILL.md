---
name: creative_performance
description: Classify Meta/Facebook ad creatives as Unicorn / Winning / Steady / Fatiguing / Losing / Testing using an industry-grounded creative-strategy framework (3-stage funnel + level-vs-benchmark + weekly fatigue trend). Sibling of performance_decay, tuned for ad-rate metrics instead of SEO traffic. Use when a marketer asks which ads to scale, refresh, or cut.
---

# creative_performance

Tells a marketer, in one word per ad, what a creative strategist would conclude:
**scale it (Unicorn/Winning), maintain (Steady), refresh (Fatiguing), cut/iterate (Losing),
or wait (Testing)** — and why, grounded in published frameworks, not vibes.

Part of the **Content Decay family**: shares the `performance_decay` trend engine
(`decay_core`) but classifies on creative funnel health instead of SEO traffic decay.
The same family idea generalizes to other channels (the engine is source-agnostic; only the
benchmark/outcome layer is Meta-specific here).

## When to use
- "Which ads should I scale / kill?" · "Is this creative fatiguing?" · "What's my best ad?"
- Building or refreshing the Creatives view of a Meta Ads dashboard.

## How it works (read reference/framework.md for the grounding)
1. **3-stage funnel** — Attention (thumbstop = 3s/impr) → Engagement (hold = ThruPlay/3s-plays) →
   Click (CTR) → Conversion (ROAS/CPA). Never judge on one number.
2. **Adaptive outcome** — ROAS if the account tracks purchases, else CTR as the engagement proxy.
3. **LEVEL drives the verdict** — full-period, volume-weighted vs the *account* benchmark (adapts to
   any vertical). **TREND only nuances it** — weekly buckets fed to `decay_core` (daily ad-rate series
   are too noisy to trust).
4. **Bands** — Unicorn ≥1.8x (+strong funnel +volume) · Winning ≥1.25x · Steady 0.8-1.25x ·
   Losing <0.8x or below an absolute kill floor (CTR<0.5%) · Testing below the data gate
   (≥2000 impr, ≥4 days). Fatiguing needs ≥28 days of history so short ads aren't mislabeled.

## Run it
```bash
# pure classifier (MCP-exposable, no plotting) — prints verdicts for the sample dataset
python3 scripts/creative_decay.py

# visual QA harness — renders charts/qa.png (weekly trend + verdict per creative) for calibration
python3 scripts/build.py
```

Programmatic:
```python
from creative_decay import classify_creatives
res = classify_creatives(rows, columns, target_cpa=None)  # Porter query_data shape
# -> {benchmarks, outcome_metric, has_conversions, creatives:[{name, verdict, reason, trend, rel, ...}]}
```

## Inputs
Porter `query_data` rows for the Meta Ads connector, dims `[ad_name, date]`, with metrics:
`spend, impressions, inline_link_clicks, video_play_actions, video_thruplay_watched_actions,
purchase, value_omni_purchase`. Date as `YYYYMMDD`. (Field names in `scripts/creative_decay.py` → `F`.)

## Files
- `scripts/creative_decay.py` — the pure classifier (the deliverable; import or expose in the MCP).
- `scripts/build.py` — visual calibration harness (renders `charts/qa.png`).
- `reference/framework.md` — every threshold traced to its industry source.
- `data/creatives_this_year.json` — calibration dataset (10 creatives, All Seasons Golf, this year).

## Calibration notes (why thresholds are where they are)
Tuned by rendering the weekly curves and checking the labels against a strategist's eye:
- Daily → **weekly** trend (killed false volatility from low-impression days).
- 0.8/1.25 bands (an earlier 0.6 cutoff split two near-identical 0.6x ads into opposite verdicts).
- 28-day fatigue gate (a 9-day ad can't be "fatiguing").
- Level over trend (winter-golf's end-spike to 23% CTR is a partial-week artifact; its real level is 1.0x →
  Steady, not Winning).

## Caveat
With no purchase tracking, CTR is the outcome proxy — ads optimized for non-click objectives
(event responses, leads) will read low on CTR. Flag the objective when interpreting.
