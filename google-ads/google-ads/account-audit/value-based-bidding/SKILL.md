---
name: value-based-bidding-audit
description: Per Google Ads campaign, judge from the advertiser's side whether bidding is set to chase VALUE (Maximize Conversion Value / Target ROAS) instead of just volume, whether the set target ROAS tracks the real ROAS, and whether the account has the conversion value + volume (15-30 conversions/30d) to support value bidding. Returns a status (on value bidding / eligible-not-using / not-eligible) + a plain executable recommendation per campaign. Use this skill whenever the user audits or inherits a Google Ads account, asks about value-based bidding, tROAS, Max Conversion Value, target vs actual ROAS, which campaigns should switch to value bidding, or whether the target ROAS is too tight/loose — even if they don't say "value bidding". This is Section 3 of the Acme account-audit cluster. Judges bid-strategy fitness ONLY; Quality Score, relevance, and the structure-vs-name check belong to the complementary audit skills.
---

# Value-Based Bidding Audit

## Goal (job-to-be-done)
Per **campaign**, answer three things from direct fields: is it on a **value strategy**
(Maximize Conversion Value / Target ROAS)? does the **set target ROAS track the real ROAS**? and
does the account even **have the conversion value + volume** to support value bidding? This is
**Section 3** of the Acme account-audit checklist. The unit of analysis is the **campaign**; the
output is a value-bidding status that yields a plain action (switch to value bidding, adjust the
target up/down, fix value tracking first, or keep).

- **Who:** media buyer / PPC manager auditing or inheriting an account. **When:** onboarding audit +
  periodic review.
- **Decision it drives:** switch a campaign to value bidding, adjust a too-tight / too-loose target
  ROAS, or — for accounts with no conversion value — leave the strategy alone and fix value tracking
  first (Section 2).
- **The differentiator:** the business-model branch. A no-value lead-gen account on Maximize
  Conversions is **correct**, not broken — the AI reads whether value is tracked before pushing a
  switch, instead of recommending value bidding everywhere.

## Scope
- ✅ **Bid-strategy fitness, campaign-level only.** Direct fields: strategy, set target ROAS, real
  ROAS, conversion value, conversions, spend. No inference, no scraping, no settings API.
- ❌ **Quality Score / relevance** → complementary audit skills (`metrics` + `alignment`).
- ❌ **Structure-vs-name** (does the campaign NAME match the strategy type) → `structure-audit`.
  This validates the strategy against **best practice + reality**, not against the account's own
  naming convention.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the one campaign-grain query + the two target-ROAS fields gotcha.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the three states, the 15-30 volume rule, the target-vs-actual check, the business-model branch.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per campaign, the **bidding strategy**, the **set target ROAS** (read from the field that
matches the strategy), the **real ROAS** (`conversion_value_per_cost`), **conversion value**,
**conversions**, and **spend** — all from one campaign-grain `query_data` call. No extra business
context required beyond what the fields carry (the one judgment is: does the account track value?).

**Process:** read per campaign over the last 30 days. Apply the rubric in
[`references/framework.md`](references/framework.md): (1) does the account track conversion value?
(2) enough volume (15-30 conversions)? (3) assign the status; (4) when on tROAS, run the
target-vs-actual check and surface the two numbers + the gap (do NOT assume which number is wrong —
sanity-check the unit first). Never push a switch on a campaign with no conversion value or thin
volume.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the value-bidding gap + the single
  action), `diagnosis` (where the money leaks — campaigns optimizing to count not dollars, or a
  target throttling spend), `action` (the highest-$ fix, where / what / why).
- `campaigns[]` — one per campaign, with its `status`, the strategy in plain words, the
  target-vs-actual block (when on tROAS), the volume vs the 15-30 floor, and an executable
  `recommendation {where, what, why}`.
- `rollup` — count + spend per status, and the 🟡 eligible-not-using opportunities ranked by spend
  (where switching to value bidding moves the most money).

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric+delta carried as data, never spelled out in prose; first sentence
> answers the heading, then names the driver; one bridge line to the next section. Plain language
> for a non-technical owner. Every recommendation is **Where · What to do (plain + the exact setting
> in parens) · Why** — no bare jargon ([cluster executable-finding rule](../README.md)).

## Example (illustrative — from real accounts, NOT rules)
- **On value bidding, suspicious target:** a Life campaign on `MAXIMIZE_CONVERSION_VALUE` with a set
  target of 37.2 (≈3720% ROAS) vs a real ROAS of 1.55 — a 24× gap → ✅ on value bidding, but surface
  both numbers and **verify the target** (shared portfolio target? internal value scale?
  misconfiguration?); do not assume which is wrong.
- **Not eligible — and that's correct:** Dental & Health on `MAXIMIZE_CONVERSIONS` with conversion
  value $0 → ⛔ not eligible. The fix is to add conversion values (Section 2), NOT a bid-strategy
  switch. A no-value lead-gen account on Maximize Conversions is right, not broken.
- **Brand on impression share:** a brand campaign on `TARGET_IMPRESSION_SHARE` that tracks value →
  🟡 note it; owning the SERP is often intentional — don't auto-flag it as "should be value bidding".
