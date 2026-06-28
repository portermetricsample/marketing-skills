---
name: campaign-settings-audit
description: Per Google Ads campaign, read two best-practice setting toggles straight from Google's config fields and flag the ones set wrong — (6) Location targeting set to Presence vs "Presence or Interest", and (7) Search Partners / Display Network left ON on Search campaigns. Use this skill whenever the user audits or inherits a Google Ads account, asks about location targeting (presence vs interest), search partners, display network, network settings, geo spend leaking outside the target market, or campaign-level setup hygiene — even if they don't say "audit". Sections 6 + 7 of the Acme DIY Audit Checklist. Reads settings ONLY; performance and relevance belong to the other audit checks.
---

# Campaign Settings Audit (Location + Networks)

## Goal (job-to-be-done)
Per campaign, read two best-practice toggles straight from Google's setting fields and flag the
ones set against best practice: **(§6) Location targeting** = Presence vs "Presence or Interest",
and **(§7) Search Partners / Display** = should be OFF on Search campaigns. The criterion IS a
field — these are direct boolean/enum config values, one row per campaign, so the verdict is a
string comparison, not a judgment call. = **Sections 6 + 7** of the Acme DIY Audit Checklist.

- **Who:** media buyer auditing or inheriting an account. **When:** onboarding audit + periodic hygiene.
- **Decision it drives:** flip location to Presence; turn off Search Partners / Display on Search campaigns.
- **The differentiator:** the misconfig hides in plain sight — "Presence or Interest" can leak
  15-25% of spend to unintended locations, and Display/Partners quietly mix lower-intent networks
  into Search spend. Reading the toggle catches what a metrics-only look never surfaces.

## Scope
- ✅ **Two setting toggles, per campaign:** location targeting type (§6) and Search Partners /
  Display network flags (§7).
- ❌ **Performance** (CPA / ROAS / conversions) → the other audit checks. A correctly-set campaign
  can still perform badly.
- ❌ **Relevance / negatives, bids, budgets, structure** → their own cluster checks.
- ⚠️ **§7 (networks) applies to Search campaigns only;** §6 (location) applies to every campaign type.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one campaign-grain settings query (+ optional geo-leak query).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the flag logic, the SEARCH-only scoping, the §6 dollar-leak sizing.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign — name, advertising channel type, the three setting fields (location type,
Search Partners flag, Display flag), and 30-day spend. For the §6 dollar leak, the advertiser's
**target market** must be supplied (account profile or user) — the skill can't know "Canada is the
target" on its own.

**Process:** one campaign-grain query (see [`references/tools.md`](references/tools.md)). Compare
the toggles **as strings** (`"PRESENCE"`, `"True"`, `"False"`). Apply the rubric in
[`references/framework.md`](references/framework.md): flag §6 when `positive_geo_target_type ==
"PRESENCE_OR_INTEREST"`; flag §7 (Partners / Display) **only when** `channel == "SEARCH"` and the
flag is `"True"`. A campaign is correct only if its applicable checks pass. Optionally run the 2nd
geo query to size the §6 leak (spend outside the target market). Never use performance to classify.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — three strings: `headline` (how many campaigns flagged + the spend exposed),
  `diagnosis` (which toggle leaks most + where, via the wasted-spend identity), `action` (the one
  fix to take now, where / what / why).
- `findings[]` — one per campaign: identity + the settings read + the verdict (`ok` / `flagged`,
  naming the wrong toggle(s)) + the spend at stake + a plain `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — a question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver. Plain language for a non-technical owner: name the
> exact campaign, the plain action, the exact setting in parentheses — no bare jargon.

## Example (illustrative — NOT rules)
- **§6 leak:** `Acme_Health_SEM_(HD)` set to `PRESENCE_OR_INTEREST` → flag; recommend "set
  location to only people IN your area, not people interested in it (Location options → Presence)".
- **§7 Display on Search:** a SEARCH campaign with `target_content_network == "True"` → flag; "turn
  off the Display Network on this Search campaign so its budget stays on search".
- **Clean pass (Acme Insurance dogfood):** every campaign `PRESENCE` · Partners `False` · Display `False`
  → 0 flags. A pass is a valid, useful result — report it, don't treat it as a gap.
