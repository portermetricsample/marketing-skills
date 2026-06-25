---
name: search-term-keyword-relevance
description: Re-judge, from the advertiser's side, each (search term × keyword that triggered it) pair in a Google Ads account — did that keyword deserve to trigger that term? Returns a relevance verdict + action (negative, tighten, move, review) per pair. Use this skill whenever the user works the Google Ads search terms report, asks what to negativize or which keyword is too loose, mentions wasted spend on irrelevant search terms, negative-keyword cleanup, or search-term↔keyword relevance — even if they don't say "relevance". Judges relevance ONLY; performance (CPA/ROAS/converts) belongs to the complementary performance skill.
---

# Search Term ↔ Keyword Relevance

## Goal (job-to-be-done)
Per **(search term × triggering keyword)** pair, judge whether the keyword *deserved* to
trigger the term. Google builds those matchings to maximize **its** spend, not the
advertiser's commercial intent. The unit of analysis is the **term↔keyword pair**; the output
is a relevance verdict that yields the action (negative, tighten keyword, move, review).

- **Who:** media buyer / PPC manager. **When:** recurring, on the search terms report.
- **Decision it drives:** what to negativize, which keyword to tighten, what to move, what to
  review by hand — without killing good traffic.
- **The differentiator:** not "better NLP than Google" — **business context**. The AI reads
  the account signals (products, geos, brand, competitors); it does not imagine the business.

## Scope
- ✅ **Semantic relevance, term↔keyword only.** Minimal input: keyword + search term.
- ❌ **Performance** (conversions, CPA, ROAS, landing) → complementary performance skill. A
  relevant term that doesn't convert is still relevant.
- ❌ **Account audit** (bids, budgets, building campaigns/PMax).

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the exact 2-field query.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: verdicts, traps, the "fix the keyword vs negativize the term" rule, PMax mode.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **search term** + its **triggering keyword** (match type splits the
output into 3 tables; it is not a data column). Plus **business context** (required): products
& geos served, what is NOT sold, own brand name(s), competitor names + bidding policy. Derive
the context from account signals first; confirm the doubtful; ask only what can't be inferred.

**Process:** run one pass **per match type** (EXACT, PHRASE, BROAD), **grouped by keyword**.
Apply the rubric in [`references/framework.md`](references/framework.md). Never use
conversions / CPA / ROAS / cost to classify — relevance only.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (where relevance leaks most + the single action),
  `diagnosis` (the keyword most off-target terms leak from + a recurring drift/leak n-gram across
  keywords), `action` (the one fix to take now, where / what / why).
- `groups[]` — one per match type; inside, keywords with their classified terms (`verdict` +
  `action`). Flag a keyword `too_loose` when most of its terms are `loose`/`leak`.
- `ngrams[]` — phrase/exact negative candidates, each with a blast-radius note.

A renderer (porter-reporting, or a chat view) turns that JSON into the human table. Do not bake
emojis/layout into the analysis output.

## Example (illustrative — from real accounts, NOT rules)
- **Misplaced:** keyword `best dental insurance plan` triggered `health insurance` → relevant
  to the business (sells health) but to another product → `move_to_other_campaign`, not negative.
- **Leak factory:** a broad keyword with dozens of terms irrelevant to it → `tighten_keyword`,
  don't chase each term (negativizing each = mopping with the faucet open).
- **Performance trap:** a keyword whose terms are relevant but don't convert → `justified`;
  the low performance belongs to the other skill.
