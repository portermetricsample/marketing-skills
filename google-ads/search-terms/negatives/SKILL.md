---
name: negative-keywords
description: Read and map a Google Ads account's FULL existing negative-keyword inventory — campaign-level, ad-group-level, and shared negative lists — so every skill that RECOMMENDS a negative (relevance, term-routing, n-grams, brand-incrementality) knows what's already excluded and never suggests redundant work. Use whenever the user asks what's already negatived / "do I already block this" / negative-keyword audit / map existing negatives / "don't recommend things I've already done", or before finalizing any add-negative recommendation. Reads via the connector-action GAQL path (NOT query_data — negatives are config, not metrics). Provides a redundancy check (is a candidate negative already covered, applying Google's exact/phrase/broad negative-match semantics) and surfaces conflicts (a negative blocking a good keyword/term). One account at a time.
---

# Negative Keywords — the existing-exclusions map

## Goal (job-to-be-done)
Give the account's recommending skills **full context of what's already excluded**, so their advice is
**net-new**, not a re-do. Without this, every negative-recommending skill risks telling the marketer to
add a negative they already have — the exact misinterpretation to avoid (live example: an account that
already negatives its brand + the classic `free`/`jobs`/`cheap` waste terms).

- **Who:** media buyer / PPC manager. **When:** before acting on any add-negative recommendation; as a
  standalone negative-keyword audit.
- **Decision it drives:** which recommended negatives are **genuinely new** (add) vs **already covered**
  (skip) — and which existing negatives may be **blocking good traffic** (review).

## Where negatives live (all three are readable)
Negatives are **config, not metrics**, so they are NOT in `query_data`. They are read via the
**connector-action GAQL path** (`execute_connector_action` → `keyword.list` with a raw GAQL `query`),
across three resources — all live-verified:
- `campaign_criterion` (campaign-level negatives, `negative = TRUE`)
- `ad_group_criterion` (ad-group-level negatives, `negative = TRUE`)
- `shared_criterion` + `campaign_shared_set` (shared negative lists + which campaigns use them)

## Scope
- ✅ **Inventory** the full negative set (text · match type · scope · where) + a **redundancy check**
  (is a candidate negative already covered, by Google's negative-match rules) + **conflict** flags
  (a negative that blocks an active positive keyword / converting intent).
- ✅ **The reconciler** for the cluster: every add-negative recommendation is run through it.
- ❌ It does NOT add/remove negatives — it maps and checks.
- ❌ It does not measure a negative's historical impact (negatives have no metrics).

## Components
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the GAQL connector-action calls (and the read-via-`execute` gotcha).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — negative-match semantics, scope resolution, redundancy vs conflict.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) (`covers()` / `blocks()`) + [`scripts/query.json`](scripts/query.json). [`scripts/example.negatives_raw.json`](scripts/example.negatives_raw.json) is a fictional fixture.
- **Output schema:** [`references/output.md`](references/output.md).

## Operate
**Input:** the three GAQL negative pulls (+ the shared-set link query) assembled into one
`negatives_raw.json`. Optionally a `candidates.json` (the negatives a recommending skill wants to add)
to annotate.

**Process (`process.py`):** normalize all negatives; build the inventory + summary; if candidates are
given, mark each **`already_covered`** (and by which existing negative, applying EXACT/PHRASE/BROAD
match) vs **net-new**.

**The wiring (cluster contract):** a skill that emits add-negative recommendations
(`relevance` · `term-routing` · `n-grams` · `brand-incrementality`) MUST reconcile them here first —
surface only the **net-new** as `add_negative`; mark the rest **already done**. (See each skill's
framework "Reconcile against existing negatives".)

**Emit** the JSON in [`references/output.md`](references/output.md): `summary` + `inventory` +
(optional) annotated `candidates`. Pure data.

## Example (illustrative — FICTIONAL, redundancy check)
- Candidate `free` (broad) → **already covered** by existing broad `free` → skip.
- Candidate `cheap membership rates` (phrase) → **already covered** by existing broad `cheap` (broad
  blocks any query containing "cheap") → skip.
- Candidate `membership cost` → **net-new** → add.
