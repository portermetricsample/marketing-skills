---
name: conversion-cpa
description: Compute the cost per INDIVIDUAL conversion action — cost per phone call, cost per form submit, cost per booking — which Google Ads does not give natively (it only shows one blended cost/conversion across all primary actions). Splits conversion counts by campaign × action, divides by spend, and flags when a campaign's real driver doesn't match its name/goal. Use this skill whenever the user asks "what's my cost per phone call / per lead form / per [action]", per-conversion-action CPA, cost by conversion type, or which action a campaign actually drives — even if they don't say "CPA". Reports a FULLY-LOADED per-action CPA (never additive); the conversion setup verdict belongs to `conversion-tracking` and budget moves to `spend-allocation`.
---

# Per-Conversion-Action CPA (cost per phone call, per form, per booking)

## Goal (job-to-be-done)
Answer the question clients ask constantly that Google Ads refuses to answer directly: **"what does
ONE phone call / ONE form submit / ONE booking cost me?"** Google only reports a single blended
`cost / conversion` across all counted actions. This skill rebuilds the per-action number by pulling
conversion counts **split by campaign × action**, dividing by spend, and — critically — labelling it
honestly so nobody adds up numbers that can't be added.

- **Who:** media buyer / PPC manager / the account owner. **When:** any time someone asks "cost per X",
  or during the audit to see which action each campaign really buys.
- **Decision it drives:** which conversion type is cheap vs expensive, and whether a campaign is
  actually producing the action it was built for.
- **The differentiator:** the **honesty layer** — a per-action CPA is *fully-loaded* (the same spend
  produced several actions), so it is **never additive**, and it is a *true* CPA only when a campaign
  optimizes to that single action. This skill states which kind every number is.

## Scope
- ✅ **Per-action fully-loaded CPA** (campaign + account), the global CPA, the real-driver-vs-name
  mismatch, and actions driven but not counted ("All conversions" only).
- ❌ **Is the conversion setup correct** (offline import / depth / values / how many primaries) →
  [`conversion-tracking`](../conversion-tracking/).
- ❌ **Which budget to raise or cut** → [`spend-allocation`](../spend-allocation/).
- ❌ **Per-segment (match-type / age / device) efficiency** — conversion counts do **not** split by
  those views; that's the blend guardrail in [`conversion-tracking`](../conversion-tracking/).

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — two queries joined by `campaign_name`.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the math + the non-additive / true-vs-fully-loaded rules.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign × action — `conversions` + `all_conversions` (counts); per campaign —
`cost_micros` + total `conversions`; and `campaign_selective_optimization_conversion_actions` to know
whether a campaign optimizes to a single action. Join by `campaign_name`.

**Process:** apply [`references/framework.md`](references/framework.md). For each action compute the
**fully-loaded CPA** = spend ÷ that action's count (campaign-level and account-level). Compute the
**global CPA** = total spend ÷ total conversions (the only additive figure). Mark a CPA as a **true**
CPA only when the campaign optimizes to that one action (single-goal). Flag a **driver mismatch** when
a campaign's biggest action by count isn't the one its name/goal implies, and flag actions with
`all_conversions > 0` but `conversions = 0` (**driven but not optimized**). Gate on a thin-volume floor
— don't quote a CPA off 1–2 conversions.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (the cheapest/most expensive action + its cost), `diagnosis`
  (where the spend actually goes by action type), `action` (the one move — e.g. give the phone-call
  action its own single-goal campaign to get a true CPA).
- `actions[]` (account-level) + `campaigns[]` (with per-action CPAs) + `rollup`, plus the
  `nonAdditiveWarning`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure data
— no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — the question the data answers;
> the metric carried as data; plain language for a non-technical owner ("each phone call costs about
> $79"), the caveat ("fully-loaded — the same spend also brought in form fills") stated once, not buried.

## Example (illustrative — NOT rules)
- **Fully-loaded:** account spend $2,830 ÷ 36 phone clicks ≈ $79 per call; ÷ 16 catering forms ≈ $177
  each — but these **don't add up** to the spend; the same dollars bought all of them.
- **Driver mismatch:** a campaign named "Form Submits" actually drives 22 phone clicks vs 4 form
  submits → its real product is calls, not forms — rename/retarget or split.
- **Driven but not optimized:** "Calls from ads" shows 19 in All conversions but 0 in Conversions →
  it's happening but bidding ignores it; decide whether to count it.
