---
name: ad-extensions-assets-audit
description: Check that a Google Ads account has the four essential ad extensions ACTIVE — sitelinks, callouts, structured snippets, image assets — and flag the missing ones. Use this skill whenever the user audits a Google Ads account, mentions ad extensions, ad assets, sitelinks, callouts, structured snippets, image assets, "are my extensions on", or asks why ads take up little space / get a low CTR — even if they don't say "extensions". This is Acme audit check #8. Judges ACCOUNT-LEVEL PRESENCE of each type ONLY; the COPY quality of each extension, and per-campaign coverage, are out of scope.
---

# Ad Extensions (Assets) Audit

## Goal (job-to-be-done)
Confirm the account is running the four essential extension types — **Sitelinks, Callouts,
Structured Snippets, Image assets** — and name the ones that are missing. Each present type lifts
CTR (Acme: +10-15%); a missing type is free real estate the ads aren't claiming. The unit of
analysis is the **extension type at account level**: present (active assets > 0) or missing.

- **Who:** media buyer / PPC manager auditing or inheriting an account. **When:** onboarding audit + periodic hygiene.
- **Decision it drives:** which extension type to add (each one makes the ad bigger and lifts CTR).
- **The differentiator:** it counts only **active** assets (status-filtered), so it never "finds"
  extensions that are `REMOVED` and not actually serving — the trap of a naive presence check.

## Scope
- ✅ **Account-level PRESENCE of the four essential types** — count of active assets per type.
- ❌ **Copy quality** of each extension (is the text good?) → out of scope; this confirms a type exists, not that it reads well.
- ❌ **Per-campaign coverage** ("which campaign lacks sitelinks") → deferred; the asset↔campaign join returns blank (gotcha 2).
- ❌ **PMax / Demand-Gen creative assets** (asset groups) — a different asset model; this is classic Search extensions.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — one query per asset type, status-filtered.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the per-type signals, the present/missing logic, the 4 gotchas, when it does NOT apply.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per essential type, the **count of active assets** of that type (status-filtered),
pulled by one query per type (Sitelinks, Callouts, Structured Snippets, Images). No business
context required beyond the account itself; presence is account-level.

**Process:** run **one query per asset type** (last_30_days), keep rows whose
`asset_primary_status` is **active** (drop `REMOVED` / `NOT_ELIGIBLE`), count them. Apply the
present/missing rubric in [`references/framework.md`](references/framework.md): count > 0 → present;
count = 0 → missing. Image assets coming back empty → "none active (may be ineligible for this
account)", not a hard fail.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (how many of the four essential types are
  active and the single action), `diagnosis` (which types are missing — the free real estate the
  ads don't claim), `action` (the highest-leverage type to add, where / what / why).
- `extensions[]` — one finding per essential type, with its `verdict` (present / missing), its
  active count, and a `recommendation` when missing.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — question heading the data
> answers yes/no; the metric carried as data, never spelled out in prose; first sentence answers
> the heading, then names the driver. Plain language for a non-technical owner — name the exact
> extension type and the exact thing to add, never bare jargon.

## Example (illustrative — NOT rules)
- **Missing Callouts:** the account runs no active Callouts → `missing` → "add 3-4 short selling
  points (e.g. Free Trial, No Credit Card) so your ads take up more space and get more clicks."
- **Present but mostly REMOVED:** Acme Insurance had sitelinks (Get Started, Contact Us, Smokers…) but
  most were `REMOVED`; the **active** count is what decides present vs missing.
- **Images empty:** not a hard fail — "none active (may be ineligible for this account)", since
  image extensions aren't eligible for every vertical.
