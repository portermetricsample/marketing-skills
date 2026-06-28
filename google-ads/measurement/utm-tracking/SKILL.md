---
name: utm-tracking-hygiene
description: Audit whether a Google Ads account's ad URLs carry consistent UTM tags so GA4 and the CRM can attribute each click back to the campaign / keyword that drove it. Checks presence, scheme consistency, and dynamic utm_term across campaigns, then recommends a consistent UTM scheme + auto-tagging. Use this skill whenever the user audits a Google Ads account, asks about UTM tags, URL tagging, campaign tracking, attribution, "can my CRM see which campaign drove this lead", auto-tagging / GCLID, lost source data, or untagged ad links — even if they don't say "UTM". Judges URL TAGGING HYGIENE only; conversion-action setup belongs to `conversion-tracking`, and GA4 configuration is a different connector.
---

# UTM Tagging Hygiene

## Goal (job-to-be-done)
Answer the client's question: are paid-search clicks **tagged** so the downstream tools (GA4 and
the CRM) can attribute them back to the campaign / keyword that drove each contact? The unit of
analysis is the **campaign** (its final URLs). The output is a tagging verdict + the exact scheme
to standardize on, so downstream attribution — and the offline-conversion loop — can see the source.

- **Who:** media buyer / PPC manager / marketer. **When:** account audit / onboarding health-check.
- **Decision it drives:** add UTMs where they're missing, standardize an ad-hoc scheme, and turn on
  auto-tagging — so a member in the CRM can be joined back to a campaign and keyword.
- **The differentiator:** not "is the conversion event set up" — that's `conversion-tracking`. This
  reads the **tags on the actual ad URLs** and flags whether they're present, uniform, and dynamic.

## Scope
- ✅ **Presence + consistency of UTM params on final URLs, dynamic `utm_term`, auto-tagging adoption.**
- ❌ **Conversion-action setup** (is offline/CRM import on, do conversions carry values) →
  complementary [`conversion-tracking`](../conversion-tracking/) skill.
- ❌ **GA4 configuration** (data streams, events, attribution model) — a different connector.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one campaign-grain query + the parsed UTM fields and final URLs.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the presence → consistency → dynamic-term ladder and the auto-tagging recommendation.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign — the parsed UTM params (`utm_source`, `utm_medium`, `utm_campaign`,
`utm_term`, `utm_content`) + `cost_micros` from one query, and the raw `ad_group_ad_ad_final_urls`
from a **second** query (the `utm_*` and final-URL fields can't be combined — join by `campaign_name`).
These params are parsed straight from the final URL by the google-ads connector. No business
context needed beyond knowing the account uses GA4 / a CRM for attribution.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md). For each
campaign: (1) **presence** — are the UTM fields populated at all (all-blank = no tagging)? (2)
**consistency** — is the scheme uniform across campaigns or ad-hoc/per-person? (3) **dynamic term**
— is `utm_term` a dynamic keyword value (e.g. `{keyword}`) rather than a static string? Rank by
spend so the highest-spend untagged / inconsistent campaigns surface first. Recommend auto-tagging
(GCLID) **plus** a consistent manual UTM scheme — this also unblocks the offline-conversion loop in
`conversion-tracking`.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the biggest tagging gap on the highest
  spender + the fix), `diagnosis` (where attribution leaks — untagged clicks the CRM/GA4 can't trace
  to a campaign/keyword), `action` (the one fix to make now, where / what / why).
- `campaigns[]` — one per campaign: `has_utms`, `scheme_note`, the `verdict`, the `action`, and a
  `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — the question the data answers
> yes/no; the metric carried as data, never spelled out in prose; first sentence answers it, then
> names the driver; one bridge line to the next section. Plain language for a non-technical owner
> ("the CRM can't see which campaign sent this lead because the link has no tags"), the technical
> setting (auto-tagging / GCLID / `{keyword}`) in parentheses.

## Example (illustrative — NOT rules)
- **Untagged:** every final URL on the top-spend campaign is bare (no `utm_*` populated) → `untagged`
  → `enable_autotagging` + `add_utms`: GA4 and the CRM can't trace these clicks to a campaign.
- **Inconsistent:** half the campaigns use `utm_campaign=brand` and half use `utm_campaign=Brand_2026`
  → `inconsistent` → `standardize`: the CRM splits the same campaign into two rows.
- **Static term:** `utm_term=ppc` hard-coded on every ad instead of the keyword → `inconsistent` →
  `standardize` toward a dynamic `{keyword}` value so each contact carries the keyword that drove it.
