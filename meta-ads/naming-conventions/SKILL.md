---
name: meta-ads-naming-conventions
description: Design and generate a consistent naming convention for Meta (Facebook/Instagram) Ads across campaign, ad set, and ad levels — plus the matching UTM/URL tracking — on any ad account. Built on the SUMAS levers (producto, objetivo, ángulo, audiencia…): each lever gets ONE home level, names are lowercase and machine-parseable, and the UTMs build themselves from the names via Meta dynamic params. Use whenever the user wants to plan how to name their campaigns/ad sets/ads, set up a naming convention, structure a Meta account, define UTMs, or asks "cómo nombrar mis campañas", "convención de nombres", "nomenclatura", "estructura de campañas", "naming convention", "how should I name my ads", "set up UTMs". Account-agnostic: ships generic defaults, reads a per-account spec the user provides. It PLANS and GENERATES names/UTMs — it does not create objects in Meta (that's meta-ads-campaign-setup / adset-setup / ad-setup).
---

# Meta Ads — Naming Conventions

Turn the levers an advertiser cares about (product, funnel stage, objective, audience,
angle, format…) into a **single, disciplined naming system** for campaigns, ad sets, and
ads — and the **UTM/URL tracking that stays in sync automatically** because it is built
from those same names.

This is a **planning / generation** skill, not a write skill. It produces:
1. a per-account **naming spec** (which levers are active + the account's vocabulary),
2. concrete **names** for a campaign plan at all three levels, and
3. the matching **`url_tags`** (UTM) template.

It never creates objects in Meta — hand the generated names to
`meta-ads-campaign-setup` / `meta-ads-adset-setup` / `meta-ads-ad-setup`.

This skill is **account-agnostic**: it hardcodes no brand, offer, or audience. All
account-specific values live in a `naming-spec.yml` the user provides (copied out of
`templates/naming-spec.template.yml`). The same skill runs on any ad account.

## The idea (built on SUMAS)

A naming convention is just **the levers the advertiser identified, made visible in the
account**. SUMAS decides *which levers matter*; this skill *encodes them into the
structure* so every campaign, ad set, and ad is self-describing and every report can be
split by lever.

Two principles carry the whole design:

1. **One home level per lever.** A lever lives at exactly one level; the full identity of
   an ad is `campaign > ad set > ad` read together, with **no repetition**. This keeps
   names short and stops them from drifting out of sync.
2. **The UTMs are generated from the names.** Meta dynamic params
   (`{{campaign.name}}`, `{{adset.name}}`, `{{ad.name}}`, `{{placement}}`) mean you set the
   `url_tags` template **once** and every ad's tracking auto-fills from its names. Names and
   tracking are one system, not two manual chores.

## Goal (job-to-be-done)
Give a media buyer a naming + tracking convention that is (a) consistent across an account,
(b) readable at a glance, and (c) **machine-parseable** — so any name splits cleanly back
into its levers in GA4 / Looker Studio / Sheets, and "which angle won?" or "which audience
won?" becomes a groupable question instead of a manual guess.

## Scope
- ✅ **Design** the convention for an account (pick active levers, build the vocabulary).
- ✅ **Generate** campaign / ad set / ad names from a plan.
- ✅ **Generate** the `url_tags` (UTM) template from the names.
- ✅ **Validate / repair** any name the user pastes against the rules.
- ❌ **Create objects in Meta** → `meta-ads-campaign-setup` / `adset-setup` / `ad-setup`.
- ❌ **Decide the media strategy** (budgets, which audiences/angles to test) → that's SUMAS
  + the setup skills. This skill encodes decisions already made.

## How to run it

1. **Get or build the spec.** Ask the user for their `naming-spec.yml`. If they don't have
   one, walk them through `templates/naming-spec.template.yml`: which levers are active per
   level, and the account's vocabulary (offers, audiences, geos, languages, angles). Start
   from the Porter defaults in `references/default-taxonomy.md` and let them override.
2. **Confirm the levers → level map** with `references/lever-map.md`. Remind them: each
   lever has one home level; don't repeat.
3. **Generate names** using the patterns below and the hard rules in `references/rules.md`.
   Show them the names AND how each splits back into levers.
4. **Generate the `url_tags` template** from `references/utm-system.md`.
5. **Validate** every name against `references/rules.md` before handing off. Reject
   anything with uppercase, spaces, or reserved characters — those break the UTMs.

## The patterns (at a glance)

```
Campaign:  {brand}_{funnel}_{objective}_{offer}[_{market}]
Ad set:    {audience-type}_{audience-detail}_{geo}_{lang}[_{placement}]
Ad:        {yymmdd}_{angle}_{format}_{hook}_{variation}

Campaign:  nike_tofu_reach_summer-sale_us
Ad set:    lal_purchasers-1pct_us_en_feed
Ad:        250716_social-proof_vid_neymar-hook_v2
```

Split any name on `_` and every lever falls into its own column. That is the entire point.

## The non-negotiable rules (full detail in `references/rules.md`)

- **Lowercase only** — no uppercase, no camelCase (UTMs are case-sensitive; `Facebook` ≠ `facebook`).
- **Two delimiters:** `_` separates fields (the levers), `-` separates words inside one field.
  An `_` never appears inside a value; a `-` never separates fields.
- **Allowed characters:** `a–z 0–9 - _` only. No spaces, `%`, `&`, `=`, `?`, `#`, `+`, `.`, `/`,
  or accents (`ñ→n`, `á→a`). Percentages/money spelled out: `1pct`, `3x`, `250usd`.
- **Dates:** `yymmdd` (e.g. `250716`).
- **Fixed field order per level.** Omit an optional lever only from the tail; an omitted
  middle lever becomes `na` so column positions never shift.

## Reference files
- `references/lever-map.md` — every lever, its home level, and which UTM it flows into.
- `references/rules.md` — casing, delimiters, charset, validation regex.
- `references/utm-system.md` — Meta dynamic params, the `url_tags` template, GA4 notes.
- `references/default-taxonomy.md` — Porter defaults: funnel stages, objectives, audience
  types, format codes, the starter **angle library**, and abbreviations.
- `templates/naming-spec.template.yml` — the per-account config to copy and fill.

> Keep filled client specs **out of this shared repo** — they contain account data. Copy the
> template into the client's own workspace.
