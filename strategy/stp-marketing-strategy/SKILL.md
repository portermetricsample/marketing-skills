---
name: stp-marketing-strategy
description: Structure marketing thinking with the STP framework (Segmentation, Targeting, Positioning) — the strategy layer beneath every asset. Use when defining market segments, choosing a target market, writing positioning or an ICP, or when the strategy behind an ad, campaign, or page must be settled before writing it (for the words themselves, use positioning-messaging then landing-page-copy).
---

# STP Framework

Work through the three steps in order. Each step's output feeds the next. Use the framework to build a strategy, to plan an asset before writing it, or to critique an existing one against it.

> **Missing inputs:** when a required input isn't available (market size, reachable channels, budget/CAC, company stage, product mechanics), don't stall and don't invent. Work from the best available information, **state the assumption you made**, and flag the gap to fill later. A directional answer with its assumption named beats a blank.

## 1. Segmentation — how does the market split into meaningfully different groups?

Segment primarily by **needs / job-to-be-done** (the job they hire the product for, the trigger that made it urgent, the outcome they expect). Layer descriptive bases on top to make segments findable:

- **B2B**: firmographic (industry, size, stage), technographic (current stack), behavioral (buying process, usage), buying role
- **B2C**: demographic, geographic, psychographic, behavioral (occasion, frequency, price sensitivity)

Generate 3–7 candidate segments. Each must pass **MASDA**:

| Criterion | Test |
|---|---|
| Measurable | Can we estimate its size and identify members? |
| Accessible | Can we reach it through affordable channels? |
| Substantial | Big enough to be worth a dedicated strategy? |
| Differentiable | Would it respond differently than other segments? |
| Actionable | Can we actually serve it today? |

Per segment, capture: name, job-to-be-done, trigger event, descriptive profile, current alternative, where they can be reached, estimated size.

Two segments that would respond the same way to the same message are one segment. "SMBs" is not a segment. This test also settles apparent "dual audiences": two named buyers who hire the product for the **same job** are one segment — keep them together. Only split them if their jobs differ (then see Differentiated targeting below).

## 2. Targeting — which segment(s) do we pursue, and why?

Score each segment 1–5 on:

- **Economics** — willingness to pay, lifetime value (or repeat/referral value for one-off purchases)
- **Fit** — do we solve their job better than anyone today?
- **Accessibility** — reachable via channels we can run, at a sane cost to acquire
- **Competitive intensity** — underserved vs crowded for this job
- **Size and growth**

When resources are limited, fit and accessibility beat size; when you can run several motions in parallel, size and economics carry more weight.

Choose a targeting strategy:
- **Concentrated** — one segment, all resources. Best when focus matters most: a new product, a limited budget, or a single dominant job.
- **Differentiated** — 2–3 segments, a distinct message each. When you have the resources for parallel motions and the segments hire you for genuinely different jobs (common for established or multi-line businesses). If you choose this, run positioning and messaging once **per** target segment.
- **Undifferentiated** — one message for everyone (rarely right).

Output: primary target(s), an ICP precise enough to disqualify (filters, trigger, disqualifiers, buying process), and one-line reasons why the other segments were deprioritized.

## 3. Positioning — what should the target believe about us versus their real alternatives?

Work through five components in order:

1. **Competitive alternatives** — what the target would do without us: direct competitors, substitutes, manual/spreadsheets, do nothing. For many products the real competitor is inertia, not the named rival — and that changes the message. **Name the single strongest alternative explicitly** — a specific competitor, or the status quo/substitute if that's the real rival. This named alternative is what the distinctiveness and name-swap tests swap in; without one, those tests can't run.
2. **Unique attributes** — capabilities the alternatives lack (true and defensible only).
3. **Value** — translate each attribute up the ladder: attribute → benefit → value for the target's job. Drop anything the target doesn't care about.
4. **Category frame** — the market category the target should slot the product into (existing category, or a subcategory like "[category] for [segment]"). Default to these; new categories are expensive.
5. **Positioning statement**:

> For **[target segment]** who **[trigger + job to be done]**, **[product]** is a **[category]** that **[key value claim]**. Unlike **[primary alternative]**, **[product]** **[differentiator + reason to believe]**.

*Reason to believe* = the proof or mechanism that makes the differentiator credible (the same thing `positioning-messaging` calls **Proof**). If you don't have it yet, keep the differentiator and mark the reason-to-believe as a proof gap to fill — don't invent one.

Test it before finalizing:
- **Clarity** — a stranger could explain what it is and who it's for
- **Credibility** — every claim provable today
- **Distinctiveness** — swap in the named alternative. If it's a competitor and the line still reads true, it fails. If the real rival is the status quo/inertia (which can't be "swapped in"), test instead: does the claim give a reason to act now that doing nothing can't?
- **Defensibility** — can't be copied quickly. Product features aren't the only moat — reputation, track record, switching costs, and network or location density count too, and often matter more than a feature a rival can ship in a quarter

## Output skeleton

Capture the result in this shape (headers only — fill with the work above):

```markdown
# STP — [Product]

## Segments (3–7 candidates)
| Segment | Job-to-be-done | Trigger | Current alternative | Est. size (or rank) |
| ... one row each, note any that fail MASDA and are cut |

## Targeting
- Primary target: [segment] — [why, from the 1–5 scores]
- Strategy: Concentrated / Differentiated / Undifferentiated
- Deprioritized: [segment → one-line reason] ...

## ICP (precise enough to disqualify)
- Who / Trigger / Filters / **Disqualifiers**

## Positioning
- Named strongest alternative: [competitor or status quo]
- Statement: [the For…who…is a…that… / Unlike… sentence]
- Stress tests: Clarity / Credibility / Distinctiveness / Defensibility — pass or fix
```

## Applying it to assets

Every marketing asset answers the three questions whether the author knows it or not: who is this for (S), why them (T), what should they believe vs their alternatives (P). To plan an asset, answer the three explicitly first. To critique one, reconstruct what it implies for each and check it against the strategy — a generic audience, a missing alternative frame, or a claim that survives the competitor name-swap are strategy problems, not copywriting problems.

---

*Worked example:* see [`../example-acme.md`](../example-acme.md) for STP applied end-to-end to a fictional company, carried through into messaging and a landing page.
