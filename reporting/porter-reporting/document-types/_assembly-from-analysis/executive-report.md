# Format skeleton — Executive report

> A **vertical narrative document**: written insights first, supporting charts second. NOT a widget
> dashboard. The reader scrolls top to bottom and ends knowing *what happened, why, and what to do.*

- **Audience:** whoever pays the spend — client / account manager / leadership (non-technical).
- **SUMAS U:** performance management (monthly) or strategic.
- **Spine = a driver tree.** Money (intro) → the funnel that produced it → the segments that explain
  the funnel. **Each section decomposes the one above it.** The cascade arithmetic that links the
  metrics (impressions × CPM → cost, etc.) is [`_framework/metric-relationships.md`](../../../porter-analysis/_framework/metric-relationships.md).
- **Golden rule (SUMAS):** aspirin, not vitamin. If a section doesn't change a decision, cut it.

## The standard block (repeats at every heading)

Every section and sub-section is the **same unit**, top to bottom:

The block follows the voice's anatomy ([`writing.md`](../../../porter-analysis/_framework/writing.md)) plus the chart:

```
<question heading>    ← H2/H3, a closed question the data answers
<metric + delta>      ← the number with its comparison. The delta arrives as data from Analysis;
                         HERE (Reporting) is where it renders as a chip/badge — never spelled out in prose.
<answer + cause>      ← first sentence answers the heading; rest names the driver (metric-relationships)
<chart / visual>      ← the evidence, under the text — never a naked chart
<close>               ← bridge OR action (see below)
```

**How the block closes** — reconciles `writing.md` rule 7 (bridge, not CTA) with per-block actions:
- **Flowing / descriptive block** (intro → funnel → segment) → **bridge**: one analytical line
  pointing to the section that explains it next. Not a CTA.
- **Terminal or QA/audit block** (an audit check, the last node in a chain, nothing to bridge to) →
  **action**: 1–3 punctual recommendations in `where/what/why` — the analysis ends in a decision.
- The report's final **Actions** section = the **global $-ranked rollup** of every block's actions.

No new analysis: the skill already emits `recommendation {where/what/why}` per finding and
`rollup.topFixes` per check — bridge vs action just decides what *surfaces* at the block's close.

> The voice is **not re-listed here** — [`writing.md`](../../../porter-analysis/_framework/writing.md) is the single
> source. For this format its scope table resolves to: headings **are** questions, each block closes
> with a bridge (or an action on terminal/QA blocks). Inherit, don't restate.

## 0. Header (document head — not a section)

The cabecera. It is also the **routing key**: the data sources it names resolve which repo folder
the planner calls.

| Field | Source | Note |
|-------|--------|------|
| **Title** | request / goal | e.g. "Acme Insurance — Google Ads, May 2026" |
| **Date** | `period` | the reporting period |
| **Account / client** | `account` | client or brand name |
| **Data sources** | resolved connectors | e.g. `google-ads` → tells the planner to call `../../google-ads/…` |

> Resolving the data source **is** how the planner finds the use cases: connector `google-ads` →
> folder `google-ads/` → its `README.md` is the catalog of available use cases.

## The skeleton (sections, in order)

The sections, their order and their bound skills are **not redefined here** — they are the shared
[`analysis-tree.md`](../../../porter-analysis/_orchestrator/analysis-tree.md). The executive report **renders that tree as a vertical
document**, mapping its depth to headings:

- Tree level 1–2 (**Intro · Funnel**) → the opener + first H2.
- Tree node **Product / Campaigns / Keywords / Ads / Audiences / Conversion tracking / Time** → one
  **H2** each (only the entities `structure-map` says exist).
- Each entity's criteria (campaign type, ad groups, bidding, search-term relevance, placement…) →
  **H3**, with *performance* and *setup/QA* kept as separate sub-blocks.
- Tree level 4 (**Actions**) → the closer.

> **Depth knob:** a monthly report may render only Product + Campaigns + Keywords; a full review
> renders every node. The order never changes — only how deep it goes.

## How the canonical object maps in

Each use case emits the [canonical object](../../../porter-analysis/_framework/output-contract.md):

- **`synthesis`** → the 1-line money headline at the very top of the Intro, above the financials.
- **financial `scorecards`** (revenue / profit / spend + delta) → the Intro driver tree.
- **`checks[].findings` + chart** → the `narrative` + `chart` of each H2/H3 block.
- **`rollup.topFixes`** (highest-$ across all sections) → the Actions closer.

## Element vocabulary

`synthesis` (the 1-line money verdict; grows to the 3-sentence arc when several use cases are assembled) · `financials` (revenue/profit/spend driver tree) ·
`narrative` (the analysis paragraph) · `chart` (a viz under the paragraph) ·
`findings` (per-entity table/chips) · `actions` (the prioritized fix list).

## Depth knob

The materiality gate ([`analysis-tree.md`](../../../porter-analysis/_orchestrator/analysis-tree.md) Principle 3) decides depth — by
money, not by template:

| Goal | Entities rendered | Depth |
|------|-------------------|-------|
| Monthly client report | Intro · Funnel · the **material** entities · Actions | Lead with the biggest dollar mover; immaterial entities collapse to one line (but always state the all-clear) |
| Strategic / QBR review | All entities `structure-map` finds | Full tree, decompose-on-surprise down to the finest node |
