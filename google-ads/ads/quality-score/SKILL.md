---
name: quality-score-trend
description: Track each keyword's Google Ads Quality Score over time and flag the keywords whose QS is DECLINING — the quiet erosion that raises your CPC and drops your rank without any alert firing — then attribute the drop to the component responsible (Expected CTR, Ad Relevance, or Landing Page Experience). Use this skill whenever the user asks about Quality Score trend, QS dropping / falling over time, "why did my Quality Score go down", CPC creeping up for no obvious reason, keywords slipping in rank, or which component (expected CTR / ad relevance / landing page experience) is hurting a keyword — even if they don't say "Quality Score". This skill diagnoses WHERE QS is eroding and WHY (which component) ONLY; the ad-copy fix belongs to the complementary `rsa-strength-copy-diversity-audit` skill, the landing-page fix to `landing-page-cro-audit`, and the point-in-time keyword↔ad↔landing relevance snapshot to `keyword-ad-landing-alignment`.
---

# Quality Score Trend

## Goal (job-to-be-done)
Answer the question a media buyer only asks *after* the damage is done: **which of my keywords are
losing Quality Score, and what's dragging each one down?** Quality Score sets your CPC and your ad
rank, but Google never alerts you when it slips — a keyword can drift from QS 8 to QS 4 over a
quarter, quietly paying more for a worse position the whole way, and you only notice when the
spend looks off. This skill reads each keyword's **historical** QS across time buckets (weekly or
monthly), classifies the direction (improving / stable / declining), and names the **component** —
Expected CTR, Ad Relevance, or Landing Page Experience — that's pulling it down, so the fix can be
routed to the right place.

- **Who:** media buyer / PPC manager / whoever owns account efficiency. **When:** a periodic QS
  health check, or the "is Quality Score eroding" item on the account-audit checklist.
- **Decision it drives:** which declining keywords to act on first (highest spend × steepest drop),
  and which fix to send them to — rewrite the ad, fix the landing page, or re-check relevance.
- **The differentiator:** it doesn't report today's QS chip (that's a point-in-time number anyone
  can read in the UI) — it reads the **trajectory** and **attributes the decline to a component**,
  so you fix the cause, not the symptom. A QS drop driven by Landing Page Experience is a different
  job than one driven by Ad Relevance, and this skill tells them apart.

## Scope
- ✅ **QS trend + component attribution over time** — overall historical QS trended per keyword (and rolled up per ad group), the direction, and which of the three components is dragging it.
- ❌ **The ad-copy fix** (rewrite headlines, fix Ad Strength / pinning to lift Ad Relevance & Expected CTR) → complementary [`rsa-strength-copy-diversity-audit`](../copy/).
- ❌ **The landing-page fix** (page speed, message-match, mobile UX to lift Landing Page Experience) → [`landing-page-cro-audit`](../../landing-page/).
- ❌ **The point-in-time relevance snapshot** (does keyword ↔ ad ↔ landing align *right now*?) → [`keyword-ad-landing-alignment`](../../keyword-ad-landing/). That is a still photo of relevance; THIS skill is the movie of QS over time.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the historical-QS query (overall + 3 component buckets, segmented by date) and the historical-vs-live caveat.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: building the QS series, the improving/stable/declining cut-offs, and the component-attribution logic that names the dragging component.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** the reporting window, split into time buckets (weekly for a quarter, monthly for a year).
Per keyword: `metrics.historical_quality_score` (the 1–10 overall) and the three component buckets —
`metrics.historical_search_predicted_ctr` (Expected CTR), `metrics.historical_creative_quality_score`
(Ad Relevance), `metrics.historical_landing_page_quality_score` (Landing Page Experience) — each
segmented by `segments.date`, plus `metrics.cost_micros` and `metrics.average_cpc` to weight the
finding by spend. See [`references/tools.md`](references/tools.md) for the date-bucketing and the
Porter-field / GAQL split.

**Process:** apply [`references/framework.md`](references/framework.md). For each keyword, order the
buckets into a QS series; compare the recent value against its baseline and classify the direction
against the cut-offs (gate on enough buckets and enough impressions — a 1-point wiggle on a thin
keyword is noise, not a trend). For every keyword that's **declining**, walk the three component
series and name the **dragging component** — the one that fell into (or deepened within)
`BELOW_AVERAGE` over the same window the overall QS dropped. Weight the finding by the keyword's
cost, so a QS slide on a high-spend keyword outranks the same slide on a $3 keyword. QS exists for
**Search keywords only** (not Display / Shopping / Performance Max); a keyword with no impressions in
a bucket has no QS for that bucket — skip the gap, don't read it as a zero.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the QS story — how many keywords are declining and the
  single steepest drop by spend), `diagnosis` (the account's dominant failing component — is the
  erosion mostly ad-side or landing-side?), `action` (the highest-impact keyword to fix, where /
  what / why, routed to the right fix skill).
- `keywords[]` — one per keyword: the QS series, `qs_trend`, the three component states + trends,
  the `dragging_component`, the spend-at-risk, a `verdict`, and the executable
  `recommendation {where, what, why, route_to}`.
- `rollup` — count of declining keywords, the biggest QS drops ranked by spend, and the dominant
  failing component across the account.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — a question heading the data answers
> yes/no; the metric+delta carried as data, never spelled out in prose; first sentence answers the
> heading, then names the driver; one bridge line to the next section. Plain language for a
> non-technical owner ("your landing page is getting a worse grade from Google", not "post-click
> quality score decayed"), the technical term in parentheses.

## Example (illustrative — NOT rules)
- **Landing-side erosion:** "insurance quote online" fell from **QS 8 → QS 4** over the quarter while
  Ad Relevance held `ABOVE_AVERAGE` and Landing Page Experience slid `AVERAGE → BELOW_AVERAGE`. The
  dragging component is the landing page — route to `landing-page-cro-audit`, not a copy rewrite. It's
  the account's #1 finding because it spends the most of any declining keyword.
- **Ad-side erosion:** "cheap car insurance" drifted **QS 7 → QS 5** as Expected CTR moved
  `AVERAGE → BELOW_AVERAGE` while the landing page stayed `ABOVE_AVERAGE` — the ad has gone stale, not
  the page. Route to `rsa-strength-copy-diversity-audit`.
- **Stable, don't touch:** "acme insurance" wiggled QS 9 → 8 → 9 with all three components
  `ABOVE_AVERAGE` — a 1-point integer wiggle inside a healthy keyword is not a trend; leave it.
