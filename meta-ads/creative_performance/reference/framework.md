# Creative performance framework — industry grounding

The classifier in `scripts/creative_decay.py` is **not invented**. Every threshold below
traces to a published creative-strategy framework or a 2025-2026 ad benchmark. This file is
the audit trail.

## The lens: a 3-stage creative funnel (Motion / Atria / Foreplay)
A creative is not one number — judge it stage by stage. A great hook with a weak body still fails.

| Stage | Question | Metric | Formula |
|---|---|---|---|
| **Attention** | Did the scroll stop? | Thumbstop / Hook rate | 3s video plays ÷ impressions |
| **Engagement** | Did they stay? | Hold rate | ThruPlay (15s) ÷ 3s video plays |
| **Click** | Did they act? | CTR (link) | link clicks ÷ impressions |
| **Conversion** | Did it pay? | ROAS / CPA | purchase value ÷ spend / spend ÷ purchases |

> Note: Hold = **ThruPlay ÷ 3s-plays**, NOT ÷ impressions. This is the corrected, industry-standard definition.

## Benchmarks (absolute, for orientation)
- **Thumbstop**: <25% weak · 30-40% solid · >35% strong.
- **Hold**: <30% weak · 40-50% average · >60% strong. (This golf account runs ~7% — long-form
  sim videos; that's why the engine compares to the *account* benchmark, not the absolute.)
- **CTR (Meta link)**: 0.9-1.5% average · >1.5% strong · ecommerce 1.5-2.5%. WordStream 2024 median
  1.71% (traffic) / 2.59% (leads). Kill floor <0.5%.
- **ROAS**: 2.5-4.0 average · scale at 2-3x sustained.

## Decision rules (kill / scale)
- **Kill**: spent 3x target CPA with 0 conversions · or CTR <0.5% · or CTR <50% of the control ad ·
  or CPA >3x target for 3 consecutive days.
- **Scale**: ROAS 2-3x for 7-14 days **and** CTR >1.5% **and** cost-per-result trending down 3+ days.
  Scale in steps (the classic 20-30%/day guidance), not all at once.
- **Unicorn**: top 1-3% of creatives — outsized outcome, not a rounding-error winner.
- **Budget split (70/20/10)**: proven winners / iterations of winners / net-new experiments.

## Fatigue signals
CPM rising **and** frequency >3 **and** CTR down ~30% from its baseline. Fatigue is a *trend* call,
so it needs enough history — the engine only assigns "Fatiguing" with ≥28 days / ≥4 weeks of data.

## How the code turns this into a verdict
- **Outcome metric is adaptive**: ROAS when the account tracks purchases, else CTR as the
  engagement proxy. (Caveat: an ad optimized for a non-click objective — event responses, leads —
  judged on CTR will read low. When there are no purchases, treat CTR verdicts as a proxy, not gospel.)
- **LEVEL drives the verdict** (full-period, volume-weighted vs the account benchmark). Robust to noise.
- **TREND only nuances it** (weekly buckets → `decay_core`). Daily ad-rate series are too noisy
  (a 2-impression day can show 50% CTR), so the trend runs weekly — the same reason
  `performance_decay` runs SEO on weekly buckets.
- **Bands** (relative to account benchmark): Unicorn ≥1.8x (+ strong funnel + volume) · Winning ≥1.25x ·
  Steady 0.8-1.25x · Losing <0.8x (or below an absolute kill floor) · Testing = below the data gate.

## Sources consulted
Motion (motionapp.com) creative-analytics framework & metric glossary; Atria/Foreplay creative-testing
guides; WordStream Facebook Ads benchmarks 2024; Meta Business Help (ThruPlay / video play definitions);
common media-buyer 70/20/10 and kill/scale heuristics. Numbers are ranges, not laws — the engine prefers
*relative-to-this-account* comparisons so it adapts to any vertical.
