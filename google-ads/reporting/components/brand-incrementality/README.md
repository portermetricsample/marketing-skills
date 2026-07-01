# google-ads/brand-incrementality

**Branded vs non-branded search** — the incrementality page. Receives raw **campaign** rows,
classifies each campaign brand vs non-brand by naming marker, and renders the **All searches /
Excluding-branded** toggle: a conversion-split donut + three scorecards (Conversions · Spend ·
CPA-or-ROAS, each vs the previous period). The Excluding-branded view is the incremental demand-gen
number to judge budget and scaling on.

> Analysis twin (same rubric, in Python): `porter-analysis/google-ads/brand-incrementality`.
> This component re-implements the **campaign-level** split in JS so a live report renders it from
> raw rows injected at view time — keep the two in sync.

## Use case
"What does the account look like with and without brand?" Branded searches convert cheaply and would
mostly arrive anyway; blending them in flatters the account. The toggle isolates the honest non-brand
(incremental) numbers.

## Input
Raw **campaign** rows (current + optional previous for Δ). Field map (`opts.fields` to override):

| key | default field |
|---|---|
| `campaign` | `google_ads_campaign_name` |
| `cost` | `google_ads_cost_micros` |
| `conversions` | `google_ads_conversions` |
| `convValue` | `google_ads_conversions_value` (present ⇒ ecommerce → ROAS; else lead-gen → CPA) |
| `clicks` | `google_ads_clicks` |

**Settings:** `brandCampaignMarkers` (naming markers that identify the brand campaign — default
`brand`/`(br)`/…; **markers, not the brand word** — accounts prefix every campaign with the company
name), `brandCampaignNames` (explicit override), `brandName` (for the copy).

## Output / behaviour
- `mount(target, opts)` renders the header + intro + toggle + host; the toggle flips the scorecards +
  caption between **All** and **Excluding-branded** (the donut — the conversion split — is constant).
- `build(opts)` (with `opts.view`) returns the donut + cards + caption HTML for one view.
- Brand classification, bucket aggregation, CPA/ROAS, deltas vs previous, and the donut proportion are
  all derived in JS.

## Styling is Design's — styling hooks
Ships **no CSS**; emits `.bi-*` hooks for porter-design. Colours from tokens — never literal hex.

| Hook | What it is | Design keys it to |
|---|---|---|
| `.bi-component` / `.bi-head` / `.bi-host` | wrapper · header · the swappable panel | layout |
| `.bi-eyebrow` | "Incrementality" kicker | small uppercase accent |
| `.bi-title` | the H2 | display heading |
| `.bi-toggle` · `.bi-tog` + `--on` | the All / Excluding-branded pill toggle; `--on` = active | pill group; active filled |
| `.bi-intro` · `.bi-ink` | the lead paragraph; `.bi-ink` = the "incremental" highlight | body; accent underline |
| `.bi-donut` (carries **`--bi-split`** = non-brand conv %) | the conversion-split ring | `background:conic-gradient(var(--bi-nonbrand) 0 var(--bi-split), var(--bi-brand) var(--bi-split) 100%)` |
| `.bi-donut-hole` · `.bi-donut-k` · `.bi-donut-v` | the centre cut-out · label · total conversions | card surface; muted; big number |
| `.bi-legend` + `--nonbrand` / `--brand` · `.bi-dot` | the legend rows + swatch | two accents (`--bi-nonbrand` / `--bi-brand`) |
| `.bi-cards-eyebrow` | "All searches · vs previous period" | small uppercase accent |
| `.bi-card` + `--hi` · `.bi-card-k` · `.bi-card-v` | a scorecard; `--hi` = the highlighted (CPA/ROAS) card | soft card; `--hi` filled accent |
| `.bi-delta` + `--good` / `--bad` / `--flat` | the Δ chip (conversions=pos, spend=neutral, CPA=down-good) | `--good` / `--bad` / muted |
| `.bi-caption` | the per-view explainer line | body, muted |
| `.bi-empty` | empty state | muted message |
| tokens `--bi-nonbrand` / `--bi-brand` | the donut + legend ramp | a 2-step brand-vs-nonbrand ramp |

## Files
`brand-incrementality.js` (generator) · `example.data.js` (fictional Northwind, 2 periods) ·
`demo.html` (standalone; demo-only styles) · this README.

## Honest caveats
- **Campaign-level split only** (matches the slide). Brand *leakage* into non-brand campaigns isn't
  reconciled here — that's the analysis skill's job (search-term reconciliation). The donut/CPA reflect
  campaign grouping.
- **"Excluding branded" is the demand-gen baseline / a strong incrementality proxy** — true
  incrementality needs a brand-holdout / geo test. The copy stays punchy; the honest framing lives in
  the analysis skill.
- Brand detection needs the **markers** set correctly; with none matching, everything reads non-brand.
