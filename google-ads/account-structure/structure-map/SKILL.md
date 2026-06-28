---
name: google-ads-structure-map
description: Decode a Google Ads account's naming convention (campaigns + ad groups) into a taxonomy of dimensions — product line/code, program, funnel stage, match type, bidding, audience, geo, test — and expose them as navigable segmentation parameters. This is the PRODUCER of the per-account `account_profile` that every other Google Ads skill consumes. Use this skill whenever the user is onboarding a new Google Ads account, asks "how is this account structured", wants account-structure dashboard filters / segmentation angles, needs to know what a campaign/ad-group naming token means, or mentions naming convention, taxonomy, product codes, or decoding campaign names — even if they don't say "structure map". Maps and decodes ONLY; it does NOT judge whether the structure is right (that is `structure-audit`) and does NOT generate new conventions.
---

# Google Ads — Structure Map

## Goal (job-to-be-done)
Turn the account's **campaign/ad-group name strings into structure**: infer the per-account
naming grammar, decode each name into a taxonomy of dimensions (program, product family→line,
type, funnel, match, bidding, audience, geo, test), and expose those dimensions as navigable
**segmentation parameters**. The emitted JSON includes the **`account_profile`** (naming
grammar + product hierarchy + lexicons + brand/competitor terms + ambiguous tokens) that the
deterministic scripts of OTHER skills (`structure-audit`, `term-routing`, future `relevance`,
`intent-discovery`) consume — see [`../../../_framework/account-profile.md`](../../../_framework/account-profile.md).

- **Who:** analyst / media buyer / whoever builds reports and views by segment.
- **When:** getting to know a new account, or feeding an "Account Structure" page / dashboard
  filters. Cached per account; re-infer only when campaigns change.
- **Decision it drives:** how to slice the account (which filters/groupings exist), and which
  tokens still need the team's dictionary before they can be trusted.
- **The differentiator:** it **infers the grammar per account** and **flags by confidence** —
  what parses for sure vs what needs research or the team dictionary. It never guesses an
  internal code as if it were truth.

## Scope
- ✅ **Decode + map.** Infer the grammar, extract the dimensions, list segmentation parameters,
  flag ambiguity by confidence, emit the `account_profile`.
- ❌ **Judge consistency / find errors** → `structure-audit` (it validates; this one extracts).
  The "Phase 1: infer convention" of `structure-audit` is a lite version of this skill's core.
- ❌ **Generate a convention for new campaigns** → future `naming-convention` skill.
- ❌ **Performance / spend / bids / budgets.**

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the 2 structure queries
  (campaign-grain + keyword-grain) + the optional site-research tools.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain:
  the dimension catalog, grammar inference, product hierarchy (family→line), the 3 decode
  levels, disambiguation by crossing levels, and the confidence discipline.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits
  (the structure map **plus** the `account_profile`).
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) +
  [`scripts/query.json`](scripts/query.json) — the decode runs as code, in ms, not by the
  model (see below).

## Operate

**Input:** per row, a **campaign name** and (Search) an **ad-group name**, plus the real
dimensions for validation (`campaign_advertising_channel_type`,
`campaign_bidding_strategy_type`, `keyword_info_match_type`) and `impressions` only to return
rows. Two queries are needed for coverage (the keyword query omits keyword-less campaigns like
Demand Gen / PMax). Optional: site research via `tool:porter-tools:scrape`/`crawl` to confirm
product lines and map codes.

**Process (split brain):**
1. **Deterministic decode → [`scripts/process.py`](scripts/process.py).** Feed it the raw
   `query_data` JSON (`{columns, rows}`). It derives the vocabularies **from the account
   itself** (never hardcoding an advertiser's products) and returns the inferred grammar, the
   `segmentation_params` (dimension → distinct values), the `code_to_lines` hierarchy
   (family → product lines), the `ad_group_subsegments`, and the `ambiguous_tokens`. This is
   the deterministic, universal half — true for any Google Ads account in any industry.
2. **LLM triage (judgment half).** The model does NOT re-decode. It ONLY:
   - resolves the `ambiguous_tokens` it can — via site research (flag "inferred from site")
     or by **crossing levels** (e.g. `GI` campaign confirmed as *Guaranteed Issue* by its ad
     groups "Guaranteed Issue", "Pre-Existing Conditions", "Severe Heart");
   - leaves the truly unknown internal codes (`AO`, `Embedded`) as "ambiguous, needs team
     dictionary" — never invents a meaning;
   - fills the `keyword_lexicon`, `brand_terms`, `competitors` of the `account_profile`;
   - assigns a confidence level (`confirmed` / `inferred` / `ambiguous`) per decoded token.

   Apply the rubric in [`references/framework.md`](references/framework.md). Validate tokens
   against real data where it exists (type/match/bidding) to raise confidence. Treat the
   parentheses code → product word as a **2-level hierarchy** (family→line), NOT as
   inconsistency.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `structure_map` — the inferred grammar, the per-campaign decode (each campaign → its
  dimensions, with confidence), the `segmentation_params`, and the `ambiguous` list.
- `account_profile` — the cached, per-account config (naming, products with the family→line
  hierarchy and lexicons, brand/competitors, intentional-variant rule, ambiguous tokens) that
  downstream skills load as their optional profile argument. **This skill is its producer.**

A renderer (porter-reporting, or a chat view) turns that JSON into the human map / filters. Do
not bake emojis/layout into the analysis output.

## Example (illustrative — Acme Insurance, 20 campaigns / 71 ad groups; NOT rules)
- **Inferred grammar:** `<Program>_<Product>[mods]_[Funnel]_<Type>_[Strategy]_(<Code>)_[Test]`.
- **Product as hierarchy:** Family(code) {TL, HD, HA, BR} → Line: TL→{Life, BestLife,
  LifeBroadMatch}, HD→{Health, Dental}, HA→{Home, Auto, Bundle}, BR→{Brand}. `(HD)` covering
  both Dental AND Health is the **family→line** hierarchy, not an error to force-parse.
- **Validated tokens:** Type {Search, Demand Gen} (✅ vs channel_type); Bidding
  ROAS→MaxConvValue, Brand→TargetIS (✅ vs bidding_strategy_type).
- **Disambiguation by level:** `GI` confirmed as *Guaranteed Issue* by its ad groups.
- **Unresolved → team dictionary:** `AO`, `Embedded` — left ambiguous, never guessed.
- **Coverage caveat:** the keyword query missed Acme Insurance's Demand Gen campaigns → the complete
  campaign map comes from the campaign-grain query (query 1).
