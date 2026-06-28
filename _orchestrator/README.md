# Orchestrator — from a request to a build plan

The **brain** of the repo. Use cases (`funnel-metrics`, `account-audit`, `segmentation`…) each
answer **one** question and emit the [canonical object](../_framework/output-contract.md). The
orchestrator sits **above** them: given a deliverable request, it decides **which use cases to run,
in what order, and how to arrange their outputs** into the shape the requested **format** needs.

> One sentence: a **`/goal`** — the user states an intent (*"create an executive report for account
> X"*, *"is my account leaking money?"*) → the orchestrator decides whether a plan can **resolve that
> intent**, and emits the outline (ordered use-case calls + how each fills a section).

## Why it exists

Today the repo has 8+ use cases but **nothing that composes them**. Ask for "an executive report"
and there is no recipe for *which* of them to run or *how* to assemble the result. This folder is
that recipe — the planner, not a new analysis.

## The 5 output formats

The format is **not** cosmetic. It changes **what you select, how deep you go, and how you arrange
it** — same SUMAS content, different shape. The format is chosen from SUMAS **S** (audience + the
decision) and **U** (operational / performance / strategic).

> **Assembly moved to Reporting (2026-06-21).** This repo chooses the format and decides *which*
> sections appear and in *what order* (`analysis-tree.md`). **How** each format is laid out now lives
> in `porter-reporting` — see `porter-reporting/RULES.md`. The specs below were moved there.

| Format | What it is | SUMAS "U" it serves | Assembly spec (now in **Reporting**) |
|--------|------------|---------------------|----------|
| **Executive report** | Vertical narrative **document**: synthesis + text + supporting charts | Performance / strategic | `porter-reporting/document-types/_assembly-from-analysis/executive-report.md` |
| **Dashboard** | Exploratory grid of widgets, monitored over time | Performance (ongoing) | `…/_assembly-from-analysis/dashboard.md` |
| **Slides** | Executive presentation: one idea per slide, highly visual | Strategic (quarterly, leadership) | `…/_assembly-from-analysis/slides.md` |
| **Alerts** | Trigger-based notification: fires only when a threshold trips | Operational (daily) | `…/_assembly-from-analysis/alerts.md` |
| **Chat / ad-hoc** | The AI answers one specific question — **no fixed skeleton** | Any | `…/_assembly-from-analysis/chat-adhoc.md` |

> `chat / ad-hoc` is the special case: it has **no skeleton**. The orchestrator routes the question
> to the **single** use case that answers it and returns that — no composition.

## The entry point — the goal (`/goal`)

The orchestrator does **not** start from a format. It starts from the user's **goal / intent**, like
a `/goal` call: *"is my account leaking money?"*, *"give the client their May report"*, *"alert me
when CPA blows up"*. The goal **is the SUMAS S** (who cares + what decision). Everything below is
derived from it, and the planner's job is to decide whether the plan it builds **resolves that
intent** — if it doesn't, the plan is wrong no matter how clean the sections look (aspirin, not
vitamin).

## The planning algorithm

Given `{ goal, account, period, format? }`:

0. **Capture the goal (intent).** Restate what the user wants to resolve and the decision behind it
   (SUMAS S). This is the yardstick every later step is measured against.
1. **Resolve the format.** If the user named one ("executive report", "dashboard"…) use it. If not,
   **infer it from the goal** via SUMAS S+U: daily/threshold → alert · monthly/numbers → dashboard ·
   monthly/narrative → executive report · quarterly/leadership → slides · single question → chat.
2. **Load the analysis tree** ([`analysis-tree.md`](analysis-tree.md)) — the format-independent
   hierarchy of *what* gets analyzed, in order, reusing one metric set. The **format assembly spec**
   (now in Reporting: `porter-reporting/document-types/_assembly-from-analysis/<format>.md`) then says
   how that tree is projected (vertical doc · widget grid · slides · one node · single answer).
3. **Bind each node to use case(s).** The tree already names them (e.g. *Campaigns → bidding* →
   `account-audit/bid-strategy`). Which nodes exist for this account = `account-structure/structure-map`
   (naming → dimensions); the catalog of skills = the connector's README
   ([`../google-ads/README.md`](../google-ads/README.md)).
4. **Order by dependency.** Some use cases feed others (`funnel-metrics` is the metrics backbone
   several reuse). Run producers before consumers. Skip use cases the account can't support
   (e.g. no keywords on a PMax-only account).
5. **Intent-fit gate.** Before emitting, check the outline against the goal from step 0:
   - **Cut** any section that doesn't serve the goal (aspirin, not vitamin).
   - **Flag a gap** if the goal needs something **no** use case covers — don't pretend it's answered.
   - If the plan doesn't resolve the intent, go back to step 1 (wrong format) or step 3 (wrong cases).
   - **Then apply the relevance gate** ([`analysis-tree.md`](analysis-tree.md) Principle 3): of the
     goal-relevant sections, keep at full depth only those that are **material by money**; collapse the
     immaterial to a line, decompose only on surprise, order by dollar impact — but always keep the
     top-line verdict even when flat. (Intent-fit decides *relevant to the goal*; this decides *worth
     the reader's time*.)
6. **Emit the outline** (below). Then execution runs each use case → each emits its canonical
   object → the orchestrator **places** each object into its section per the skeleton.

## The outline it emits

The output is the **outline of the document** — its title, its intro, its section headings, and the
**elements** mapped into each section (scorecard / chart / findings / synthesis / actions), each
bound to the use case that produces it. It is the index of the report **before it is filled in**.

```jsonc
{
  // The intent this plan must resolve (SUMAS S). Every section is justified against it.
  "goal": "Give Acme Insurance their May Google Ads report: what we spent, what came back, what to do next.",
  "intentResolved": true,        // intent-fit gate verdict; false → the plan is wrong, re-plan

  "format": "executive-report",

  // 0. Header (document head + routing key — the data sources resolve which repo folders to call)
  "header": {
    "title":   "Acme Insurance — Google Ads, May 2026",
    "date":    { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "account": "Acme Insurance",
    "dataSources": ["google-ads"],          // → planner calls ../google-ads/… for use cases
    "currency": "CAD"
  },

  // Ordered sections. Each = heading (+ level) + the elements it holds + which use case fills them.
  "sections": [
    {
      "id": "intro", "heading": "Intro", "level": "h1", "role": "opener",
      "elements": [
        { "type": "synthesis",  "from": "the 1-line money verdict — REQUIRED, sits above the financials" },
        { "type": "financials", "from": "financial-overview" }   // revenue · profit · spend, driver tree
      ]
    },
    {
      "id": "funnel", "heading": "Funnel metrics", "level": "h2", "role": "body",
      "elements": [
        { "type": "narrative", "from": "funnel-metrics" },       // explains the financials above
        { "type": "chart",     "from": "funnel-metrics" }
      ]
    },
    // Body by ENTITY (account structure). Which entities exist = account-structure/structure-map.
    // Each entity's H3 = its use cases: performance (what moved) + setup/QA (audit), kept separate.
    {
      "id": "product", "heading": "Product / business line", "level": "h2", "role": "body",
      "from": "account-structure/structure-map"   // decodes naming → product lines; metrics cut by line
    },
    {
      "id": "campaigns", "heading": "Campaigns", "level": "h2", "role": "body",
      "children": [
        { "id": "camp-perf",     "heading": "Performance",        "level": "h3", "from": "segmentation/campaign" },
        { "id": "camp-bidding",  "heading": "Bidding & settings", "level": "h3", "from": ["account-audit/bid-strategy", "account-audit/campaign-settings", "account-audit/value-based-bidding"] },
        { "id": "camp-spend",    "heading": "Spend allocation",   "level": "h3", "from": "account-audit/spend-allocation" },
        { "id": "camp-hygiene",  "heading": "Ad-group hygiene",   "level": "h3", "from": "account-structure/structure-audit" }
      ]
    },
    {
      "id": "keywords", "heading": "Keywords & search terms", "level": "h2", "role": "body",
      "children": [
        { "id": "kw-search-terms", "heading": "Search terms",        "level": "h3", "from": "search-terms/*" },
        { "id": "kw-alignment",    "heading": "Keyword↔ad↔landing",  "level": "h3", "from": ["keyword-ad-landing/alignment", "keyword-ad-landing/metrics"] },
        { "id": "kw-quality",      "heading": "Quality & negatives", "level": "h3", "from": ["keyword-ad-landing/metrics", "search-terms/relevance", "search-terms/term-routing"] }
      ]
    },
    {
      "id": "ads", "heading": "Ads & assets", "level": "h2", "role": "body",
      "from": "account-audit/ad-assets"
    },
    {
      "id": "audiences", "heading": "Audiences", "level": "h2", "role": "body",
      "children": [
        { "id": "aud-segments", "heading": "Demographics / geo / device", "level": "h3", "from": "segmentation/audience/*" },
        { "id": "aud-qa",       "heading": "QA",                          "level": "h3", "from": "account-audit/audience-demographics" }
      ]
    },
    {
      "id": "conversions", "heading": "Conversions & tracking", "level": "h2", "role": "body",
      "from": "account-audit/conversion-tracking"
    },
    {
      "id": "time", "heading": "Time / trends", "level": "h2", "role": "body",
      "from": "segmentation/time"   // orthogonal — not an entity
    },
    {
      "id": "actions", "heading": "Actions / next steps", "level": "h2", "role": "closer",
      "elements": [
        { "type": "actions", "from": "(rollup.topFixes across sections)" }   // {where, what, why}, by $
      ]
    }
  ],

  // dependency-sorted: financials & funnel are the backbone; structure-map decides which entities
  // exist; each entity's use cases (segmentation + audit) reuse the funnel metrics.
  "runOrder": ["financial-overview", "funnel-metrics", "account-structure/structure-map",
               "segmentation/campaign", "account-audit/bid-strategy", "account-audit/spend-allocation",
               "search-terms/*",
               "segmentation/audience", "segmentation/time", "account-audit/conversion-tracking"]
}
```

The outline is the **handoff**: execution walks `runOrder`, runs each use case, and each emitted
element (scorecard, chart, finding, action) drops into its mapped slot. The format skeleton owns
*how* the elements are arranged (narrative prose vs widget grid vs one-per-slide vs single trigger);
the outline owns *which* elements exist and *where*; and [`_framework/writing.md`](../_framework/writing.md)
owns *how the text inside each element is written* (the voice — same for every format).

## Boundary note (resolved 2026-06-21)

**Assembly by format now lives in `porter-reporting`** — the format specs were moved to
`porter-reporting/document-types/_assembly-from-analysis/`. This repo (`porter-analysis`) owns
only *what* gets analyzed and in *what order*: the goal, the format choice, and the
format-independent [`analysis-tree.md`](analysis-tree.md). It does **not** lay reports out. The use
cases emit the canonical object unchanged; Reporting consumes it and assembles. See
`porter-reporting/RULES.md`.
