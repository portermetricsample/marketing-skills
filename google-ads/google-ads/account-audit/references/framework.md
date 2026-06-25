# Framework — how the audit is orchestrated

The per-check **rubrics** (thresholds, verdicts) live in each `account-audit/<check>/references/framework.md`
and are NOT repeated here. This file is the **conductor's brain**: which checks run, in what order, how
they combine into one ranked story, and the gates that keep it honest.

## 1. Which checks, and the order they run (dependency-sorted)
Producers before consumers; cheap config before expensive scrape.
1. **Fingerprint** (campaign mix) → decides applicability.
2. **Conversion tracking** first — it explains "ROAS 0 / no value" everywhere downstream; its value-gap
   gates value-based-bidding.
3. **Performance + settings checks** (reuse the fingerprint metrics): spend-allocation, bid-strategy,
   value-based-bidding, campaign-settings, quality-score, audience-demographics, device & dayparting,
   geography, ad-assets.
4. **Search terms & negatives** — n-gram the full tail (`scripts/ngram.py`).
5. **Landing-cro last** (it scrapes; slowest, and depends on the high-spend URL list from the ads pull).

## 2. Brand vs non-brand (mandatory, before any efficiency claim)
Separate the brand campaign(s) from non-brand **first**. Brand conversions are demand *capture*, not
*generation* — blending them flatters the account. **Baseline on non-brand; treat brand as defense**,
exclude it from spend-allocation baselines, never flag it as a "scale" winner. Report the blended number
AND the non-brand number when they tell different stories (they usually do). See
[`brand-vs-nonbrand`](../../../_framework/brand-vs-nonbrand.md). Reach/Ad-Rank reasoning (budget-lost vs
rank-lost IS) follows [`ad-rank-and-impression-share`](../../../_framework/ad-rank-and-impression-share.md).

## 3. Severity = money at stake (how findings are ranked)
Every finding carries a severity by the **dollars exposed** (wasted spend, mis-set targets, missed
conversions, mis-allocated budget):
- 🔴 **HIGH** — the biggest money: a value/tracking gap on a large spender, a capped efficient campaign,
  a device/segment running well below baseline on a large share of spend.
- 🟠 **MED** — meaningful but smaller, or a fix that needs a decision (loose target, QS weak spot, negatives).
- 🟡 **LOW** — tune-ups / monitor (geo nudges, dayparting, minor demographics, asset completeness).
The document orders **sections by severity, not by §-number**, then numbers them 01, 02, … in that order.
Aspirin, not vitamin: every finding ends in a `Where · What · Why` action.

## 4. Negatives are a RELEVANCE call, never a performance one
A relevant-but-zero-conversion term (we sell it) is a **diagnose** item (bid/landing/match), NOT a
negative. Only **off-vertical / competitor / informational** terms become negatives. Brand terms belong
to the brand-defense logic. Do not turn "$X of zero-conversion spend" into "$X of waste to cut" — split
the true-negative buckets out (usually a fraction of the zero-conv total). See
[`search-terms/relevance`](../../search-terms/relevance/) (the "performance trap").

## 5. The executive synthesis arc (the opener)
After the checks, weave one 3–5 sentence story, in this arc (per [`writing.md`](../../../_framework/writing.md)):
1. **Money headline** — period-over-period ("spend ▲12% but ROAS fell 2.28→1.88 — more conversions, each
   worth less").
2. **Where it leaks** — the funnel stage / the real driver (and de-bias it: is the headline a brand-value
   artifact? then say non-brand actually moved the other way).
3. **Culprit + opportunity** — named ("Health & Dental carry no value; the capped 2.87× campaign is the
   clearest place to add budget").
Then a **Do-first** line (the 2–3 highest-leverage moves). Lead with the story; the sections prove it.

## 6. The verify gate (run BEFORE rendering/deploy)
Treat the draft adversarially:
- **Recompute** the headline numbers (spend, conv, value, CPA, ROAS, the non-brand split) from the raw
  pulls — they must reconcile.
- **Label every metric's window** (a 30-day actual vs a 90-day ROAS for the same campaign looks like a
  contradiction unlabeled).
- **Brand separated?** No brand campaign in a non-brand baseline.
- **Every gap flagged** "verify in-account"; **zero fabricated values**; "0 conversions" ≠ "<1 conversion".
- **Ad copy actually read** before judging it; **asset states** not over-claimed.
If anything fails, fix it before rendering.

## 7. Applicability / graceful degradation
Each section runs **only if its data exists**. PMax-only → no keyword/search-term/QS sections (say so);
no conversion value → value-based-bidding is N/A (the correct state); scrape blocked → landing = "needs
review"; connector target missing → "no target set". Emit a one-line "n/a — <reason>" or
"verify in-account" and **omit the empty section block** — never invent a section to fill the layout.

## 8. What "good" looks like (the rubric the deliverable is graded against)
- **Coverage:** the checklist sections that apply + device + geo + dayparting + n-gram waste + real ad
  copy + Demand Gen (when present).
- **Grounding:** every number traces to a Porter pull; every page claim to a scrape; **zero fabricated values**.
- **Actionability:** every finding ends in `Where · What · Why`, ranked by money.
- **Honesty:** gaps flagged, ambiguous values marked "verify in-account", brand separated.
