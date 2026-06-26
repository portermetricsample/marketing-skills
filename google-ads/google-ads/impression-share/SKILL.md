---
name: impression-share
description: For each Google Ads Search campaign, track impression share OVER TIME and classify its trajectory — growing, consistent, flattening, declining or crashing — then tag the driver of any decline as a budget problem (money, raise budget) vs a rank problem (auction, fix bid/Quality). Use this skill whenever the user asks which campaigns are losing or gaining visibility, impression-share trend, IS dropping/declining over time, visibility decay, "are we showing less than we used to", proactive alerts on reach, or which campaigns are consistent vs slipping — even if they don't say "impression share". Does BOTH the current-period cap snapshot (budget vs rank, incl. top-of-page) AND the trajectory over time with its driver — the unified impression-share view; competitor Auction Insights is unavailable on the connector.
---

# Impression Share Trend & Driver Diagnosis

## Goal (job-to-be-done)
Per **Search** campaign, answer two questions a snapshot can't: **is our visibility trending up, flat,
or down over time — and when it drops, is it a money problem (budget) or an auction problem (rank)?**
The unit is the campaign's **weekly impression-share curve**; the output is a trajectory label
(Winning / Healthy / Volatile / Losing / Crashing / Crashed / New) + the driver of any decline + the
single lever that recovers it. Built to catch decay **early** and at scale (a portfolio of campaigns,
or many accounts).

- **Who:** media buyer / PPC manager / agency. **When:** recurring monitoring; the proactive
  "are any campaigns slipping?" review; an early-warning trigger.
- **Decision it drives:** which campaigns to act on *now* and with *which lever* — fund the
  budget-limited decliners, fix bid/Quality on the rank-limited ones, leave the healthy ones alone.
- **The differentiator:** it reads the **shape of the curve** like a human (reusing the validated
  `performance_decay` engine), not a naive period-over-period % that mislabels normal noise — and it
  puts a **cause** (rank vs budget) on every decline, never recommending budget for a rank problem.

## Scope
- ✅ **Per-campaign impression-share trajectory over time + the rank-vs-budget driver of any decline.**
- ✅ **The current-period cap snapshot** (budget vs rank, incl. **top-of-page**) — emitted as the `current` block per campaign.
- ❌ **Deeper rank cause** (Quality Score pillars / CPC inflation behind a rank decline) → deferred; pairs with [`../keyword-ad-landing/metrics`](../keyword-ad-landing/).
- ❌ **Competitor / Auction Insights** — validated **unavailable** on this connector (timeout + reauth + no domain dimension).
- ❌ Per-keyword IS (campaign grain is the floor); Display / Demand Gen / Video (IS ≈ 0 there — dropped automatically).

Built on [`../../_framework/ad-rank-and-impression-share.md`](../../_framework/ad-rank-and-impression-share.md) (what Ad Rank is, the rank-vs-budget split) and the `performance_decay` trend engine (vendored as `scripts/decay_core.py`).

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the ONE validated daily query, Search-only, + the gotchas (week=0, the channel-filter trap, daily sums to 1.0).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: daily→weekly impression-weighting, edge-week trim, `decay_core` classification, the driver tag, the flat-low "capped" nuance.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) (+ vendored [`scripts/decay_core.py`](scripts/decay_core.py)) — does ALL the math; the LLM only writes the narrative.
- **View (bundled — this is the UNIFIED skill):** this public skill ships BOTH the analysis AND the view. Render the spend-ranked, click-to-expand monitor with `python3 scripts/build_porter_page.py <daily.json> out.html` (Porter-styled) or `scripts/build_interactive.py` (token-neutral). Run `scripts/make_example.py` for a fictional Acme dataset to try it end-to-end. **The same capability is also offered SPLIT across two repos** for the modular pipeline: the analysis in [`porter-analysis/google-ads/impression-share`](https://github.com/portermetricsample/porter-analysis/tree/main/google-ads/impression-share) + the token-driven render component in [`porter-reporting/components/google-ads/impression-share-trend-monitor`](https://github.com/portermetricsample/porter-reporting/tree/main/components/google-ads/impression-share-trend-monitor). Use THIS unified skill to get analysis + view in one; use the split repos to compose your own pipeline.

## Operate
**Input:** the daily query in [`references/tools.md`](references/tools.md) — per campaign per day:
`search_impression_share`, `search_rank_lost_impression_share`, `search_budget_lost_impression_share`,
`impressions` (the weight), over ~90 days. No business context needed.

**Process:** run `scripts/process.py <rows.json>`. It drops non-Search (all-zero) rows, aggregates
daily→weekly **impression-weighted**, **trims the partial leading/trailing weeks** (so an incomplete
edge week never reads as a false crash), classifies each campaign's IS curve with `decay_core`, tags
the driver (recent impression-weighted `rank_lost` vs `budget_lost`), and ranks by impressions
(impact). The LLM then writes only the `synthesis` + polishes the recommendations. **Always sanity-check
a label against its `series`** — if a label disagrees with the curve, fix the threshold, not the label.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the three strings: `headline` (the biggest-impact mover + its lever), `diagnosis`
  (is the account gaining or losing visibility overall, and is the dominant driver budget or rank),
  `action` (the single highest-impact fix now).
- `campaigns[]` — one per Search campaign: trajectory label, the IS curve, the driver, and a
  `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`, or `scripts/render.py`) turns this JSON into the human
document. **Emit pure data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../_framework/writing.md`](../../_framework/writing.md) — the question the data answers yes/no;
> the metric carried as data; first sentence answers it, then names the driver. Plain language for a
> non-technical owner ("your Health campaign's visibility nearly doubled — 12% to 24% — but it's still
> capped by budget, so more money buys more reach"), the technical lever in parentheses.

## Example (illustrative — fictional Acme Insurance, 90 days)
- **Winning:** `Acme_Health_SEM` IS curve `12→24%` over 12 weeks → `Winning`, driver still `budget`
  → "growing, and budget is the remaining cap — fund it to capture the rest."
- **Healthy (steady):** `Acme_Brand` flat at ~82%, loss all rank → `Healthy` → keep; the rank loss is
  competitors on your brand, expected.
- **Healthy but capped-low (flattening):** `Auto_Test` flat at ~10% → `Healthy` label, but low level +
  rank loss = **stuck against a ceiling**, not fine — read level + driver, not just the trend word.
- **Crashing (what it catches):** a campaign whose IS falls from a healthy baseline (e.g. 30%→12%
  sustained, not a partial last week) → `Crashing` with its driver → act now. *(The edge-week trim is
  what stops a 2-day final week from faking this.)*
