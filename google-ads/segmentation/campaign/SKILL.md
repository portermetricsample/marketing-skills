---
name: campaign-segmentation
description: Explain WHICH campaign drove a Google Ads metric's up or down between two periods, and where spend / return is concentrated. Returns, per metric, the top contributing campaigns with their share of the change, concentration (top-N share), and any entrants/exits — cross-cut by campaign type. Use this skill whenever the user asks "which campaign caused this", "why did spend/conversions/ROAS move", wants contribution-to-change attribution by campaign, concentration of budget/return, or to decide which campaign to fund, fix, or cut — even if they don't say "segmentation". Locates WHICH campaign; the "why" stays a marked interpretation. Sibling of the time-segmentation skill, same engine, campaign dimension.
---

# Campaign Segmentation (movement attribution)

## Goal (job-to-be-done)
Explain **which campaign drove a metric's up/down** between the report period and its comparison
period, and **where spend / return is concentrated**. The unit of analysis is the **campaign**; the
output is a structured finding that attributes a metric's change to the campaigns that caused it,
plus concentration and any structural entry/exit.

- **Who:** the marketer / analyst running the account. **When:** a metric moved and you need *which
  campaign* caused it, or to see where budget and return concentrate.
- **Decision it drives:** where to shift budget, and which campaign to fix or cut.
- **The differentiator:** **contribution to change** — campaigns ranked by how much of `ΔM` they
  explain (sums back to the total), not a flat per-campaign table. Locates *which*, not *why*.

This is the **S-step (Segment) of [SUMAS](../../../_framework/sumas.md), campaign dimension**.
Sibling of [`segmentation/time/`](../time/) — same contribution-to-change engine, campaign segment.

## Scope
- ✅ **Attribution by campaign** of a count metric's move (contribution to change), **concentration**
  (top-N share), and **entry/exit** (campaigns present in only one period).
- ✅ **Cross-cut by campaign type** (Search · PMax · Shopping · Demand Gen · Display · Video) — the
  fingerprint that gates what's reportable.
- ❌ **The "why"** — a launch, a budget change, seasonality. Contribution locates *which* campaign;
  the cause is a **marked interpretation**, not an observation.
- ❌ **Mix-vs-rate modelling** of ratios (not in v1) — ratios are decomposed into numerator/denominator
  counts, not modelled.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the campaign-grained query, both periods.
- **Framework / method:** [`references/framework.md`](references/framework.md) — the brain: contribution to change, concentration, entry/exit, the honesty rules.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **campaign** (name + id + advertising_channel_type + status) with its **base
counts** (impressions, clicks, cost_micros, conversions, conversions_value), pulled for **both** the
report period and its comparison period (see [`references/tools.md`](references/tools.md)). Plus the
**target metric(s)** the user wants explained (default: the metric that moved). Match campaigns
across periods by `campaign_id` (names can be renamed).

**Process:**
1. **Compute every rate/cost from the base counts** (CTR, CPC, CPM, CPA, ROAS, conv-rate) — native
   ratio fields are wrong at the aggregate. Never read a ratio field directly.
2. **Separate entry/exit first.** A campaign present in only ONE period (newly launched, or paused/
   removed) **mechanically** moves the total — pull it out of the like-for-like set so "Generic fell"
   doesn't get confused with "a new campaign turned on".
3. **Contribution to change** for each **count** metric M: `ΔM = M(now) − M(prev)`; each campaign *c*
   contributes `ΔM_c`; rank campaigns by `|ΔM_c|` (they sum back to ΔM) and report the top
   contributors with their **share of ΔM**.
4. **Ratios** (CTR, CPA, ROAS) are **never summed across campaigns** — decompose into
   numerator/denominator counts and attribute *those* to campaigns.
5. **Concentration:** cumulative share — e.g. "top 3 campaigns = 70% of spend" — to flag over-reliance.
6. **Cross-cut by campaign type** — don't compare type-incomparable sets (PMax/Shopping lack
   keyword/search-term data; some metrics are N/A by type) as if equal.

Apply the rubric in [`references/framework.md`](references/framework.md). Every figure carries **vs
previous period**. Write per the Analysis-narrative rule: observation with numbers → dominant campaign
named → at most one **marked** interpretation. **Contribution ≠ cause.**

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — insight-first: the metric, its direction + Δ, and the one campaign/action that matters.
- `metrics[]` — one entry per explained metric: its Δ, the ranked `contributors[]` (with `share_of_change`),
  `concentration` (top-N share), and the `kind` (count vs ratio).
- `entries_exits[]` — campaigns present in only one period (structural movers), kept apart from like-for-like.
- `by_campaign_type[]` — the type cross-cut (spend/return per advertising channel type).

A renderer (porter-reporting) turns that JSON into the human view — the **SUMAS table**, the
**breakdown bar** (e.g. cost by campaign), and the **contribution view**. Do not bake emojis/layout
into the analysis output.

## Example (illustrative — NOT rules)
- **Movement attribution:** conversions fell 120→90 (ΔM = −30); `Generic_Search` contributed −24 (80%
  of the drop) → that's the campaign to inspect, not the account as a whole.
- **Concentration:** top 3 campaigns = 70% of spend → over-reliance flag; a budget shock to any one
  swings the account.
- **Entry/exit:** a `PMax_Launch` campaign live only this period added $7k spend → structural, reported
  apart from the like-for-like change so it isn't read as "existing campaigns spent more".
- **Type gate:** comparing a Search campaign's CTR against a PMax campaign's as if equal → invalid;
  the cross-cut keeps them in separate type buckets.
