---
name: google-ads-device-segmentation
description: Attribute a Google Ads metric's up/down move to device type (mobile / desktop / tablet / connected-TV) and decide whether device bid adjustments or the mobile landing experience should change. Use this skill whenever the user segments Google Ads by device, asks if mobile vs desktop vs tablet drove a metric's change, wonders about device bid adjustments / bid modifiers by device, mobile-vs-desktop performance, or where spend concentrates across devices — even if they don't say "segmentation". Judges device contribution-to-change and ROAS spread; honest "no device lever" is a valid result. Performance per other dimensions belongs to the sibling segmentation skills.
---

# Google Ads Device Segmentation (movement attribution)

## Goal (job-to-be-done)
Per **device type** (MOBILE / DESKTOP / TABLET / CONNECTED_TV), explain **whether a device drove a
metric's up/down move**, and whether **bids or the landing experience should change by device**. This
is the **S-step (Segment) of [SUMAS](../../../../_framework/sumas.md) made concrete for device type** —
the simplest segmentation case: one dimension, full coverage, no Undetermined bucket.

- **Who:** the marketer / analyst running the account. **When:** recurring, when a metric moved and
  device may explain it, or to check device efficiency and where spend concentrates.
- **Decision it drives:** device bid adjustments, and making sure the device carrying most spend has a
  landing / checkout that holds up.
- **The honesty differentiator:** **even ROAS across devices = no bid lever.** A "no strong signal"
  result is valid — say so, don't manufacture a recommendation.

## Scope
- ✅ **Device contribution-to-change + ROAS spread.** Minimal input: device dimension + 5 base counts.
- ✅ **Two jobs:** explain a movement (attribute a metric's change to devices) **and** find the pattern
  (device efficiency + where spend concentrates).
- ❌ **Other segments** (demographics, geography) → sibling skills under `audience/`.
- ❌ **Trend over time** (aggregate flattens trend) → the `time/` case; cross-check a flagged device there.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one device-segmented query + 5 base counts.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: contribution-to-change, ROAS-spread lever test, honesty rules, the validated Acme Golf proof.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** one query **segmented by `google_ads_device`** returning ≤ 4 rows (MOBILE / DESKTOP /
TABLET / CONNECTED_TV), each with the 5 base counts (impressions, clicks, cost, conversions,
conversions value), for the **report period AND its comparison period** (vs-previous-period
attribution, ≥ 4 weeks). Confirm `google_ads_device` via `list_fields` if a query fails.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md).
- **Contribution to change** — for a **count** metric, each device's `ΔM_dev` sums to ΔM → rank by
  `|ΔM_dev|`. For a **ratio** (ROAS, CPA), attribute via numerator/denominator counts, **never summed
  across devices**.
- **Spread / lever test** — if ROAS sits in a tight band across devices there is **no bid lever**;
  pivot to "which device carries the spend, and is its UX solid?". Only a genuine gap (e.g. mobile ROAS
  half of desktop) justifies a bid-down + a UX investigation.
- **Compute every rate/cost from base counts**; ratios don't sum across devices. Fold near-zero
  connected-TV / tablet into the read — don't weight a near-zero row equally.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the movement, the dominant-spend device, and whether device is a lever or not.
- `devices[]` — one per device: base counts (period + delta), derived ROAS/CPA, share of spend, and
  contribution to the focal metric's ΔM.
- `lever` — `lever` | `no_lever`, with the ROAS spread that justifies it.

A renderer (porter-reporting) turns that JSON into a small bar chart or table (≤4 categories). Do not
bake emojis/layout into the analysis output.

## Example (illustrative — Acme Golf, 13 weeks, NOT rules)
- **Full coverage (~$32.7k, 100% of spend)** — no Undetermined bucket, unlike demographics.
- **Mobile carries 71% of spend** (ROAS ≈ 6.25); desktop slightly better (≈6.6); tablet ≈6.0;
  connected-TV negligible (≈$10, 0 conv).
- **Honest read: device is a WEAK lever here** — ROAS even (6.0–6.6), no segment worth a big bid swing
  → `no_lever`. The takeaway is "mobile-first": 71% of spend rides on mobile, so the mobile landing /
  checkout must be flawless.
