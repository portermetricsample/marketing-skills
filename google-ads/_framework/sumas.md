# SUMAS — the global framework

Every use case in this repo is built with **SUMAS** (Porter Metrics + HubSpot).
The core idea: **use fewer but better-chosen metrics**, and always give them context.

SUMAS is 5 steps. For each report, walk through them in order:

| Step | Question it answers | In the report it translates into... |
|------|----------------------|-------------------------------|
| **S — Strategy** | What business is it and who cares about this report? | Who it's aimed at + what decision it helps make |
| **U — Use case** | What is the data used for? | Operational (daily) / Performance management (monthly) / Strategic (quarterly) |
| **M — Metrics** | What do we measure? | KPIs ordered by funnel: Visibility → Engagement → Conversion |
| **A — Add context** | Is it going well or badly? | vs previous period, vs target, efficiency (costs) and effectiveness (rates) |
| **S — Segments** | Where is the insight? | Cut by campaign, channel, audience, content, time |

## M — the 3 funnel levels
- **Visibility:** the user SEES (impressions, reach).
- **Engagement:** the user INTERACTS (clicks, CTR).
- **Conversion:** the user DOES something of value (leads, purchases, $ value).

## A — the 2 ways to add context
- **Effectiveness = vs potential → RATES** (CTR, conversion rate).
- **Efficiency = vs spend → COSTS** (CPC, CPA/CPL, ROAS).
- And always: **vs previous period**, **vs target**, **time series**.

## S — the 7 ways to segment
Campaign · Business/product · Channel · Objective · Audience · Content · Time.
Rule: start general (context) and cascade down to the detail that explains it.

## Golden rule
A report is **aspirin, not a vitamin**: it exists to solve a problem and
trigger an action. If nobody reads it "because it doesn't hurt," the chosen metrics
don't matter to the audience → go back to step S (Strategy).

> Full version of the framework: skill `sumas` in `~/.claude/skills/sumas/`.
