---
name: search-term-insights
description: Build the dollar-quantified "Recommended actions" insights card for the Google Ads Search Terms dashboard — it does NOT classify anything new, it JOINS the per-term tags from the classifier skill with the money from the performance skill (and optional opportunity clusters) and rolls them into one insight row per criterion, each expressed in DOLLARS of monthly optimization potential, leading with a total. Use this skill whenever the user wants the search-terms insights card, the "recommended actions" roll-up, the total optimization potential in dollars, or to turn the tagged search-terms tables into a prioritized money list. Seven lanes: Irrelevant negatives, Wasteful (relevant-but-losing-money) review, Duplicate overlap, Competitor reallocation, Branded recapture, and Opportunity (uncovered intents + new ad angles). It is a SYNTHESIS layer — the judgments stay in classifier / performance / opportunity; this merges their dollars.
---

# Search Term Insights (the dollar roll-up / insights card)

## Goal (job-to-be-done)
Produce the dashboard's **insights card**: a short list of **recommended actions**, each a real dollar
figure of monthly optimization potential, led by a **total**. It is the *output* of the search-terms
page (the tables are the input the AI reads; this card is what it concludes).

- **Who:** media buyer / PPC manager / the account owner reading the dashboard.
- **Decision it drives:** where the next optimization dollar comes from, in priority order.
- **What it is NOT:** it does not re-judge relevance, money, or opportunity. It is a **join + dollar
  math** over the axes that already did. If a number looks wrong, fix the owner skill, not this layer.

## The seven lanes
| Lane | Dollar basis | basis |
|---|---|---|
| **Irrelevant** | Σ spend on terms with a relevance `leak` verdict (the leak you stop) | measured |
| **Wasteful** | Σ waste-spend on terms that are **relevant** but losing money — review/fix, never negative | measured |
| **Duplicate** | overlap spend flowing through the non-owner keywords (proxy) | estimated |
| **Competitor** | Σ spend on competitor terms (available to reallocate) | measured |
| **Branded** | CPA savings if the brand leak were recaptured: `cost × (1 − brand_cpa/cur_cpa)` | estimated |
| **Opportunity · intents** | projected value of uncovered intents (`demand × conv-rate × benchmark CPA`) | estimated |
| **Opportunity · angles** | projected lift from new ad angles | estimated |

> **Why Wasteful is its own lane (the whole point):** a term that is *right for the keyword* but
> *losing money* must NOT be tagged `Irrelevant` — that would tell the user to block a real customer
> search. The `Irrelevant` lane is matching-only (`leak`); the money problem lives here. See
> [`relevance`](../relevance/references/framework.md) → "How the verdict drives the dashboard tag".

## The honesty rule (measured vs estimated)
Every row carries a `basis`: **measured** (a sum of real spend you can act on) or **estimated** (a
projection / model). The card emits two totals:
- `totalPotential` — Σ of **all** rows (matches the spec's single total).
- `measuredPotential` — Σ of **measured** rows only — **the solid number; lead with this.**

Never present an estimate as a fact. A branded-recapture or opportunity figure is a *forecast*; an
irrelevant-negatives figure is *money already spent*. Mixing them into one headline overstates
certainty — so we keep both numbers and label every row.

## Components
- **Framework:** [`references/framework.md`](references/framework.md) — the lanes, the formulas, the measured/estimated doctrine.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) — the join engine. Fixtures:
  `labeling.example.json` + `performance.example.json` (both **fictional** Acme).
- **Output schema:** [`references/output.md`](references/output.md) — the `insights{}` JSON (the spec's contract).

## Operate
**Input:** the **JSON outputs** of [`classifier`](../classifier/) (per-term tags + cost) and
[`performance`](../performance/) (the money), produced for the SAME account+period. Optional:
[`classifier/opportunity`](../classifier/opportunity/) clusters (richer Opportunity sizing) and a `context.json`
(`brand_cpa` to make branded recapture exact; `competitor_policy`; `branded_default_savings`).

**Process:** `process.py labeling.json performance.json [intent.json] [context.json]` — joins on the
search term, computes each lane's dollars, flags the basis, sorts by dollars, sums the two totals.
No LLM needed; the rationale strings are generated from the real terms + spend.

**Emit** the JSON in [`references/output.md`](references/output.md): `insights { totalPotential,
measuredPotential, rows[] }`. The reporting layer renders it as the insights card. Pure data — no colors
baked in beyond the `tone` token each criterion already owns.

## Example (FICTIONAL Acme — see the fixtures; NOT rules)
Joining the Acme fixtures yields: Irrelevant $90 (measured) · Wasteful $60 (measured, `free life
insurance` is right-fit but 0-conv) · Competitor $70 (measured) · Duplicate $190 (est.) · Branded $36
(est.) · Opportunity $283 (est.) → **total $726, of which $220 is measured.**
