---
name: time-segmentation
description: Explain WHY and WHEN a Google Ads metric moved — and surface recurring scheduling patterns. Composes two sub-skills: time/trend (chronological attribution) and time/cyclical (day-of-week × hour-of-day patterns). Use this parent when both are needed. Use the sub-skills directly for a focused question: trend for "when did this start / what moved MoM", cyclical for "what's the best/worst day or hour."
---

# Time Segmentation

## Sub-skills

| Sub-skill | Question it answers | Use when |
|---|---|---|
| [trend/](trend/) | When did the metric turn? Which week/month drove the change? | movement attribution, inflection detection, MoM/WoW |
| [cyclical/](cyclical/) | What is the recurring day-of-week / hour-of-day pattern? | scheduling patterns, best/worst slot reporting |

## How they compose
Run **both** when the deliverable is a full time analysis. Run **one** when the question is specific:
- *"Why did CPA spike last month?"* → `trend/` only.
- *"What's our best day of the week?"* → `cyclical/` only.
- *"Give me a full time breakdown"* → run both, lead with `trend/` then `cyclical/`.

## Boundary with campaigns/ad-schedule
`cyclical/` is the **reporting lens** — it shows what the pattern is.
`campaigns/ad-schedule/` is the **optimization lens** — it takes that pattern and produces specific bid-adjustment recommendations (positive / negative / exclude by day/hour).

They are complementary: run `cyclical/` to understand the shape, then `campaigns/ad-schedule/` to act on it.
