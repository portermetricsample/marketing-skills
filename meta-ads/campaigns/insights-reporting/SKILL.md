---
name: meta-ads-insights-reporting
description: Read and interpret Meta (Facebook/Instagram) Ads performance — spend, impressions, reach, clicks, CTR, CPC, CPM, frequency, conversions/actions, CPA/ROAS — at account / campaign / ad-set / ad level, with breakdowns (age, gender, placement, region, device), to answer "how is it doing and WHERE does it leak". Use whenever the user asks for results, performance, what's working/not, where budget leaks, or to feed an optimization decision. Read-only. Scope: reading + diagnosing performance; changing budgets/status belongs to the setup skills / meta-ads-rules-optimizer.
---

# Meta Ads — Insights & Reporting

Turn Meta's numbers into a decision: **how is it doing, and where does it leak?** Read-only — this
skill pulls and interprets performance; it never changes anything. Account-agnostic.

## Goal
Answer "how are my ads doing and why" with the SUMAS funnel (Visibility → Engagement → Conversion),
each level with volume + cost + rate, so the next action is obvious. Feeds `rules-optimizer` and
`clone-winner`.

## Components
- **Tools / metrics + breakdowns:** [`references/tools.md`](references/tools.md) — the `insights_get`
  schema (validated 2026-07-16) + how to parse `actions`.
- **📖 Param map:** [`../PARAMETERS-REFERENCE.md`](../PARAMETERS-REFERENCE.md).

## Operate
1. **Resolve the account** (`list_accounts`, signed ref).
2. **Pull totals** with `insights_get` at the level you need (`account`/`campaign`/`adset`/`ad`) and a
   `date_preset` (or `time_range`). Default fields: `spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,cost_per_action_type`.
3. **Diagnose with breakdowns** — re-pull with `breakdowns` (age/gender/placement/region/device) to see
   WHERE performance concentrates or leaks.
4. **Read it** with the framework below; report vs a comparison window if the user wants a trend.

## Framework — what to read per objective
- **Conversion (SALES/LEADS):** cost per result (CPA) and ROAS are the truth. Get results from the
  `actions` array (`offsite_conversion.fb_pixel_purchase`, `lead`, etc.) and cost from
  `cost_per_action_type`. CTR/CPC are *diagnostic*, not the goal.
- **Traffic:** CTR (link) + CPC. **Awareness:** reach + CPM + frequency (fatigue if frequency high).
- **Engagement:** post engagement / thruplay + cost per.
- **The funnel read:** impressions → CTR → landing/adds → conversions. A leak at one stage points to the
  fix: low CTR = creative/audience; high CTR but low conversion = landing/offer; high CPM = audience/auction.

## Gotchas (validated 2026-07-16)
- **`date_preset` enum is specific:** `today, yesterday, this_week_mon_today, last_7d, last_14d,
  last_30d, this_month, last_month, this_quarter, last_quarter, this_year, last_year`. **NOT** `last_30_days`.
- **`campaign_name` is NOT a valid field** — the fields list is metrics only. Get names via `object_read`
  or the row id, and join. `level=campaign/adset/ad` returns per-object rows.
- **`actions` and `cost_per_action_type` are ARRAYS** of `{action_type, value}` — parse the action type
  you care about; there is no flat "conversions" number for custom events.
- **Empty `{data:[]}`** = no delivery in that window (not an error). Widen the range or check the account had spend.
- Read-only + cheap (1 point each) — safe to poll, but still batch sensibly.

## Scope
- ✅ Pull + interpret performance at any level, with breakdowns and comparison windows.
- ❌ Change budgets/status/creative (setup skills / rules-optimizer). ❌ Build a hosted dashboard (`meta-ads/dashboard`).
