---
name: search-term-routing
description: Find Google Ads search terms matched by 2+ DIFFERENT keywords competing to serve them — split across the ad groups of one campaign, across campaigns of a product line, or across product lines — pick the single MOST-RELEVANT keyword to own each term, and emit the negative keywords that consolidate it there. Use whenever the user works the search-terms report and mentions cannibalization, duplicate/overlapping keywords, two keywords (or campaigns/ad groups) competing for the same term, "which keyword/ad group should own this term", broad-stealing-from-exact, or negative-keyword consolidation — even if they don't say "routing". Routing/consolidation ONLY; relevance of a single pair → the relevance skill; spend prioritizing / keep-cut → the performance skill; brand-new keyword or asset ideas → the intent-discovery skill.
---

# Search Term Routing (cannibalization → consolidation)

## Goal (job-to-be-done)
For each search term matched by **2+ different keywords**, find the single **most-relevant owner**
and produce the **negatives** that consolidate the term under it. It does **one** thing: route each
term to its best keyword and stop the looser ones from catching it.

- **Who:** media buyer / PPC manager. **When:** recurring, on the search-terms report.
- **Decision it drives:** in which ad groups/campaigns to add a negative for each term, so the
  most-relevant keyword serves it.

## What "cannibalization" means here (and what it doesn't)
It is real and worth fixing — but the harm is **not** "bidding against yourself / a higher CPC"
(one auction per query, one keyword chosen). The harm is **(1) routing** — a looser keyword wins a
query the more-relevant one should own (wrong ad, weaker message match) — and **(2) split signal** —
the query's clicks/conversions/Quality-Score scatter across keywords, weakening each one. So frame
the output as *"route each term to its most-relevant keyword,"* never *"stop bidding against yourself."*

## Scope
- ✅ Act when a term is served by **2+ distinct keyword texts** — within one campaign (different ad
  groups), across campaigns of a line, or across product lines. Pick the owner; negative the rest.
- ❌ **Intentional segmentation** — the **same keyword** deliberately replicated across age/geo/
  audience/`_Test` campaigns (1 distinct keyword) → left alone (`skipped_intentional`).
- ❌ Relevance of a single term↔keyword pair → `relevance`.
- ❌ Prioritizing by budget / keep-cut verdicts → `performance` (spend is used here only to rank + size).
- ❌ Proposing a **new** keyword/asset for the term's intent → `intent-discovery`. This skill routes
  only among keywords that ALREADY exist; it raises `term_has_no_exact_owner` as the handoff signal.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the 6-field query + where the data flows.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the trigger, owner selection, the 3 patterns, the intentional guard.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) + [`scripts/query.json`](scripts/query.json) — the executable pipeline (no LLM in the typical case). [`scripts/example.json`](scripts/example.json) is a **fictional** test fixture (no real data).
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **search term** + its **triggering keyword** + **match type** + **campaign** +
**ad group** + **cost**. Plus **business context**: the product lines and how campaigns are split —
product suffixes vs segment/test (age/geo/audience) suffixes, read from the campaign names. Derive it
from account signals first; an account profile (`../../../_framework/account-profile.md`) makes the
line detection precise. NO advertiser vocabulary is hardcoded.

**Process (deterministic — `process.py`):**
1. Acquire the data with [`references/tools.md`](references/tools.md) (`list_accounts` → `query_data`,
   args in [`scripts/query.json`](scripts/query.json)).
2. Feed the raw `query_data` JSON (or a CSV export) to [`scripts/process.py`](scripts/process.py)
   (optionally the account profile as a 2nd arg). The script — **no model in the typical case** —
   does the whole detection:
   - Group by **search term**; keep terms matched by **2+ distinct keyword texts**.
   - Leave **intentional** same-keyword replication (segment/test campaigns) in `skipped_intentional`.
   - Pick the **owner**: right product line → match specificity (exact > phrase > broad) →
     keyword-text closeness to the term → spend.
   - Emit the **negatives** (add the term as a negative in every other keyword's ad group);
     **quarantine** test/segment-campaign negatives to `review_segment` (human review).
   - Tag each term's `pattern` (`same_campaign_cross_adgroup` / `cross_campaign_same_line` /
     `cross_product`) and `term_has_no_exact_owner`. Sort by term cost.
3. The model only intervenes if the "right product line" is **ambiguous**.

**Emit** the JSON in [`references/output.md`](references/output.md): `synthesis` (3 strings) +
`actionable[]` (owner + negatives + review_segment per term, sorted by spend) + `skipped_intentional[]`.
A renderer (porter-reporting, or a chat view) turns that JSON into the human "Search Term Routing —
Negatives Plan". Do not bake emojis/layout into the analysis output.

## Example (illustrative — FICTIONAL Acme Insurance, see [`scripts/example.json`](scripts/example.json); NOT rules)
- **Same-campaign (the most common, highest-spend pattern):** `life insurance` is matched by exact
  `life insurance online`, phrase `best life insurance`, and phrase `cheap life insurance` — 3 ad
  groups of ONE campaign → owner = `life insurance online` (exact) → add `life insurance` as a
  negative in the other 2 ad groups.
- **Cross-product:** `health insurance` served by the Dental campaign (broad `best dental insurance
  plan`) AND Health (exact `health insurance coverage`) → owner = Health/exact → negative in the
  Dental campaign.
- **Intentional, skipped:** `life insurance canada` repeated under the **same** keyword across age-
  segment test campaigns → by design → **do NOT touch**.
- **Scale (illustrative):** on a large account, expect a few hundred actionable terms; the highest-
  spend ones are usually a single broad/phrase keyword catching a head term several exact ad groups
  should own.
