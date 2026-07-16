# Framework: PMax Diagnostics

## Mission
Turn each Performance Max campaign's spend + conversions into an **earning verdict against the account's
Search baseline**, read the **asset-group signal** that is actually exposed, and — the load-bearing part
— **state what the API cannot show for PMax** so the reader knows precisely how far the verdict extends.
PMax's pain is opacity; this framework's integrity is that it never manufactures a placement, audience,
or search-term conclusion it has no data for.

## The benchmark — compare to non-brand Search
PMax competes for the same budget as Search, so the right yardstick is the account's **non-brand Search
CPA/ROAS** (the proven, un-inflated efficiency). It arrives as input (from `financial-overview` /
`spend-allocation` with brand traffic stripped). If only **blended** account CPA is available, use it
and flag that brand traffic inflates the baseline, which **understates** the true PMax gap (PMax looks
better than it is).

## The numbers (deterministic)
For each PMax campaign, over the period:

- **`spend`** = `cost_micros / 1e6`.
- **`conversions`** = `metrics.conversions`.
- **`value`** = `metrics.conversions_value`.
- **`cpa`** = `spend / conversions` (skip if `conversions = 0`).
- **`roas`** = `value / spend`.
- **`cpa_ratio`** = `cpa / search_baseline_cpa` (1.0 = matches Search; >1 = more expensive).
- **`roas_ratio`** = `roas / search_baseline_roas` (1.0 = matches Search; <1 = worse return).

Use ROAS for value-based / ecommerce accounts, CPA for lead-gen. If both exist, the **worse** of the
two ratios drives the verdict (a campaign that clears CPA but tanks ROAS is not "earning").

## Verdicts (cut-offs)

| Condition (vs non-brand Search baseline) | Verdict | Implication |
|---|---|---|
| `cpa_ratio ≤ 1.0` **and** `roas_ratio ≥ 1.0` | **earning** | keep / scale — it beats or matches the proven benchmark |
| within ~20% of baseline (`cpa_ratio ≤ 1.2` and `roas_ratio ≥ 0.8`) | **watch** | hold; reassess in 30d or after the conversion signal is fixed |
| `cpa_ratio` 1.2–2.0 (or `roas_ratio` 0.5–0.8) | **underperforming** | trim the daily budget; do not scale — it buys conversions at a premium the account can beat |
| `cpa_ratio > 2.0` (or `roas_ratio < 0.5`) | **unprofitable** | pause and replan (creative/audience/feed) — it is a drain |

- **`earning` vs `underperforming` is the coarse binary** the caller usually wants; `watch` and
  `unprofitable` are the honest edges of it.
- A small PMax budget (2–5% of account) at a *borderline* efficiency loss can be defensible for
  prospecting / new-customer goals — note this context when the gap is in the `watch`/`underperforming`
  seam, rather than reflexively cutting.

## The asset-group read (the only creative-level signal)
PMax exposes asset-group-**level** cost/conv and `ad_strength` — nothing finer through the API. Read it
as:
- **Concentration** — what share of the campaign's spend/conv sits in each asset group (is one group
  carrying the campaign while others are idle?).
- **Ad strength** — POOR/AVERAGE/GOOD/EXCELLENT as a *quality proxy*, not a performance verdict. A POOR
  group is a fix-the-assets flag; it does not by itself mean the group loses money.
- **Per-asset labels** (optional Query 3) — `LOW`/`GOOD`/`BEST` per headline/image/video hints which
  creatives to swap.

Present this as **directional**: "Group A carries 80% of spend at GOOD strength; Group B is EXCELLENT
but starved". Never upgrade it to "Group B is the winner" — you do not have the conversion attribution
to say that.

## The honesty rule — visibility_limits is mandatory
Every PMax read MUST close by naming what the API does not show, so the reader can weight the verdict:

- **Search terms** — only coarse category buckets exist (`campaign_search_term_insight`), never the
  search-terms report. Do not present categories as terms.
- **Placements** — where the ad showed is not returned; → Google Ads UI.
- **Audience signals** — applied segments and their performance are not returned; → Google Ads UI.
- **Channel split** — Search vs YouTube vs Display vs Discover vs Gmail inside PMax is not returned.
- **Impression share** — PMax does not report IS like Search; do not print a "0% IS" cap.

The verdict (earning vs baseline) is **real and defensible** — it rests on cost/conv the API does
return. Everything about *why* (which query, placement, audience, channel) is **limited by the API** —
and the skill says so rather than guessing. This is what earns the reader's trust in the numbers that
ARE solid.

## Volume & recency gate
- A PMax campaign under ~15–30 conversions in the period is **directional** — annotate it; a CPA off
  eight conversions is noise, not a verdict.
- PMax needs a learning ramp (~6 weeks); a campaign launched inside the window reads as
  underperforming because it is still learning — note the launch date rather than calling it a drain.
- Ignore PMax campaigns whose spend is below a floor (e.g. <1% of account) unless the user asked about
  them — they don't move the account number.

## What this skill deliberately does NOT do
- It does not mine **search terms** or build **negative-keyword** lists for PMax — the data isn't there
  (only coarse categories). That work, to the extent it's possible, lives in the Google Ads UI.
- It does not control **placements/exclusions** — API-limited; → Google Ads UI.
- It does not judge **bid targets** (is tROAS/tCPA set right?) — that is `bid-strategy`.
- It does not re-derive the **Search baseline** — that comes from `financial-overview` /
  `spend-allocation`; this skill consumes it.
