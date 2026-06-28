---
name: google-ads-geography-segmentation
description: Segment a Google Ads account by geography (country / region / state / province / metro / DMA / city) and attribute a metric's up/down movement to the locations that drove it. Returns per-location metrics + vs-previous-period comparison, the efficient vs wasteful locations, and expansion / exclusion candidates that drive geo bid adjustments (location bid adjustments) and budget reallocation. Use this skill whenever the user breaks down performance by location, asks which country/region/state/province/city converts best or worst, why a metric moved geographically, where to raise or lower location bids, where to expand or exclude, or mentions geo segmentation / geographic performance — even if they don't say "geography".
---

# Geography Segmentation (movement attribution)

## Goal (job-to-be-done)
Per **location** (at the chosen granularity: country › region › metro › city), explain **which
location drove a metric's up/down move** and where return concentrates. The unit of analysis is
the **location**; the output is a structured finding — top contributing locations + share of the
change, the efficient vs wasteful list, and expansion / exclusion candidates.

- **Who:** the marketer / analyst running the account. **When:** a metric moved and geography may
  explain it, or to find the locations worth more / less bid.
- **Decision it drives:** **geo bid adjustments** (location bid adjustments) + budget reallocation
  — push the efficient locations, trim the wasteful, expand / exclude.
- **The differentiator:** **efficiency over volume** — the biggest-spend location is usually just
  the biggest market, not the best-paying. Rank by ROAS / CPA, then weight by volume.

## Scope
- ✅ **Geographic segmentation + contribution-to-change**, one granularity per pass
  (country / region / metro / city / most-specific).
- ❌ **Demographics** and **devices** → sibling sub-segments under [`audience/`](../).
- ❌ **Building the map / chart** — naming the viz is analysis; building it is reporting's job.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the geo dimensions + base counts to pull, sorted and capped.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: SUMAS S-step for geography, contribution-to-change, efficiency-over-volume, the long-tail + atlas traps.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **location** (at one geo granularity) + its **base counts** (impressions,
clicks, cost, conversions, conversions value), for the **report period AND its comparison period**
(vs-previous-period attribution), ≥ 4–8 weeks. Plus the account's **`location_type`** (physical
presence vs presence-or-interest) — state which the account targets, it changes the meaning.

**Process:** run **one query at the chosen geo granularity** that matches the account's footprint
(country for multi-country, region for the national default, metro for local media-buying, city
for store-radius). **Sort by the value metric and cap `limit`** (e.g. top 25); geo has a long
tail — roll up the rest as "all others". Apply the rubric in
[`references/framework.md`](references/framework.md):
- **Contribution to change** — for a **count** metric, each location's `ΔM_loc` sums to ΔM → rank
  by `|ΔM_loc|` to find what explains the move. For a **ratio** (ROAS, CPA), attribute via
  numerator / denominator counts, **never summed across locations**.
- **Efficiency over volume** — rank by ROAS / CPA before weighting by spend.
- **Compute every rate / cost from base counts**; ratios don't sum across locations.
- **Low-spend high-ROAS = expansion; high-spend low-ROAS = bid-down / exclude.**

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (which location drove the move + the single action),
  `diagnosis` (the dominant location of the move + the efficiency pattern), `action` (the one
  bid up / down / expand / exclude, where / what / why).
- `locations[]` — one per location, with period + comparison metrics, `delta`, contribution
  share, efficiency `state`, and a `recommendation`.
- `rollup` — the "all others" tail + expansion / exclusion lists.

A renderer (porter-reporting) turns that JSON into a **choropleth map when an atlas exists, else
a ranked bar**. Do not bake emojis / layout into the analysis output.

## Example (illustrative — from Acme Golf, region, 13 weeks; NOT rules)
- **Leads volume AND efficiency:** California (ROAS ≈ 9.5) → `bid_up`.
- **Hidden gem:** Iowa (ROAS ≈ 10.7 on low spend) → `expand` (low-spend high-ROAS).
- **Scrutiny list:** Texas & Florida big spenders but mediocre (ROAS ≈ 5.6) → `audit` / `bid_down`.
- **Atlas trap:** a Canada-province account renders as ranked bars (no atlas) — analysis unchanged.
