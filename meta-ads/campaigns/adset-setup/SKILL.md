---
name: meta-ads-adset-setup
description: Create and configure a Meta (Facebook/Instagram) Ads AD SET under an existing campaign — optimization goal, audience/targeting (geo, age, interests, custom/lookalike audiences), placements, promoted object (page/pixel/lead form), schedule, ad-set budget & bid (only when the campaign is not CBO), always PAUSED. Use whenever the user wants to define WHO sees the ads and WHERE, set targeting/placements/audience, or add an ad set to a Meta campaign, even if they don't say "Porter". Scope: the ad-set level only; the campaign shell belongs to meta-ads-campaign-setup and the ad/creative to meta-ads-ad-setup.
---

# Meta Ads — Ad Set Setup

Create the **ad set** inside a campaign and configure everything that decides **who** sees the ads
and **where**: optimization goal, targeting/audience, placements, the promoted object (Page / Pixel /
lead form), schedule, frequency cap, and — only when the campaign is NOT using CBO — the ad-set
budget and bid. Created **PAUSED**. Account-agnostic (resolve the account from `list_accounts`; never
hardcode).

## Goal (job-to-be-done)
Turn "target small-business owners in Colombia, 25–55, on feed + stories" into a correctly
configured ad set whose optimization goal and promoted object actually match the campaign objective —
so an ad can attach and the set can deliver once turned on.

- **Who:** media buyer / marketer. **When:** right after the campaign shell exists, once per audience.
- **Decision it drives:** the audience + placements + optimization the campaign will spend against.
- **The differentiator:** it matches `optimization_goal` and `promoted_object` to the campaign
  objective (Meta rejects mismatches), picks the budget convention correctly (see the ⚠️ below), and
  sets `is_dynamic_creative` up front when a multi-format / DCA ad is coming — a structural choice
  that is frozen at create.

## Scope
- ✅ **Ad-set object**: optimization goal, billing event, destination type, targeting/audience,
  placements, promoted object, schedule, frequency cap, PAUSED status.
- ✅ **Ad-set budget + bid** — ONLY when the campaign is NOT CBO (else budget lives on the campaign).
- ✅ Targeting research helpers (`geolocation_search`, `interest_search`) to resolve keys/ids.
- ❌ **Campaign** (objective, CBO, campaign budget) → `meta-ads-campaign-setup`.
- ❌ **Ad / creative** (image, video, carousel, copy, CTA) → `meta-ads-ad-setup`.

## Components (read these references as needed)
- **📖 Mapa exhaustivo de TODOS los parámetros y opciones (todos los niveles):** [`../../PARAMETERS-REFERENCE.md`](../../PARAMETERS-REFERENCE.md) — objetivos, pujas, optimización, placements, CTA, UTMs, audiencias, insights. Esta skill es dueña del bloque **§2 Ad set** (targeting, placements, promoted object).
- **Tools / action plan:** [`references/tools.md`](references/tools.md) — exact calls, the full param
  map, the validated gotchas.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — how to match
  optimization + promoted object to the objective, choose targeting/placements, and the budget rule.
- **Output schema:** [`references/output.md`](references/output.md) — what the skill reports back.

## Operate
**Input:** the parent `campaign_id` (+ its objective and whether it is CBO), the target account, and
the audience/placement intent. Required before writing: `optimization_goal` and `billing_event`
(compatible with the objective), at least one geo, and the objective-specific promoted object
(Page for LEADS/AWARENESS/ENGAGEMENT; Pixel + event for SALES; lead form for LEADS).

**Process:**
1. **Read the campaign** (`object_read` on the campaign) to learn its `objective`, `bid_strategy`,
   and CBO flag — these drive every downstream choice.
2. **Match** optimization goal + destination type + promoted object to the objective via
   [`references/framework.md`](references/framework.md).
3. **Resolve targeting keys** (`geolocation_search` for cities/regions, `interest_search` for
   interests, `customaudience_list` for retargeting/lookalike ids).
4. **Decide budget placement:** CBO campaign → NO budget on the ad set. Non-CBO → set the ad-set
   budget (⚠️ **MAJOR units**) and an explicit `bid_strategy`.
5. **Set `is_dynamic_creative`** if a multi-format / DCA ad will follow (see gotchas).
6. **Create** with `facebook_ads.adset_create`, `status: "PAUSED"`. Verify with `object_read`.

**Emit** the summary in [`references/output.md`](references/output.md). Plain language for a
non-technical owner.

## Safety rules
- **Always PAUSED.**
- **Account-agnostic** — resolve via `list_accounts`; the `account_id` is the SIGNED blob, never `act_…`.
- **Budget = MAJOR units here** (the connector converts) — the OPPOSITE of the campaign skill. Do not
  ×100. (Feedback gap 35.)
- **Never retry-storm a Meta throttle** (`subcode 2859015 — account restricted / temporarily
  blocked`): back off, tell the user, retry later. Automations must respect rate limits.

## Example (illustrative — NOT rules)
> Campaign is OUTCOME_LEADS + CBO. Ad set: `optimization_goal: LEAD_GENERATION`, `destination_type:
> ON_AD`, `promoted_object_page_id: <page>`, `promoted_object_lead_gen_form_id: <form>`, geo
> `["CO"]`, age 25–55, placements feed + stories, NO budget (CBO), PAUSED. Report id + "next: attach
> an ad with the lead form."
