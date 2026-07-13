# Framework: UTM Tagging Hygiene (presence · consistency · dynamic term)

## 1. Business question
> Are paid-search clicks **tagged** so GA4 and the CRM can attribute each one back to the campaign /
> keyword that drove the contact — and is the scheme consistent enough to actually join on?

## 2. The signals (direct fields — parsed from the final URL)
> Two queries, joined by `campaign_name` — the `utm_*` fields **cannot be combined** with
> `ad_group_ad_ad_final_urls` (verified). See [`tools.md`](tools.md).
- **Tagging read:** `google_ads_utm_source`, `google_ads_utm_medium`, `google_ads_utm_campaign`,
  `google_ads_utm_term`, `google_ads_utm_content` — the five parsed UTM params (+ `campaign_name`, `cost_micros`).
- **URL evidence (separate query):** `google_ads_ad_group_ad_ad_final_urls` — the raw final URL(s);
  confirms a bare URL and shows the scheme (+ `campaign_name`).
- `google_ads_cost_micros` — spend, for ranking by dollars.

## 3. The decision logic (per campaign)
A three-step ladder; the first failing step sets the verdict.

1. **Presence** — are the UTM fields populated at all?
   - **All five blank** across the campaign → 🔴 `untagged`. GA4/CRM get no source for these clicks.
   - At least the core params (`source` + `medium` + `campaign`) populated → continue.
2. **Consistency** — is the scheme uniform across campaigns, or ad-hoc?
   - Same casing / naming convention for `utm_campaign` (and `source`/`medium`) across the account →
     pass. Mixed conventions for the same logical campaign (e.g. `brand` vs `Brand_2026`,
     `cpc` vs `ppc`) → 🟡 `inconsistent`. The CRM splits one campaign into many rows.
3. **Dynamic term** — is `utm_term` a **dynamic** value (the keyword, e.g. `{keyword}`) rather than a
   static string repeated on every ad? A static `utm_term` → 🟡 `inconsistent` (the keyword is lost).
4. **Pass all three** → 🟢 `tagged`.
5. **Rank by spend** — the highest-spend untagged / inconsistent campaigns surface first.

## 4. The recommendation (always both layers)
- **Auto-tagging (GCLID)** — turn on auto-tagging so Google can hand GA4/CRM a click id to join on.
  This is the machine-readable layer that survives even when manual UTMs are missing.
- **A consistent manual UTM scheme** — one casing/naming convention across the account, with a
  **dynamic `utm_term` (`{keyword}`)** so each contact carries the keyword that drove it.
- Why both: this is what lets the CRM join a member back to the campaign **and** keyword — which in
  turn **unblocks the offline-conversion loop** in [`conversion-tracking`](../../conversion-tracking/)
  (you can't import a conversion against a campaign the CRM can't identify).

## 5. Sanity-checks / traps
- **Blank ≠ error** — an empty `utm_*` is the signal (param absent from the URL), not a failed query.
- **Populated `utm_term` is not enough** — check it's dynamic, not the same literal on every ad.
- **Inspect the raw final URL** — partial/blank params usually trace to a missing query string or a
  malformed scheme; confirm against `ad_group_ad_ad_final_urls` before calling a campaign untagged.
- **GCLID vs UTMs are complementary** — never recommend one as a replacement for the other.
- **Don't judge the destination page** — the page content is `landing-cro` / alignment skills; here
  we only judge the tags on the link.

## 6. Output contract (content only)
> Executable + plain ([cluster rule](../../README.md)). Name the exact campaign + the exact scheme move.
1. **Identity** — campaign · spend · a representative raw final URL.
2. **Presence / consistency / term** — `has_utms` + a `scheme_note` describing what's off.
3. **Verdict** — 🟢 tagged / 🟡 inconsistent / 🔴 untagged.
4. **Recommendation** — plain + exact ("turn on auto-tagging and add a consistent `utm_*` scheme on
   `<campaign>` so the CRM can see which campaign and keyword sent each lead").

**Roll-up:** coverage (% of spend on tagged campaigns), the account verdict, and the highest-$ fixes.

## 7. When it applies / when it does NOT
- **Applies to:** any account whose CRM / GA4 attribution depends on tagged ad URLs.
- **Does NOT:** judge conversion-action setup or values (→ `conversion-tracking`), GA4 configuration
  (different connector), or landing-page content (→ `landing-cro` / alignment). Pairs with
  `conversion-tracking` — UTM hygiene unblocks its offline-conversion loop; keep the boundary.
