# Component contract (UX defaults)

The behavior rules every Porter Reporting component follows by default. These are not
suggestions — a generator that produces a component should produce it *this way* unless the
intent explicitly overrides it. Consistency across deliverables comes from here.

Each rule splits responsibility:
- **Reporting owns** — behavior, state, data-binding, defaults.
- **Design owns** — appearance (always pulled from tokens; never redefined here).

> The dividing line is **behavior + state + data**, not "is it a React component."
> See [`design-system.md`](design-system.md) for the Design ↔ Reporting boundary.

---

## Table

**Reporting owns:**
- Show **10 rows by default**; the rest are reachable by **vertical scroll** inside a
  fixed-height container (not pagination).
- **Every numeric metric carries its Δ vs previous period by default** — and the comparison goes
  **inline in the same cell** (value + delta), **not as a separate delta column**. This keeps
  "always compare" true for all metrics without doubling the column count. **No exceptions:** a
  plain count column (clicks, impressions) gets its delta AND conditional formatting too, exactly
  like a rate column — never leave one metric column bare. The delta is **colored by meaning**
  (cost-efficiency inverted: a falling CPA/CPC/CPM is good/green; ROAS up is good; raw spend up is
  neutral) — this is where good/bad lives, not in the heat tint.
- **Columns keep a readable min-width; they never squash or wrap to fit.** When the columns'
  total width exceeds the container, the table **scrolls horizontally** with the **first column
  (the dimension/label) pinned**. The trigger is "columns reached their min-width", not a fixed
  pixel breakpoint.
- **Header stays sticky** while scrolling vertically.
- **Conditional formatting by default — faithful to the canonical example.** A translucent
  **red → yellow → green heat (~30% opacity)** encoding each value's **magnitude within its
  comparison set** (down a column = across rows/entities; scale per column, so ROAS compares to
  ROAS). The heat shows **"how big", NOT good/bad** — **good/bad is carried by the inline delta,
  never by the cell color.** The label/dimension column gets no tint. Heat replaces zebra striping
  (no two cell backgrounds) and coexists with the delta: delta = vs previous period, heat = vs peers.

**Canonical shape — the SUMAS table (faithful to the example):** the default entity table groups
its **columns by SUMAS stage** — `<entity> | Budget | Visibility | Engagement | Conversion` —
each stage column carrying a **headline metric + stacked sub-metrics**, each with its inline
meaning-colored delta, and the cell's heat keyed to the headline metric. (Budget = Cost ·
Visibility = Impressions + CPM · Engagement = Clicks + CTR + CPC · Conversion = Conversions +
Conv. value + Cost/conv + ROAS.) This is the **same SUMAS grouping** used by the funnel cards and
the Breakdown-matrix rows — the through-line of the whole system. A flat metric-per-column table is the
exception, for non-SUMAS detail (e.g. a raw search-terms list).

**Design owns:** row height, borders, fonts, padding, the delta chip styling, and the heat ramp
(red→yellow→green ~30% opacity / `--cf-*`; `--heat-*` for single-hue magnitude where preferred).

---

## Tooltip (chart hover)

**Reporting owns:**
- **Every chart that carries data** shows a **hover tooltip with that point/segment's values** —
  time series, pie/donut, bars, breakdowns, funnels, **and sparklines** (the mini-charts inside
  scorecards/cards are hoverable too; their small size is not an excuse to drop the tooltip).
- Tooltip follows the hovered point; shows the label/date + the metric value(s).

**Design owns:** the tooltip's look — reuse Design's `.pds-tooltip` (tokens `--tip-bg` /
`--tip-text`). Do **not** restyle it here.

---

## Chart highlight (bar / line)

**Reporting owns:**
- A chart highlights **exactly one value** by default — the **extreme** (the peak / max that the
  reader should notice). One mark only (hierarchy).
- The highlight is **colored by meaning**: a good extreme (e.g. top ROAS) uses the positive
  highlight; a bad extreme (e.g. highest CPA) uses a warn/bad tone. The rest of the bars/line
  stay in the muted series color.
- **Bar chart** → the one extreme bar is highlighted.
- **Line chart** → same logic: the one extreme point gets a dot + an inline value label; the rest
  of the line is plain.
- This is the *static* "one notable value" mark; it's independent of the hover **Tooltip** rule
  (which still covers every point).

**Design owns:** the highlight fill / tones (`--highlight-fill`, `--good` / `--bad` / `--cf-*`),
bar and point styling.

---

## Chart axes

**Reporting owns:**
- A full chart (time series, bar, line) shows **explicit X and Y axes**: labeled X ticks (dates /
  categories), a Y scale with a few labeled ticks, and light gridlines.
- The reader must be able to read approximate values **without hovering** — the tooltip is an
  enhancement, not the only way to read the chart.
- **Sparklines are the deliberate exception:** no axes (they show trend shape only) — but they
  still get a hover tooltip (see Tooltip).

**Design owns:** axis/tick/gridline styling (`--grid-line`, label type in Hanken).

---

## Breakdown matrix (metrics × any breakdown)

The "trended / segmented" monitoring view: **rows = metrics (optionally grouped), columns = the
values of ONE breakdown dimension**. The breakdown is **pluggable** — this is the general form of
what began as the "Time matrix":
- **time** → consecutive periods (bucketed by day/week/month/quarter) — the canonical case;
- **category** → any dimension: campaign · ad group · campaign type · product · device · landing page · …

A GRID, not a line chart. **Faithful to the canonical example** — the Acme Insurance report's "Time"
page (`ga_time`) is the *time* case; match it, then generalise the columns to any breakdown.

> **Implemented by:** [`components/charts/breakdown-matrix/`](../components/charts/breakdown-matrix/) — the repo's first chart component.

**Nothing here is hardcoded that a user changes:** the **metric rows** are caller-provided (the SUMAS
funnel below is only the DEFAULT), and the **column breakdown** is caller-provided (time is only the default).

**Reporting owns:**
- **Columns, left → right:** `KPI label` · **`Total`** · then the **breakdown values**. The leading
  Total is the comparison anchor (not a trailing "vs prev" column — the per-row heat IS the comparison).
  Ordering: **time → periods NEWEST → oldest**; **category → by the primary metric, biggest first**.
- **All values shown** — when the columns exceed the width the matrix **scrolls horizontally** (the KPI
  label column stays pinned). No top-N rollup by default. For a **high-cardinality** dimension (every
  campaign, every ad group) prefer the entity-row **Table** rule instead — this matrix is for time +
  small/medium breakdowns.
- **Rows = metrics**, caller-provided, optionally grouped (each group introduced by a header row). The
  **default** is the SUMAS funnel: **Budget** (Cost) · **Visibility** (Impressions, Search IS, CPM) ·
  **Engagement** (Clicks, CTR, Avg CPC) · **Conversion** (Conversions, Conv. value, ROAS, Cost / conv.).
  Rates are DERIVED from base counts (incl. the impression-weighted Search IS) — never pre-averaged.
- **Granularity control (time breakdown only)** — selector **day / week / month / quarter** (default
  **week**); changing it re-buckets the period columns. Labels: day `May 5`, week `May 5 - May 11`,
  month `May 2026`, quarter `Q2 2026`. A category breakdown has no granularity (the host picks the field).
- **Segment-by control (CORE — do NOT drop it; a time-only build is WRONG).** The matrix MUST be
  able to switch the breakdown DIMENSION live (time / campaign / objective / product / …) via a
  selector next to the granularity one (granularity shows only while the segment is time). The host
  decides whether to *surface* the control, but segment support is **not optional** — this component
  is the **Breakdown** matrix, not a time matrix; shipping only the day/week/month/quarter toggle is
  an incomplete build. Switching re-slices a SINGLE granular series (one row per finest grain × every
  dimension) in place — or a per-dimension data provider for large accounts — so it is not a fresh
  query per change when the data is already present. One dimension at a time (not a two-way pivot).
- **Conditional formatting per ROW (this is critical — do not skip it):** each metric cell is
  tinted against **that row's own min/max across the columns**, on a translucent
  **low → high = red → yellow → green ramp (~30% opacity)**. The color shows each column's magnitude
  for that metric, so strong/weak columns pop instantly. The `Total` column is not tinted.
- Empty/zero cell → `—`; empty input → `No data for this range`.
- **Number formatting per metric** (money, %, ratio `x`, integer); **KPI label column sticky**;
  horizontal scroll when columns exceed the width.

**Design owns:** cell tints (the red→yellow→green heat ramp at ~30% opacity / `--cf-*`),
grid lines, fonts.

> **Honest caveat on the heat ramp:** the example tints **every** row low→high (high = green),
> so a high *cost* metric (CPA, CPM, CPC) shows green even though a rising cost is usually bad. As
> a pure magnitude heatmap that's defensible (green = "big period"), but the red→green palette
> reads as good/bad. If that ever misleads, invert the cost rows so green always means "good". For
> now we keep it faithful to the example.

---

## Heatmap (cyclical: day-of-week × hour)

The recurring-pattern view — the other half of "time", next to the chronological Breakdown matrix (its time case):
**rows = day-of-week (Mon–Sun), columns = hour (0–23)**, each cell = one metric for that slot.
Surfaces the best/worst times. (Render behind a report's ad-schedule / cyclical page.)

**Reporting owns:**
- One **metric at a time** (selectable; default the metric under analysis — clicks, cost…).
- **Heat scale spans the WHOLE grid** (one min/max over all cells), NOT per-row — the job is to
  find the hot/cold *slot* across the full week. Same red → yellow → green ~30% ramp.
- **Tooltip per cell** (day · hour · value); **number formatting** per metric.
- Low-volume slots respect the analysis **volume floor** — render muted / "—", never a confident
  color on noise (a heatmap invites over-reading thin cells).

**Design owns:** cell tints, grid lines, axis labels, fonts.

---

## Contribution view (what explains the Δ)

The shared **movement-attribution** visual for the whole **segmentation family** (time / campaign /
audience / any dimension): shows **how much each segment contributed** to a metric's change vs the
previous period. The visual answer to "what explains the up/down".

**Reporting owns:**
- A **waterfall / contribution bars**: one bar per segment, length = that segment's contribution to
  the change (`ΔM_segment`), ordered by magnitude, **summing to the net Δ** (running total or a net
  bar at the end). State each bar's **share of the gross move** ("Generic = 60% of the drop").
- **Colored by MEANING, not magnitude heat** — a contribution that *helped* is good-toned, one that
  *hurt* is bad-toned (cost-efficiency inverted). This is the one segmentation visual that's
  good/bad rather than heat, because a *directional contribution* is inherently good/bad. (Heat =
  magnitude elsewhere; contribution = direction here. No contradiction — different question.)
- **Count metrics by default** (their contributions sum cleanly). For a **ratio**, don't waterfall
  the ratio — show the contributions of its numerator/denominator counts (Metric-relationships rule).
- **Top-N segments + an "others" rollup** when the list is long; **tooltip** per bar (segment ·
  contribution · share). One metric at a time.

**Design owns:** bar styling, the good/bad tones (`--good` / `--bad`), labels, fonts.

---

## Data-component states (loading / empty / error)

**Reporting owns:** every component that renders data ships **all three states by default**:
- **Loading** — a skeleton in the component's shape (not a blank box, not a spinner-only).
- **Empty** — an explicit "no data" message when the input is valid but has zero rows/points.
- **Error** — an explicit error state when the input fails, scoped to the component (one broken
  chart doesn't blank the whole page).

**Design owns:** the look of the skeleton / empty / error states (from tokens).

---

## Number formatting

**Inherited from Design** for now: follow `porter-design` `AGENTS.md` §10 — abbreviate in
KPI tiles (`$150K`, `1.2M`, `4.8x`), full numbers with separators in tables (`$150,000`),
one decimal on percentages/deltas (`▲14.2%`), `×` for ratios, never mix abbreviated + full for
the same metric in the same place.

> Note: formatting *knows about data*, so by our own rule it is really a **Reporting**
> concern. It lives in Design today only because of the templates overlap. **Migration target:**
> this rule moves into Reporting when the templates migrate. Until then, point at Design — don't
> duplicate it.

---

## Scorecard

**Reporting owns:**
- **Always compares vs the previous period by default.** A scorecard with no comparison is the
  exception, not the rule.
- The delta is colored by **meaning, not arrow direction** — a cost going *down* is good (green),
  ROAS going *down* is bad (cherry), raw spend up is neutral. (Use Design's `--good` / `--bad`,
  not `--delta-up/-down`, for cost/efficiency metrics.)

**Design owns:** the scorecard look + the delta chip styling (`.pds-scorecard`, `.pds-chip`,
`--good`/`--bad` tokens).

---

## SUMAS funnel-metrics group (default render for the `funnel-metrics` skill)

When the `funnel-metrics` skill (in `porter-analysis`) produces output, this is its default
visual. It maps the SUMAS frame so the funnel is read correctly.

**Reporting owns:**
- **Three cards, in order: Conversion → Engagement → Visibility** (outcome-first, left→right).
- Each card =
  - **headline volume metric** (Conversions / Clicks / Impressions) + an optional secondary
    headline (e.g. Conv. value), each with its **Δ vs previous period**;
  - a **sparkline** of the headline metric's trend;
  - a row of **sub-metrics ordered cost-then-rate** (efficiency first, effectiveness after) —
    e.g. Conversion: Spend, Cost/conv (efficiency) then ROAS (effectiveness). **No group labels**
    — the order carries the hierarchy.
- Everything compares **vs previous period** (inherits the Scorecard rule).

**Design owns:** card chrome, the per-level accent color, the sparkline (`porter-charts.js` /
`.pds-scorecard__spark`), fonts, deltas.

---

## Financial-overview render (default for the `financial-overview` skill)

**Reuses the same 3-card component** as the SUMAS funnel group above — chosen for visual
consistency across the two analysis skills (one card pattern to learn).

**Reporting owns:**
- **Three cards, in order: Revenue → Spend → Return** (left→right: money in → money out → result).
- Each card = headline metric + Δ vs previous period + sparkline + a row of two sub-metrics:
  - **Revenue** → headline Revenue (conv. value); sub: AOV, Conversions.
  - **Spend** → headline Spend; sub: CPA (cost/conv), CPM.
  - **Return** → headline ROAS; sub: Profit, Margin.
- Everything compares **vs previous period**; deltas colored by **meaning** (Scorecard rule).

**Design owns:** card chrome, per-card accent, sparkline, fonts, deltas.

> Trade-off on record: `financial-overview` answers "is it returning / better than before?",
> where one number (Return/ROAS) really leads — the 3-card symmetry presents Return as a third
> parallel group even though it's *derived* (Revenue ÷ Spend). Juan chose this anyway for
> consistency with `funnel-metrics`. If the derived-vs-parallel framing ever causes confusion,
> the alternative is a ROI-hero layout (bottom-line big, supporting metrics below).

---

## Report outline (the skeleton every report follows)

The canonical top-to-bottom structure. The components below (header, section, callout…) are its
pieces; this rule fixes the order, the heading hierarchy, and the narrative arc.

**Order, top to bottom:**
1. **Header / cover** — `H1` = report title. (See [Report header].)
2. **Executive summary (intro)** — the TL;DR: **one prose finding sentence + 2–4 key-takeaway
   bullets** (the headline numbers). It opens with the conclusion, not a wind-up.
3. **Body — sections**, each an `H2`, **one per analysis use case**, ordered
   **overview → detail → action** (e.g. funnel / financial → trends / search-terms / breakdowns).
   Each section follows the Report-section rule (eyebrow → H2 → lead finding → visualization).
   **`H3` subsections** are allowed when a use case has distinct parts (e.g. search-terms →
   relevance, routing).
4. **Next steps** — `H2`, the closing section: the **consolidated, prioritized actions** (the
   "what do I do now"). **No separate "conclusion" section** — the exec summary already opens with
   the conclusion; a middle conclusion just repeats it.
5. **Methodology footer** — source, currency, date range + comparison, data freshness, generated
   date.

**Heading hierarchy (strict):**
- **`H1` once** — the report title (in the header). Never two H1.
- **`H2`** — exec summary, each body section, and next steps.
- **`H3`** — a subsection inside a section.
- **Never skip a level** (no H2 jumping to H4).

**Design owns:** the heading type scale (`.title-xl` / `.title-lg` / `.title-md`, `.eyebrow`).

---

## Report header

The look already exists in the `executive-report-*` templates (now in `templates/`) + porter-design's
display headings (`--font-bricolage` + `.eyebrow`). This rule fixes the **information every header must carry** —
that part is Reporting's, not Design's.

**Reporting owns — mandatory fields (always present):**
- **Report type** — eyebrow label ("Monthly performance", "Account audit").
- **Title** — what it is / the client.
- **Account name** — the specific account the data comes from (distinct from the client; a
  client may have several accounts).
- **Period + its comparison** — the date range **and** the baseline ("May 2026 · vs April 2026").
  Never the range alone (always-compare).
- **Data-source logo(s)** — the connector lockup (Google Ads, Meta, GA4…), per Design §7.

Optional: prepared-by / agency lockup, confidentiality tag, generation date, client logo.

**Two variants — same fields, different visual weight:**
- **Cover** — heavy band + large title. For `report` (narrative), `presentation`, `audit`.
- **Compact** — single inline row. For `dashboard`.

**Design owns:** the cover band / compact layout, title scale, eyebrow, logo-lockup styling
(reuse the `executive-report-*` template cover band in `templates/` + porter-design display headings).

---

## Report section (the repeating unit of a report)

A report is a sequence of **sections**, one per analysis use case (one `porter-analysis` skill =
one section). This is the render of `narrative.sections` from [`input-contract.md`](input-contract.md):
each skill emits `{ eyebrow, h2, narrative + insights, visualization }` and the report is the
ordered sequence. Add a skill → add a section.

**Reporting owns — fixed anatomy, top to bottom (text before visualization):**
1. **Eyebrow** — short use-case label (optional). Uses Design's eyebrow.
2. **H2** — a **topic label**, sentence case, one short line (e.g. "Funnel performance",
   "Search terms"). It orients; it does NOT state the finding.
3. **Narrative** — a **lead sentence = the finding** (the "what"), then optional body (the
   "why"), carrying inline insight markers (below). The finding lives here, not in the H2.
4. **Visualization** — the component that proves the finding (SUMAS cards / chart / table).

Order is **always text → visualization**: the reader gets the point, then the evidence.

### Inline insight markers (semantics defined here; appearance owned by Design)

Three levels, each with a distinct job. Reuse Design's atoms — porter-design `.pds-chip` / `.pds-hl`
/ `.pds-u`. Never restyle them here.

| Marker | Job | Use for |
|---|---|---|
| **Chip** | a number **with its variation**, inline in prose | quantified movement ("cost rose `▲32%`"). Colored by **meaning** (Scorecard rule). |
| **Underline** | emphasis on a **qualitative phrase** | the "what it means" ("the leak is *downstream of the click*"). Not a number. |
| **Highlight (lime)** | the **one** hero number/phrase of the whole report | used **once per report**, never per section. |

### When to use which — the selection ladder

**Default is plain text.** Marking is the exception; each marker is *earned* by a test. For
anything you want to emphasize, ask in order and stop at the first that applies:

| Test | → Use |
|---|---|
| Is it a **number with a movement that matters**? | **Chip** (value + delta) |
| Is it **the one qualitative point of this paragraph**? | **Underline** |
| Is it **the conclusion of the whole report**? | **Highlight (lime)** — once |
| Is it an **action the reader must take**, or a **risk/caveat they can't miss**? | **Callout block** |
| Anything else | **Plain text** |

The dividing line between *inline* and *block*: does it fit as a marked word inside the
sentence, or is it so important it must **leave the paragraph and stop the reader**? A metric
that moved → inline chip. "Pause the competitor campaign, it's burning budget" → that's an
**action** → a callout, not an underline lost in prose.

**Marking budget (anti-noise — protects the hierarchy principle):** a section earns its marks.
By default: chips **only on metrics that moved materially**, **≤1 underline per paragraph**, the
**lime highlight once per report**, and **callouts only for genuine actions/risks** (not for
ordinary emphasis). If everything is marked, nothing is.

### Callout (block) — the one standard block component

**Reporting owns:** a box that leaves the prose flow to carry an **action** or **alert**, in one
of four meanings: **info / win / warn / risk**. Use it for "do this" or "watch out for this",
never for plain emphasis (that's an inline marker). One clear message per callout.

> Not yet in the standard set: **pull-quote** and **CTA banner** (deferred — add later if needed).

**Design owns:** heading/eyebrow type; chip, underline, highlight, and callout styling
(porter-design `.pds-chip` / `.pds-hl` / `.pds-u` /
`--callout-{info,win,warn,risk}`); section spacing.

---

## Analysis narrative (objective)

How the **text** inside a section is written — so the analysis is **standard and objective**, not
subjective prose. It describes what the analysis output *shows*; it does not editorialize.

**Three layers, kept distinct:**
- **Observation (the body — always):** what the data shows — metric, value, variation vs the
  comparison period, and the comparison that makes it notable. **Every claim carries a number.**
  This is most of the text.
- **Interpretation (optional — ONE labeled line):** the "why / what it means", at most one line
  per section, clearly marked and separated from the observations — never woven into them.
- **Action:** never here — actions live only in the **Next steps** section.

**Observation template — each section's text follows this order:**
1. **Headline** — the section's primary metric + its Δ (value · direction · %).
2. **Movers** — the biggest variations vs the comparison period (what changed most, up and down).
3. **Standouts** — the extremes / outliers / concentration (highest, lowest, vs the average or an
   explicit benchmark).

**Style rules:**
- **No claim without a figure.** Every statement names a value and its comparison.
- **No subjective adjectives** (healthy / poor / strong / weak / clear / great) unless tied to an
  **explicit threshold or benchmark** — e.g. "CPA $332 is 2.3× the $145 target", not "CPA is high".
- Always **direction + magnitude + comparison** ("rose 31.8% to $198,584 vs April").
- Describe what is **seen**; don't infer causes in the observation layer.

**Before → after (the fix this enforces):**
- ✗ "Engagement is healthy — CTR up sharply — so the top of the funnel is fine." (adjectives, no
  figures, smuggled conclusion)
- ✓ "Clicks grew 19.0% to 13,957 and CTR rose 70.2% to 3.66%, while impressions fell 30.1% to
  381,280." (then, optionally, one marked interpretation line.)

**Design owns:** the text type scale (`.lead` / `.body`) and the interpretation line's styling.
Reporting owns what the text says and its structure.

---

## Metric relationships (re-state the driver — don't compute it)

> **Boundary:** the "why" of a metric movement is **computed in `porter-analysis`**
> ([`funnel-metrics` → "Metric relationships"](https://github.com/portermetricsample/porter-analysis/blob/main/google-ads/funnel-metrics/framework.md),
> the funnel-identity arithmetic). It arrives in `analysis.synthesis.diagnosis` and each finding's
> `recommendation.why`. Reporting **does not re-derive it** — a second engine producing the same
> explanation is exactly the redundancy to avoid. Reporting **renders the driver the analysis
> already named**, and styles it.

**What reporting owns here (presentation only):**
- **Surface the driver inline** as the one labeled interpretation line of the Analysis-narrative
  section — never woven into the observation body.
- **Keep it to the dominant driver** the analysis shipped; don't expand the rendered text into a
  full equation (the arithmetic stays upstream).
- **Bridge to action stays in Next steps**, pointing at the driver the analysis flagged ("CTR fell
  on rising impressions → targeting/relevance"), never at the symptom ("improve CTR").

**Example (as rendered):** observation body — "Conversions held at 597.81 while clicks rose 19.0%";
interpretation line (from `analysis`) — "conversion rate fell, so the extra clicks didn't convert."

---

<!-- Add new component rules below as Juan defines them. Keep the same shape:
     Reporting owns (behavior) / Design owns (appearance). -->
