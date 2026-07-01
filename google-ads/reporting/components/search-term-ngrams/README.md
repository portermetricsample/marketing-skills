# google-ads/search-term-ngrams

**Search-term N-gram Mining** as a live report table — the Brainlabs search-query-mining method.
It receives raw search-term rows, breaks every term into 1/2/3-grams, aggregates the metrics of every
term containing each n-gram, and renders one sortable/filterable row per n-gram with a **bucket** chip
(waste / winning / brand / competitor / neutral) and, on waste rows, the **blast-radius flag** chips.

> Analysis twin (same rubric, in Python, for the AI):
> [`porter-analysis/google-ads/search-terms/n-grams`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/search-terms/n-grams).
> This component re-implements that rubric in JS so a **live Porter report renders it from raw rows
> injected at view time** — keep the two in sync (n-gram construction · ecommerce/lead-gen detection ·
> the waste/winning rules · the blast-radius guards).

## Use case
"Which words/phrases waste my budget, and which are themes to expand?" One negative on a recurring
n-gram (`free`, `cheapest`, `jobs`) kills many bad terms at once; a strong-converting n-gram is a
theme to build into keywords/ad groups. The long tail aggregates into signal that's invisible on any
single term.

## Input
Raw **search-term** rows (current + optional previous period for Δ). Default field map (`opts.fields`
to override for another connector):

| key | default field | notes |
|---|---|---|
| `term` | `google_ads_search_term` | the unit split into n-grams |
| `impressions` | `google_ads_impressions` | |
| `clicks` | `google_ads_clicks` | |
| `cost` | `google_ads_cost_micros` | already in currency units (Porter pre-converts) |
| `conversions` | `google_ads_conversions` | lead-gen waste = 0 here |
| `convValue` | `google_ads_conversions_value` | its presence auto-selects **ROAS** mode |

**Settings** (a live report binds these to report params):
`brandTerms[]`, `competitorTerms[]` (the brand/competitor separation + the `rides-brand` /
`competitor` flags), `targetCpa` / `roasBreakeven` (the waste/winning bar), and the recall knobs
`minTerms` (default 2), `minCostWaste`, `winConv` (2), `winRoas` (2), `stopWords[]`.

Pull the **whole** search-terms report (the long tail is the signal), not the top-N by cost.

## Output / behaviour
- One row per n-gram with `term_count` ≥ `minTerms`. Columns: n-gram · n · #terms · impr · clicks ·
  cost (heat-tinted) · conv · CTR · CPA-or-ROAS · Action. Numbers carry Δ vs the previous period.
- **Bucket** per n-gram: `brand` (defense, never waste) · `winning` (expand) · `waste` (negative) ·
  `competitor` · `neutral`. **ecommerce** (value present) judges on ROAS; **lead-gen** on CPA / 0-conv.
- **Blast-radius flags on waste** (`broad` / `rides-brand` / `competitor` / `has-conversions`): a
  flagged waste downgrades its Action to **Review** — surfaced as a warning, the reader adjudicates
  before negativing (mirrors the analysis skill's `needs_confirm` gate).
- Controls: filter by n (uni/bi/tri), bucket, brand class; sort by any metric; search.
- `build(opts)` returns the table HTML string; `mount(target, opts)` adds the control bar + re-render.

## Styling is Design's — styling hooks
This component ships **no CSS** (repo split: this repo holds **structure + behaviour**, the design
system holds **all appearance**). It emits the hooks below; **porter-design** styles them. Colours
must come from tokens — never literal hex.

| Hook | What it is | Design should key it to |
|---|---|---|
| `.sng-component` / `.sng-controls` / `.sng-filter` | wrapper · control bar · one labelled control | layout, spacing |
| `.sng-n` `.sng-bucket-f` `.sng-class` `.sng-sort` | the `<select>` filters | control styling |
| `.sng-search` | the search `<input>` | pill input |
| `.sng` | the table | table chrome |
| `.sng thead th` | column headers | sticky, uppercase label type |
| `.sng-term` | the n-gram column | left-aligned, wide; **no heat tint** |
| `.sng-gram` | the n-gram text | bold |
| `.sng-nbadge` + `--1` / `--2` / `--3` | the n badge (uni/bi/tri-gram) | small pill; optional per-n accent |
| `.sng-terms` | the #terms count | muted numeric |
| `.sng-cost` | the cost cell | **heat = inline `background:var(--cf-N)`** |
| `.sng-eff` | the CPA / ROAS cell | numeric |
| `.sng-bucket` + `--waste` / `--winning` / `--brand` / `--competitor` / `--neutral` | the bucket chip | five accents (bad / good / brand / competitor / muted) |
| `.sng-flag` + `--broad` / `--rides-brand` / `--competitor` / `--has-conversions` | a blast-radius warning chip | one "caution" accent |
| `.sng-action` + `--waste` / `--winning` / `--brand` / `--competitor` / `--neutral` / `--review` | the Action chip | match bucket; `--review` = caution |
| `.sng-delta` + `--good` / `--bad` / `--flat` | the Δ chip | `--good` / `--bad` / muted |
| `.sng-empty` | empty state | muted message |
| heat ramp `--cf-1 … --cf-5` | the red→green magnitude ramp (a porter-design token, shared with `charts/breakdown-matrix` + `campaign-performance-table`) | reuse it |

## Files
- `search-term-ngrams.js` — the generator (UMD, vanilla JS, no deps). `build` + `mount`.
- `search-term-ngrams.html` — static scaffold for wiring into a live report.
- `example.data.js` — fictional Acme Insurance rows, two periods (no real data, per RULES.md #3).
- `demo.html` — standalone labelled demo (open in a browser). Its styles are **demo-only**.

## Honest caveats
- The cost heat ramps low→high = red→green, so the biggest-cost n-grams tint green even though
  high spend isn't "good" — magnitude only; good/bad lives in the bucket + Δ chip (same trade-off as
  `campaign-performance-table`).
- "Winning" includes the head terms you already own (`life insurance`); use the filters/sort to find
  the *useful* movers. Single-instance tokens (`term_count` < `minTerms`) are intentionally hidden.
- `rides-brand` is share-based (≥30% of an n-gram's terms are brand) — a heuristic flag for the reader
  to confirm, not a verdict; needs `brandTerms` set to fire.
