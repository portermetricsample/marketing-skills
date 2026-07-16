# Framework: Quality Score Trend

## Mission
Turn a keyword's historical QS across time buckets into a **direction** (improving / stable /
declining) and, for every decliner, name the **one component** dragging it down — so the fix routes
to the right skill. A falling QS quietly raises CPC and lowers rank with no alert; this skill is the
alert, and it hands the decliner to the component-specific fix instead of just flagging it.

## The series (deterministic)

For each keyword (`criterion_id`), over the window:

- **`qs_series`** = the ordered list of `{period, qs}` — one entry per time bucket (weekly or
  monthly), each `qs` = the **last non-null `historical_quality_score`** in that bucket. Buckets with
  **no impressions** produce no entry — leave the gap, don't fill it with 0.
- **`qs_baseline`** = the QS of the **first** bucket that has data (the window's starting point).
- **`qs_now`** = the QS of the **most recent** bucket with data.
- **`qs_change`** = `qs_now − qs_baseline` (a signed integer; QS is 1–10).
- **`buckets_with_data`** = count of non-null buckets (the gate below reads this).
- For each of the three components, build the same ordered series of **bucket states**
  (`ABOVE_AVERAGE` / `AVERAGE` / `BELOW_AVERAGE`) — `component_now` = latest state,
  `component_trend` = direction of the state series (map `ABOVE_AVERAGE = 2`, `AVERAGE = 1`,
  `BELOW_AVERAGE = 0`, then read first-vs-last).
- **`spend`** = Σ `cost_micros / 1e6` over the window; **`cpc_now`** = latest bucket's
  `average_cpc / 1e6`. Spend is how the finding is weighted — a QS drop on a high-spend keyword is the
  one that costs real money.

## Direction (cut-offs)

Read `qs_change` first, then confirm it's a real move (not one-bucket integer noise) with the slope:

| `qs_change` (baseline → now) | Direction | Confirm |
|---|---|---|
| `≤ −2` | **declining** | the drop is real if it persists ≥2 recent buckets (not a single dip that recovered). |
| `−1` | **declining** *only if* the last 2–3 buckets trend down (sustained), else **stable** | a lone −1 that bounced back = noise → **stable**. |
| `0` (within ±1, no sustained slope) | **stable** | — |
| `≥ +1` and trending up | **improving** | — |

- **QS is a 1–10 integer** — a single-point wiggle (9 → 8 → 9) is **not** a trend. Require a
  **sustained** move, not one bucket. The whole value of this skill is catching *slow* erosion, so
  favor the direction confirmed across several buckets over a single dramatic bucket.
- **Declining is the finding that matters.** Improving and stable keywords are reported for context
  but carry no recommendation.

## Component attribution (the core logic — which component is dragging)

For every **declining** keyword, find the component responsible so the fix can be routed:

1. Take the three component **state series** over the same buckets where overall QS fell.
2. The **dragging component** is the one that **moved *into* or *deeper into* `BELOW_AVERAGE`** across
   that window — i.e. the component whose state series fell the most (largest negative first-vs-last
   delta on the 2/1/0 scale), tie-broken toward the one currently sitting at `BELOW_AVERAGE`.
3. If **two or more** components fell together, set `dragging_component = "mixed"` and name each in the
   recommendation — but still lead with the one that's `BELOW_AVERAGE` now and highest-cost.
4. If overall QS fell but **all three components look flat** (Google's coarse buckets didn't change
   grade), set `dragging_component = "unclear"` — the drop is inside the buckets' resolution. Say so
   honestly; don't invent a culprit.
5. **Expected-CTR-only limitation:** if you're on the `query_data` path (no Expected-CTR dimension —
   see `tools.md`) and both exposed components (Ad Relevance, Landing Page) held steady while overall
   QS fell, attribute to **Expected CTR by residual** and flag it as inferred, not measured.

### Routing the fix (where each dragging component goes)

| Dragging component | Plain-words cause | Route `route_to` |
|---|---|---|
| **Ad Relevance** (`creative_quality_score`) | the ad no longer matches the keyword's intent — copy has gone stale | `rsa-strength-copy-diversity-audit` |
| **Expected CTR** (`search_predicted_ctr`) | people are clicking the ad less than Google expects — usually the ad, sometimes a mismatched keyword | `rsa-strength-copy-diversity-audit` (and note: if the keyword itself looks off-intent, cross-check `keyword-ad-landing-alignment`) |
| **Landing Page Experience** (`landing_page_quality_score`) | Google is grading the destination page worse — speed, mobile, message-match | `landing-page-cro-audit` |
| **mixed** | more than one component fell | name each; route to the highest-cost / most-below-average one first |
| **unclear** | overall QS fell but no component changed grade | no route — surface it, recommend watching another bucket before acting |

## Spend-at-risk (weighting, stated honestly)

QS and CPC move **inversely** — a lower QS raises the price you pay per click and lowers your rank.
But **Google does not publish the QS→CPC formula**, so this skill does **not** compute an exact CPC
increase. Instead:

- **`spend_at_risk`** = the keyword's `spend` over the window — the money exposed to the erosion,
  used to **rank** findings (highest-spend decliner first). It is an exposure figure, not a
  computed loss.
- In the recommendation `why`, state the **direction and mechanism** honestly: "a falling Quality
  Score raises your cost-per-click and lowers your position — this keyword spends $X, so the drift is
  quietly making that spend less efficient." Never assert a specific "+$Y CPC" number QS can't give you.

## Volume & recency gate

- **`buckets_with_data < 3`** → not enough history to call a direction. Mark `qs_trend: "stable"` with
  a note "too few periods to trend" — never declare a decline off 1–2 buckets.
- **Thin keywords** — below an impression / spend floor (e.g. < 1% of account spend and few
  impressions) → include only if the user asked; they don't move the account and their historical QS
  is jumpy.
- **Gaps in the series** (a keyword that paused, then resumed) — don't read the gap as a crash;
  compare the buckets that *have* data, and note the pause.
- **New keywords** (first served inside the window) have a short series and often a provisional QS —
  annotate rather than flag a "decline".

## What this skill deliberately does NOT do

- It does **not fix** the ad copy, the landing page, or the keyword match — it only says *which* is
  eroding. The Ad Relevance / Expected CTR fix is `rsa-strength-copy-diversity-audit`; the Landing
  Page Experience fix is `landing-page-cro-audit`.
- It does **not judge point-in-time relevance** (does the ad match the keyword *today*) — that still
  photo is `keyword-ad-landing-alignment`. This skill is strictly the **movie**: QS over time.
- It does **not compute the CPC impact** in dollars — QS's effect on CPC is real but Google's formula
  is private; the skill flags exposure and direction, not a computed loss.
