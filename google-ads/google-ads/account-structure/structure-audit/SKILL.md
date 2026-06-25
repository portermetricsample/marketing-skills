---
name: structure-audit
description: Audit a Google Ads account for internal structural consistency against ITS OWN inferred convention — keywords ↔ ad groups ↔ campaigns aligned by theme, match type coherent with the ad-group name, consistent naming (campaigns AND ad groups), and no accidental keyword redundancy. Use this skill whenever the user is auditing or onboarding/inheriting a Google Ads account, asks to clean up account structure, mentions misplaced keywords, ad-group/campaign naming chaos, default names like "Ad group 1", duplicate keywords across ad groups, or "does my match type match the name" — even if they don't say "structure audit". Checks structural alignment ONLY; bids, budgets, ad copy, extensions, Quality Score and negative lists are out of scope.
---

# Google Ads — Structure Audit

## Goal (job-to-be-done)
Validate that the account is **internally consistent with its own convention** — that
keywords fit their ad group, ad groups fit their campaign, the match type fits the name, the
real config matches what the name promises, and there's no redundancy or broken naming. It
does NOT validate against a universal ideal: **it infers the account's convention and checks
against THAT.**

- **Who:** media buyer / agency — especially when **auditing or inheriting** an account.
- **When:** at account onboarding and as a periodic hygiene check.
- **Decision it drives:** which keyword to move, which match type to fix, what to rename,
  which duplicate to consolidate — so the structure is clean and manageable.

## The 4 checks (narrow scope)
1. **Theme alignment** — keyword ↔ ad group ↔ campaign agree on theme (the only semantic part).
2. **Match-type in the name** — if the ad group says "- Broad", its keywords are broad.
3. **Consistent naming** — ad groups/campaigns that break the dominant pattern.
4. **Keyword redundancy** — same keyword defined across several ad groups (separating
   intentional from accidental).

## Scope
- ✅ **Structural alignment only**, against the account's OWN inferred convention.
- ❌ **Out of scope (the hard line):** bids, budgets, ad copy, extensions, Quality Score,
  negative lists. That is NOT structure alignment.
- This skill is at the **defined-keyword** level. The **served search term** level belongs to
  `term-routing` (search-terms) — different unit.

## Consumes the account_profile
This skill **consumes the `account_profile`** produced by `structure-map` (see
[`../../../_framework/account-profile.md`](../../../_framework/account-profile.md)). The
profile supplies the advertiser's vocabulary (`products.code_of_line`,
`products.keyword_lexicon`) so the cross-product theme check knows what the account sells.
**Without a profile** that one check runs in a degraded "generic" mode derived from the
campaign names (noisier, best-effort) — never with a wrong hardcoded guess. Code knows
Google's universal vocabulary (BROAD/PHRASE/EXACT, channel types); the profile supplies the
account-specific vocabulary.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the structure query (1)
  + the optional audience query (2).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain:
  infer→check method, the 4 checks, the intentional-vs-accidental rule, severity.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) +
  [`scripts/query.json`](scripts/query.json) — see Pipeline.

## Pipeline (don't improvise — execute; declarative + deterministic)
This is a **DETERMINISTIC** skill. The work is split into artifacts; the model only makes the
irreducible semantic judgment.

1. **Execute [`scripts/query.json`](scripts/query.json)** — substitute the `<placeholders>`
   and run the MCP call (do not re-compose the query) → the `structure` result.
2. **Run [`scripts/process.py`](scripts/process.py)** over that result (optionally pass the
   `account_profile.json` as a 2nd arg) → returns `convention` + `findings` (checks A/B/C/D,
   already with severity) + `theme_suspects` (only the cross-family candidates). Runs in
   milliseconds.
3. **The model ONLY judges `theme_suspects`** — is the keyword really from another
   family/product? confirm or discard each one. (On the Acme Insurance dogfood that was **13
   candidates**, not 1,415.) Everything else comes already resolved and ranked.
4. **Emit** the JSON in [`references/output.md`](references/output.md), merging the deterministic
   `findings` + the confirmed theme suspects.

`process.py` runs in `scripts/`, executed not read. Where `process.py` ends (deterministic
checks A/B/C/D + theme_suspects) and the LLM begins (judging theme_suspects = check 1) is the
split brain: code computes the universal, the LLM judges the business criterion.

## Operate

**Input:** per row — keyword text, real match type, campaign name, real campaign
channel type, real bidding strategy, ad-group name (impressions only to fetch rows). Plus
**business context**: product lines and how campaigns/ad groups are organized — read from the
names first; confirm the doubtful. The `account_profile` supplies this when available.

**Process:**
- **Phase 1 — Infer the convention** and state it (the user confirms): do campaigns separate
  by product / audience / geo / brand / funnel? do ad groups encode theme + match type?
  Output a short "this is how your account is organized" summary + which checks apply.
- **Phase 2 — Run the applicable checks** per the rubric in
  [`references/framework.md`](references/framework.md). Only applicable checks run (e.g. the
  match-type check only if the account encodes match type in the name).
- Assign each finding a **severity** (High / Medium / Low) by impact (keywords + ad groups
  touched, whether it breaks the account's own convention). **Group similar findings** (e.g.
  "campaign X: 14 keywords duplicated across 12 ad groups" as ONE line, not 14). **Sort by
  severity.** No bids / budgets / ad-copy / QS commentary.
- **Separate intentional from accidental ALWAYS by the naming** — same base name + a varying
  segment suffix (audience / age / geo / test / landing-split) = intentional, skip it.

**Emit** the JSON in [`references/output.md`](references/output.md): `meta` + `synthesis`
(`headline` + `diagnosis` carrying the inferred-convention summary + worst break + `action`) +
`checks[]` (one per check, each with `findings[]`
carrying `state`, `where`, `recommendation`) + the `Skipped (intentional)` set. A renderer
(porter-reporting, or a chat view) turns that JSON into the human table ordered by severity.
Do not bake emojis/layout into the analysis output.

## Example (illustrative — from the Acme Insurance dogfood, NOT rules)
- **Inferred convention:** campaigns by product (Life/Dental/Health/Auto/Home/Bundle) + age/GI
  test variants. TWO naming schemes: `Acme_<Product>_SEM_(XX)` (disciplined) and
  `SG_<X>_<Funnel>_SEM_(XX)`. Ad groups by theme + match type. Checks 1–4 apply.
- **HIGH — match-type in name:** `"Converting KW Broad"` ad group (Acme_Life_MOFU) — 75/143
  keywords are PHRASE, not broad → split phrase out or rename.
- **HIGH — redundancy + generic names:** `Acme_Dental_MOFU` — 16 ad groups with generic names
  (`Ad group 1`, `Buy up`) + the same dental keywords duplicated across ~15 of them →
  consolidate & rename by theme.
- **MEDIUM — naming schemes:** 3 schemes coexist (`Acme_` / `SG_` / `KSM | Campaign N`) →
  unify or document.
- **MEDIUM — duplicate campaign:** `Acme_Health ... Landing_Page_Split` duplicates the full
  11-ad-group Health campaign → set an end date.
- **LOW — stray keyword:** `"alberta"` (BROAD) sits in ~14 `"Phrase & Exact"` ad groups →
  remove/relocate.
- **Skipped (intentional):** `"life insurance canada"` across Embedded 45-54 / 55-64 / 65+ test
  campaigns — same base name + age suffix, by design.
