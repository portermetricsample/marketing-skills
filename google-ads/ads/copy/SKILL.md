---
name: rsa-strength-copy-diversity-audit
description: For each Google Ads ad group, judge whether its Responsive Search Ads are built to win the auction — strong Ad Strength, diverse non-redundant headlines, and pinning that doesn't strangle rotation. Use this skill whenever the user audits a Google Ads account, mentions Ad Strength, responsive search ads, RSAs, ad copy, headlines, pinned headlines, duplicate / near-identical headlines, "why is my Ad Strength Poor", or asks which ads to rewrite — even if they don't say "ad copy". Judges the AD COPY ITSELF (strength + headlines + pinning) ONLY; ad EXTENSIONS/assets belong to the complementary `ad-extensions-assets-audit` skill, and message-match to the keyword/landing belongs to the `keyword-ad-landing` cluster.
---

# Ad Copy — RSA Strength & Headline Diversity

## Goal (job-to-be-done)
Per ad group, answer the client's question: are the Responsive Search Ads strong enough to win the
auction? Read each RSA's **Ad Strength** rating, judge whether its headlines are **diverse** (not
near-duplicates that risk serving two near-identical lines together), and flag **pinning** that
limits Google's rotation. The unit of analysis is the **ad** (inside its ad group); the output is a
strength/diversity verdict + the exact headlines to fix or unpin.

- **Who:** media buyer / PPC manager. **When:** onboarding audit + periodic creative hygiene.
- **Decision it drives:** which ads to rewrite, which headlines to replace (LOW labels) or keep
  (BEST), which pins to remove so Google can rotate.
- **The differentiator:** it doesn't just report the Ad Strength chip — it explains *why* it's
  weak (over-pinning, near-duplicate headlines, too few assets) and names the exact headline to act
  on, using Google's own `action_items` as supporting evidence.

## Scope
- ✅ **Ad Strength rating** (POOR/AVERAGE/GOOD/EXCELLENT), **headline diversity / near-duplicates**,
  **pinning** that limits rotation, **per-asset performance labels** when populated.
- ❌ **Ad extensions / assets presence** (sitelinks, callouts, snippets, images) →
  complementary [`ad-extensions-assets-audit`](../ad-assets/).
- ❌ **Message-match** to the keyword / landing page (does the copy deliver the search's promise?)
  → the [`keyword-ad-landing`](../../keyword-ad-landing/) cluster.
- ❌ **Creative angle ideation** (what new hook to write) — that's open-ended judgment, not this audit.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the ad-grain query: headlines (text + label + pin), Ad Strength, action items, impressions.
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the strength distribution, the pinning/duplicate/few-assets logic, the PENDING-label trap, when it does NOT apply.
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits.

## Operate
**Input:** per ad — `ad_strength`, the list of `responsive_search_ad_headlines` (each with `text`,
`assetPerformanceLabel`, `pinnedField`), `action_items` (Google's own ad recommendations), and
`impressions` to rank by serving volume. No business context required beyond the account itself.

**Process:** apply the rubric in [`references/framework.md`](references/framework.md). For each ad,
sorted by impressions desc: read the Ad Strength; flag POOR/AVERAGE. Scan the headline list for
**near-duplicates** (same root reworded — "X Software" / "X App") and for **pinning** (esp. a brand
pinned to HEADLINE_1, which limits rotation and drags strength). Count headlines — too few assets
is its own flag. Read `assetPerformanceLabel`: when PENDING, say "not enough data yet"; when
populated, LOW = replace-candidate, BEST = keep. Use `action_items` as supporting evidence, never
the sole verdict.

**Emit** the JSON in [`references/output.md`](references/output.md):
- `synthesis` — the canonical three strings: `headline` (the weakest high-impression ad + the one
  move), `diagnosis` (the account's dominant weakness — over-pinning vs duplicate headlines vs thin
  assets), `action` (the highest-leverage ad to fix, where / what / why).
- `ads[]` — one per RSA: `strength`, `headline_count`, `issues[]`, a `verdict`, and a
  `recommendation {where, what, why}`.

A renderer (the orchestrator's `formats/*`) turns this JSON into the human document. **Emit pure
data — no emojis, tables, markdown, or colors in the output.**

> **Voice (don't copy the rules, link them):** write every narrative line per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — the question the data answers
> yes/no; the metric/label carried as data, never spelled out in prose; first sentence answers the
> heading, then names the driver. Plain language for a non-technical owner ("unpin the brand
> headline so Google can test more combinations"), the technical setting in parentheses.

## Example (illustrative — NOT rules)
- **Over-pinned:** an RSA with Ad Strength `AVERAGE` and the brand pinned to HEADLINE_1 →
  `over_pinned` → `unpin_headline`: the pin blocks Google from rotating, capping strength.
- **Duplicate headlines:** two headlines "Acme Insurance Software" / "Acme Insurance App" that can
  serve together → `duplicate_headlines` → `replace_headline`: rewrite one to a distinct benefit.
- **Thin + pending labels:** an ad with only 4 headlines, all `assetPerformanceLabel: PENDING` →
  `few_assets` → `add_headlines`; don't call any single headline weak yet — there isn't enough data.
