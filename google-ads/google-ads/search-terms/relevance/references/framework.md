# Framework: Search Term ↔ Keyword Relevance

## Mission
Re-judge, from the advertiser's side, each **(search term × keyword that triggered it)** pair:
did that keyword deserve to trigger that term? Google builds those matchings to
maximize spend, not the advertiser's commercial intent. **Unit of analysis = the
term↔keyword pair.** Output = relevance verdict + action.

## Scope
- **YES — semantic relevance term↔keyword.** Minimal table: **keyword + search term**
  (no ad group or metrics, to reduce context and focus the task). The match type is
  used only to split tables (see below), not as a data column.
- **NO — performance** (conversions, CPA, ROAS, landing, offer, tracking): that belongs to a
  **complementary** performance skill (see [cluster README](../../README.md)). A
  relevant term that doesn't convert is still
  relevant.
- **NO — account audit** (bids, budgets, creating campaigns, asset groups, PMax).

## The verdict (single scale)
For each pair, one verdict. Relevance first (drift axis), then identity:

| Verdict | What it is | Action |
|-----------|--------|--------|
| **Justified** | The term fits the keyword's intent (echo / variant) | Keep |
| **Loose** | Related but Google stretched the keyword (expansion) | Tighten the keyword |
| **Leak** | Outside the keyword's intent | Negative |
| **Misplaced** | Relevant to the business but to ANOTHER product, not to this keyword | Move (the destination is set by the performance skill) |
| **Brand** | Contains the own brand | Leave alone |
| **Competitor** | Contains a confirmed competitor | Advertiser policy |
| **Review** | Ambiguous brand/competitor, not decidable | Human decision |

The verdict is ONLY relevance. Whether the term converts or not is irrelevant here.

## The business context (what breaks Google's bias)
Golden rule: **the AI does not imagine the business — it reads the account signals.** Without this,
it guesses just like Google. It needs: products and geos served, what is NOT sold,
own brand, competitors + policy (are they bid on or not?).

| Context | Source | Auto? |
|----------|--------|--------|
| Brand | account name + domain + brand campaign | ✅ auto |
| Products / scope | campaign names + conversion actions + landings | 🟡 confirm edges |
| Geos | campaign names / geographic targeting | ✅ auto |
| Competitors | knowledge of the model per category | 🟡 confirm |
| Exclusions / competitor policy | — | 🔴 ask |

Flow: **auto-derive draft → confirm the doubtful → ask for what can't be inferred →
cache** (don't ask every run; refresh when campaigns change).

## Key rule: fix the KEYWORD vs negativize the TERM
The match type = how much freedom Google has to match (exact little, broad a lot).
A loose broad keyword is the *source* of many terms irrelevant to it.
- **Majority of terms irrelevant to the keyword** → fix the keyword: **tighten**
  (broad→phrase/exact) or restructure. Negativizing 100 terms is whack-a-mole: broad
  generates new terms every month.
- **Well-matched keyword, few irrelevant terms** → negativize those few.

Analogy: negativizing each term = mopping with the faucet open; tightening the keyword =
closing the faucet. That's why you **group by keyword** (to see the ratio), not loose terms.

## The 2 pitfalls to avoid
1. **Don't judge relevance by performance.** Few conversions ≠ irrelevant. A term
   can be perfectly relevant to its keyword and not convert → that belongs to the other skill.
2. **Relevance at the keyword level, NOT the account level.** A term can be relevant to
   the business and still be wrong for THIS keyword (= Misplaced).

## n-grams
Tokens that repeat across terms irrelevant to their keyword → candidates for a phrase
negative, with a **blast radius** note (which good terms it would block; if there's
collateral, drop to an exact negative).

## PMax / Demand Gen (no keywords)
They don't expose the term→keyword → you can't blame a keyword (it would invent one). No-keyword
mode: term relevance vs business + account-level negatives / brand exclusions
/ search themes. The skill declares the campaign type and switches mode.

## Analysis structure and output
- **One table per match type** (EXACT / PHRASE / BROAD), **grouped by keyword**:
  header = keyword; below it, its search terms with verdict. Columns: keyword + term.
- Output: per keyword, each term classified + a 3-string synthesis (headline/diagnosis/action) + candidate n-grams.

## Period
`last_month` or `{date_from, date_to}` of 30-90 days to have volume.

---

## Examples (illustrative — from real accounts, NOT rules)
- **Misplaced:** keyword `best dental insurance plan` triggered `health insurance` →
  relevant to the business (sells health) but to another product → move, don't negativize.
- **Leak / competitor to review:** a generic keyword triggered a near-identical query that is
  actually a competitor's brand name → Review (don't auto-negative — conquesting may be intentional).
- **Leak factory (fix the keyword):** a broad keyword with dozens of terms
  irrelevant to it → tighten the keyword, don't chase each term.
- **Performance trap:** a keyword whose terms are relevant (same product)
  but don't convert → verdict = Justified; the low performance belongs to the other skill.
