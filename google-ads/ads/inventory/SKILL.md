---
name: google-ads-creative-inventory
description: Map a Google Ads account's SEARCH creative into a clean, structured graph — every ad (id + name) and below it its variations (headlines and descriptions), each with its pin position, character length, Google performance label, and its own impressions/clicks/conversions/cost, plus the extensions linked to it. This is the PRODUCER of the per-account `creative_graph` that every other creative skill (performance, copy-hygiene, rewrite) consumes. Use this skill whenever the user wants to inventory / structure / map their ad copy, asks "what headlines and descriptions am I running", needs the relationship between ads and their assets, or is starting any creative audit — even if they don't say "inventory". Maps and structures ONLY; it does NOT judge performance, repetition, or copy quality (those are the consumer skills). Search/RSA first; PMax & other types are documented in references/campaign-types.md.
---

# Google Ads — Creative Inventory (the creative graph)

## Goal (job-to-be-done)
Turn the account's scattered ad assets into **one structured creative graph**: the ad as the
parent (id, name, type, ad strength, final URL, tracking), and **below it its variations** —
`headlines[]` and `descriptions[]` — each carrying its pin position, character length, Google
performance label, and its own served metrics (impressions, clicks, conversions, cost). It also
attaches the **extensions** linked to each campaign/ad group.

The emitted JSON includes the **`creative_graph`** that the deterministic scripts of the OTHER
creative skills (`performance`, `copy-hygiene`, `rewrite`) consume — this skill is its
**producer**, exactly as [`structure-map`](../../account-structure/structure-map/) produces the
[`account_profile`](../../../_framework/account-profile.md).

- **Who:** any marketer / media buyer auditing or reporting on ad copy.
- **When:** the first step of any creative analysis; cached per account, re-pull when ads change.
- **Decision it drives:** nothing on its own — it gives every downstream creative skill a single,
  correct, structured view so they never re-pull or re-join the data.
- **The differentiator:** it emits **two views** — the **tree** (ad → its variations: the
  relationships) and the **rollup** (each unique headline/description aggregated across every ad
  that uses it: the basis for performance). Structure is read from each ad's authoritative
  `responsive_search_ad` arrays (≤15 H / ≤4 D), NOT from the asset view (which over-reports);
  per-asset metrics are joined on by text, and each asset is tagged `served` (impr > 0).

## Scope
- ✅ **Map + structure** Search (RSA) creative into the graph: ads, their headlines/descriptions
  (pin, char length, perf label, per-asset metrics), and linked extensions. Plus legacy
  Expanded/Text ads as a flat fallback.
- ✅ **Optionally label segments** (brand / competitor-conquest / generic) per ad group when an
  [`account_profile`](../../../_framework/account-profile.md) is supplied — so downstream
  benchmarks can be segment-aware. Degrades to `unknown` without a profile.
- ❌ **Judge anything** — winners/losers (`performance`), repetition/character waste/pinning
  (`copy-hygiene`), rewrites (`rewrite`), message→landing match (`keyword-ad-landing/alignment`),
  extension *presence* gaps (`account-audit/ad-assets`). This skill only structures.
- ❌ **PMax / Demand Gen / Display / Video / Shopping / App creative** — different asset models;
  Search is built first. Where each type's creative lives and what's reachable is documented in
  [`references/campaign-types.md`](references/campaign-types.md) so consumers know the boundary.

## Components (read these references as needed)
- **Tools / data plan:** [`references/tools.md`](references/tools.md) — the 3 GAQL pulls and **why
  this skill uses `report.query` (GAQL) instead of `query_data`** (asset text is not in the
  reporting fields).
- **Framework / rubric:** [`references/framework.md`](references/framework.md) — the brain: the
  graph model, tree vs rollup, what's universal (code) vs profile, the served-only rule, gotchas.
- **Campaign-type nuances:** [`references/campaign-types.md`](references/campaign-types.md) —
  where creative lives per campaign type (Search/RSA, PMax, Demand Gen, Display, Video, Shopping,
  App, legacy) and exactly what is reachable. **Read this to understand PMax & the others.**
- **Output schema:** [`references/output.md`](references/output.md) — the JSON this skill emits
  (the `creative_graph` + a small synthesis).
- **Deterministic core:** [`scripts/process.py`](scripts/process.py) +
  [`scripts/query.json`](scripts/query.json) — the merge/aggregate runs as code, not by the model.

## Operate

**Input (per account):** the raw results of the GAQL pulls in
[`references/tools.md`](references/tools.md) — **Q_CREATIVE** (each ad's authoritative
`responsive_search_ad` headline/description arrays + container), **Q_METRICS** (per-asset metrics
from the asset view, used only to join by text), and **Q_EXT** (extensions). Optionally the
account's `account_profile` (from `structure-map`) for segment labels.

**Process (split brain):**
1. **Deterministic merge → [`scripts/process.py`](scripts/process.py).** Feed it the saved GAQL
   result files. It builds the **tree** from each ad's `responsive_search_ad` arrays (the truth —
   NOT the asset view, which over-reports), joins per-asset metrics by `(ad_id, field, text)` and
   tags each asset `served` (impr > 0), builds the **rollup** (aggregate each unique `field+text`
   across ads), computes char length vs the per-type limit, flags DKI, attaches extensions, and —
   if a profile is given — tags each ad group's segment. All universal: any account, any industry.
2. **LLM step (thin).** The model does NOT re-structure. It only writes the 3-line `synthesis`
   and, if no profile was supplied, may add a best-effort segment guess (clearly marked
   `inferred`). Apply [`references/framework.md`](references/framework.md).

**Emit** the JSON in [`references/output.md`](references/output.md): `synthesis` (3 strings) +
`creative_graph` (`tree`, `rollup`, `extensions`, `coverage`). **Pure data — no emojis, tables,
markdown, or colors.** A renderer (porter-reporting) turns it into the human view.

> **Voice (link, don't copy):** narrative lines per
> [`../../../_framework/writing.md`](../../../_framework/writing.md) — plain language for a
> non-technical owner; name the exact ad / asset, never bare jargon.

## Example (illustrative — fictional Acme Insurance, NOT rules)
- **Tree:** ad `111111111111` ("Term Life" ad group, RSA, strength EXCELLENT, → /term-life) → 15
  headlines (one pinned to position 1) + 4 descriptions, each with its 30-day impressions/clicks/conv.
- **Rollup:** "Acme Insurance" (headline) appears in 5 ad groups → one rollup row, 10,176 impr
  summed, `pinned_somewhere: true`.
- **Coverage:** account is 100% Search → `tree` complete; a PMax campaign would appear in
  `coverage.not_mapped` with reason "PMax creative lives in asset groups — see campaign-types.md".
