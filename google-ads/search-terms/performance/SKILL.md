---
name: search-term-performance
description: Judge the MONEY each Google Ads search term makes or wastes — aggregate every row of the same term, compute cost / conversions / CPA / conv-rate (or ROAS for ecommerce) from the base counts, and classify each term Winning (converts at/under the account benchmark) / Watch (converts above it, or too few clicks to judge) / Waste (real spend, ~0 conversions, past the thin-data floor), ranked by spend, with a destination (promote to exact / leave / add negative) and the dollars at risk. Use this skill whenever the user works the search-terms report and asks which terms are wasting budget, which to promote to exact keywords, which to negativize for poor performance, "what's burning money", cost/CPA/ROAS per search term, or wants the spend-ranked keep/cut read. Performance ONLY — the matching verdict (is this term relevant to the keyword?) is the relevance skill; who should own a duplicated term is term-routing; new keyword/asset ideas are intent-discovery.
---

# Search Term Performance (the money axis)

## Goal (job-to-be-done)
Per **search term** (aggregated across the keywords that triggered it), judge whether it is **earning
its budget**: Winning, Watch, or Waste — ranked by spend, so the biggest dollars move first. It reads
**dollars, not semantics**.

- **Who:** media buyer / PPC manager. **When:** recurring spend hygiene on the search-terms report.
- **Decision it drives:** which terms to **promote to an exact keyword**, which to **add as negatives**
  for poor performance, and which to **leave** — in spend order.
- **The discipline:** **irrelevant ≠ poor performance.** A term can be perfectly relevant to its
  keyword and still waste money, or be loosely matched and still convert. This skill does **not**
  re-judge the match (that is [`relevance`](../relevance/)); it judges the money.

## Scope
- ✅ Per-term **cost / clicks / conversions / value / CPA / conv-rate / ROAS** from the base counts;
  Winning / Watch / Waste against the **account's own benchmark**; a destination + the dollars at risk.
- ✅ **Thin-data floor** — a 0-conversion term is Waste only once it has had enough clicks that ~1
  conversion would have been *expected* at the account conversion rate. Below the floor it is
  **unproven (Watch)**, never Waste.
- ❌ **Relevance / matching** → [`relevance`](../relevance/). ❌ **Cannibalization / ownership** →
  [`term-routing`](../term-routing/). ❌ **New keyword / asset ideas** → [`intent-discovery`](../intent-discovery/).
  ❌ It does **not** auto-apply negatives or bid changes.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the 7-field query + the cost-scale rule.
- **Framework / rubric (SUMAS):** [`references/framework.md`](references/framework.md) — the brain: the benchmark, the floor, the Winning/Watch/Waste classification, the destinations.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) + [`scripts/query.json`](scripts/query.json) — the aggregator/classifier (no LLM in the typical case). [`scripts/example.json`](scripts/example.json) + [`scripts/example.context.json`](scripts/example.context.json) are a **fictional** Acme fixture.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **search term** + its **match type** + **campaign** + **cost / clicks /
conversions / value** (one query — [`references/tools.md`](references/tools.md)). Optional context:
`target_cpa` (the account tCPA, if known — overrides the median benchmark), `roas_target` (ecommerce
break-even), `min_clicks_floor`, and **`model`** (`lead_gen`/`ecommerce` — force the business model
when an account that **values its leads** would fool the value-present auto-detect; verified on a live lead-gen account).

**Process (deterministic — `process.py`):**
1. Acquire the data ([`scripts/query.json`](scripts/query.json)).
2. Feed the raw `{columns, rows}` to [`scripts/process.py`](scripts/process.py). It **aggregates the
   base counts** per term (cost/clicks/conv/value sum correctly across a term's keywords; native ratio
   fields do **not**), computes CPA/conv-rate/ROAS, sets the **benchmark** (the account tCPA if given,
   else the **median CPA across converting terms**), derives the **thin-data floor** (≈ clicks for one
   expected conversion), classifies **Winning / Watch / Waste**, and sets the destination + dollars at
   risk. Lead-gen vs ecommerce is auto-detected from whether conversion value is present.
3. The model only writes the synthesis (and intervenes if a destination needs a human eye).

**Emit** the JSON in [`references/output.md`](references/output.md): `meta` (account type, benchmark,
floor) + `terms[]` (sorted by spend; class + destination + `dollars_at_risk`) + `rollup`. A renderer
(porter-reporting) turns it into the spend-ranked read. Emit **pure data** — no emojis/tables.

> ⚠️ **Cost scale:** `google_ads_cost_micros` is returned **already in currency units** (Porter
> pre-converts — verified live 2026-06-23 on a production account: it reads `166.01`, not `166007841`). Do **NOT**
> divide by 1e6.

## How it feeds the Search Terms dashboard
Performance is the **money lane** the dashboard's insights card needs. Its `Waste` terms — intersected
with the relevance verdict — split into two insight rows: a term that is **`leak` + Waste** belongs to
the `Irrelevant` negatives line; a term that is **relevant + Waste** is the *"right-fit but wasteful"*
line (review/fix — **do not** tag it `Irrelevant`). The `waste_cost` rollup is the recoverable-dollars
input. Performance is **never** a tag on a term row; it lives in the insights card.

## Example (illustrative — FICTIONAL Acme Insurance, see [`scripts/example.json`](scripts/example.json); NOT rules)
- **Winning → promote:** `term life insurance` (PHRASE+BROAD, $380, 14 conv, CPA $27 ≤ $40) → broad-served
  winner → **promote to exact**.
- **Watch (converts, over benchmark):** `cheap life insurance` ($300, 1 conv, CPA $300) → leave, revisit.
- **Waste:** `life insurance jobs` ($90, 45 clicks, 0 conv, past the 20-click floor) → **add negative**;
  $90 at risk.
- **Thin-data (NOT waste):** `is life insurance worth it` ($12, 5 clicks, 0 conv) → below the floor →
  **Watch (unproven)**, never called waste on 5 clicks.
