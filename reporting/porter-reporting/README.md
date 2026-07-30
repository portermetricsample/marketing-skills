# Porter Reporting Infrastructure

The **UX/UI layer** for everything Porter Metrics puts in front of a user.

A user may not want a "report." They may want a **dashboard**, a **presentation**, or
an **audit**. This repo is generic on purpose: it defines the **types of documents**
people ask for, and the **components** that turn incoming data into a finished interface.

> This does NOT store client data. Only the reusable building blocks and recipes.

## Where this sits (and what it is NOT)

Porter's reporting work lives across three layers. Keep them separate so they don't drift:

| Layer | Repo / source | Owns |
|-------|---------------|------|
| **What** to measure | [`porter-analysis`](https://github.com/portermetricsample/porter-analysis) | The analysis — metrics, SUMAS, business questions |
| **How it looks** | `porter-design` | Tokens, color, type, chart styling (4 themes, default `white`) |
| **How it's assembled** (this repo) | `porter-reporting` | Document **types** + **generators** that build the interface |

This repo is the **assembly / orchestration** layer. It should *consume* the design system
and the frameworks, not re-implement them. When a generator needs styling, it pulls from the
design system; when it needs the "what goes in," it pulls from the frameworks.

## How it's organized

```
porter-reporting/
├── README.md             ← this index
├── _foundation/          ← cross-cutting rules every document obeys
│   ├── principles.md     ← the UX/UI principles (clarity, hierarchy, audience-fit)
│   ├── input-contract.md ← the shape of "the inputs that arrive"
│   └── design-system.md  ← how we consume porter-design tokens
├── _template/            ← copy this to define a new document type or variant
├── document-types/       ← the catalog of what users ask for
│   ├── report/           ← vertical narrative document + charts
│   ├── dashboard/        ← live, multi-page widget surface
│   ├── presentation/     ← slide-based deck
│   └── audit/            ← structured findings / checklist
└── components/           ← generators: inputs → output
    ├── charts/           ← chart builders
    ├── slides/           ← slide builders
    └── layouts/          ← page / document scaffolds
```

Two axes:
- **document-types/** = the *deliverable* a user wants (report, dashboard, presentation, audit)
- **components/** = the *reusable parts* that any deliverable is built from

## Document types

| Type | What it is | When a user wants it |
|------|------------|----------------------|
| [Report](document-types/report/) | Vertical narrative document with supporting charts | "Send me a report of how X did" |
| [Dashboard](document-types/dashboard/) | Live, interactive, multi-page widget surface | "I want to monitor this over time" |
| [Presentation](document-types/presentation/) | Slide deck for a meeting / readout | "I'm presenting this to the client/board" |
| [Audit](document-types/audit/) | Structured findings, scored sections, checklist | "Review this account and tell me what's wrong" |

## Status

🟡 Initial scaffold. Document-type definitions and components are stubs to be filled in.
