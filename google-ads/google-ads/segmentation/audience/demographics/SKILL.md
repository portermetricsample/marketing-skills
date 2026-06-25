---
name: demographics-segmentation
description: Attribute a Google Ads metric's up/down movement to the age or gender segment that drove it, and find which demographic converts efficiently — within the campaigns Google can demographically identify. Use this skill whenever the user segments by demographics, asks which age range or gender drives spend / conversions / ROAS, wants demographic bid adjustments, a creative angle for the segment that buys, or asks "who is converting" — even if they don't say "demographics". Covers age and gender (parental-status and household-income are NOT exposed by google-ads via Porter). Movement attribution only; performance over time belongs to the complementary time skill.
---

# Demographics Segmentation (movement attribution)

## Goal (job-to-be-done)
Per **demographic segment** (age range OR gender), explain **which segment drove a metric's
up/down move**, and which segments convert efficiently — *within the campaigns Google Ads can
demographically identify*. Age and gender are **one case** (the demographic dimension is the
parameter), run through the same contribution-to-change engine. Sub-segment of
[`audience/`](../README.md) in the [`segmentation/`](../../README.md) family.

- **Who:** the marketer / analyst running the account. **When:** a metric moved and demographics
  may explain it, or to find the age / gender worth more bid and the creative angle that fits the
  segment that buys.
- **Decision it drives:** demographic bid adjustments (up the efficient segments, down the
  wasteful) + creative / targeting briefed to the segment that actually buys.

## Scope
- ✅ **Movement attribution by demographics**, age and gender, run as **two separate analyses**.
- ✅ **Coverage-aware**: state what % of spend the demographic split covers; claims are scoped
  "within demographic-eligible campaigns…" when coverage is low.
- ❌ **Parental status / household income** — NOT exposed by google-ads via Porter (0 fields).
- ❌ **Trend over time** (aggregate flattens trend) → cross-check a flagged segment in the `time/` case.
- ❌ **Age × gender cross** — shreds the already thin sample into noise.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the two separate queries (age, gender) + the coverage-total query.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the mandatory coverage check, contribution-to-change, UNDETERMINED rule, efficiency-over-volume.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per row, a **demographic segment value** (age range or gender enum) + the **base
counts** (impressions, clicks, cost, conversions, conversions_value), pulled for the **report
period AND its comparison period**. Plus the **account-total cost** (no dimension) for the
coverage check.

**Process (apply the rubric in [`references/framework.md`](references/framework.md)):**
1. **Mandatory pre-check — availability + coverage.** Confirm `google_ads_age` /
   `google_ads_gender` exist; sum the demographic spend and divide by the account total to get the
   **coverage %**. Google reports demographics only for some campaign types, so the split can cover
   a small slice. **State the coverage % up front.** If low, every claim is scoped "within
   demographic-eligible campaigns…", never an account-level statement.
2. **Run age and gender as two separate passes.** Never request age × gender together.
3. **Contribution to change.** For a **count** metric M with `ΔM = M(now) − M(prev)`, each segment
   *s* contributes `ΔM_s`; rank by `|ΔM_s|` → the segments that explain the move (they sum back to
   ΔM, exact). For a **ratio** (CPA, ROAS, conv-rate): not summed across segments — attribute via
   its numerator/denominator counts.
4. **Keep UNDETERMINED visible.** The `AGE_RANGE_UNDETERMINED` / `UNDETERMINED` gender bucket is
   often the single largest — report it, never drop it, never optimize on it.
5. **Judge on efficiency, not volume.** Rank segments by ROAS / CPA, not spend share — the
   biggest-spend segment is usually just where the platform aimed.
6. **Compute every rate/cost from base counts** — native ratio fields are wrong at the aggregate.

**Emit** the JSON in [`references/output.md`](references/output.md): coverage % up front, per-segment
metrics with their `ΔM` share and an efficiency `verdict`, the best/worst segment, UNDETERMINED kept
visible, and a `synthesis` whose every figure carries **vs previous period**.

A renderer (porter-reporting, or a chat view) turns that JSON into a bar chart (segment vs spend)
with the coverage % as caption. Do not bake emojis/layout into the analysis output.

## Example (illustrative — Acme Golf, 13 weeks, NOT rules)
- **Coverage ≈ 13%** of spend ($4.1k of $32.7k); the `UNDETERMINED` bucket was the largest → every
  sentence scoped "within demographic-eligible campaigns…".
- **Age 55–64 = the goldmine:** ROAS ≈ 11.8 at the lowest CPA (~$17) → `bid_up`; 35–44 strong
  (≈7.0) → `bid_up`; **65+ worst (≈2.7)** → `bid_down`.
- **Gender: male ≈ female ROAS (~6.3)**, but male took ~94% of demo'd spend — a volume skew (golf
  audience), not an efficiency gap → `leave` (no real gender lever).
