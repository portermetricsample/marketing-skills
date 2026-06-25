---
name: <skill-id-in-kebab-case>
description: <What it does, in one sentence from the advertiser's side.> Use this skill whenever <the user works on X / asks about Y / mentions Z> — even if they don't say "<keyword>". <One line on scope: judges ONLY <this>; <that> belongs to the complementary <other> skill.>
---

# <Use case name>

> Copy this folder to create a new skill. Fill every `<...>`. The shape is fixed by
> [`_framework/skill-anatomy.md`](../_framework/skill-anatomy.md) — 4 components:
> **tools · framework · output · prompt** (this body is the prompt). Delete these quote blocks
> when done.

## Goal (job-to-be-done)
<The decision this skill drives, from the advertiser's side. One short paragraph.>

- **Who:** <role: media buyer / PPC manager / marketer>. **When:** <recurring on report X / one-off audit>.
- **Decision it drives:** <the action the reader takes after reading it>.
- **The differentiator:** <why this beats the naive/default approach — usually business context>.

## Scope
- ✅ **<what it judges — kept minimal>.**
- ❌ **<what it does NOT do>** → <where that belongs>.
- ❌ **<another out-of-scope thing>.**

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the exact MCP calls + fields.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** <what the skill receives — the fields from tools.md, plus any required business context>.

**Process:** <the steps — apply the rubric in [`references/framework.md`](references/framework.md);
if deterministic, run `scripts/process.py` over the rows first, then the LLM judges only the
ambiguous part>.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the silver line), `diagnosis` (where it
  leaks, via the funnel identity), `action` (the highest-$ fix, where / what / why).
- `<the skill's main array(s)>` — <the per-entity findings>.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`_framework/writing.md`](../_framework/writing.md) — question heading the data answers yes/no;
> the metric+delta carried as data, never spelled out in prose; first sentence answers the heading,
> then names the driver; one bridge line to the next section. Plain language for a non-technical owner.

## Example (illustrative — NOT rules)
- <a concrete, real-flavored example of the verdict/finding this skill produces>.
