---
name: brand-incrementality
description: Split a Google Ads account's performance into BRANDED vs NON-BRANDED to show the incremental value of the demand-gen effort — the "All searches" vs "Excluding branded" view. Branded searches convert cheaply and would mostly arrive anyway; non-brand is the net-new engine you judge budget and scaling on. Use whenever the user asks for branded vs non-branded, brand vs non-brand split, incrementality, "what's the real CPA/ROAS excluding brand", "is brand flattering my numbers", whether to build a brand campaign, or to isolate net-new performance. Two auto-detected modes: (A) no brand campaign exists but people search the brand → quantify the brand demand mixed into non-brand + recommend creating a brand campaign; (B) brand campaign(s) exist → the branded/non-branded performance split + flag brand leakage. Reuses the misspelling-aware brand matcher from search-terms/labeling. One account at a time.
---

# Branded vs Non-Branded Incrementality

## Goal (job-to-be-done)
Show what the account looks like **with** and **without** brand, so the advertiser judges budget and
scaling on the **incremental** (non-brand) performance — not the blended total that brand flatters.
Branded searches are **demand capture**, not demand generation: those conversions were very likely to
happen anyway (cheap, ultra-high-intent), so blending them in makes the whole account look better than
the paid demand-gen effort actually is.

- **Who:** media buyer / PPC manager / the client reading the report. **When:** every account read; the
  incrementality page of a report.
- **Decision it drives:** the **budget / scaling** call (made on the non-brand numbers), and — if no
  brand campaign exists — whether to **build one**.

## The two modes (auto-detected)
- **Mode A — no brand campaign.** People search the brand (caught in non-brand campaigns, typos
  included) but there's no dedicated brand campaign. → Quantify the brand demand currently mixed into
  non-brand and **recommend creating a brand campaign** (capture it cheaply, defend the SERP, and stop
  it flattering the non-brand baseline).
- **Mode B — brand campaign(s) exist.** → Produce the **branded / non-branded split** (All / Branded /
  Non-branded KPIs vs the previous period — the "All searches" / "Excluding branded" toggle) and **flag
  brand leakage** (brand terms served by non-brand campaigns, which secretly flatters the non-brand CPA).

## Detection (both grains — see [`references/framework.md`](references/framework.md))
1. **Campaign-level naming** → which campaigns are the brand campaigns, by a **marker** (`Brand`/`(BR)`/…,
   configurable) or an explicit name. This drives the clean headline split. *(Markers, NOT "name contains
   the brand word" — many accounts prefix every campaign with the company name.)*
2. **Search-term-level, typo-aware** → reuses the [`labeling`](../search-terms/labeling/) brand matcher
   (`policym`→`policyme`) to find brand demand the campaign naming misses: reconcile **leakage** (Mode B)
   and size **uncaptured brand demand** (Mode A).

## Scope
- ✅ The branded/non-branded **performance split** (spend · conversions · value · CPA · ROAS, vs prev),
  brand campaign detection, leakage reconciliation, the create-a-brand-campaign recommendation.
- ❌ **True incrementality measurement** — excluding-branded is a strong *baseline/proxy*; the real
  incremental number needs a **brand-holdout / geo experiment**. Stated as the recommended next step.
- ❌ It does NOT create/pause campaigns or apply negatives — it recommends.

## Components
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — campaign KPIs (current + prev) + the search-terms report.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — brand detection, the split, leakage, the modes, the incrementality caveat.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) + [`scripts/query.json`](scripts/query.json). [`scripts/example.campaigns.json`](scripts/example.campaigns.json) + siblings are a **fictional** fixture.
- **Output schema:** [`references/output.md`](references/output.md).

## Operate
**Input:** campaign-level KPIs (current + previous period) + the search-terms report (term + campaign +
cost + conversions). Plus context: `brand_terms`, `competitor_terms`, `brand_campaign_markers` (and an
optional `brand_campaign_names` override). Auto-detects ecommerce (judge on ROAS) vs lead-gen (CPA).

**Process (`process.py`):** classify each campaign brand/non-brand by marker → aggregate All / Branded /
Non-branded KPIs + deltas vs previous; detect branded search terms (typo-aware) → leakage (Mode B) or
uncaptured demand (Mode A); emit the split + recommendations. **LLM:** writes the 3-string `synthesis`
(the strong "incremental value" framing — the real CPA/ROAS to scale on), and confirms any ambiguous
misspelling/competitor brand match.

**Emit** the JSON in [`references/output.md`](references/output.md). A renderer turns it into the
"Branded vs non-branded search" page (the All / Excluding-branded toggle + donut + scorecards). Pure
data — no emojis/layout.

## Example (illustrative — FICTIONAL Northwind, Mode B; matches the report slide)
- All: $42,180 · 1,840 conv · **$22.92 CPA**. Branded: 39% of conv at ~$10 CPA. Non-branded: $34,780 ·
  1,120 conv · **$31.05 CPA** — the honest number to scale on.
- Leakage: 28 brand conversions ($550) caught by non-brand campaigns → flatters the non-brand CPA from
  $31.35 to $31.05 → add brand negatives.
