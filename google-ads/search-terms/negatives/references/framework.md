# Framework: Negative Keywords

## Mission
Map the account's full existing negative set and answer one question for every recommending skill:
**"is this negative already there?"** — so the cluster recommends net-new work, never a re-do.

## Negative match semantics (the deterministic heart)
A negative blocks a query by its **match type** — and negatives have **no close variants** (unlike
positive keywords):

| Negative | Blocks a query when |
|---|---|
| **EXACT** `[x]` | the query equals `x` exactly (word-for-word) |
| **PHRASE** `"x"` | the query contains `x` as a **contiguous phrase** (same order) |
| **BROAD** `x` | the query contains **all** of `x`'s words (any order) |

Normalize both sides: lowercase, strip punctuation, split into words. (`process.py::blocks()`.)
Example: broad negative `cheap` blocks `cheap membership rates`; phrase `tee times` blocks
`book tee times near me`; exact `[east point country club]` blocks only that exact query.

## Scope resolution — which negatives apply where
A query in (campaign C, ad group G) is filtered by:
- **campaign-level** negatives of **C**, plus
- **ad-group-level** negatives of **G**, plus
- **shared-list** negatives whose list is **linked to C** (via `campaign_shared_set`).
`process.py::applicable()`. When a candidate gives no scope, check **account-wide** ("is it negatived
anywhere?").

## Two questions it answers
1. **Redundancy (the wiring)** — given a candidate negative a skill wants to add (text + match + target
   scope), is an applicable existing negative already blocking that text? → `already_covered` + the
   blocking negative. Surface only **net-new**.
2. **Conflict (the audit)** — does an existing negative block one of your **own active positive
   keywords**? That keyword can never serve its own term — a negative silently hurting you. Pass the
   account's active positive keywords (the same `keyword.list` GAQL, `WHERE negative = FALSE`) as
   `negatives_raw.positive_keywords`; each blocked keyword is returned in `conflicts[]` with the
   offending negative → **review** (usually: scope the negative tighter, or drop it). Live-validated:
   catches a brand keyword blocked by a brand broad-negative, `public golf` blocked by broad `public`,
   etc.

## The cluster contract (how skills wire in)
Any skill that emits `add_negative` — `relevance` · `duplicates` · `n-grams` · `brand-incrementality`
— reconciles its candidates HERE before finalizing: each becomes `already_covered` (mark **done**, do
not re-recommend) or net-new (`add_negative`). This is the single source of truth for "what's already
excluded"; the skills don't each re-implement it.

## Honest caveats
- **Current config only** — no metrics, no history. Right for "what's excluded," silent on impact.
- **Match-type nuance is approximate at the edges** — Google's real matching has spelling/stemming
  subtleties; `blocks()` implements the documented exact/phrase/broad rules, which cover the vast
  majority. A near-miss is a candidate for human review, not a silent skip.
- **Shared lists need the link query** — without `campaign_shared_set`, shared negatives are treated
  account-wide (a safe over-approximation for redundancy).
