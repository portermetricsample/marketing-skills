# google-ads/keyword-ad-landing-alignment

**Alignment journey** — one card per ad group showing the paid journey end to end and whether it
tells **one coherent story**, with a three-state verdict and the one fix to make.

```
Intent (keyword → search terms)   →   Message (ad)   →   Destination (page)
                          ↳ verdict: Aligned · Needs review · Broken
```

> **Behaviour spec (source of truth):** [`_foundation/component-contract.md`](../../../_foundation/component-contract.md)
> → *Report section* (eyebrow → finding → visualization) + *Data-component states*. This folder
> **implements** that rule; it does not restate it.

This is the data-driven, reusable version of the hand-built **"Journey"** page (the one that was
hardcoded to a single golf-club account). It runs on **any** Google Ads account because it renders
the output of two `porter-analysis` skills instead of a baked-in table.

## What it consumes — the two analysis skills, joined here

The component **never fetches and never judges** — the intelligence lives upstream. It joins two
[`porter-analysis`](https://github.com/portermetricsample/porter-analysis) skill outputs by the
shared `(campaign, ad_group)` key and renders them:

| Input | Skill | Carries |
|---|---|---|
| `alignment` *(required)* | [`keyword-ad-landing-alignment`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/keyword-ad-landing/alignment) | the spine — `findings[]` (verdict, L1–L4 links, intent, message, destination, recommendation) + `synthesis` + `rollup` |
| `metrics` *(optional)* | [`keyword-ad-landing-metrics`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/keyword-ad-landing/metrics) | the grades — `journeys[]` (Quality Score, Ad relevance, Expected CTR, Landing-page experience, CTR, CVR, Impression Share) |

With `metrics` omitted the cards still render (verdict, links, intent, message, destination, fix) —
just without the grade strip and the conversions/CVR/CPA chips.

## What it receives → emits

A **generator**: it receives the two JSON objects and returns an HTML string. The headline public
name is **`PorterReporting.addAlignment`** (a thin alias of `mount` — "add an alignment section to
this page"); the noun module `PorterReporting.alignmentJourney` exposes `build` / `mount` to match
its sibling components.

```js
const A = require("./keyword-ad-landing-alignment"); // browser: window.PorterReporting.alignmentJourney

// Pure HTML (summary banner + journey cards):
const html = A.build({
  alignment,        // keyword-ad-landing-alignment output (required)
  metrics,          // keyword-ad-landing-metrics output (optional — adds grades + CVR/CPA)
  verdict,          // optional filter: "" | "broken" | "needs_review" | "aligned"
  sort,             // "attention" (default — worst first) | "spend" | "alpha"
  landingBase,      // optional base for scheme-less final URLs (defaults to metrics.meta.site)
  emptyMessage      // optional empty-state text
});

// Self-contained (browser): renders the cards AND its own verdict-filter / sort bar.
PorterReporting.addAlignment("#host", { alignment, metrics });
```

## What each card shows (definition of done)

A faithful render shows, per ad group (a **flat list of cards**, biggest-spend first), **all** of:

- **Header** (journey-level outcome) — ad group · campaign · the verdict badge (**Aligned / Needs
  review / Broken**) · and, when `metrics` is joined, **total ad spend · conversions · CPA**
  (cost / conv.), with a *thin volume* note when the ratios sit on too few clicks.
- **Google relevance strip** — representative **Quality Score** (impression-weighted) + **Ad
  relevance · Expected CTR · Landing-page experience** grades.
- **Relevance links L1–L4** — Search→keyword · Keyword→ad · Ad→landing · Intent→landing, each graded
  **Pass / Partial / Fail / —** with its one-line reason.
- **Three columns, each with its stage metric** — **1 Intent** (keyword → its top search terms, each
  keyword carrying its QS/grade badge) · **2 Message** (the ad's lead headlines + description, footed
  by the ad's **CTR**) · **3 Destination** (the real final URL, the page's H1, a plain summary, the
  mismatch word, footed by the landing's **CVR**).
- **Fix** — the recommendation (`what` + `why`), tagged with the break type when broken.

Above the cards: a **summary banner** — N journeys · **total ad spend** · aligned / needs-review /
broken counts · and the dollars flowing through journeys that need attention (from `alignment.rollup`).
Sort options: ad spend (default) · needs-attention · A–Z.

> **Metrics are mapped to the stage they measure** (not dumped in the header): CTR on the ad, CVR on
> the landing, spend / conversions / CPA as the journey outcome. **CTR uses Google's native rate**
> (Porter's ad-grain impressions undercounts vs native ctr — verified live), and CVR = conversions /
> clicks.
>
> **Impression Share is intentionally not shown here.** It is campaign-grain, so it lives in its own
> `impression-share-competitiveness` component rather than bolted onto these per-ad-group cards.

## The Quality-Score gate (why this fixes the old page)

The hand-built page showed **`QS 0`** because it hand-rolled the Quality-Score math (it divided the
raw value by 100, with no sanity check). This component does **not** compute QS — it trusts the
metrics skill, which already nulls the value when Porter returned a summed artifact (`> 10`) or when
a keyword has no historical grade. The component then shows a Quality Score **only when it is a real
1–10 number**, and otherwise shows nothing (or the categorical grades, which are safe at any grain).
**`QS 0` can never render.** (Verified: the demo's `Dental_Broad` group has `quality_score: null`
and still shows no zero.)

## Behaviour (implemented here)

- **Verdict is a STATE, never a number** — `aligned` / `needs_review` / `broken`, faithful to the
  analysis skill's deliberate choice (no invented "9/10").
- **Sort = ad spend by default** — biggest spend first, so the highest-stakes journeys lead.
  `attention` (broken → needs-review → aligned, then spend) and `alpha` are also offered.
- **Verdict filter** — show all, or just one verdict (client-side in `mount`).
- **CTR / CVR / cost-per-conv. are derived** from the metrics counts (`clicks / impressions`,
  `conversions / clicks`, `spend / conversions`) — never read from a pre-averaged field. CTR is
  recomputed across the journey's ads; CVR is omitted on zero clicks.
- **Scheme-less landing URLs** are normalised to an absolute `href`; an un-scraped page is flagged
  (the verdict is already `needs_review` upstream in that case).
- **Empty input →** the *No journeys to analyse for this range* state; `skeleton(n)` gives the loading
  state.

## Styling is Design's — styling hooks

This component ships **no CSS**. It emits the class hooks below; **porter-design** styles them.
Colours must come from tokens — never literal hex. (The old page inlined dozens of hex colours;
this fixes that.)

| Hook | What it is | Design should key it to |
|---|---|---|
| `.alj-component` / `.alj-controls` / `.alj-filter` | wrapper · control bar · one labelled control | layout, spacing |
| `.alj-verdict-filter` `.alj-sort` | the `<select>` controls | control styling |
| `.alj-summary` | the roll-up banner | sunken card |
| `.alj-sum-headline` | the synthesis sentence | lead text |
| `.alj-sum-stat` + `--spend` / `--aligned` / `--review` / `--broken` | the count + total-spend chips | `--spend` strong · `--good` / `--callout-warn-*` / `--bad` |
| `.alj-sum-spend` | "$X needs attention" line | muted |
| `.alj-card` + `--aligned` / `--review` / `--broken` | one journey card; accent edge by verdict | card chrome + verdict accent (`--good` / warn / `--bad`) |
| `.alj-ag` / `.alj-cmp` | ad-group name (card title) · campaign | title · muted |
| `.alj-perf` + `.alj-perf-*` / `.alj-thin` | header chips: spend · conv · CPA · thin-volume note | muted; thin → warn |
| `.alj-verdict` + `--aligned` / `--review` / `--broken` | the verdict badge | three meaning tones |
| `.alj-paircount` + `--whole` / `--multi` | the "N ads · M landing pages" badge (`--whole` = 1·1, the whole story; `--multi` = several → representative shown) | calm confirm tone (`--good`) vs attention tone (`--callout-warn-*`) |
| `.alj-grades` (+ `--none`) / `.alj-grades-label` / `.alj-grade-line` | the Google-relevance strip | sunken strip; muted |
| `.alj-qs` | the Quality-Score value | strong |
| `.alj-grade` + `--above` / `--avg` / `--below` | a categorical grade | `--good` / `--callout-warn-*` / `--bad` |
| `.alj-links` / `.alj-link` + `--pass` / `--partial` / `--fail` / `--unknown` | the L1–L4 grid + one link | grade tones |
| `.alj-link-name` / `.alj-link-grade` / `.alj-link-reason` | link label · grade · reason | eyebrow · strong · muted |
| `.alj-grid` / `.alj-col` / `.alj-col-label` | the 3-column layout · one column · its eyebrow | columns, borders, eyebrow |
| `.alj-grid--shared` / `.alj-grid--pairing` | (multi-ad groups) the shared Intent row (full width) · a pairing's Message+Destination row (2-col) | grid spans |
| `.alj-pairings` / `.alj-pairing` + `--aligned` / `--review` / `--broken` | (multi-ad groups) the stack of ad→page sub-cards · one sub-card; accent edge by its own verdict | sub-card chrome + verdict accent |
| `.alj-pairing-head` / `.alj-pairing-n` | a sub-card's header (its verdict) · its "Ad N of M" label | row; muted eyebrow |
| `.alj-col-metric` | per-stage metric footer (CTR on the Message column, CVR on the Destination column) | strong; top divider |
| `.alj-kw` / `.alj-kw-head` / `.alj-mt` / `.alj-kw-badge` | keyword · its header · match type · QS/grade badge | body · muted · small |
| `.alj-term` (+ `--off`) | a search term under a keyword (`--off` = off-intent) | muted; off = de-emphasised |
| `.alj-ad-headline` / `.alj-ad-sep` / `.alj-ad-desc` | the ad headlines · separator · description | "Google ad" blue · muted |
| `.alj-dest-url` / `.alj-h1` / `.alj-dest-summary` | landing link · its H1 · the page summary | link · strong · body |
| `.alj-mismatch` / `.alj-notscraped` | the break word · un-scraped flag | `--bad` |
| `.alj-rec` + `--broken` / `--review` / `--aligned` / `.alj-rec-label` / `.alj-rec-why` / `.alj-break` | the fix line · its label · the "why" · the break-type tag | verdict tone · strong · muted · `--bad` tag |
| `.alj-empty` / `.alj-empty-col` / `.alj-skeleton` | empty state · empty column · loading skeleton | muted · skeleton |

## Files

| File | What |
|---|---|
| [`keyword-ad-landing-alignment.js`](keyword-ad-landing-alignment.js) | The generator (`build`) + browser `mount` (verdict filter / sort) + `skeleton`. Vanilla JS, no deps; browser **and** Node. |
| [`keyword-ad-landing-alignment.html`](keyword-ad-landing-alignment.html) | Static scaffold (control bar + host) for wiring into a live report. Class hooks only — no `<style>`, no logic. |
| [`example.data.js`](example.data.js) | **Fictional** Acme Insurance — both skill outputs, joined. Five ad groups across the three verdicts; exercises the QS gate. Synthetic. |
| [`demo.html`](demo.html) | Labeled fictional demo. Open in a browser. (Its styles are a clearly-marked demo-only fallback, not the component's.) |

## Wiring into a live Porter report

The "Journey" page pairs the two analysis charts and renders both into one host. The alignment chart
reads `search_term`, `keyword_info_text`, `keyword_info_match_type`, the RSA headlines/descriptions
and `ad_group_ad_ad_final_urls`; the metrics chart reads `historical_quality_score` + the three
`historical_*_quality_score` grades, `impressions`, `clicks`, `conversions`, `ctr` and the
`search_*_impression_share` splits. In the report page:

```js
// the page provides the scaffold (keyword-ad-landing-alignment.html); then,
// once both source charts have resolved, render the joined section:
Porter.renderChart("jr_alignment", ".alj-host", function (data, host, ctx) {
  host.innerHTML = PorterReporting.alignmentJourney.build({
    alignment: data.alignment,   // the keyword-ad-landing-alignment skill output
    metrics:   data.metrics      // the keyword-ad-landing-metrics skill output (optional)
  });
});
```

> The exact wiring of "two analysis charts → one component" depends on how the report feeds the
> skill outputs to the page. The contract here is fixed: pass the alignment output (required) and
> the metrics output (optional) and the component renders the joined journey cards.

## Notes & honest caveats

- **No deltas vs previous period (yet).** The component-contract's *Table* rule wants every numeric
  to carry its Δ vs the previous period. The two analysis skills currently emit a **single-period
  snapshot** — no previous figures — so the cards show no deltas rather than invent them. When the
  skills add a previous-period block, add the chips here (CVR/CPA are the natural candidates). This
  is a deliberate deviation, recorded so it isn't mistaken for an oversight.
- **No heat tint on the cards.** Heat (`--cf-*`) is the *Table / Breakdown-matrix* device for
  magnitude-vs-peers. These cards carry good/bad through the **verdict and grade tones** instead (a
  verdict is inherently good/bad, like the Contribution view) — heat would double-encode it.
- **Impression Share is intentionally not shown here.** IS is campaign-grain (the same for every ad
  group in a campaign), so it doesn't belong on a per-ad-group card. It lives in its own
  `impression-share-competitiveness` component. Quality Score, which *is* per-keyword, stays in the
  Intent column. (Cards are a flat per-ad-group list — there is no campaign grouping.)
- **Competitive Auction Insights is NOT available — and not faked here.** Verified live on the Porter
  google-ads connector (2026-06-23): the catalog exposes the six `auction_insight_*` *metrics* but **no
  competitor/domain dimension** to attribute them to a named rival, and those metric queries fail with
  `reauth_required` on a connected account while ordinary queries on the same token succeed. So true
  Auction Insights (competitor domains with overlap / outranking / position-above / top-of-page) cannot
  be built. The honest IS-based alternative is the own-account **impression-share competitiveness**
  view — see the sibling component `google-ads/impression-share-competitiveness` and the gap write-up in
  `~/porter-mcp-feedback/`. This alignment component does not render IS at all.
- **Google Ads only.** Search terms, keyword↔term pairs and Quality Score exist only on Search
  campaigns — so this lives under `google-ads/`, not the connector-agnostic `charts/`. PMax / Demand
  Gen spend is reported as uncovered by the analysis skill, not charted here.
- **No real data:** the example uses only the fictional **Acme Insurance** account
  (`1234567890-1234567890`), per `RULES.md` #3.
