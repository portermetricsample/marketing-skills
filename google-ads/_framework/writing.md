# Writing — how every analysis writes its text

The **voice** of the repo. Use cases produce numbers + verdicts; this file says **how the prose that
carries them is written**. It applies to every narrative paragraph, every synthesis, every
recommendation — in any use case and any output format. The orchestrator's "standard block"
(*heading → analysis paragraph → charts*) writes its paragraph by these rules.

> Hoisted from where it was first written (`google-ads/account-audit/README.md` output rule + the
> synthesis arc) and [`output-contract.md`](output-contract.md). Those stay as the audit's specifics;
> this is the **global** version every case inherits.

## The block anatomy (what one unit looks like)

Every narrative section is the **same four-part unit**. This is the concrete shape the 6 rules below
produce:

```
<question heading>     ← H2, a closed question the data can answer yes/no  (report + slides only)
<metric + delta>       ← each number with its comparison, surfaced as data — NOT spelled out in prose
<answer + cause>       ← first sentence answers the heading; rest names the driver from arithmetic
<bridge>              ← one analytical line pointing to the section that explains it next
```

> **Boundary — where the delta gets *rendered* is not this repo's call.** `writing.md` only says the
> delta is carried **as a separate element, not inside the sentence**. *How* it looks (a chip, a
> badge, an inline arrow) is declared in **`porter-reporting`**, off the canonical
> [`output-contract.md`](output-contract.md) (the number + its delta travels as a scorecard datum).
> Keep this file UI-agnostic — it never names a widget.

Worked example (the boxed metrics below are illustrative — the reporting layer decides their actual
shape):

> ## Did revenue actually grow this month?
>
> `Revenue $48.2K ▲25%`  `Sales 312 ▲31%`  `Value per sale $154 ▼5%`
>
> Yes — up 25%. But it grew **because more sales came in (+31%), not because each sale was worth
> more** — the average ticket actually dropped 5%. In plain terms: you sold more often, but a little
> cheaper each time.
>
> *Worth checking which campaigns brought the extra volume, and whether the smaller ticket comes from
> one specific segment.* →

The heading is a **question**; the **first sentence answers it** (decision-first survives). The delta
travels **next to the number as data**, so the prose spends its words on the **why**, not on restating
"vs last month".

## The 6 rules

1. **Decision-first, answer-first.** Lead with the conclusion, then prove it. When the heading is a
   question (report + slides), the **first sentence is the answer** — never make the reader hunt for
   it. A number-dump opener is wrong: say *what it means*, then show the evidence. (SUMAS golden rule
   — aspirin, not vitamin: if a sentence doesn't move a decision, cut it.)

2. **Headings are closed questions** — *in reports and slides only*. Each section heading is a
   question the data answers yes/no or with one clear verdict (*"Did revenue actually grow?"*, *"Is
   the budget going to the campaigns that pay?"*). Not open musing (*"What happened with revenue?"* is
   too vague to answer). **Dashboards and alerts keep declarative labels** — they're scanned, not
   read, and a question slows the scan. See the scope note below.

3. **Plain language, for the person who pays.** Written for a non-technical account owner, not a PPC
   expert. **No bare jargon** ("switch to tROAS", "improve QS") — say it in plain words, put the exact
   technical term in parentheses. **No vague verbs** ("optimize", "improve", "leverage"). Explain a
   metric in plain words the **first time it appears** in a deliverable; after that, assume it's
   understood — don't re-explain and bloat the document.

4. **The delta is carried as data, not spelled out in prose; the prose carries the cause.** Every
   number still carries its comparison (vs previous period / vs target) — but that comparison travels
   **as a separate element beside the number** (`Revenue $48.2K ▲25%`), not restated in the sentence.
   That frees the prose to spend its words on **why** the number moved. *How that element is rendered
   (chip, badge, inline arrow) is **`porter-reporting`**'s decision, off the `output-contract.md`
   datum — not this file's.* *Fallback in prose:* when the writing must state a number inline (a
   running sentence, plain chat), use the shortest form — *"revenue up 25%"* — never a long *"revenue
   was 25% higher than the previous period"*.

5. **Every recommendation is `Where · What · Why`.**
   - **Where** — the exact entity, at its real level (campaign / ad group / keyword / ad / conversion
     action / account setting). Never "the account" when you can name the campaign.
   - **What** — plain words first, exact setting in parentheses. *"Tell Google to bid for the value
     of sales, not the number of leads (setting: Maximize Conversion Value)."*
   - **Why** — one plain sentence. *"So Google chases the leads that actually pay."*

6. **One story, decomposed, and every movement names its driver from the arithmetic.** Money → the
   funnel that produced it → the segments that explain the funnel. Each section decomposes the one
   above; if a lower section contradicts the headline, the headline is wrong — re-write it, don't paper
   over it. **The cause is never guessed — it's read off the identity** per
   [`metric-relationships.md`](metric-relationships.md): *"revenue rose because sales went up (+31%),
   even though value per sale fell (−5%)"* comes from `revenue = sales × value-per-sale`, not from a
   hunch. Name the driver, objectively.

7. **Close each block with a bridge, not a CTA.** End the unit with **one analytical line** that
   points to the section which explains the finding next (*"worth checking which campaigns drove the
   extra volume"*). It's a hand-off inside the analysis, not a marketing call-to-action. If there is
   no next section to point to, leave it out — don't manufacture one.

## Scope: where the question-heading applies

| Format | Headings | Why |
|--------|----------|-----|
| Executive report | **Questions** | Read top to bottom; the question frames the finding, the first sentence answers it. |
| Slides | **Questions** | One question per slide reads as a clear claim; the body is the answer. |
| Dashboard | **Declarative labels** | Scanned at a glance — a question slows the scan. Keep "Revenue", "Funnel". |
| Alerts | **Declarative** | A trigger line, not a narrative. |
| Chat (ad-hoc) | Flexible | Match the user's framing. |

## The synthesis arc (the opener of any assembled deliverable)

When a deliverable assembles several use cases, it opens with a 3–5 sentence **executive synthesis**
that weaves them into one story, in this arc:

1. **The money headline** — period-over-period. *"Spend ▲32% but conversions flat and ROAS fell to
   1.43× — buying the same outcomes for more money."*
2. **Where it leaks** — the funnel stage. *"CTR up → top of funnel is fine; the leak is past the click."*
3. **Culprit + opportunity** — named. *"Generic & Competitor drive the loss (CPA 2–5× Brand); Brand
   Search is efficient and capped — the clearest place to add budget."*

Lead with the story, then the sections prove it.

## What this is NOT

Not marketing copy. The `porter-writing-*` skills (landings, emails, listicles) are a different
domain — persuasion. This is **analytical prose**: explain, quantify, recommend. The bridge (rule 7)
points to the next section; it is **not** a hook or a CTA. Don't borrow their devices.
