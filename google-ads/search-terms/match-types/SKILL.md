---
name: match-types
description: For a Google Ads account, judge whether spend is over-concentrated in one keyword match type (Broad/Phrase/Exact) and whether any type is sitting untested at $0 — then flag rebalance vs test-a-type, with each type's cost / conversions / cost-per-conversion side by side. Use this skill whenever the user asks about match types, broad vs phrase vs exact, "am I too heavy on broad", whether to test a match type, match-type efficiency or budget concentration, or audits how keywords are bid — even if they don't say "match type". Judges SPEND CONCENTRATION + per-type efficiency ONLY; per-keyword relevance belongs to `search-terms/relevance` and search-term mining to `search-terms/n-grams`.
---

# Match Types — Efficiency & Concentration

## Goal (job-to-be-done)
Across the account's keywords, answer the client's question: is the budget **over-concentrated in
one match type** (usually Broad), and is any match type **untested** (sitting at $0)? Put Broad /
Phrase / Exact side by side — cost, conversions, cost-per-conversion, share of spend — and decide
whether to **rebalance** spend or **test a type**. The unit of analysis is the **match type**; the
output is a concentration verdict + the move to make per type.

- **Who:** media buyer / PPC manager. **When:** recurring account audit; the "match types" item of
  the [account-audit](../README.md) cluster.
- **Decision it drives:** whether to shift budget off an over-weighted type, and which untested type
  to pilot — with the two real numbers (share + efficiency) in hand.
- **The differentiator:** the **blend guardrail**. Porter cannot split a single qualified action
  (MQL/Opp) by match type, so per-type `conversions` can be a blend that *inverts* the true ranking.
  This skill reports efficiency as **directional only** when that risk is present — it never asserts
  "most/least efficient" on a blended number.

## Scope
- ✅ **Spend concentration + per-type efficiency:** cost, conversions, cost/conv, spend-share by
  Broad/Phrase/Exact; budget concentration %; untested types.
- ❌ **Per-keyword relevance** (does this keyword fit its term/ad?) → [`search-terms/relevance`](../../search-terms/relevance/).
- ❌ **Search-term mining** (n-grams, new negatives, harvest) → [`search-terms/n-grams`](../../search-terms/n-grams/).
- ↔ **Cross-reference** [`search-terms/performance`](../../search-terms/performance/), which carries
  match type as a breakdown — use it to drill into *which terms* sit behind a flagged type.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the keyword-grain query by match type + the conversion-action inventory probe.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: concentration threshold, untested test, and the blend guardrail.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per match type (BROAD / PHRASE / EXACT) — `cost_micros`, `clicks`, `conversions` from the
keyword view; plus a second probe (conversion-action inventory) to learn whether `conversions` blends
more than one primary action. Brand context: which terms are branded, so they can be excluded.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md). Group the
keyword rows by `keyword_info_match_type`; **compute** cost, conversions, cost/conv and spend-share
per type from the base counts (never trust a native ratio field). **First** exclude branded terms
([`../../../_framework/brand-vs-nonbrand.md`](../../../_framework/brand-vs-nonbrand.md)) — branded
keywords are usually Exact and flatter that type. Flag **concentrated** if one type holds ~≥70% of
spend; flag **untested** for any type at $0. **Run the blend guardrail before judging efficiency:**
if the account has >1 primary conversion action, mark every type `directional` and never claim one is
"most/least efficient" — cost/conv is a blend that can invert the true qualified ranking.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the concentration + the move), `diagnosis` (which way the
  account leans — over-concentrated vs untested — and whether efficiency is trustworthy), `action`
  (the one move now, where / what / why).
- `match_types[]` — one per type: `cost`, `conversions`, `cost_per_conversion`, `spend_share`,
  `verdict`, `directional`, and a `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — the question the data answers
> yes/no; the metric+share carried as data, never spelled out in prose; first sentence answers it,
> then names the driver. Plain language for a non-technical owner ("almost all the budget is on one
> setting"), the technical term in parentheses.

## Example (illustrative — NOT rules)
- **Concentrated:** Broad holds 78% of spend, Exact 18%, Phrase 4% → `concentrated` on Broad →
  `rebalance`: too much budget rides one setting; shift some toward the proven type.
- **Untested:** Phrase sits at $0 across the account → `untested` → `test_type`: pilot Phrase on the
  best ad groups to learn before committing budget.
- **Blend trap (verified 2026-06-23):** Broad looks best on all-conv ($373/conv) but worst on
  Cost/MQL ($1,515) once you split by qualified action — Porter can't make that split per type, so
  every type is `directional: true` and the skill never says "Broad is most efficient".
