# Document type: Audit

A **structured set of findings**: sections reviewed, issues flagged with severity, and a
recommendation for each. The job is *judgment*, not just reporting numbers.

## When to use
- "Review this account and tell me what's wrong and what to fix."
- The reader wants a prioritized to-do list, not a narrative or a live surface.

## Input → render (the audit consumes the `analysis` object verbatim)
The audit is a **pure render of `porter-analysis`'s output** (`_foundation/input-contract.md` →
`analysis`). It does not judge — every verdict/state/recommendation arrives already made.

**Layout, top → bottom:**
1. **Executive synthesis** (`analysis.synthesis`) — the opener: `headline` · `diagnosis` · `action`,
   as a lead/callout. Insight-first, before any section. **The most important block.**
2. **One section per `check`** (`analysis.checks[]`), in priority order:
   - **Section header** = `check.title` + the **verdict chip** (`check.verdict`: ok / review / broken / n/a).
   - `check.scorecards[]` → **scorecards** (value + Δ vs previous period).
   - `check.findings[]` → the **findings table**:

     | Entity (`level · name`) | State | Evidence | Recommendation |
     |---|---|---|---|

     - **State** → a chip colored by meaning (✅ ok · 🟢 raise · 🔴 cut/broken · 🟡 review · flag).
     - **Recommendation** → the `{where · what · why}` in plain language (exact entity, no jargon) —
       the executable to-do. Rank rows by `spend`.
   - `check.rollup` → the section's "N flagged · top fixes" summary.
3. **Roll-up / to-do** — the highest-$ recommendations across all checks, as the prioritized action list.

## Finding model (resolved)
- **Severity / verdict / state live in `porter-analysis`** (each framework produces them) — the audit
  **renders** the state, never re-derives it. *(Resolves the old open question.)*
- **State scale:** `ok · flag · raise · cut · review · broken` (per finding) + `ok · review · broken · n/a`
  (per section verdict). Colored by **meaning** (cost-down = good), per the component contract.
- **Every recommendation is `{where, what, why}`** — exact entity + plain language, so the audit is a
  to-do list you can execute without thinking.

## Built from
- Content: the **account-audit cluster** + sibling skills in `porter-analysis` (8 Acme sections +
  spend-allocation, bid-strategy, landing-cro), via the shared output contract.
- Components: `components/layouts` (section scaffold), the **Table** + **states** + **chips** from
  `_foundation/component-contract.md`, scorecards.
- Reference: the Acme PPC audit checklist; the real Acme Insurance audit findings.
