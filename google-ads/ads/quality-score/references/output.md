# Output — Quality Score Trend

The skill emits ONE JSON object. Pure data — no emojis, markdown, tables, or colors; a renderer
(`formats/*`) turns it into the human document.

## Enums

- `qs_trend`: `improving` · `stable` · `declining`
- component `state`: `above_average` · `average` · `below_average` · `null` (no data in the latest bucket)
- component `trend`: `improving` · `stable` · `declining`
- `dragging_component`: `expected_ctr` · `ad_relevance` · `landing_page` · `mixed` · `unclear` · `none`
- `route_to`: `rsa-strength-copy-diversity-audit` · `landing-page-cro-audit` · `keyword-ad-landing-alignment` · `null`
- `granularity`: `weekly` · `monthly`

## Top-level schema

```json
{
  "_meta": {
    "skill": "quality-score-trend",
    "version": "1.0.0",
    "account_id": "123-456-7890",
    "period_start": "2026-04-01",
    "period_end": "2026-07-16",
    "granularity": "weekly",
    "buckets": 15,
    "source": "historical_quality_score (last-known per period, not live)",
    "status": "complete"
  },
  "synthesis": {
    "headline": "One string: how many keywords are declining and the single steepest QS drop weighted by spend (the keyword losing the most Quality Score on the most money).",
    "diagnosis": "One string: the account's dominant failing component — is the erosion mostly ad-side (Ad Relevance / Expected CTR) or landing-side (Landing Page Experience)?",
    "action": "One string: the highest-impact keyword to fix — where / what / why — routed to the right fix skill."
  },
  "keywords": [
    {
      "criterion_id": "555",
      "keyword_text": "insurance quote online",
      "match_type": "PHRASE",
      "ad_group": "Quotes — Online",
      "campaign": "Search — Quotes",
      "qs_baseline": 8,
      "qs_now": 4,
      "qs_change": -4,
      "qs_trend": "declining",
      "qs_series": [
        { "period": "2026-W14", "qs": 8 },
        { "period": "2026-W20", "qs": 6 },
        { "period": "2026-W27", "qs": 4 }
      ],
      "components": {
        "expected_ctr":  { "state": "average",        "trend": "stable" },
        "ad_relevance":  { "state": "above_average",   "trend": "stable" },
        "landing_page":  { "state": "below_average",   "trend": "declining" }
      },
      "dragging_component": "landing_page",
      "spend": 4820.0,
      "cpc_now": 6.40,
      "spend_at_risk": 4820.0,
      "verdict": "declining",
      "recommendation": {
        "where": "insurance quote online (ad group: Quotes — Online) → its landing page",
        "what": "Fix the landing page, not the ad. Google's Landing Page Experience grade for this keyword slid from average to below average — check page speed, mobile layout, and that the page delivers the 'online quote' the keyword promises (setting: Landing Page Experience component).",
        "why": "Quality Score dropped from 8 to 4 while the ad-side components held steady — the erosion is entirely landing-side. A lower QS raises this keyword's cost-per-click and lowers its rank, and it spends $4,820 in the window, so the drift is quietly making the biggest chunk of spend less efficient.",
        "route_to": "landing-page-cro-audit"
      }
    },
    {
      "criterion_id": "556",
      "keyword_text": "cheap car insurance",
      "match_type": "BROAD",
      "ad_group": "Prospecting — Broad",
      "campaign": "Search — Prospecting",
      "qs_baseline": 7,
      "qs_now": 5,
      "qs_change": -2,
      "qs_trend": "declining",
      "qs_series": [
        { "period": "2026-W14", "qs": 7 },
        { "period": "2026-W21", "qs": 6 },
        { "period": "2026-W27", "qs": 5 }
      ],
      "components": {
        "expected_ctr":  { "state": "below_average",  "trend": "declining" },
        "ad_relevance":  { "state": "average",         "trend": "stable" },
        "landing_page":  { "state": "above_average",   "trend": "stable" }
      },
      "dragging_component": "expected_ctr",
      "spend": 1310.0,
      "cpc_now": 3.10,
      "spend_at_risk": 1310.0,
      "verdict": "declining",
      "recommendation": {
        "where": "cheap car insurance (ad group: Prospecting — Broad) → the ads",
        "what": "Refresh the ad copy. People are clicking this ad less than Google expects (component: Expected CTR, now below average) while the landing page still grades well — the ad has gone stale, or a broad-match term is pulling off-intent traffic.",
        "why": "Quality Score slid 7 to 5 driven only by Expected CTR; the page is fine. If the copy rewrite doesn't lift it, the broad-match keyword may be the real mismatch — cross-check keyword-ad-landing-alignment.",
        "route_to": "rsa-strength-copy-diversity-audit"
      }
    }
  ],
  "rollup": {
    "keywords_analyzed": 240,
    "count_declining": 18,
    "count_improving": 22,
    "count_stable": 200,
    "biggest_drops_by_spend": [
      { "criterion_id": "555", "keyword_text": "insurance quote online", "qs_change": -4, "spend": 4820.0, "dragging_component": "landing_page" },
      { "criterion_id": "556", "keyword_text": "cheap car insurance", "qs_change": -2, "spend": 1310.0, "dragging_component": "expected_ctr" }
    ],
    "dominant_failing_component": "landing_page",
    "component_breakdown": { "expected_ctr": 5, "ad_relevance": 4, "landing_page": 8, "mixed": 1, "unclear": 0 }
  }
}
```

## Field definitions

| Field | Type | Description |
|-------|------|-------------|
| `qs_baseline` | integer | overall QS of the first bucket with data (1–10) |
| `qs_now` | integer | overall QS of the most recent bucket with data (1–10) |
| `qs_change` | integer | `qs_now − qs_baseline` (signed) |
| `qs_trend` | enum | `improving` · `stable` · `declining` |
| `qs_series` | array | ordered `{period, qs}`, one per bucket with data (gaps omitted, never zero-filled) |
| `components.<c>.state` | enum | latest bucket state of component c (`above_average` / `average` / `below_average` / `null`) |
| `components.<c>.trend` | enum | direction of component c's state series |
| `dragging_component` | enum | the component pulling QS down (`expected_ctr` / `ad_relevance` / `landing_page` / `mixed` / `unclear` / `none`) |
| `spend` | number | Σ `cost_micros / 1e6` over the window |
| `cpc_now` | number | latest bucket `average_cpc / 1e6` |
| `spend_at_risk` | number | = `spend` — the money exposed to the erosion; a ranking figure, NOT a computed loss |
| `verdict` | enum | mirrors `qs_trend` (only `declining` carries a recommendation) |
| `recommendation` | object | `{where, what, why, route_to}` — the executable move + the fix skill it hands off to |
| `route_to` | enum | the skill that OWNS the fix (this skill diagnoses; it does not fix) |

## Error / edge states

- **`buckets_with_data < 3`** (too little history): include with `qs_trend: "stable"`, `verdict: "stable"`, `dragging_component: "none"`, and a note "too few periods to trend" — never declare a decline off 1–2 buckets.
- **Component grades flat while overall QS fell**: `dragging_component: "unclear"`, `route_to: null` — the drop is inside the coarse buckets' resolution; recommend watching one more bucket, don't invent a culprit.
- **Expected-CTR inferred by residual** (`query_data` path, no Expected-CTR dimension): set `dragging_component: "expected_ctr"` and add a note in `what` that it's inferred, not measured.
- **No QS at all** (Display / Shopping / PMax keyword, or a keyword that never served): skip — QS is Search-only; note the exclusion count in `_meta` if relevant.
- **Series gap from a pause**: compare the buckets with data and note the pause; do not treat the gap as a crash to zero.
- **Improving / stable keywords**: emit them for the rollup counts, but with `recommendation: null` — no action, they're context.
