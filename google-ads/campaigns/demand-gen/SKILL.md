---
name: campaign-demand-gen-audit
description: Demand Gen campaign performance audit — evaluates whether Demand Gen campaigns are earning their budget against the account's Search baseline (CPA/ROAS), surfaces efficiency gaps, and states what Porter can and cannot see (asset-group detail is not exposed). Use this skill when the user asks about Demand Gen, YouTube/Display campaigns, video campaign performance, or whether top-of-funnel campaigns are delivering.
---

# Demand Gen Campaign Audit

## Goal (job-to-be-done)
Judge whether Demand Gen campaigns justify their spend relative to the account's **Search baseline**
(the proven CPA/ROAS from non-brand Search), and surface what to fix, hold, or cut.

- **Who:** media buyer / PPC manager / account owner.
- **Decision it drives:** raise, hold, cut, or restructure Demand Gen spend.
- **What it is NOT:** a Search performance review (that's `campaigns/spend-allocation/` or
  `financial-overview/`). This skill is specifically for evaluating upper/mid-funnel campaign types.

## Scope — what Porter can and cannot see

| What | Exposed by connector | Note |
|------|---------------------|------|
| Campaign-level spend / conversions / CPA / ROAS | ✅ | the primary lens here |
| Impression Share on Demand Gen | ⚠️ partial | IS less reliable on DG; note if missing |
| Asset-group performance (creative/audience breakdown) | 🔴 gap | not exposed by Porter; audit in Google Ads UI |
| Audience signals applied | 🔴 gap | not returned by `query_data` for DG |
| Video view rate / VTR | 🔴 gap | not in connector |

**Always close the section by naming these gaps and directing the user to the Google Ads UI
for the asset-group and creative read.** Never imply a creative or audience verdict was formed
from Porter data — it wasn't.

## The benchmark — compare to non-brand Search

Demand Gen competes for budget against Search. The right benchmark is **non-brand Search CPA/ROAS**
(from `brand-incrementality/` or `financial-overview/` with brand traffic stripped). If only the
blended account CPA is available, use it and flag that brand inflation understates the true gap.

| Verdict | When | Implication |
|---------|------|-------------|
| `Earning` | DG CPA ≤ non-brand Search CPA **and** ROAS ≥ non-brand ROAS | keep / scale |
| `Watch` | within 20% of the Search baseline | hold; reassess in 30d or after conversion-signal fix |
| `Trim` | CPA 20–50% above Search baseline | reduce daily budget; don't scale |
| `Pause` | CPA > 2× Search baseline or ROAS < 0.5× Search baseline | pause and replan creative/audience |

Spending 2–5% of account budget on Demand Gen at a moderate efficiency loss can be defensible
for pipeline/awareness goals — note this context when the CPA gap is borderline.

## Output

1. **Campaign table**: one row per Demand Gen campaign:
   `{ campaign_name, spend, conversions, cpa, roas, vs_search_baseline_pct, verdict, recommendation }`.
2. **Asset-group note**: explicit gap statement directing the user to the Google Ads UI.
3. **Summary**: total Demand Gen spend + share of account budget, aggregate efficiency vs Search
   baseline, top fix (pause / restructure / hold), and whether the conversion signal (§1 /
   `conversion-tracking/`) is trustworthy before making budget moves.

## Interaction with conversion-tracking (Step Zero)
If `conversion-tracking/` flagged multiple primary actions (blended conversions), Demand Gen CPA
comparisons are **directional only** — Demand Gen typically captures upper-funnel events that
Search doesn't, so the comparison overstates the gap. Name this if applicable.
