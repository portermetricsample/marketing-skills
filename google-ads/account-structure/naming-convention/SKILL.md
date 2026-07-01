---
name: google-ads-naming-convention
description: Generate the canonical naming convention a Google Ads account SHOULD use — a single coherent grammar for BOTH campaigns and ad groups, plus the controlled vocabulary per dimension and the rules that keep an ad-group name consistent with its campaign — inferred fresh by the LLM from the account's own dominant scheme (never a hardcoded regex). Use this skill whenever the user wants a naming standard / convention / template for a Google Ads account, asks "how should we name campaigns and ad groups", wants a naming spec to feed a report / dashboard filter / custom field, or mentions naming governance, taxonomy standard, or a structure the team must follow going forward — even if they don't say "naming convention". It GENERATES the target standard as machine-consumable data; it does NOT rename existing entities (out of scope for now), does NOT judge current consistency (that is `structure-audit`), and does NOT merely describe what exists (that is `structure-map`).
---

# Google Ads — Naming Convention (generate the standard)

## Goal (job-to-be-done)
Produce the **naming convention the account should follow** as a structured spec: one coherent
grammar for **campaigns** and **ad groups**, the **controlled vocabulary** for each dimension,
and the **coherence rules** that tie an ad-group name to its parent campaign — so the whole
structure reads with one logic. The output is the **insumo** a downstream AI consumes later
(to build a report, a dashboard filter, or a custom field); this skill does not act on the
account itself.

- **Who:** analyst / PPC lead / whoever sets the account's standards. **When:** onboarding a new
  account, or when the team wants one convention everyone follows going forward.
- **Decision it drives:** the naming standard the team adopts — what a well-formed campaign and
  ad-group name looks like, and which controlled values are allowed in each slot.
- **The differentiator:** it does not invent a standard from a template and does not impose a
  universal ideal. It **reads the account's own dominant scheme**, keeps what the team already
  does, orders it, and only fills the gaps with best practice. And it infers that scheme **with
  the LLM on every run** — because every account names things differently and a fixed regex
  would assume a format that isn't there.

## Scope
- ✅ **Generate the target convention** — one grammar for campaign + ad-group level, controlled
  vocabulary per dimension, and the coherence rules across the two levels. Emit it as data.
- ❌ **Rename existing campaigns / ad groups (migration map)** → out of scope for now (a future
  extension). This skill defines the standard; it does not apply it.
- ❌ **Judge whether the current structure is consistent** → `structure-audit` (it validates
  against the convention; this one *writes* the convention).
- ❌ **Describe / decode the dimensions that already exist as-is** → `structure-map` (it
  *describes*; this one *prescribes*). This skill consumes structure-map's `account_profile`
  when it exists.
- ❌ **Performance / spend / bids / budgets / copy.**

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the exact MCP calls (the
  same two structure queries `structure-map` uses) + why there is **no `process.py`** here.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: how
  the LLM infers the dominant scheme, synthesizes one grammar for both levels, builds the
  controlled vocabulary, writes the coherence rules, and keeps ambiguity honest.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON convention spec
  this skill emits (the insumo).

## Operate
**Input:** the unique **campaign names** and **ad-group names** of the account (two queries — the
campaign-grain one also brings keyword-less campaigns like Demand Gen / PMax; see tools.md). The
real dimensions (`campaign_advertising_channel_type`, `campaign_bidding_strategy_type`,
`keyword_info_match_type`) ride along so a token can be checked against reality. Optional and
preferred: the **`account_profile`** produced by `structure-map` — if present, start from its
decoded grammar/lexicons instead of re-inferring from zero.

**Process (LLM-first — this is the deliberate difference from its siblings):**
The only deterministic step is the data pull. Everything after it is the LLM's judgment, run
fresh each time. **There is no `process.py` parsing engine** — a regex would bake in a format
assumption, and Juan's rule for this skill is that the model determines the pattern per account.

1. **Gather the unique names** (campaign + ad-group) from the two queries. Work over the DISTINCT
   names (they are few), not over every keyword row.
2. **Infer the dominant scheme (LLM).** Read the names and identify the pattern the account
   *already uses most* — separators, slot order, which token encodes which dimension, at both
   levels. Where two schemes coexist, pick the majority one as the base and note the minority.
3. **Synthesize the target grammar (LLM).** Write ONE campaign grammar and ONE ad-group grammar
   that (a) preserve the dominant scheme, (b) fill missing slots with a sensible best-practice
   default, and (c) mark each slot required or optional.
4. **Build the controlled vocabulary (LLM).** Per dimension, list the allowed values and
   **canonicalize** the messy variants the account already has into one value each
   (e.g. `Life`, `LifeBroadMatch`, `bestlife` → `Life`). Validate a token against real data
   where it exists (type / match / bidding) to raise confidence.
5. **Write the coherence rules (LLM).** The rules that keep an ad-group name consistent with its
   campaign — the "one logic" across levels (e.g. the ad group inherits the campaign's product
   line; the match token in the ad-group name must equal the ad group's real match type).
6. **Keep ambiguity honest.** Internal codes the LLM cannot resolve (`AO`, `Embedded`) go to a
   "needs team dictionary" list — never invent a meaning.

Apply the rubric in [`references/framework.md`](references/framework.md).

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the three canonical strings: `headline` (the convention in one line),
  `diagnosis` (the dominant scheme it was built from + the biggest gap it fills), `action` (what
  the team must confirm before adopting it — usually the ambiguous codes).
- `convention` — the generated standard: `separators`, the per-level `grammar` + `slots` (with
  controlled values, canonicalization map and confidence), the `coherence_rules`, a well-formed
  `example` at both levels, and the `ambiguous` codes to resolve.

A downstream AI / renderer consumes this JSON to build a report, a dashboard filter, or a custom
field. **Emit pure data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — plain language for a
> non-technical owner; state the standard, name what it was built from, one line on what to
> confirm. No bare jargon.

## Example (illustrative — Acme Insurance; NOT rules)
- **Dominant scheme read from the account:** `<Program>_<Product>_[Funnel]_<Type>_[Bidding]_(<Code>)_[Test]`
  at campaign level; `<Persona/Theme>[ - <Match>]` at ad-group level.
- **Target campaign grammar (kept + gap-filled):** `Program_Product_Funnel_Type_Bidding_(Code)[_Test]`
  — `Funnel` was optional in the account; the convention makes it required so every campaign
  declares its stage.
- **Controlled vocabulary (canonicalized):** `Product` → {Life, Health, Dental, Auto, Home,
  Bundle, Brand}; the variants `LifeBroadMatch` / `bestlife` collapse to `Life`. `Type` →
  {Search, DemandGen} (validated vs `advertising_channel_type`).
- **Coherence rule:** an ad group's persona/theme must sit inside its campaign's product line;
  the `- Broad` token must match the ad group's real match type.
- **Needs team dictionary:** `AO`, `Embedded` — left for the team to define, never guessed.
