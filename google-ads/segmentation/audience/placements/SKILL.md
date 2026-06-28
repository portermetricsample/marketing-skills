---
name: placement-relevance
description: Classify each Google Ads placement — the website, app, or YouTube video the ad actually showed on — as on-topic vs off-topic for the advertiser and brand-safe vs unsafe, by reading the placement name / URL and scraping the page when it's ambiguous, then emit the exclusion list and the % of content spend wasted on irrelevant or unsafe content. Use whenever the user asks where their ads are showing, about placements, brand safety, content exclusions, "what sites / videos am I on", wasted Display / Demand-Gen spend, or wants to read the audience from the content it consumes — even if they don't say "placement". Display / Video / Demand-Gen only (Search and Performance Max do not expose placements).
---

# Placement Relevance & Brand-Safety (content classification)

## Goal (job-to-be-done)
Per **placement** (the website / mobile app / YouTube video the ad actually showed on), judge
whether the content is **on-topic** for what the advertiser sells and **brand-safe** — by reading
the placement name / URL, and **scraping the page when the name is ambiguous and the spend is
material** — then produce the **exclusion list** and the **% of content spend on off-topic / unsafe
placements**. Placement sub-member of [`audience/`](../README.md): *where / what the audience
consumes* — the content the ad ran next to reveals who is watching.

- **Who:** the media buyer / PPC manager running Display / Video / Demand-Gen. **When:** a content
  campaign is live and you need to know what your money is showing next to.
- **Decision it drives:** a **placement exclusion list** (cut the irrelevant / unsafe), and a read of
  the **realized audience** from the content it consumes.
- **The differentiator:** the verdict comes from **reading the content**, not from a metric — only
  AI turns 10,000 raw placement strings into "your golf brand is running next to true-crime videos".

## Scope
- ✅ **Relevance (on / off-topic) + brand-safety** classification of automatic placements; exclusion
  candidates; **% of content spend** off-topic / unsafe; the realized-audience signal from content.
- ✅ **Availability-gated** — Display / Video / Demand-Gen only; an explicit `n/a` on Search / PMax.
- ❌ **Not placement performance / movement attribution** — counts feed *ranking by spend*, not a
  contribution-to-change verdict (that engine is the count-based siblings).
- ❌ **Not managed-placement targeting setup** (which placements you *chose* to target).
- ❌ **Search / PMax** — no `detail_placement_view` rows (Performance Max hides placements).

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the applicability fingerprint, the placement pull, and the conditional `scrape`.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the availability gate, the spend threshold, the relevance + brand-safety rubric, scrape-when-ambiguous, confidence.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate

**Input:** per placement, the `display_name` / `target_url` / `placement_type` + the **base counts**
(impressions, clicks, cost, conversions), pulled for the **content campaigns**; plus the **business
context** (what the advertiser sells) that the relevance judgment is measured against.

**Process (apply the rubric in [`references/framework.md`](references/framework.md)):**
1. **Mandatory pre-check — availability + applicability.** Fingerprint `campaign_advertising_channel_type`;
   if no `DISPLAY` / `VIDEO` / `DEMAND_GEN`, emit `verdict: "n/a"` (Search / PMax don't expose placements) and stop.
2. **Deterministic first.** Group by placement, sum spend; **drop the long tail** below the spend /
   impression threshold (don't classify 1-impression noise); rank by spend.
3. **Then judge — read the content.** Classify each above-threshold placement on two axes: **relevance**
   (on / off-topic vs the business) and **brand-safety** (safe / sensitive / unsafe). Judge from
   `display_name` when it's clearly enough; when it's **ambiguous and the spend is material, `scrape`
   the page / channel** and re-judge. Attach a **confidence**; send the genuinely ambiguous to `human_review`.
4. **Roll up.** % of content spend off-topic + unsafe; the exclusion candidates ordered by spend; the
   one-line realized-audience read.

**Emit** the JSON in [`references/output.md`](references/output.md): `synthesis` (the % + the action),
`placements[]` (per-placement verdict + confidence + reason + spend), and `rollup` (% off-topic, the
ordered exclusion list). **Pure data — no emojis, tables, markdown, or colors in the output.**

> **Voice (link, don't copy):** write every narrative line per [`_framework/writing.md`](../../../../_framework/writing.md) —
> the heading is a question the data answers; the first sentence answers it then names the driver;
> plain language for a non-technical owner; the figure carried as data, never spelled out in prose.

## Example (illustrative — OnePuttPro Demand Gen, NOT rules)
- A YouTube Demand-Gen golf campaign: `detail_placement_view` returned `youtube.com` + a list of video
  ids. Reading `display_name`: ~half were golf ("Jon Rahm's home course…", "Charles Schwab Challenge…")
  → `on_topic`; the rest were **true-crime and finance** ("Son Murders Mom…", "Once Your Portfolio
  Hits This Number…") → `off_topic` / `sensitive`. Rollup ≈ the off-topic share of spend → an
  exclusion list, and the audience read: "the realized audience skews general-entertainment, not just golfers."
