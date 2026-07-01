# Framework: Naming Convention (generate the standard)

## Mission
Write the **naming convention the account should follow going forward** — one coherent grammar
for **campaigns** and **ad groups**, the **controlled vocabulary** allowed in each slot, and the
**coherence rules** that keep an ad-group name consistent with its parent campaign. Output is the
standard as data (the insumo), not a judgment of the current state and not a rename of what
exists.

## The engine is the LLM, not a regex (the core rule)
Every account names things differently. This skill **infers the pattern with the model on every
run** — it does **not** run a deterministic `process.py` parser. A fixed regex would assume a
format the account may not have. The only deterministic part is the data pull (see
[`tools.md`](tools.md)); the reasoning below is all the LLM's.

## The method: read the dominant scheme → order it → fill the gaps
There is **no universal "correct" structure** (some accounts segment by match type, others by
audience, brand, product or funnel — the cluster's common principle). So the convention is not
imposed from a template. It is **built from the account's own dominant scheme**:

1. **Infer the dominant scheme.** Read the unique campaign and ad-group names. Identify the
   pattern the account *already uses most*: the separators (`_`, `-`, `|`, `()`, `[]`), the slot
   order, and which token encodes which dimension — at **both** levels. If two or more schemes
   coexist, take the **majority** one as the base and record the minority as a note (not part of
   the standard).
2. **Order it into one grammar.** Express the dominant scheme as an explicit slot sequence for
   each level. Keep the account's separators and order; do not re-order the team's tokens for
   aesthetics.
3. **Fill the gaps with best practice.** Where a useful dimension is missing or only sometimes
   present (e.g. funnel stage declared on half the campaigns), add the slot and mark whether the
   convention makes it **required** or **optional**. Filling a gap is the only place best practice
   overrides the account — and it must be justified in one line.

## The two levels must share one logic (coherence — the point of this skill)
Juan's requirement: the campaign and ad-group conventions can't be two disconnected rules; the
ad-group name must relate consistently to its campaign so the whole structure reads with one
logic. So the output always includes **coherence rules** that bind the levels, for example:

- **Inheritance:** the ad group sits inside its campaign's product line / theme — its name must
  not introduce a product the campaign doesn't carry.
- **Non-duplication:** the ad group does not repeat a dimension the campaign already fixes (if
  the campaign name already carries `(TL)`, the ad group doesn't restate the product code).
- **Truthful tokens:** a `Match` token in the ad-group name must equal the ad group's **real**
  match type; a `Type` / `Bidding` token in the campaign name must equal the real
  channel / bidding strategy. (These are the same real dimensions `structure-audit` later checks
  against — this skill *writes* the rule, the audit *enforces* it.)

Write the rules in plain language; they are meant to be read by a person and by a downstream AI.

## The controlled vocabulary (canonicalize, don't multiply)
For each dimension the grammar uses, list the **allowed values** — and, crucially, a
**canonicalization map** from the messy variants the account already has to the one value the
convention keeps. This is what turns "the account's habits" into "a standard":

- `Product`: `Life`, `LifeBroadMatch`, `bestlife` → **`Life`**. One canonical word per line.
- `Match`: `Broad`, `BroadMatch`, `broad` → **`Broad`** (and validate against the real match type).
- `Type`: `SEM`, `Search` → **`Search`** (validate vs `advertising_channel_type`).

Where real data exists (type / match / bidding), validate the value and raise its **confidence**.

## Confidence and ambiguity (the discipline — inherited from the cluster)
Each proposed slot / value carries a **confidence**:
- **confirmed** — the account clearly and consistently uses it, and/or it is validated against
  real data.
- **inferred** — reasonable, from the dominant scheme or site research (mark "from site").
- **ambiguous** — an internal code the model cannot resolve (`AO`, `Embedded`). It goes to
  **needs team dictionary** — never invent a meaning, and never bake an unresolved code into a
  required slot.

## What this skill deliberately does NOT do
- **No rename / migration map.** It defines the standard; applying it to existing entities is out
  of scope for now (a future extension). Do not emit new names for current campaigns.
- **No consistency verdict.** Whether the current account obeys the convention is
  `structure-audit`'s job. This skill produces the convention that audit checks against.
- **No performance / bids / budgets / copy.**

## Output
The standard as data (see [`output.md`](output.md)): the separators, the per-level grammar with
its slots (controlled values + canonicalization + confidence + required/optional), the coherence
rules, one well-formed example at each level, and the ambiguous codes to resolve. A downstream AI
consumes it to build a report, a dashboard filter, or a custom field.

> **Stress-test frame (Acme Insurance, illustrative — NOT rules):**
> - **Dominant scheme:** campaign `<Program>_<Product>_[Funnel]_<Type>_[Bidding]_(<Code>)_[Test]`;
>   ad group `<Persona/Theme>[ - <Match>]`.
> - **Gap filled:** `Funnel` present on ~half the campaigns → convention makes it **required** so
>   every campaign declares its stage.
> - **Vocabulary canonicalized:** `Product` → {Life, Health, Dental, Auto, Home, Bundle, Brand}
>   (variants `LifeBroadMatch`/`bestlife` → `Life`); `Type` → {Search, DemandGen} (validated).
> - **Coherence:** ad-group persona ⊂ campaign product line; `- Broad` = the ad group's real match.
> - **Needs team dictionary:** `AO`, `Embedded`.
