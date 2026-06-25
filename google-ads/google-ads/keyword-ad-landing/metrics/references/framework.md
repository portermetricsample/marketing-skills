# Framework: Keyword / Ad / Landing Metrics

## Mission
For the SAME Search journey the alignment sibling judges, **surface the numbers** behind each stage
of the chain. At each link, print two things side by side: the **metric that the chain's quality
actually moves** (real behavior) and **Google's own grade** for that stage. **Unit of analysis = one
journey = campaign + ad group**, the same unit the alignment skill uses. Output = the metric + the
grade next to each link, never a score.

## Scope
- **YES — instrumentation.** Lay the real-behavior metric and Google's grade next to each stage.
- **NO — classification.** No bands, no benchmarks, no good/bad verdict. A CTR is a CTR. The reader
  (or the alignment verdict next to it) does the interpreting. Keeping it that way is the whole point
  and avoids the false precision the sibling was built to escape.
- **NO — relevance / message-match.** That is the **keyword-ad-landing-alignment** skill's job; this
  one only shows the figures it sits beside.
- **SEARCH campaigns only.** The four grades and Search Impression Share only exist / only mean
  anything on the Search auction. On PERFORMANCE_MAX, DEMAND_GEN, DISPLAY, VIDEO, APP the grades are
  absent and IS returns nothing. Run the campaign-type coverage check first (step 0 of the alignment
  skill) and report uncovered spend rather than printing zeros.

## The metric map — what prints at each stage
This is the rubric: which metric and which grade belong to each link, and at what grain each lives.

| Stage | Real behavior | Google's grade (diagnosis) | Grain it prints at |
|---|---|---|---|
| **Keyword / SERP** | Impressions; Search Impression Share (Top %) + rank-lost / budget-lost | **Quality Score** (1–10, gated by the `≤ 10` check) | keyword (QS) · campaign (IS) |
| **Ad** | **CTR** | **Ad Relevance**; **Expected CTR** | keyword (grades) · ad (CTR) |
| **Landing** | **CVR** = conversions / clicks | **Landing Page Experience** | keyword (grade) · ad (CVR) |

`cost` rides along in every pull for ONE purpose: rank journeys by dollars at stake. It is never a
quality metric here.

Two things to know about the grades:
- **Quality Score** is `1–10`; the other three (**Ad Relevance**, **Expected CTR**, **Landing Page
  Experience**) come back as **BELOW_AVERAGE / AVERAGE / ABOVE_AVERAGE**, not numbers. The three
  categorical grades are **dimensions** and read reliably at any grain.
- All four are attributes Google computes **per keyword** (they live in `keyword_view`). So even
  though Ad Relevance "belongs to" the ad stage and Landing Page Experience to the landing stage,
  they print next to the **keyword**, not next to each individual ad or page. **CTR and CVR**, by
  contrast, are real behavior and live at the **ad** level.

## The Quality-Score aggregation trap (validated, must-handle)
`historical_quality_score` is a **metric, and Porter SUMS it** across the rows that collapse into a
group. Validated live: grouping a keyword above its raw criterion grain returned QS **124** and
**29** — not 1–10. So:
- **Only trust the numeric QS at one-row-per-keyword grain** (keyword text + match type, fine enough
  that each keyword resolves to a single criterion). If it comes back **> 10 it has been summed →
  discard the number or re-pull finer.**
- The **three categorical grades are safe** at any grain — lead with them; treat the numeric QS as
  secondary and gate it on the `≤ 10` sanity check.
- **CTR also aggregates** as a metric — if grouped coarsely, recompute `clicks / impressions`
  yourself rather than trusting the native `google_ads_ctr`.

## How it pairs with the alignment skill
Same unit (one journey = campaign + ad group), same three stages, same scope. When both run for a
report, each stage shows the alignment verdict AND its numbers together:

```
Journey: <campaign> › <ad group>
  Keyword/SERP   alignment: <Aligned/Needs review/Broken>   metrics: QS, Impressions, Impression Share
  Ad             alignment: <Aligned/Needs review/Broken>   metrics: CTR, Ad Relevance, Expected CTR
  Landing        alignment: <Aligned/Needs review/Broken>   metrics: CVR, Landing Page Experience
```

The causal read is left to the human: e.g. alignment **Aligned** at the landing but a very low CVR
means the concordance is fine and the problem is elsewhere (offer, price, UX). This skill only lays
the two facts next to each other.

## How to print it
- **Per keyword** (in the journey's intent list): the three Below/Average/Above grades, plus QS
  (1–10) only when it passes the `≤ 10` check.
- **Per ad:** CTR and CVR (with the click / conversion counts beside them).
- **Per campaign** (once, as context above its journeys): Impression Share (Top %) with the
  rank-vs-budget split.
- Keep `cost` visible only to order the output by spend.

## Guardrails (do NOT skip)
- **Don't classify.** Print the numbers; let the alignment verdict and the reader interpret. No
  "good/bad", no thresholds.
- **Sanity-check the numeric QS (`≤ 10`).** It is a summing metric; a value above 10 is an
  aggregation artifact, not a real score. Lead with the categorical grades.
- **Flag thin volume, don't judge it.** A CTR or CVR on a handful of clicks is noise — annotate the
  click / conversion count next to the ratio so the reader knows when a number isn't yet trustworthy.
  That's a note, not a verdict.
- **`conversions`, not `all_conversions`** for CVR (primary actions = the Google Ads UI). Disclose
  the choice; offer `all_conversions` if the user wants phone / store / cross-device.
- **Grades are historical and can be missing.** New or low-volume keywords may return no grade → show
  it as blank, not as a zero.
- **Use the `*_top_*` Impression Share variants.** The plain `*_impression_share` fields also exist,
  but this skill wants top-of-page IS — so use `*_top_*` (and `*_absolute_top_*`) on purpose.
