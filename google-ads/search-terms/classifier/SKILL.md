---
name: search-term-classifier
description: Give every Google Ads search term its COMPLETE set of labels at once — brand class (brand / competitor / generic), intent type (informational / comparison / cost / persona / geo / transactional), cannibalization (matched by 2+ keywords + who should own it), and a per-keyword relevance verdict — then roll them up to one recommended disposition per term (add negative / route to owner / add as keyword / hand to content / brand policy / keep). Use this skill whenever the user wants the FULL picture per term, a multi-tag / multi-label classification, "tag/label/classify every search term", "one card per term", to triage the whole search-terms report in a single pass, or says a term is several things at once (branded AND informational AND cannibalized). It COMPOSES the cluster's single-axis skills (relevance, duplicates, opportunity, branded), it does not replace them — a single-axis ask belongs to that sibling; the keep/cut-by-spend verdict belongs to the performance skill.
---

# Search Term Labeling (the multi-label / triage layer)

## Goal (job-to-be-done)
Produce **one profile card per search term** that carries **all** of its classifications at once,
then roll them up into a single **recommended disposition** for the term. It is the
**composition layer** of the search-terms cluster: instead of running four single-axis skills and
joining their outputs in your head, you get every tag on every term in one pass.

- **Who:** media buyer / PPC manager. **When:** recurring, when working the whole search-terms
  report and you want the complete read per term, not one angle.
- **Decision it drives:** per term, what to do with it — *add negative · route to the right keyword ·
  add as a new exact keyword · hand to content · brand policy · keep* — decided with **all** the
  term's labels visible at once, not one.
- **The differentiator:** a single term is **multi-dimensional**. `best life insurance for seniors`
  is comparison **and** persona; `acme life insurance` is brand **and** (often) cannibalized. Run
  one single-axis skill and you lose the other dimensions. This layer keeps them all — and shows
  where they interact (a cannibalized term carries **several** relevance verdicts at once).

## What it is (and is NOT)
- It **REUSES** the siblings, it does not re-judge: cannibalization comes from
  [`term-routing`](../term-routing/) (its engine is run as a sub-step), intent from the
  [`intent-discovery`](../intent-discovery/) modifier dictionaries, brand from
  [`brand-vs-nonbrand`](../../../_framework/brand-vs-nonbrand.md), relevance from the
  [`relevance`](../relevance/) rubric. If a tag's logic must change, change it in the **owner**
  skill — this layer stays a merge.
- It is **not** the orchestrator. The orchestrator decides which skills a *request* needs; this is
  one specific analytical artifact (the term × tag matrix).

## Scope
- ✅ **Tag every term across all axes** + a per-keyword relevance list + a rolled-up disposition.
- ✅ **Brand containment + misspellings:** a brand search (including a typo like `policym` for
  "policyme") served **outside the brand campaign** is flagged `contain_brand` — a distinct check
  from cannibalization (it fires even when only **one** keyword catches the leak).
- ✅ **Respect the grain:** brand / intent / cannibalized are **term-level** (one tag); relevance is
  **(term × keyword)-level** (a nested list — one verdict per triggering keyword).
- ❌ **Does NOT fork** the sibling judgments — it composes them.
- ❌ **Does NOT make the keep/cut-by-spend verdict** (Winning/Waste) → the `performance` skill. It
  carries cost/conversions as **context** only, never as a performance verdict.
- ❌ **Does NOT produce content or apply changes** — it labels and recommends.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the single superset query + the per-account context.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the four axes, the grain rule, the disposition ladder.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) + [`scripts/query.json`](scripts/query.json) — the merge engine (it runs `term-routing` as a sub-step). [`scripts/example.json`](scripts/example.json) + [`scripts/example.context.json`](scripts/example.context.json) are a **fictional** test fixture.
- **Output schema:** [`references/output.md`](references/output.md) — the term-keyed JSON this skill emits.

## Operate

**Input:** per row, a **search term** + its **triggering keyword** + **match type** + **campaign** +
**ad group** + **cost / impressions / clicks / conversions** (one superset query). Plus **business
context** (per-account, never hardcoded): the **brand-term list**, the **competitor-term list**, the
**geo terms**, and the product lines (from campaign names / an account profile). Derive context from
account signals first; confirm the doubtful; ask only what can't be inferred.

**Process:**
1. Acquire the data with [`references/tools.md`](references/tools.md) (`list_accounts` → one
   `query_data`, args in [`scripts/query.json`](scripts/query.json)).
2. Run [`scripts/process.py`](scripts/process.py) over the raw rows with the context. The
   **deterministic** half tags every term: brand class, intent (primary + every modifier matched, so
   multi-intent terms keep all of it), cannibalization (by **reusing** `term-routing`'s engine),
   intentional-segmentation flag, and a preliminary `disposition_hint`. It also emits the
   **(term × keyword) pairs** that still need a relevance verdict.
3. The **LLM** half fills the part code can't: the **relevance verdict per pair** (apply the
   [`relevance` rubric](../relevance/references/framework.md)), it resolves any `intent: null`
   ambiguous terms, and it **finalizes `recommended_action`** using the disposition ladder in
   [`references/framework.md`](references/framework.md) (a `leak` relevance verdict overrides
   everything → add a negative).

**Emit** the JSON in [`references/output.md`](references/output.md): `synthesis` (3 strings) +
`terms[]` (one card per term: metrics + the full `tags` object + `recommended_action` + a plain
`action_detail` of where/what/why) + `rollup`. A renderer (the orchestrator's `formats/*`) turns it
into the human "Search Term Label Matrix". Emit **pure data** — no emojis, tables, or colors.

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`_framework/writing.md`](../../../_framework/writing.md) — the heading is a question the first
> sentence answers; the metric+delta is carried as data; plain language for a non-technical owner.

## Example (illustrative — FICTIONAL Acme Insurance, see [`scripts/example.json`](scripts/example.json); NOT rules)
- `life insurance` → **generic · transactional · cannibalized** (3 keywords in one campaign; owner =
  exact `life insurance online`; no keyword's text == the term → also a new-exact-keyword handoff) →
  **route_to_owner**.
- `how much is life insurance` → **generic · cost · not cannibalized · 0 conversions** → the searcher
  wants a price, not a quote form → **hand_to_content** (calculator; handoff to intent-discovery).
- `rival life insurance quote` → **competitor · cost** (caught by broad `life insurance`) →
  **brand_policy** (negative in the generic campaign, or a dedicated conquest decision).
- `acme life insurance` → **brand** (demand capture, not demand-gen) → **keep**, reported as defense,
  never held up as a performance model.
