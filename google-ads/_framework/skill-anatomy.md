# Skill Anatomy — how every analysis skill in this repo is built

This is the **creation framework** for every use case in `porter-analysis`. It is a
domain specialization of [Anthropic's Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)
standard (`SKILL.md` + `references/` + `scripts/`, progressive disclosure). We adopt their
container; inside it we always fill the **same four components**, so any reader (human or AI)
finds the same shape in every skill.

> One use case = one skill = one folder. The folder is a real Agent Skill: it has a
> `SKILL.md` with frontmatter so Claude can trigger it on its own.

## Two recognized shapes (don't confuse them)

- **Judgment skills** (the default, most use cases) — atomic and composable; they **judge** and
  emit the canonical findings JSON ([`output-contract.md`](output-contract.md)). They follow the
  full container below: `SKILL.md` + `references/{tools,framework,output}.md`.
- **Narrative recipes** — `financial-overview`, `funnel-metrics`, `search-terms/performance`.
  They do **not** judge or emit a `checks[]` verdict; they lay out a fixed reading (KPIs / the
  funnel / a table). They use a lighter shape: `framework.md` + `datos.md` + `README.md`. This is a
  **deliberate second type, not a half-built skill.** If a recipe ever needs to emit findings or
  trigger on its own, migrate it to the full skill shape below.

## The container (Anthropic standard)

```
<skill>/
├── SKILL.md              # frontmatter (name + description) + body
├── references/           # loaded on demand (progressive disclosure)
│   ├── tools.md
│   ├── framework.md
│   └── output.md
└── scripts/              # optional — deterministic code that runs, not read
    ├── process.py
    └── query.json
```

`SKILL.md` stays short (Anthropic's guidance: < ~500 lines). Detail lives in `references/`,
read only when needed. Deterministic compute lives in `scripts/`, executed not loaded.

## The four components (what we always fill in)

| # | Component | Lives in | Answers | Anthropic mapping |
|---|-----------|----------|---------|-------------------|
| 1 | **GOAL** | `SKILL.md` frontmatter + intro | Who is it for, when does it fire, what decision it drives, and **what it does NOT do** (scope) | `description` = the trigger (what + when) |
| 2 | **TOOLS** | `references/tools.md` | How it acquires its inputs: the **ordered plan of MCP tool calls**, each with its exact args | a `references/` doc |
| 3 | **FRAMEWORK** | `references/framework.md` | The brain: the rubric / verdicts / thresholds / traps — the reusable IP | a `references/` doc |
| 4 | **OUTPUT** | `references/output.md` | The **JSON schema** the skill emits (a specialization of the global output-contract) | "define the output format" |
| — | **PROMPT** | `SKILL.md` **body** | The assembler that wires 1–4 into the runnable instruction | the SKILL.md instructions |

The PROMPT is not a separate file — per Anthropic, the operational instructions ARE the
`SKILL.md` body. Version history is **git**, not loose `prompt-vN.md` files.

## Shared contracts (owned by the orchestrator — skills conform, don't redefine)

Skills are the **catalog**; the **orchestrator** (`_orchestrator/`) consumes them. These globals
belong to the orchestrator lane — reference them, never copy or fork them into a skill:

- **`output-contract.md`** — the envelope every `output.md` specializes.
- **Canonical `synthesis`** = exactly three strings (NO `highlights[]`):
  - `headline` — the one-line insight (the "silver line").
  - `diagnosis` — where it leaks, stated via the funnel identity in [`metric-relationships.md`](metric-relationships.md).
  - `action` — the highest-$ fix, framed as where / what / why.
- **`writing.md`** — the voice. A **global transversal** (like `sumas.md`), NOT a 5th component.
  The `SKILL.md` body references it with a ~3-line reminder + a link; never copy the voice rules in.
- **`metric-relationships.md`** — the funnel identity ("why"). The FRAMEWORK component points to it;
  its result fills `synthesis.diagnosis` and `recommendation.why`. It does not change the schema.

**Zero presentation in output:** a skill emits pure JSON — no emojis, tables, markdown, or colors.
The orchestrator's `formats/*` render it.

**Path stability:** the orchestrator binds to skill folder names/paths (`analysis-tree.md`). Do not
rename a skill folder without telling the orchestrator session first.

### 2 — TOOLS: a tool-call plan, not a single query
`tools.md` is an **ordered inventory of the MCP tools the skill calls**, each with its
arguments. The "query" is not a separate thing — it is simply the **arguments of the
`query_data` tool**, nested inside this plan. A skill that also scrapes a landing page lists
`scrape` as a second tool with its own arg (the URL). Saved/executable forms of these args
live in `scripts/query.json`.

- **Universal principle:** minimal, exact fields → the AI never hallucinates the data.
  Ask only for what the verdict needs; park the rest.
- See [`porter-mcp-calls.md`](porter-mcp-calls.md) for the portal mechanics (fetch/execute, tool-ids).
- ⚠️ **Naming note:** Anthropic's frontmatter has an optional `allowed-tools` field = *permissions*
  (which tools the skill may touch). That is **different** from this `references/tools.md` =
  the *data-acquisition plan*. Keep them separate.
- **Edge case:** if a skill takes input the user already provides (a pasted CSV) instead of
  calling tools, document that expected input shape here too. The component's real job is
  "how the skill gets its inputs."

### 3 — FRAMEWORK: split brain (code vs judgment)
The brain has two halves (see [`account-profile.md`](account-profile.md)):
- **Deterministic half → `scripts/process.py`**: what is universal and computable for any
  account in any industry (group, count, ratios, rates, n-grams). Code must never hallucinate.
- **Judgment half → `framework.md` applied by the LLM**: what needs business criterion
  (does this term fit this keyword?). Flexible across industries.

### 4 — OUTPUT: data, not a pretty table
The skill emits **JSON** — the canonical truth, a specialization of
[`output-contract.md`](output-contract.md). This is the handoff to
[`porter-reporting`](https://github.com/portermetricsample/porter-reporting), which decides
how to render it (table, slide, doc). Keep presentation (emojis, layout) OUT of the analysis
output: "same input → any output" only works if analysis emits structured data.

## Execution pipeline (the WHEN)

```
GOAL (design-time)
  │
  ▼
TOOLS ──────► query_data / scrape / list_accounts fire   → raw inputs
  │
  ▼
FRAMEWORK (code)  ──► process.py: deterministic transform → pre-digested data
  │
  ▼
FRAMEWORK (judgment) ─► LLM applies the rubric            → verdicts
  │
  ▼
OUTPUT ─────► emit the canonical JSON

PROMPT = the conductor of TOOLS → OUTPUT.  Version history = git.
```

## Checklist to create a new skill
1. Copy `_template/`, rename to the use case.
2. Write the `SKILL.md` frontmatter: `name` + a pushy `description` (what + when to trigger).
3. Fill `references/tools.md` — the minimal, exact tool-call plan.
4. Fill `references/framework.md` — the rubric, the scope (YES / NO), the traps.
5. Fill `references/output.md` — the JSON schema, anchored to `output-contract.md`.
6. Write the `SKILL.md` body — the assembler prompt, pointing to the three references.
7. (Deterministic only) add `scripts/process.py` + `scripts/query.json`.

> Reference implementation: [`google-ads/search-terms/relevance`](../google-ads/search-terms/relevance/) —
> the cleanest skill in the repo; copy its shape.
