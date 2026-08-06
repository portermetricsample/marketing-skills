---
name: page-teardown
description: Reverse-engineer any live web page — a competitor's homepage, a reference landing page, a pricing or comparison page — into its positioning, messaging, narrative, exact sections, and a value read that scores whether it works. Use when the user wants to tear down, break down, analyze, or audit an external page, understand how a competitor's site persuades, or extract the structure and messaging behind a page they admire. Reads the copy off the live page via the Porter Metrics MCP scraper, classifies it against a fixed framework, and outputs a single clean JSON object. The analysis counterpart to positioning-messaging and landing-page-copy: those build a page, this takes one apart.
---

# Page Teardown

A **Page Teardown** reverse-engineers an external page the way a creative teardown takes apart an ad. It reads the copy straight off the live page — never from memory — names every moving part against a fixed framework, measures it, and ends in a **value read**: does the page actually work, and where does it leak.

The output is a **single JSON object** — one source of truth. Render it however you like later (a report page, a slide, a comparison table across competitors). Data and presentation stay separate.

## What it runs on

Two things, nothing else:

1. **Porter Metrics MCP** — its built-in scraper fetches the page. No third-party tool, no API key. A competitor's public page needs no login.
2. **Claude** — does the analysis.

Fetch the page with `execute_action` before naming anything:

| Action | Returns | Use for |
|---|---|---|
| `web_scraping.firecrawl_scrape` | clean markdown / structured content | the page's copy (default) |
| `seo.on_page_content_parsing` | headings, anchors, text — structured | the outline / section order |
| `web_research.wayback_get_snapshot_content` | a past version's content | comparing the page over time |

Discover them anytime with `list_actions(task="scrape this landing page")`. **Read the page first, never from memory** — a teardown built from what you remember of a brand is worthless. Copy only: nav, images, demos and layout are the designer's job, out of scope.

## The one rule

The substance is **read off the page**, not invented. Name what the page actually does; classify it with a real entry from the reference banks (a sequence, a section, a figure); never label something the page doesn't show. A claim with no quote or bank entry behind it is a guess.

## The cascade — four levels, then metrics, then the value read

Each level sets the ground for the next: strategy decides the structure, the structure fixes what the copy must say, style dresses it. Diagnose **upward** — a flat line is usually a broken level above it.

### Level 1 — Strategic levers *(what the page decides before a word is written)*
| Attribute | What it names |
|---|---|
| **Positioning** | the category it claims + what it competes against |
| **Messaging** | the 2–3 claims repeated across the page |
| **Audience** | one or several — and whether the copy really segments or only the tabs do |
| **Awareness path** | where it starts and whether it educates — the spine ([`references/awareness.md`](references/awareness.md)) |
| **Goal** | the single action it optimizes |

### Level 2 — Structure *(how it's assembled to persuade)*
Inherits L1: awareness + goal decide the sequence.
| Attribute | What it names | Bank |
|---|---|---|
| **Outline** | the exact sections, in order | [`references/sections.md`](references/sections.md) · [`references/elements.md`](references/elements.md) |
| **Sequence** | the persuasion pattern (often a blend) | [`references/sequences.md`](references/sequences.md) |
| **Sections used vs omitted** | coverage — and what's deliberately dropped | [`references/sections.md`](references/sections.md) |
| **Objection map** | which objections it answers, where, and which it leaves live | [`references/objections.md`](references/objections.md) |
| **Proof ladder** | how the evidence escalates (anonymous scale → named peer → institutional) | read off the page |
| **Copy-component structure** | do sections descend headline → subhead → bold label → body, and does the **bold path survive a skim**? | [`references/patterns.md`](references/patterns.md) |

### Level 3 — Copy *(how each section argues)*
Inherits L2: the sequence decides what each section must say.
| Attribute | What it names | Bank |
|---|---|---|
| **Concept / big idea** | the single arguable point the whole page makes | read off the page |
| **Angle** | how it's told (before/after, listicle, decode…) | [`references/angles.md`](references/angles.md) |
| **Hook** | the hero line — outcome, identity, pain, curiosity | read off the page |
| **Headline pattern** | benefit-as-headline vs label; where the label lives | read off the page |
| **CTA strategy** | count, verb, repetition, friction removed | [`references/elements.md`](references/elements.md) |

### Level 4 — Style *(how it sounds)*
| Attribute | What it names | Bank |
|---|---|---|
| **Voice / register** | perspective, warmth, jargon level | read off the page |
| **Rhetorical figures** | the figures actually used (name them) | [`references/rhetorical-figures.md`](references/rhetorical-figures.md) |
| **Triggers** | the psychological levers leaned on | [`references/triggers.md`](references/triggers.md) |

### Metrics *(classify and measure; don't argue)*
Length (sections · body words · # CTAs · # proof points) · Density / above-the-fold · Language.

### Capstone — the value read *(the evaluative pass — "does it work?")*
The four levels *describe* the page; this **judges** it. Score each layer `strong · yes · partial · weak · fail`, each with **where it leaks**. This is where the sharpest finding usually lives.

| # | Layer | The reader's question | Leak points to |
|---|---|---|---|
| 1 | **Clarity** | Do I get it? | hero · headline · too much at once |
| 2 | **Relevance** | Is it for me? | audience · awareness mismatch |
| 3 | **Value** | Do I want it now? | benefits · outcome · proof of value |
| 4 | **Differentiation** | Why this over the alternatives? | comparison · differentiator · positioning |
| 5 | **Completeness** | Does it answer all my questions? | live objections · missing FAQ / pricing |
| 6 | **Conversion** | Do I know what to do next? | CTA · microcopy · too many actions |

## Output — JSON is canonical

The deliverable is one JSON object whose keys are the framework's variables. Every claim string carries its ground — a page quote in `evidence`/`example`, or a bank entry name. See [`examples/teardown-buffer.json`](examples/teardown-buffer.json) for the full shape and [`examples/teardown-buffer.md`](examples/teardown-buffer.md) for a readable rendering.

```
{
  meta:            { url, analyzed_from, scope }
  declaration:     { page_type, awareness_path[], sequence[] }
  strategic_levers:{ positioning, messaging[], audience, awareness_path, goal }
  structure:       { outline[], sequence, sections_used[], sections_omitted[],
                     objection_map, proof_ladder[], copy_component_structure }
  copy:            { concept, angle, hook, headline_pattern, cta_strategy }
  style:           { voice, rhetorical_figures[], triggers[] }
  metrics:         { sections, body_words, cta_count, proof_points, density, above_the_fold[], language }
  value_read:      [ { layer, question, verdict, leak } ]   // verdict: strong|yes|partial|weak|fail
  reading:         "one-paragraph through-line"
  gaps:            { sections_omitted[], objections_left_live[], value_layers_failed[] }
}
```

## Rules

- **Read the page first.** Fetch live via the Porter MCP scraper; never analyze from memory.
- **Classify, don't invent.** Name what's there with a real bank entry; never a bare adjective.
- **It's a menu, not a checklist.** Core spine always (positioning · messaging · awareness · outline · sequence · concept · value read · length); the optional lenses (objection map, proof ladder, skim test) only when the page earns them.
- **Diagnose upward.** A weak value verdict is rarely a copy problem — check the level above.
- **The value read is the point.** The descriptive levels feed it; the sharpest finding usually surfaces there.

## Where it sits

Sibling of the other `strategy/` skills: `positioning-messaging` and `landing-page-copy` **build** a page from a decision; `page-teardown` **takes an existing page apart** and scores it. Run a teardown on the best pages in a category before writing your own.

## Frameworks credited

Awareness stages (Eugene Schwartz) · Positioning components (April Dunford) · Positioning → messaging → copy hierarchy (Peep Laja) · Persuasion sequences (AIDA, PAS, BAB, PASTOR, and classic copywriting formulas) · Persuasion triggers (Robert Cialdini) · Classical rhetoric · Creative-teardown method (competitive creative analysis).
