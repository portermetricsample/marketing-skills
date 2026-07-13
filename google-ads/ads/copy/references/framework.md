# Framework: RSA Strength & Headline Diversity Audit

## 1. Business question
> Per ad group: are its Responsive Search Ads built to win the auction — strong **Ad Strength**,
> **diverse non-redundant headlines**, and **pinning that doesn't strangle rotation**? Which ads /
> headlines should be fixed?

## 2. The signals (direct fields)
- **Ad Strength:** `google_ads_ad_group_ad_ad_strength` → `POOR` / `AVERAGE` / `GOOD` / `EXCELLENT`.
- **Headline list:** `google_ads_ad_group_ad_ad_responsive_search_ad_headlines` — each item has:
  - `text` — the headline copy (judge diversity / near-duplicates here).
  - `assetPerformanceLabel` — `PENDING` / `LEARNING` / `LOW` / `GOOD` / `BEST`.
  - `pinnedField` — `HEADLINE_1` / `HEADLINE_2` / `HEADLINE_3` / null.
- **Google's recommendations:** `google_ads_ad_group_ad_action_items` (supporting evidence).
- **Serving volume:** `google_ads_impressions` (rank ads; weight high-impression ads).

## 3. The reading (per ad, ranked by impressions)
1. **Ad Strength distribution.** Map the account's mix of POOR / AVERAGE / GOOD / EXCELLENT. Flag
   every ad at **POOR** or **AVERAGE** — those leave auction performance on the table. GOOD/EXCELLENT pass.
2. **Pinning.** Any non-null `pinnedField` limits Google's rotation. The classic drag: the **brand
   (or a generic line) pinned to `HEADLINE_1`** → the ad always leads with it, so Google can't test
   combinations and strength stays AVERAGE. → flag `over_pinned`. (A genuine legal/disclaimer pin is
   acceptable — note it, don't always recommend unpinning.)
3. **Headline diversity / near-duplicates.** Scan `text` across the list for near-identical lines
   (same root, reworded — "X Software" / "X App" / "X Platform"). Two near-duplicates can serve
   together, wasting an asset slot and looking redundant to the searcher. → flag `duplicate_headlines`
   (recommend pinning to control which serves, or rewriting one to a distinct benefit).
4. **Asset count.** Too few headlines (well under the ~8–15 Google rewards) caps strength on its own.
   → flag `few_assets`.
5. **Per-asset labels.** When `assetPerformanceLabel` is populated: `LOW` = replace-candidate; `BEST`
   / `GOOD` = keep. When `PENDING` / `LEARNING`: **say "not enough data yet"** — do not call the
   headline weak.
6. **Action items.** Use `action_items` as corroboration ("Google itself flags this ad"), never as
   the lone verdict.

## 4. Sanity-checks / traps (mandatory)
- **PENDING ≠ weak.** A `PENDING` / `LEARNING` label means insufficient data, not a bad headline.
  Never emit a `LOW`-based replace on a PENDING label. Widen the window before judging per-asset.
- **Pinning isn't always bad.** A legal disclaimer or required phrase can justify a pin. Flag the
  *pattern* (brand/generic pinned to slot 1) — not every pin.
- **Diversity is a `text` judgment, not a label.** Google's labels won't tell you two headlines are
  near-duplicates — read the copy.
- **PMax has no RSA headlines.** This applies to **Search RSAs**. If a row is PMax / asset-group,
  note it as out of scope, don't force a verdict.
- **Rank by impressions.** A POOR ad with no impressions is low priority; a POOR ad serving heavily
  is the first fix.

## 5. Output contract (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact ad group + the exact headline move.
1. **Identity** — ad group · Ad Strength · headline count · impressions.
2. **Issues** — the flags that apply: `low_strength` / `over_pinned` / `duplicate_headlines` / `few_assets`.
3. **Verdict** — `strong` / `needs_work`.
4. **Recommendation** — plain + exact ("unpin the brand headline on `<ad group>` so Google can
   rotate — that's what's holding strength at Average"; or "rewrite one of the two near-identical
   'X Software' / 'X App' headlines to a distinct benefit").

**Roll-up:** the strength mix, the weakest ads by impressions, the top fixes by leverage.

## 6. When it applies / when it does NOT
- **Applies to:** Search campaigns running **Responsive Search Ads**.
- **Does NOT:** PMax / Demand-Gen asset groups (no RSA headlines field — note separately); ad
  **extensions/assets** presence → [`ad-extensions-assets-audit`](../../ad-assets/); **message-match** to
  the keyword/landing → the [`keyword-ad-landing`](../../../keyword-ad-landing/) cluster; creative angle
  ideation (open-ended judgment). Keep the boundary — this grades **build quality of the copy**, not
  its outcomes (CTR/CVR) and not its relevance to the search.
