# Framework: <Use case name>

The brain — the reusable rubric this skill applies. Prompt-independent: the `SKILL.md` body just
assembles it. The deterministic half (counting, ratios, contribution math) belongs in
`scripts/process.py`; this file is the judgment half (what needs business criterion).

## Mission
<One paragraph: what this skill re-judges and why the default/naive approach gets it wrong.>

## The verdict / rubric
> The core logic — a scale, a set of checks, or a classification. Define every allowed value;
> these become the enums in [`output.md`](output.md).

| Verdict / check | What it is | Action |
|-----------------|------------|--------|
| <value> | <definition> | <what to do> |

## Business context (what the AI must read, not imagine)
<The account signals the skill reads to avoid guessing — products, geos, brand, competitors, etc.
Auto-derive what you can; confirm the doubtful; ask only what can't be inferred; cache it.>

## The funnel "why" (where it leaks)
> The `synthesis.diagnosis` and `recommendation.why` are stated through the funnel identity. Don't
> re-derive it here — point to the global doc.

See [`../../_framework/metric-relationships.md`](../../_framework/metric-relationships.md): the
arithmetic identity that says which input moved a metric. The skill computes the driver; the
synthesis re-states it.

## Pitfalls to avoid
1. <a common wrong way to read this — e.g. judging relevance by performance>.
2. <another trap>.

## Edge cases
- <e.g. campaign types with no keywords, missing dimensions, no-data segments — and the mode switch>.

## Period
<`last_month` or a range with enough volume.>

---

## Examples (illustrative — from real accounts, NOT rules)
- <concrete examples that teach the rubric without becoming hard rules>.
