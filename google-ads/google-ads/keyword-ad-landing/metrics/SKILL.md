---
name: keyword-ad-landing-metrics
description: >-
  Quantitative companion to the keyword-ad-landing-alignment skill. For the SAME Search journey
  (campaign + ad group), it prints the real-behavior metric and Google's quality grade at each
  stage of the chain: Quality Score + Search Impression Share at the keyword/SERP stage, CTR +
  Ad Relevance + Expected CTR at the ad, and CVR + Landing Page Experience at the landing. It
  SURFACES the numbers next to each link; it does NOT score, classify, or judge them — the
  relevance verdict is the alignment skill's job. Use it together with keyword-ad-landing-alignment
  whenever a Google Ads journey audit or report should show the metrics behind each stage. Google
  Ads SEARCH campaigns only.
---

# keyword-ad-landing-metrics

The quantitative half of the journey audit. Its sibling, **keyword-ad-landing-alignment**, reads
the search term, the ad and the landing and judges whether they tell one story (Aligned / Needs
review / Broken). This skill takes the SAME journey and, at each stage of the chain, prints two
things side by side: the **metric that the chain's quality actually moves** (real behavior) and
**Google's own grade** for that stage. That's all it does.

It does **not** classify. No bands, no benchmarks, no good/bad verdict. A CTR is a CTR. The reader
(or the alignment verdict next to it) does the interpreting. This is instrumentation, not analysis —
keeping it that way is the whole point and avoids the false precision the sibling skill was built
to escape. **It emits content only — visual rendering is handled by `porter-reporting` + the
design system, not here.**

## How it pairs with the alignment skill

Same unit of analysis (one journey = campaign + ad group), same three stages, same scope. When both
run for a report, each stage shows the alignment verdict AND its numbers together:

```
Journey: <campaign> › <ad group>
  Keyword/SERP   alignment: <Aligned/Needs review/Broken>   metrics: QS, Impressions, Impression Share
  Ad             alignment: <Aligned/Needs review/Broken>   metrics: CTR, Ad Relevance, Expected CTR
  Landing        alignment: <Aligned/Needs review/Broken>   metrics: CVR, Landing Page Experience
```

The causal read is left to the human: e.g. alignment Aligned at the landing but a very low CVR means
the concordance is fine and the problem is elsewhere (offer, price, UX) — this skill only lays the
two facts next to each other.

## Scope — SEARCH campaigns only

Same boundary as the sibling, and for the same reason plus a data one: the four Google quality
grades and Search Impression Share only exist / only mean anything on the Search auction. On
PERFORMANCE_MAX, DEMAND_GEN, DISPLAY, VIDEO and APP the grades are absent and Impression Share
returns nothing. Run the campaign-type coverage check first (it is step 0 of the alignment skill)
and report uncovered spend rather than printing zeros.

## The metric map — what prints at each stage

> ⚠️ Field names below are **validated against the live Porter catalog (Jun 2026)**. Both families
> exist — the plain `*_impression_share` AND the `*_top_*` / `*_absolute_top_*` variants. This skill
> uses the **`*_top_*`** variants on purpose: it wants top-of-page IS, not whole-SERP IS.

| Stage | Real behavior | Google's grade (diagnosis) | Porter fields |
|---|---|---|---|
| **Keyword / SERP** | Impressions; Search Impression Share (Top %) + rank-lost / budget-lost | **Quality Score** (1–10, ⚠️ aggregation caveat below) | `google_ads_impressions`, `google_ads_search_top_impression_share`, `google_ads_search_rank_lost_top_impression_share`, `google_ads_search_budget_lost_top_impression_share`, `google_ads_historical_quality_score` |
| **Ad** | **CTR** | **Ad Relevance**; Expected CTR | `google_ads_ctr`, `google_ads_historical_creative_quality_score`, `google_ads_historical_search_predicted_ctr` |
| **Landing** | **CVR** = conversions / clicks | **Landing Page Experience** | `google_ads_conversions`, `google_ads_clicks`, `google_ads_historical_landing_page_quality_score` |

(Absolute-Top IS is also available — `google_ads_search_absolute_top_impression_share` — pull it too
if the report wants "how often we were the very first result".)

`cost` (`google_ads_cost_micros`) rides along in every pull for ONE purpose: rank journeys by
dollars at stake. It is never a quality metric here.

Two things to know about the grades:
- **Quality Score** is `1–10`; the other three (**Ad Relevance**, **Expected CTR**, **Landing Page
  Experience**) come back as **BELOW_AVERAGE / AVERAGE / ABOVE_AVERAGE**, not numbers. The three
  categorical grades are **dimensions** and read reliably at any grain.
- All four are attributes Google computes **per keyword** (they live in `keyword_view`). So even
  though Ad Relevance "belongs to" the ad stage and Landing Page Experience to the landing stage,
  they print next to the **keyword**, not next to each individual ad or page. CTR and CVR, by
  contrast, are real and live at the **ad** level.

### ⚠️ The Quality-Score aggregation trap (validated, must-handle)
`historical_quality_score` is a **METRIC, and Porter SUMS it across the rows that collapse into a
group.** Validated live: grouping a keyword above its raw criterion grain returned QS **124** and
**29** — not 1–10. So:
- **Only trust the numeric QS at one-row-per-keyword grain** (keyword text + match type, fine
  enough that each keyword resolves to a single criterion). If it comes back **> 10, it's been
  summed → discard or re-pull finer.**
- The **three categorical grades are safe** at any grain — lead with them; treat the numeric QS as
  secondary and gate it on the `≤ 10` sanity check.

## Pulls (respecting Porter's field-combination rules — validated)

Filter every pull to **Search + the chosen ad groups** and sort by `google_ads_cost_micros desc`,
exactly like the alignment skill.

**A · Google grades — `keyword_view`, keyed by keyword (+ match type).** The four `historical_*`
grades **DO combine with `campaign_name` / `ad_group_name`** (validated — no "cannot be combined"
error). Include the labels so you can join back to the journey directly; include `match_type` to
keep the QS grain fine (see the aggregation trap):

```
["google_ads_campaign_name", "google_ads_ad_group_name",
 "google_ads_keyword_info_text", "google_ads_keyword_info_match_type",
 "google_ads_historical_quality_score", "google_ads_historical_creative_quality_score",
 "google_ads_historical_search_predicted_ctr", "google_ads_historical_landing_page_quality_score",
 "google_ads_cost_micros"]
```

> Read the categorical grades directly. For the numeric QS, apply the `≤ 10` sanity check; if it
> exceeds 10 it was summed across instances → re-pull at a finer grain or omit the number.

**B · Search Impression Share — campaign level.** IS is campaign-grain (coarser than the journey),
so it prints as **campaign context**, not per ad group:

```
["google_ads_campaign_name", "google_ads_search_top_impression_share",
 "google_ads_search_rank_lost_top_impression_share", "google_ads_search_budget_lost_top_impression_share",
 "google_ads_cost_micros"]
```

Read it: high rank-lost → the campaign loses the top auction on rank (weak bid / QS / assets); high
budget-lost → it's capped by budget. Disclose which. (Account-total IS does not aggregate cleanly —
keep it at campaign grain.)

**C · Ad behavior — ad level.** CTR is native; CVR is computed. Split from pull A because this is
**ad grain** (`ad_id`), not keyword grain:

```
["google_ads_campaign_name", "google_ads_ad_group_name", "google_ads_ad_group_ad_ad_id",
 "google_ads_impressions", "google_ads_clicks", "google_ads_ctr", "google_ads_conversions",
 "google_ads_cost_micros"]
```

Compute **CVR = `conversions / clicks`** per ad (guard divide-by-zero → null, not 0). Note: `ctr`
also aggregates as a metric — if you ever group it coarsely, recompute `clicks / impressions`
yourself rather than trusting the native field.

## How to print it

- **Per keyword** (in the journey's intent list): the three Below/Average/Above grades, plus QS
  (1–10) only when it passes the `≤ 10` check.
- **Per ad**: CTR and CVR.
- **Per campaign** (once, as context above its journeys): Impression Share (Top %) with the
  rank-vs-budget split.
- Keep `cost` visible only to order the output by spend.

## Guardrails

- **Don't classify.** Print the numbers; let the alignment verdict and the reader interpret. No
  "good/bad", no thresholds.
- **Sanity-check the numeric QS (`≤ 10`).** It is a summing metric; a value above 10 is an
  aggregation artifact, not a real score. Lead with the categorical grades.
- **Flag thin volume, don't judge it.** A CTR or CVR on a handful of clicks is noise — annotate the
  click/conversion count next to the ratio so the reader knows when a number is not yet trustworthy.
  That's a note, not a verdict.
- **`conversions`, not `all_conversions`.** Use `google_ads_conversions` (primary actions, matches
  the Google Ads UI) for CVR and disclose the choice; offer `all_conversions` if the user wants
  phone/store/cross-device.
- **Grades are historical and can be missing.** New or low-volume keywords may return no grade —
  show it as blank, not as a zero.
- **Use the `*_top_*` Impression Share variants.** The plain `*_impression_share` fields also exist,
  but this skill wants top-of-page IS — so use `*_top_*` (and `*_absolute_top_*`) on purpose.
- **Split, don't fight the MCP.** If any pull returns *"cannot be combined"*, break it into the
  granularity that fits; never retry the same field list. (The grades + labels combination IS
  allowed — the real reason to keep pulls B and C separate is grain, not a combine error.)
