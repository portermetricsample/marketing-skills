# Framework: Search Term Labeling (the multi-label / triage layer)

## Mission (a single job)
For every search term, attach **all** of its classifications at once and roll them up into **one**
recommended disposition. This is a **composition** of the cluster's single-axis skills, not a new
set of judgments — each axis's brain lives in its owner skill; this layer **merges** their outputs
keyed on the search term.

## Why a merge, not a fifth classifier (the principle)
A search term is **multi-dimensional**. The same query can be *branded* **and** *informational*
**and** *cannibalized* **and** have a *loose* relevance verdict — all true at once. Run a single
single-axis skill and you only see one of those; the rest are simply not computed. The repo keeps
the axes separate **on purpose** (the cluster README's "Why separate": mixing the *judgments* leads
to crooked decisions). So we keep the **judgments** separate (each in its owner skill) and merge
only the **outputs** — the view, not the logic. If a tag's rule must change, change it in the owner
skill, never here.

## The grain rule (the trap this skill exists to handle)
Not all tags describe the same thing — so they cannot all sit on one flat line:

| Tag | Describes | Grain | Shape on the card |
|---|---|---|---|
| `brand_class` | the term string | **term** | one value |
| `intent` (+ `intent_matched`) | the term string | **term** | one primary + the list of every modifier matched |
| `cannibalized` / `cannibalization` | the term vs the keyword set | **term** | one block (owner + competitors + negatives) |
| `relevance` | the term **×** a specific keyword | **(term × keyword)** | a **nested list** — one verdict per triggering keyword |

The consequence to never flatten away: a **cannibalized term is matched by several keywords, so it
has several relevance verdicts at once.** Crushing that to a single "relevance" tag throws out
exactly the detail the user is here for.

## The four axes (each REUSES its owner skill)

### 1. Brand class — owner: [`brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md)
`brand` (term contains a brand-term) · `competitor` (contains a competitor-term, no brand-term) ·
`generic` (neither). Brand **wins** over competitor so the non-brand baseline holds. Deterministic
from the per-account `brand_terms` / `competitor_terms` lists. Branded = **demand capture, not
demand-gen** — treat as defense, never as a performance model.

**Misspelling-aware (the key refinement).** Exact matching alone misses the brand typos that do the
most damage — they're the ones the brand keywords don't cover, so broad non-brand keywords scoop
them up (example: `acmelfe`, `acmelyfe` caught by a Dental broad keyword). So brand matching is
two-tier: exact word-boundary match → `brand_match_kind: "exact"`; else a **deterministic fuzzy
match** of each word / adjacent-word-pair against each **distinctive** brand token (Levenshtein
similarity ≥ 0.82, brand token length ≥ 5) → `brand_match_kind: "misspelling"` (flagged so the LLM
can confirm). Guardrails matter: the 0.82 bar keeps a generic near-word like `insure` (sim 0.75 vs a coined brand `insurely`) **out**, and
competitor names stay **exact-only** — fuzzy-matching common-word competitor names (Canada Life)
would false-positive.

### 5. Brand containment (NEW — a distinct check, not cannibalization)
A brand-classified term (**including a misspelling**) should be served by the **brand campaign**.
If any of its serving campaigns is **not** the brand campaign → it's a **leak**:
`brand_contained: false`, with the offending campaigns/keywords in `brand_leak[]` → disposition
**`contain_brand`** (add the brand token as a negative in those non-brand campaigns — a shared brand
negative list is the clean mechanism — so the brand campaign owns it).

Why this is **not** the cannibalization axis: a brand leak frequently happens via a **single** broad
non-brand keyword, and the cannibalization check only fires at **2+** keywords — so it would miss
exactly these. Containment is keyword-count-agnostic.

The brand campaign is identified by `brand_campaign_markers` (default `brand` / `(br)` / `_br_` …;
per-account override in the context). If no campaign matches a marker, treat brand leaks as
"no brand campaign detected → consider creating one" rather than silently passing.

Scope guardrails (don't over-negative):
- **Brand + competitor** (`acmelife vs manulife`) may belong in a deliberate conquesting campaign →
  `review`, not an auto-negative.
- **Single ad group is NOT required** — the rule is brand-*campaign* ownership; intent-segmented ad
  groups inside it (core / reputation / product / competitor-comparison) are fine and often better.
- Recommend the **negative in non-brand first**; only "add as a brand keyword" if the brand campaign
  isn't already catching the well-spelled form (Google's close variants often cover typos).

### 2. Intent type — owner: [`intent-discovery`](../opportunity/references/framework.md)
`cost · comparison · informational · persona · geo · transactional`, by the **modifier
dictionaries** (regex first; the LLM resolves the ambiguous ones, i.e. `intent: null`). Reports a
**primary** (by the precedence in `process.py`) **and** `intent_matched[]` (every modifier matched)
so multi-intent terms keep all their tags. Keep the dictionaries in sync with that skill's
framework.

### 3. Cannibalization — owner: [`duplicates`](../duplicates/references/framework.md)
A term matched by **2+ distinct keyword texts**. `process.py` **runs `duplicates`'s engine as a
subprocess** (single source of truth — not copied) and lifts: `pattern`
(same_campaign_cross_adgroup / cross_campaign_same_line / cross_product), the `owner`, the
`competing_keywords`, the `negatives` (+ `review_segment` for test campaigns), and
`needs_own_keyword` (no keyword's text == the term → a handoff to intent-discovery, **not** an
action this layer takes). The **same keyword** replicated across segment/test campaigns is
`intentional_segmentation: true`, **not** cannibalization.

### 4. Relevance — owner: [`relevance`](../relevance/references/framework.md)
A verdict per **(term × keyword)** pair: `justified · loose · leak · misplaced · brand · competitor
· review`. This is the one axis code can't compute — the **LLM applies the relevance rubric** to
each pair `process.py` emits. Reflects relevance ONLY — never derive it from cost / conversions.

## The disposition ladder (the roll-up → `recommended_action`)
`process.py` emits a preliminary `disposition_hint` from the deterministic tags; the **LLM
finalizes `recommended_action`** AFTER it assigns relevance, applying this ladder **top-down (first
match wins)**:

1. Any relevance verdict is **`leak`** (irrelevant to the business) → **`add_negative`**. (Relevance
   overrides everything — an irrelevant term is negated no matter what else it is. If a whole n-gram
   leaks, suggest a list-level negative.)
2. Else **`brand_class: brand`** (incl. misspelling) **served outside the brand campaign**
   (`brand_contained: false`) → **`contain_brand`** (negative the brand token in the leaking
   non-brand campaigns; see check 5). Fires even with one catching keyword.
3. Else relevance **`misplaced`** (relevant, wrong campaign) → **`route_to_owner`** / move it.
4. Else **cannibalized** (2+ keywords, relevant) → **`route_to_owner`** (add the term as a negative
   in every non-owner ad group). If `needs_own_keyword` → ALSO flag **`add_as_exact_keyword`** as a
   secondary handoff (intent-discovery owns the new-keyword idea).
5. Else **`brand_class: competitor`** → **`brand_policy`** (a decision, not a mechanical fix:
   negative in the generic campaign, or run a deliberate conquest campaign).
6. Else **intent ∈ {informational, comparison, cost}** with **0 / very low conversions** →
   **`hand_to_content`** (the searcher wants a calculator / guide / listicle, not the provider form —
   handoff to intent-discovery).
7. Else (relevant, converting, single clean keyword, not cannibalized) → **`keep`**.
8. Ambiguous / not enough signal → **`review`**.

`recommended_action` enum: `add_negative · contain_brand · route_to_owner · add_as_exact_keyword ·
hand_to_content · brand_policy · keep · review`.

## Dashboard tag mapping (the Search Terms page)
The Search Terms page renders a **flat, per-row tag set** (`Branded · Duplicate · Competitor ·
Irrelevant · Opportunity`) and tags **only what's off** — a relevant, non-brand, non-duplicate,
on-intent term is **untagged** (the "keep" state is the *absence* of a tag). These five tags are
**derived** from the rich axes above — never re-judged:

| Dashboard tag | tone | Fires when | Source axis |
|---|---|---|---|
| `Branded` | purple | `brand_class == brand` (incl. `brand_match_kind: misspelling`) | brand |
| `Competitor` | aqua | `brand_class == competitor` | brand |
| `Duplicate` | yellow | `cannibalized == true` (2+ distinct keywords; **not** `intentional_segmentation`) | cannibalization |
| `Irrelevant` | pink | the row's relevance verdict **`== leak`** — only `leak` | relevance |
| `Opportunity` | green | `needs_own_keyword == true` **or** `recommended_action == hand_to_content` | intent handoff |

The **grain rule still holds for `Irrelevant`:** it is a **(term × keyword)** decision, so it attaches
to the row of the specific keyword that leaked — a term can be `Irrelevant` under one keyword and clean
under another. **`misplaced` and `loose` NEVER set `Irrelevant`** (`misplaced` → *move*; `loose` →
*tighten the keyword*); folding either in would recommend negativing a relevant customer search — the
exact mistake the relevance axis exists to prevent. A relevant term that merely **wastes money** is
not a tag at all — it surfaces in the insights card's dollar lanes (the `performance` axis), never as
`Irrelevant`.

> `Opportunity` here is the **v1 per-term derivation** (a handoff this layer already emits). The richer
> opportunity sizing — uncovered intents and new ad angles, in dollars — is the `intent-discovery`
> skill's clusters, joined into the insights card by the insights synthesizer, not stored on the term.

## Split brain (code vs judgment)
- **Deterministic → `process.py`:** group by term; brand match; intent dictionaries; cannibalization
  (via the `duplicates` subprocess); intentional-segmentation flag; metric sums; the
  `disposition_hint`; emit the relevance pairs.
- **Judgment → the LLM:** the relevance verdict per pair; resolving `intent: null`; finalizing
  `recommended_action` on the ladder; the 3-string `synthesis`.

### Edge cases are LLM-adjudicated, NOT regex (doctrine)
The deterministic pass is a **high-recall candidate net + a decider only for the CLEAR-CUT**. Every
genuinely ambiguous call belongs to the LLM — even though that is probabilistic. A regex/threshold
cannot encode "is this really a brand typo or a different word?" without turning into brittle
whack-a-mole that needs re-tuning per account. So any threshold here (e.g. the `0.82` misspelling
similarity) is a **recall knob that decides what to SHOW the LLM — never the final verdict**. Lean it
loose to surface more candidates; the LLM filters the noise.

Routed to the LLM as judgment (the deterministic tag is **provisional**, marked for confirmation):
- **Brand misspelling** (`brand_match_kind: "misspelling"`) → confirm it's the brand, not a real word
  with its own intent ("covertly" is one edit from a coined brand like "coverly" but may not be brand).
- **Brand vs competitor vs generic on common-word names** → "canada life insurance" is the *Canada
  Life* brand OR "life insurance in Canada"; only reading the term in context resolves it.
- **Cannibalization that may be geo-isolated** → two campaigns sharing a term don't compete if they're
  geo-targeted to different regions; the LLM judges real-vs-isolated from the campaign structure.

These three carry `needs_confirm: true` + a `confirm_reasons[]` and **gate** their destructive action
(negative / contain / route): the LLM must adjudicate each before it's recommended; if it can't, the
action downgrades to `review`. (Resolving `intent: null` is also the LLM's job, but it's a separate
non-destructive step — it doesn't gate a negative, so it is NOT a `needs_confirm` flag.)

The clear-cut stays deterministic (an exact brand match; a term caught by 2+ keywords in one
campaign) — no LLM tax where there is no ambiguity. The rule is **clear-cut → code, ambiguous → AI**,
not "everything → AI" (that throws away reproducibility and pays tokens on the 90% that isn't
ambiguous, while adding nothing).

## Boundaries (cluster)
- A **single-axis** ask (only cannibalization / only relevance / only intent / only discovery) → the
  owner sibling, not this layer.
- **Keep/cut-by-spend** (Winning / Waste, prioritize by dollars) → the `performance` skill. This
  layer carries cost/conversions as **context** only.
- **New keyword / asset ideas** for unmet intent → `intent-discovery` (this layer only *flags* the
  handoff via `needs_own_keyword` / `hand_to_content`).

## Period
`last_month` or `{date_from, date_to}` of 30–90 days.
