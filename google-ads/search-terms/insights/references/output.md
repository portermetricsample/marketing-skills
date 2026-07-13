# Output — Search Term Insights (the insights card)

What this skill **emits**: the `insights{}` object the Search Terms dashboard's insights card renders.
It is the join of [`labeling`](../../labeling/) + [`performance`](../../performance/) (+ optional
[`intent-discovery`](../../intent-discovery/)). Produced **deterministically** by
[`../scripts/process.py`](../scripts/process.py) — no LLM. **No presentation here** — the card layout,
the big total, the chips are a reporting concern.

> Values below come from joining the **fictional** `../scripts/labeling.example.json` +
> `../scripts/performance.example.json` (Acme Insurance) — no real account data.

## Enums
- `criterion`: `Irrelevant` · `Wasteful` · `Duplicate` · `Competitor` · `Branded` · `Opportunity`
- `tone`: `pink` · `amber` · `yellow` · `aqua` · `purple` · `green`  (the `pds-badge` token per criterion)
- `basis`: `measured` (sum of real spend) · `estimated` (projection / model)

## Schema
```jsonc
{
  "insights": {
    "totalPotential": 726.0,        // Σ of ALL rows (matches the spec's single headline total)
    "measuredPotential": 220.0,     // Σ of measured rows only — the SOLID number; lead with this
    "rows": [                       // sorted by dollars desc
      {
        "criterion": "Irrelevant",  // chip label
        "tone": "pink",             // chip color token
        "basis": "measured",        // measured | estimated  (the honesty flag)
        "action": "Add 1 term as negatives",                 // imperative
        "rationale": "\"life insurance jobs\" ($90.0) drew real spend on searches outside the keyword's intent — exclude them.",
        "dollars": 90.0,            // monthly optimization potential for this lane
        "sub": "recoverable"        // sub-label under the dollar figure
      }
      // … Wasteful (amber, measured), Competitor (aqua, measured), Duplicate (yellow, estimated),
      //    Branded (purple, estimated), Opportunity (green, estimated)
    ]
  }
}
```

## Rules
- **`measuredPotential` is the number to feature.** `totalPotential` includes projections; the card
  must visually distinguish estimated rows (e.g. an "est." marker) so a forecast never reads as banked.
- **Every row names the real offenders** — the actual term(s) + their real spend/conversions in the
  rationale. It is an audit, not generic advice.
- **Lanes only appear when they have members** — an account with no competitor terms has no Competitor
  row. Never emit a $0 lane.
- **`Wasteful` ≠ `Irrelevant`.** Wasteful = relevant terms losing money (review/fix). Irrelevant = a
  relevance `leak` (block). A term is in exactly one of the two, never both.
- **Estimated formulas are explicit in the rationale** (e.g. "assumes a 30% lower brand CPA") so the
  reader can see the assumption. Set `brand_cpa` / pass intent-discovery clusters to harden them.
- **Tones** are the criterion's owned token (Duplicate = `yellow`, never a dark chip — dark-mode
  contrast). Match [`porter-reporting` DATA-SCHEMA](https://github.com/portermetricsample/porter-reporting).
