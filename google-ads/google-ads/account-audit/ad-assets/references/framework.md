# Framework: Ad Extensions (Assets) Audit

## 1. Business question
> Does the account have the four essential extension types **active** — Sitelinks, Callouts,
> Structured Snippets, Images — and which are missing?

## 2. The signals (one field per asset type — query each TYPE separately)
| Extension | Text/identity field | Status field (filter on this) |
|---|---|---|
| **Sitelinks** | `google_ads_asset_sitelink_asset_link_text` ✅ validated | `google_ads_asset_primary_status` |
| **Callouts** | `google_ads_asset_callout_asset_callout_text` ✅ validated | `google_ads_asset_primary_status` |
| **Structured Snippets** | `google_ads_asset_structured_snippet_asset_*` (header/values) — confirm name via `list_fields("structured snippet")` at run time | `google_ads_asset_primary_status` |
| **Images** | `google_ads_asset_image_asset_*` — confirm via `list_fields("image asset")` | `google_ads_asset_primary_status` |

## 3. The decision logic
For each essential type, run its own query (last_30_days), keep rows whose
`asset_primary_status` is **active** (NOT `REMOVED`/`NOT_ELIGIBLE`), and count them:
- **count > 0 → ✅ present.**
- **count = 0 → 🟡 missing.**

This is **account-level**: presence of the type anywhere in the account. Per-campaign coverage
("which campaigns lack sitelinks") is **deferred** — the asset↔campaign join returns blanks
(validated), so don't promise it.

## 4. Output contract — one row per essential type (content only)
> **Executable + plain ([cluster rule](../../README.md)).** Name the **exact extension type** that's
> missing (account-level — per-campaign is deferred) and the **exact change**, for a non-technical
> owner as **What to do (plain + examples) · Why** — no bare jargon. e.g. *"You have no active
> Callouts — add 3-4 short selling points (e.g. Free Trial, No Credit Card) so your ads take up more
> space and get more clicks."*
> Layout/visuals = `porter-reporting`, NOT here.
1. **Extension type** — Sitelinks / Callouts / Structured Snippets / Images.
2. **Present?** — count of active assets (status-filtered).
3. **Verdict** — ✅ present / 🟡 missing.
4. **Recommendation** — when missing, "add {type}" with concrete examples (Acme's): Sitelinks →
   Pricing/Features/Demo; Callouts → Free Trial/No Credit Card/24-7; Structured Snippets → features
   or services; Images → product screenshots.

**Roll-up:** the missing types as the action list ("add Structured Snippets and Images").

## When it applies / when it does NOT
- **Applies to:** any account — presence of the 4 essential types is universal hygiene. Scope is
  **account-level**, **active assets only** (status-filtered), **≤ 30-day** window.
- **Does NOT apply / caveat:**
  - **Per-campaign coverage** ("which campaign lacks sitelinks") — deferred; the asset↔campaign join
    returns blank, so don't promise it.
  - **Image extensions** aren't eligible for every vertical/account (some are auto-disallowed) —
    when Images come back empty, say "none active (may be ineligible for this account)", not a hard fail.
  - **PMax / Demand-Gen assets** are a different asset model (asset groups) — this check is about the
    classic Search **extensions**; don't conflate PMax creative assets with missing Search extensions.
  - **Copy quality** is out of scope — it confirms a type exists, not whether the text is good.

## 5. Gotchas (validated live)
- **One asset type per query** — sitelink + callout in the same query → callout column blank.
- **No `campaign_name`** in the asset query — it returns blank asset text. Presence is account-level.
- **Status filter is mandatory** — `asset_primary_status` is mostly `REMOVED`; count only active.
- **30-day cap** — asset queries reject ranges older than 30 days (`last_month` errored "too old");
  use `last_7_days` / `last_30_days`.
- **Counts presence, not quality** — it confirms the type exists, not whether the copy is good.
