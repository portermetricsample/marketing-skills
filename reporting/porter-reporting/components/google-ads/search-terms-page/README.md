# google-ads/search-terms-page

The Google Ads **"Search terms" page** as a live component — a grid of **keyword cards** (a card per
keyword, its search terms inside) + a **criterion filter bar** + a dollar **insights card**. Every
term carries 0+ of five tags and is tagged **only when something is off**; a relevant / standard term
is **untagged** (the absence of a tag is the "keep" signal).

> Analysis twins (the rubric + the dollars, in Python, for the AI):
> [`labeling`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/search-terms/labeling)
> (the per-term tags) + [`performance`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/search-terms/performance)
> (the money) + [`insights`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/search-terms/insights)
> (the dollar roll-up). [`adapter.js`](adapter.js) converts that analysis output into the page shape.

## Use case
"Across my search terms, what's off and what's it worth?" Each term shows its tags (Branded / Duplicate
/ Competitor / Irrelevant / Opportunity); the insights card turns the tags into a prioritized **dollar**
list of recommended actions, led by a total.

## Input (the analysis contract)
```jsonc
{
  "keywords": [
    { "keyword": "life insurance", "matchType": "Broad",
      "totals": { "spend": 820, "conversions": 23, "cpa": 35.65 },
      "terms": [
        { "term": "life insurance online", "on": true, "spend": 420, "conversions": 14, "cpa": 30, "tags": [] },
        { "term": "acme life insurance", "on": true, "spend": 120, "conversions": 8, "cpa": 15,
          "tags": [ { "label": "Branded", "tone": "purple" } ] }
      ] }
  ],
  "insights": { "totalPotential": 586, "measuredPotential": 280, "rows": [
    { "criterion": "Irrelevant", "tone": "pink", "basis": "measured",
      "action": "Add 2 terms as negatives", "rationale": "…names the real terms + $…", "dollars": 150, "sub": "recoverable" }
  ] }
}
```
- `status` → the on/off dot (`on:false` = paused/removed). CPA is `spend/conversions` when absent.
- `tags: []` (empty) is the explicit "relevant / keep" state → an empty Tags cell.
- `basis: "estimated"` rows get an **est.** marker; `measuredPotential` is the solid number to feature.

Use [`adapter.js`](adapter.js) (`adapt(rawRows, labelingJSON, insightsJSON)`) to build this from the
porter-analysis output: it pivots the term-centric analysis into keyword-centric cards and derives the
five tags. **Irrelevant is per (term × keyword)** — a `leak` verdict for *that* keyword only (never
`misplaced`/`loose`).

## Output / behaviour
- `build(data, opts)` → the page HTML string. `mount(target, data, opts)` adds the filter + ⋯ behaviour.
- **Filter bar:** All / Branded / Duplicate / Competitor / Relevance / Opportunity. Single-select,
  active pill = `--porter-purple`. Filtering hides non-matching term rows AND keyword cards with zero
  matches, hides the table footers while active, and **never** hides the insights card. (The
  **Relevance** pill matches the `Irrelevant` tag — its filter token is `relevance`.)
- **Tags cell:** chips on one nowrap clipped row; a `⋯` button (on 2+ tags) toggles the cell open to
  wrap and show all tags — **height only, no width growth**. Empty tags → empty cell.
- **Equal-height cards** via the split-table technique; rows beyond ~5 scroll, fewer pad to height.

## Styling is Design's — styling hooks
Ships **zero CSS** (repo split: this repo holds **structure + behaviour**, porter-design holds **all
appearance**). It emits the hooks below; **porter-design** styles them with tokens — never literal hex.

| Hook | What it is | Design keys it to |
|---|---|---|
| `.stp-component` | page wrapper | — |
| `.stp-filters` / `.stp-pill` / `.stp-pill--active` | filter bar + pills | pill chrome; active = `--porter-purple` bg, white text |
| `.stp-grid` | the cards grid | **`repeat(auto-fit, minmax(520px, 1fr))`, `gap:14px`, `align-items:start`** |
| `.stp-card` | one keyword card | `--surface-card`, radius 20px, `overflow:hidden`, `--card-border` |
| `.stp-table` + `.stp-head` / `.stp-body` / `.stp-foot` | the split table | **`thead,tfoot,tbody tr {display:table; table-layout:fixed}`; `tbody {display:block; height:235px; overflow-y:auto; scrollbar-gutter:stable}`** |
| `.stp-c-term` / `-spend` / `-conv` / `-cpa` / `-tags` | the 5 columns | **widths 31% / 14% / 12% / 15% / 28%**; term column `text-align:left; white-space:normal` |
| `.stp-head` | merged header row | `--surface-sunken` bg, uppercase label type |
| `.stp-kw` | keyword name in the header | `--font-bricolage` 700, 15px, `--text-title` |
| `.stp-mt` + `--exact` / `--phrase` / `--broad` | match-type chip | **Exact = aqua, Phrase = purple, Broad = yellow** |
| `.stp-dot` + `--on` / `--off` | status dot | on = `--good`; off = `--text-muted` @ 45% opacity |
| `.stp-term` | the term text | `--text-title` |
| `.stp-foot` | the Total row | `--surface-sunken`, bold; **hidden while a filter is active** (`[data-filtering="1"]`) |
| `.stp-tags` / `.stp-tags-list` / `.stp-tags--open` | tags cell · clipped chip row · expanded | list `flex-wrap:nowrap; overflow:hidden`; `--open` → `flex-wrap:wrap` |
| `.stp-tag` + `--purple` / `--pink` / `--aqua` / `--yellow` / `--green` | a tag chip | the `pds-badge` tones; **Opportunity green = `#e6f3cd / #5e7c00`** |
| `.stp-more` | the `⋯` expand button | muted, `flex:0 0 auto` (never clips) |
| `.stp-insights` | the insights card | full width, `--surface-card`, radius 20px |
| `.stp-eyebrow` / `.stp-insights-title` / `.stp-insights-note` | card header | eyebrow `--porter-purple`; title `--font-bricolage` 800 |
| `.stp-total-num` | the big potential number | **`--porter-purple` in light; `--lime-400` in dark (use `!important`)** |
| `.stp-split` | "$X measured · $Y est." line | muted |
| `.stp-irow` | one insight row | chip · action+rationale · dollars+sub |
| `.stp-chip` + `--{tone}` | criterion chip (104px) | the criterion's tone (incl. `--amber` for **Wasteful**) |
| `.stp-iaction` / `.stp-irat` | action (bold) + rationale (muted) | `--text-title` / `--text-muted` |
| `.stp-idollars` / `.stp-isub` / `.stp-est` | dollars (Bricolage 800, 17px) · sub-label (uppercase) · **est.** marker | dollars `--text-title`; est. = a muted outlined marker |
| `.stp-empty` | empty state | muted message |

## Theming / contrast checklist
- **Duplicate = yellow** (never a dark chip) so it passes on the dark `blue` theme.
- The big potential number needs a dark-theme override to a light accent (**lime**).
- The **Wasteful** insight chip (`--amber`) is the one criterion not in the 5 filter tags — it only
  appears in the insights card (a relevant term losing money → review/fix, never the `Irrelevant` tag).

## Files
- `search-terms-page.js` — the generator (UMD, vanilla JS, no deps). `build` + `mount`.
- `adapter.js` — analysis output → page shape (the term→keyword pivot + the 5-tag derivation).
- `example.data.js` — fictional **Acme Insurance** sample in the page shape (no real data, per RULES.md #3).
- `demo.html` — standalone labelled demo (open in a browser; light/dark toggle). Styles are **demo-only**.

## Honest caveats
- **Three of the six insight lanes are estimates** (Duplicate / Branded / Opportunity) — they carry an
  `est.` marker and a stated assumption. Feature `measuredPotential`, not the blended total, as the
  number to act on today. The Duplicate overlap $ is a proxy (per-keyword spend isn't exposed by Porter).
- The page renders what the analysis tagged — it does not re-judge. If a tag looks wrong, fix the owner
  skill (`labeling` / `relevance` / `performance`), not this component.
