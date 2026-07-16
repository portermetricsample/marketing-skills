---
name: pmax-diagnostics
description: Give the advertiser the honest Performance Max read — is each PMax campaign earning its budget against the account's Search baseline (CPA/ROAS), what asset-group-level performance is actually visible, and — explicitly — what Google's API does NOT expose for PMax (search terms, placements, audience detail), so the reader trusts the numbers that ARE real. Use this skill whenever the user asks about Performance Max, PMax, "is my PMax working / worth it", PMax spend, PMax vs Search, asset groups, or the PMax black box — even if they don't say "diagnostics". Judges PMax earning-vs-baseline and the visible asset-group signal ONLY; full search-term mining and placement control are API-limited (named as gaps, not faked), and bid targets belong to the complementary `bid-strategy` skill.
---

# PMax Diagnostics

## Goal (job-to-be-done)
Answer the question every media buyer distrusts PMax on: **is each Performance Max campaign actually
earning its budget, or is the black box just absorbing spend?** Google gives PMax a single spend and
conversion number and hides almost everything underneath — no full search terms, no placements, no
audience-level read. This skill does the one honest thing you can do with the API: compare each PMax
campaign's **CPA/ROAS to the account's Search baseline** (the proven benchmark), pull the
**asset-group-level** performance that *is* exposed, and then **name — plainly — what the connector
cannot show**, so the reader knows exactly how far to trust the verdict.

- **Who:** media buyer / PPC manager / account owner who suspects PMax is a budget sink. **When:** a
  PMax review, or the "is PMax earning its budget" line on the account-audit checklist.
- **Decision it drives:** raise, hold, trim, or pause PMax budget — and where to go (the Google Ads
  UI) for the reads the API withholds.
- **The differentiator:** it refuses to over-claim. A trustworthy PMax skill states what PMax
  *hides* instead of inventing a placement or search-term verdict from data it never received —
  opacity is PMax's real pain, so the skill's credibility comes from naming the limits, not papering
  over them.

## Scope
- ✅ **PMax earning vs the Search baseline** — spend / conversions / value / ROAS / CPA per PMax campaign, judged against the account's non-brand Search CPA/ROAS, plus the **asset-group-level** performance the connector *does* expose.
- ✅ **An explicit "what you can't see" section** — the API's PMax blind spots, listed, so the rest of the read is trustworthy.
- ❌ **Full search-term mining** — the API does NOT expose PMax search terms; only `campaign_search_term_insight` gives coarse category buckets, never the search-terms report. Named as a limit, not faked.
- ❌ **Placement-level control / exclusions** (where PMax ads showed) — not exposed for PMax by the connector → Google Ads UI.
- ❌ **Bid-strategy targets** (is tROAS/tCPA aligned with actuals?) → `bid-strategy`.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the queries (PMax campaigns, asset groups, the Search baseline, the coarse search-category insight) AND a plain list of what the connector will NOT return for PMax.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the earning-vs-baseline cut-offs, the asset-group read, and the honesty rule on visibility limits.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits, including the `visibility_limits` block.

## Operate
**Input:** the reporting period and the account's **Search baseline** (non-brand Search CPA and ROAS —
from `financial-overview` / `spend-allocation` with brand stripped; if only blended account CPA is
available, use it and flag that brand inflation understates the true gap). Per PMax campaign:
`metrics.cost_micros`, `metrics.conversions`, `metrics.conversions_value`,
`metrics.conversions_from_interactions_rate`, filtered to
`campaign.advertising_channel_type = 'PERFORMANCE_MAX'`; plus `asset_group` rows
(`asset_group.name`, `asset_group.status`, `asset_group.ad_strength`, and asset-group-level
`cost_micros`/`conversions`/`conversions_value`). See [`references/tools.md`](references/tools.md) for
the exact GAQL and the blind-spot list.

**Process:** apply [`references/framework.md`](references/framework.md). For each PMax campaign compute
CPA (`cost / conversions`) and ROAS (`conversions_value / cost`), then take the ratio to the Search
baseline → verdict **earning / watch / underperforming / unprofitable**. Summarize each campaign's
asset groups by the visible signal (spend, conversions, `ad_strength`, and — where present —
`asset_group_asset.performance_label` LOW/GOOD/BEST) — this is the *only* creative-level read the API
gives, so present it as directional, not a full creative audit. Gate on volume; a PMax campaign under
~15–30 conversions is directional, annotate it. Then assemble the `visibility_limits` block from
tools.md verbatim in intent — do not imply a placement, audience, or search-term verdict was formed
from Porter data.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (does PMax earn its budget — total PMax spend and its
  efficiency vs the Search baseline, and the loudest single campaign), `diagnosis` (where PMax is
  earning vs quietly losing, and how much of that read is limited by what the API hides), `action`
  (the highest-$ move — raise / hold / trim / pause which campaign, where / what / why).
- `pmax_campaigns[]` — one per PMax campaign: spend, conv, value, CPA, ROAS, ratio-to-baseline,
  `verdict`, an `asset_group_summary`, and the executable `recommendation {where, what, why}`.
- `visibility_limits` — the explicit list of what the API can NOT show for PMax (search terms,
  placements, audience detail, channel split), each with the fallback (Google Ads UI). This block is
  mandatory: it is what makes the rest of the report trustworthy.
- `rollup` — total PMax spend and share of account budget, blended PMax CPA/ROAS vs the Search
  baseline, and the biggest earner / biggest drain by dollars.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`_framework/writing.md`](../../../_framework/writing.md) — a question heading the data answers
> yes/no; the metric+delta carried as data, never spelled out in prose; first sentence answers the
> heading, then names the driver; one bridge line to the next section. Plain language for a
> non-technical owner. **And never soften a visibility limit into a claim** — "the API doesn't show
> PMax placements" is the line, not a guessed placement verdict.

## Example (illustrative — NOT rules)
- "PMax — Shopping Feed" runs at a **$34 CPA vs the $22 non-brand Search baseline** (1.5×) and
  **2.1× ROAS vs 3.4×** — underperforming: trim the daily budget, it is buying conversions at a
  premium the account can beat elsewhere. Its asset groups are legible only as "Group A carries 80% of
  spend at GOOD ad strength; Group B is EXCELLENT but starved" — a directional creative hint, **not** a
  verdict. And the report is explicit that **which search terms, placements, and audiences drove this
  spend are not returned by the API** — for those, the reader goes to the Google Ads UI. That honesty
  is the point: the CPA verdict is real; the creative and query reads are limited, and the skill says so.
