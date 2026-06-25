# Google Ads Account Audit — assembled output template (gold standard)

This folder holds the **realized output** of the `account-audit` cluster: the single, client-ready
audit document that the 11 checks compose into. `audit-template.html` is the genericized
("Acme Insurance", synthetic data) gold-standard layout — open it in a browser to see the target.

> **Architecture note.** The *checks* (what to measure) live here in `porter-analysis/google-ads/account-audit/`.
> The *output layout* (how it's assembled) architecturally belongs to
> `porter-reporting/document-types/audit/` (currently a stub) — this template is the reference
> implementation until that layer is built out. Real client audits live OUTSIDE the repos
> (e.g. `~/Downloads/<client>-deliverable/`), never here — see `feedback_no_real_data_in_repos`.

## Document structure (top → bottom)
1. **Header** — account, window (performance vs comparison), settings-as-of, currency, connector lockup.
2. **Executive summary** — money headline → where it leaks → culprit + opportunity → "Do first".
3. **Scorecards** — spend, conversions, conv value, CPA, ROAS, value/conversion, each Δ vs prior period (meaning-colored).
4. **Severity + verdict legend.**
5. **Findings sections**, severity-ordered, each = heading + severity + verdict chip + lead (decision-first) + findings table (Entity · State · Evidence · Where/What/Why) + a callout. The full set:
   1. Conversion tracking (is bidding optimizing toward down-funnel events?)
   2. Bid strategy — target vs actual (30d)
   3. Quality Score (3 pillars) + **real ad-copy read**
   4. Budget allocation (efficiency × budget-lost vs rank-lost, 90d)
   5. Landing pages / message match (CRO, scraped)
   6. Audience & demographics (age bid adjustments)
   7. Search terms & negatives (**n-gram** waste buckets)
   8. Ad assets / extensions
   9. Device & ad schedule
   10. Geography (provinces)
   11. Demand Gen
6. **What's already set up right** (confirm the clean fundamentals — location, networks, offline import, landings).
7. **Prioritized action plan** — highest-$ fixes, ranked.
8. **Footer + method & caveats.**

## Quality rubric ("objectively better")
- **Coverage:** 8 checklist sections + device + geo + dayparting + n-grams + real ad copy + Demand Gen.
- **Grounding:** every number traces to a Porter `query_data` pull; every page claim to a scrape; **zero fabricated values**.
- **Actionability:** every finding ends in a `Where / What / Why`, ranked by money at stake (aspirin, not vitamin).
- **Honesty:** data gaps flagged, never faked; ambiguous values flagged "verify in UI," not guessed.
- **Brand-adjusted:** separate brand vs non-brand, baseline on non-brand, treat brand as defense — see
  [`_framework/brand-vs-nonbrand.md`](../../../../_framework/brand-vs-nonbrand.md). Reach/Ad-Rank reasoning
  follows [`_framework/ad-rank-and-impression-share.md`](../../../../_framework/ad-rank-and-impression-share.md).

## Build pipeline (how a real one is produced)
1. Resolve account (`list_accounts`), fingerprint campaign mix.
2. Run the per-check `query_data` pulls (see each sub-skill's `references/tools.md`); 90d for performance, 30d for settings/assets/bid-target, point-in-time for config.
3. Scrape the top landing pages (CRO) + n-gram the search terms + read the live RSA copy.
4. Synthesize into the `{synthesis, checks[{verdict, findings[{entity,state,evidence,recommendation}], rollup}]}` contract.
5. Render to a self-contained HTML deliverable (this layout; CSS scoped under `#audit` so it can drop into a Porter report).
6. **Adversarially verify** against the rubric (independent agents recompute numbers from raw data, hunt contradictions, check completeness + honesty) BEFORE delivering.
7. (Optional) publish into a Porter report: `get_report_template('blank')` → `create_report` (tiny placeholder) → `write_report_file` the page HTML + scoped CSS. Static/baked, `/* porter:no-compare */`, `<meta charset="utf-8">`.

## v1 → v2 lessons (baked in — don't repeat these mistakes)
- **Read the actual ad copy before judging it.** v1 said "rewrite the best/compare ads"; the copy was already strong — the real issue was *structural* (a consolidated ad group), not missing copy.
- **Pull the full search-term tail for waste, not just the top rows.** v1 estimated ~$8–10K of waste; the n-gram pass over ~1,500 terms found ~$96K zero-conv (≈$101K incl. sub-1-conv).
- **Label the window on every metric.** A 30d "actual ROAS" (bid-target check) and a 90d ROAS (budget check) for the same campaign look like a contradiction if unlabeled.
- **Don't over-claim asset states.** "Every asset is PENDING" was false (GOOD/LEARNING exist) — scope the claim to the ad groups under review.
- **"Zero conversions" ≠ "< 1 conversion."** State the strict figure, footnote the looser one.

## Data gaps — Google-Ads-UI-only (a desk audit can't close these)
Conversion/attribution settings (model, windows, primary/secondary toggles), Auction Insights,
the *exact* tROAS/tCPA value + unit, ad-asset fields (sitelink/snippet/image — connector unreliable),
Demand Gen asset-group detail (connector returns no rows). Flag these "verify in-account."
