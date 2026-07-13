# Framework: Google Ads — Placement Relevance & Brand-Safety (content classification)

Applies [SUMAS](../../../../../_framework/sumas.md) — the **S-step (Segment) made concrete for
placement / content**. Sub-member of the `audience/` umbrella, but a **classification** skill (read
content → judge), not movement attribution like demographics / geography / devices.

## S — Strategy
- **Who cares:** the buyer running Display / Video / Demand-Gen.
- **Their question:** "What is my money actually showing next to — is it relevant and safe, and who
  does that content tell me is watching?"
- **Decision it triggers:** a **placement exclusion list**, and a read of the **realized audience**.

## U — Use case
On-demand, two jobs:
1. **Brand-safety / relevance sweep** — flag the off-topic and unsafe placements eating spend.
2. **Realized-audience read** — what the content reveals about who is actually being reached
   (vs who was targeted).

## M — Method

### Mandatory pre-check — availability + applicability (audience-specific)
Two checks before anything (see [`../README.md`](../../README.md)):
1. **Availability** — `detail_placement_view_*` exist in the catalog.
2. **Applicability** — the **fingerprint** shows `DISPLAY` / `VIDEO` / `DEMAND_GEN`. Gate on the
   *campaign type*, not on an empty placement query — that is what tells "not applicable" (Search /
   PMax never expose placements) apart from "no spend this window". If not applicable → `verdict: "n/a"`, say why.

### Deterministic first (code half — no judgment)
Group by placement, sum spend / impressions / clicks; **drop the long tail** below the spend /
impression floor (1-impression rows are noise); **rank by spend**. The classifier only ever sees the
placements that matter.

### Then judge — read the content (judgment half)
For each above-threshold placement, two independent axes:
- **Relevance** — `on_topic` / `off_topic` / `unknown`, measured against **what the advertiser sells**
  (the business context). A golf brand on a golf-tips video = on-topic; on a true-crime doc = off-topic.
- **Brand-safety** — `safe` / `sensitive` / `unsafe` (violence, tragedy, true-crime, adult, hate).
  Independent of relevance — a finance video can be on-topic-ish yet brand-sensitive.

**Source ladder (cheapest first):**
1. Judge from `display_name` when it's clearly enough → `source: "name"`.
2. **Ambiguous AND material spend → `scrape` the page / channel**, re-judge → `source: "scraped"`.
3. Still ambiguous → `confidence: "low"`, `action: "human_review"`.

### Roll up
- **% of content spend** that is `off_topic` or `unsafe` — the headline waste figure.
- **Exclusion candidates** — the off-topic / unsafe placements, **ordered by spend** (highest waste first).
- **Realized-audience read** — one line: what the on-topic vs off-topic mix says about who is watching.

## A — Add context (mandatory)
The relevance verdict is **only as good as the business context** — state what the advertiser sells
that "on-topic" is measured against. Every placement carries its **spend** (the stake). The audience
read is a **marked interpretation line**, not a number.

## S — Segments
This case = the **placement / content** sub-member. Demographics, geography, devices are the
count-based siblings under `audience/`.

## Validated finding (a Demand Gen golf account — the proof; details fictionalized)
- `detail_placement_view` returned 15 real placements: `youtube.com` + specific video ids, with
  `placement_type` `WEBSITE` / `YOUTUBE_VIDEO`. Reading `display_name`: golf content
  ("Fix Your Putting Stroke in 10 Minutes…", "Final Round Highlights…") = `on_topic`; **true-crime +
  finance** ("True Crime: The Cabin Case…", "Turn $1,000 Into $100,000…") = `off_topic` / `sensitive`.
- Output: an exclusion list of the off-topic ids + "the realized audience skews general-entertainment".
- Same gate proven negative: Search-only and PMax-only accounts returned **0** → `n/a`.

## Interpretation / honesty rules
- **Gate on campaign type, not an empty result** — distinguishes `n/a` from `no_activity`.
- **Threshold the tail** — never classify 1-impression noise; classify the spend that matters.
- **Confidence is mandatory** — name-only and blocked-scrape judgments are `low`; surface, don't hide.
- **Off-topic ≠ auto-exclude** — conquest / adjacency may be intentional; flag, the human decides.
- **Relevance needs the business** — without business context the verdict is a guess; ask or infer it first.
