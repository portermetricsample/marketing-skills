---
name: conversion-tracking-audit
description: Audit a Google Ads account's conversion setup from direct fields — is offline/CRM conversion import set up, are the counted (primary) conversions down-funnel (not page-views), and do they carry values? Returns an account verdict per question + a per-action detail + ranked fixes. Use this skill whenever the user audits a Google Ads account, asks about conversion tracking, offline/CRM conversion imports, value-based conversion setup, whether conversions carry values, "are we tracking the right conversion", deprecated Universal Analytics goals, or onboarding/health-check of an account — even if they don't say "conversion tracking". This is Acme audit Section 2. Judges the account-level conversion-action CONFIG only; it does NOT judge campaigns, keywords, bids, or which specific event is the "right" KPI (the human's call).
---

# Offline Conversion Tracking Audit

## Goal (job-to-be-done)
Answer the three Acme questions about an account's conversion setup, each from direct fields:
is **offline/CRM conversion import** set up? are the **counted (primary) conversions down-funnel**
(not page-views)? do they **carry values**? This is foundational — bad conversion setup breaks
everything downstream (bidding chases the wrong action, or leads with no value). It is **Section 2**
of the Acme DIY Audit Checklist and the last check
to complete the [account-audit](../README.md) cluster.

- **Who:** media buyer / PPC manager. **When:** onboarding audit / account health-check (one-off, foundational).
- **Decision it drives:** import CRM events, promote a deeper action to primary, add conversion
  values, migrate off Universal Analytics, clean up legacy actions.
- **The differentiator:** no vibes — every recommendation rests on **field facts** (action type,
  source, category-depth, primary flag, value) plus Google's own category taxonomy, not opinion.

## Scope
- ✅ **Account-level conversion-action CONFIG only** — the four objective rules (R1–R4) over the ENABLED actions.
- ❌ **Campaign / keyword / bid judgment** → other account-audit checks (value-based-bidding reads the bidding strategy).
- ❌ **Whether a specific event is the "right" business KPI** → the human's call; this skill flags the structural gap, it doesn't prescribe the exact event or CRM.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the two queries (config + metrics) and the cannot-combine join.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the category→depth ladder, the 4 rules, the A+B join.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** two pulls joined by `conversion_action_name` — **A · config** (name, category, type,
conversion_source, primary_for_goal, status) and **B · metrics** (name, conversions, value). Config
and metrics **do not combine** (the merged query errors), so two queries. No business context needs
to be asked — the rules read direct fields; only the depth of a `DEFAULT`-category action is
name-inferred (disclose it).

**Process:** filter to **ENABLED** actions (drop REMOVED/HIDDEN — count them for hygiene), join A+B,
map each `conversion_action_category` to funnel depth via the ladder in
[`references/framework.md`](references/framework.md), then run the four objective rules: R1 offline
import missing, R2 primary is shallow, R3 value missing, R4 deprecated (Universal Analytics goal).
When category is `DEFAULT`, fall back to the action **name** for depth and mark it inferred.
**Caveat on `primary_for_goal`:** it is Google's per-action API flag and can differ from the
account's UI **Primary/Secondary goal** setting (goal-level config + account-level overrides) —
report it as the flag it is, and defer to the operator if it conflicts with what they see in the UI.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the single biggest setup gap + its fix),
  `diagnosis` (why it leaks — e.g. bidding optimizes a shallow / value-less action so it chases the
  wrong outcome), `action` (the highest-leverage fix, where / what / why).
- `questions[]` — one per Acme question (offline import, optimization depth, conversion values),
  each with a `verdict` and a `recommendation`.
- `actions[]` — the ENABLED conversion-action detail (name, category + depth, type/source, primary?, value?, conversions).
- `hygiene` — count of REMOVED/HIDDEN + deprecated (UA) actions to clean up.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver; one bridge line to the next section. Plain language
> for a non-technical owner — name the exact conversion action and the exact change (the
> executable-finding rule), never bare jargon.

## Example (illustrative — NOT rules)
- **No offline import (R1):** no enabled action has an UPLOAD/CRM type or source → `broken` →
  "import down-funnel CRM events (HubSpot/Salesforce/Pipedrive) so Google can optimize on real revenue."
- **Value missing (R3):** primary `H&D Application Start` fires 134 leads with value $0 → `broken` →
  "add a value to `H&D Application Start` so Google chases the leads that actually pay."
- **Deprecated (R4):** several `UNIVERSAL_ANALYTICS_GOAL` actions still enabled → `review` →
  "migrate off Universal Analytics goals (sunset) before they stop counting."
