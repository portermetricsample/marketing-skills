# google-ads/creative-ad-preview

**Creative Ad Preview** — render one Responsive Search Ad the way it appears in Google search (the
recognizable **ad frame**), then its **full pool** of headlines & descriptions annotated for
analysis. The layout looks like a Google ad so a user instantly maps what they're looking at.

```
[ Sponsored · domain ]                     ← the ad frame (one pin-aware combination)
 Headline | Headline | Headline
 Description…   · sitelinks · callouts
─────────────────────────────────────
 Headlines · 15   [chips: pin · text · chars · impr]   ← the full annotated pool
 Descriptions · 4 [chips…]
```

Consumes the **`creative_graph`** produced by [`porter-analysis` →
`google-ads/creative/inventory`](https://github.com/portermetricsample/porter-analysis) — one `ad`
node from `creative_graph.tree`, plus the graph's `extensions`. It does **not** fetch and does
**not** judge performance (that's a separate, future skill) — it visualizes the inventory.

## What it receives → emits

A **generator**: receives one ad node, returns an HTML string. No CSS, no data fetching.

```js
const C = require("./creative-ad-preview");   // browser: window.PorterReporting.creativeAdPreview

const html = C.build(ad, { extensions, business });   // one card
C.mount("#cap-host", { ad, extensions, business });    // render into a host
C.buildGallery({ graph, business });                   // one card per tree ad (filters = dashboard layer)
```

- **Input** = one `creative_graph.tree[]` ad node: `{ ad_id, ad_type, campaign, ad_group, segment,
  ad_strength, final_url, final_url_suffix, headlines[], descriptions[] }`, where each asset is
  `{ text, pin, char_len?, limit?, perf_label, approval, dki, served, impressions, clicks, conv, cost }`.
  Plus the graph's `extensions` ({sitelinks[], callouts[], snippets[{header,values}]}). `business`
  is optional (defaults to the final-URL domain / first campaign token).
- The component **computes** the displayed combination (pin-aware) and each chip's character state;
  it does not re-pull or re-derive metrics.
- **Output** = one `<div class="cap-component">` ready to drop into any page scaffold (or a gallery).

## Required render — a faithful card shows ALL of this (definition of done)

This is the contract for any render (incl. a Claude Design card or any AI redrawing it). Dropping a
piece is a **bug, not a styling choice**:

- **The ad frame** — business name · `Sponsored` + final-URL domain · the **assembled headline**
  (up to 3, **pin-aware**, joined by `|`) · at least one **description** · the **sitelinks** row ·
  the **callouts** line. It must read as a Google search ad.
- **Ad-level meta** — `campaign › ad group` · **ad-strength** badge · **segment** badge
  (brand / competitor-conquest / generic).
- **The full pool** — **every** headline and **every** description as a chip, each with: **pin**
  marker (if pinned), **character usage** `n/limit` (under-use flagged), **DKI** marker, **served**
  state (unserved muted), **impressions**, and a **disapproved** flag when `approval` ≠ APPROVED.
  Pinned first, then by impressions.
- **Extensions** — sitelinks / callouts / structured-snippet summary.
- **Spotlights** — a "high-impact fixes" panel listing **only needle-movers**: **broken/dead
  landing URL** (needs `urlHealth`) and **disapproved assets**, each with the impact + the fix, per
  the lever map. Ad-Strength hygiene (fill slots · char usage · pinning · callouts · DKI · Low ·
  variety) is **deliberately not here** — it doesn't reliably move performance (see
  `metric-levers.md` "Scope decision"). A clean ad shows the nothing-broken state. The pool chips
  below still show char count / pin / impressions as **neutral facts**, not recommendations.
- **Non-Search ad** (`ad_type` not RSA/ETA/TEXT) → a coverage note, never a blank or fake frame.

## Styling is Design's — styling hooks

Ships **no CSS** (repo split: structure + behavior here, appearance in **porter-design**). It emits
the hooks below; porter-design styles them to **look like a Google ad**, from tokens — never literal
hex (the Google-ad-format convention colors are the one labeled exception, see the design skin).

| Hook | What it is | Design keys it to |
|---|---|---|
| `.cap-component` / `.cap-card` | wrapper · the card surface | layout; `--surface-card` + `--card-border` |
| `.cap-admeta` · `.cap-where` | ad-level meta row · campaign›ad-group | small meta type, `--text-muted` |
| `.cap-strength` + `--excellent/--good/--average/--poor/--unknown` | ad-strength badge | status pill (poor=cherry → excellent=green) |
| `.cap-seg` + `--brand/--competitor_conquest/--generic/--unknown` | segment badge | category pill (`--cat-*`) |
| `.cap-ad` | **the Google-ad frame** | white inset surface, the ad look |
| `.cap-fav` · `.cap-biz` · `.cap-url` · `.cap-spon` | favicon dot · business · domain · "Sponsored" | the Google business row (`Sponsored` bold, domain muted) |
| `.cap-title` · `.cap-sep` | the assembled headline · the `|` separators | **the Google ad-title blue**, ~19px |
| `.cap-desc` | description line | body text |
| `.cap-sitelinks` · `.cap-slink` | sitelink row · one sitelink | blue links |
| `.cap-callouts` | callout line | muted, `·`-separated |
| `.cap-legend` · `.cap-legend-item` | the annotation key | small muted row |
| `.cap-pool` · `.cap-group` · `.cap-group-label` | the pool grid · a group · its label | two-column pool, label type |
| `.cap-chips` · `.cap-chip` (+ `--unserved` / `--disapproved`) | chip list · one asset chip | chip surface; unserved muted; disapproved cherry edge |
| `.cap-chip-text` · `.cap-meta` · `.cap-impr` | asset text · meta cluster · impressions | text + small muted meta |
| `.cap-char` + `--ok/--under/--over` | character usage `n/limit` | green ok · amber under-use · cherry over |
| `.cap-pin` | pin marker (carries the position number) | pin glyph (`::before`) + accent pill |
| `.cap-dki` | keyword-insertion marker | `{ }` glyph (`::before`) |
| `.cap-warn` | disapproved marker | warning glyph (`::before`), cherry |
| `.cap-ext` · `.cap-ext-chip` | extensions summary · one chip | neutral chips |
| `.cap-spotlights` · `.cap-spot` (+ `--broken_url` / `--disapproved` / `--clean`) | "high-impact fixes" panel · one row | sunken panel; clean = muted |
| `.cap-spot-issue` · `.cap-spot-metric` · `.cap-spot-fix` | the issue · the impact · the fix | title · eyebrow-color tag · muted fix |
| `.cap-coverage` · `.cap-empty` | non-Search note · empty state | muted message |

## Files

| File | What |
|---|---|
| [`creative-ad-preview.js`](creative-ad-preview.js) | The generator (`build` / `mount` / `buildGallery`). Vanilla JS, no deps; browser **and** Node. |
| [`creative-ad-preview.html`](creative-ad-preview.html) | Static scaffold (host) for wiring into a page. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance ad + extensions. Synthetic. |
| [`demo.html`](demo.html) | Labeled fictional demo. Its styles are a clearly-marked demo-only fallback; the real look is porter-design (`components/CreativeAdPreview/creative-ad-preview.css`). |

## Notes & honest caveats

- **Needle-movers only (scope decision).** Spotlights are limited to changes with real, attributable
  impact: **broken URL** (wasted spend) and **disapproved** (handicapped reach). Ad-Strength hygiene
  was deliberately discarded — Ad Strength is a weak performance predictor — see
  [`porter-analysis` → `google-ads/creative/metric-levers.md`](https://github.com/portermetricsample/porter-analysis)
  "Scope decision". The third needle-mover, **message/intent match**, is owned by the existing
  `keyword-ad-landing/alignment` skill, not duplicated here.
- **Never promises conversion/ROAS from copy.** The panel names the impact ("stop wasted spend",
  "reach / serving"); it does not claim a ROAS lift.
- **Inventory, not performance.** Impressions ride along as a volume cue + the character/pin/approval
  hygiene; this card does **not** rank assets or carry vs-previous deltas. Ranking is a separate
  analysis skill — keep it out of here (the user asked not to build a metrics skill).
- **An RSA is not one fixed ad.** The frame shows ONE pin-aware combination for recognition; the
  *pool* below is the real object of analysis. A future "interactive" mode can cycle combinations.
- **No real data.** Examples use only the fictional **Acme Insurance** account, per `RULES.md` #3.
