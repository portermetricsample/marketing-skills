# Output — Impression Share Trend & Driver Diagnosis

What this skill **emits**: a JSON object (the canonical truth), a specialization of the global
[`../../../_framework/output-contract.md`](../../../_framework/output-contract.md). Handoff to the
**orchestrator**, which renders it (document / dashboard / slides). **No presentation here** — no emojis,
tables, markdown, or colors. `scripts/process.py` produces this object with `synthesis` blank; the LLM
fills `synthesis` and polishes each `recommendation`.

## Enums (the only allowed values)
- `trend_label`: `Winning` · `New` · `Healthy` · `Volatile` · `Losing` · `Crashing` · `Crashed`
- `driver`: `rank` · `budget` · `mixed` · `none`
- `dominant_driver`: `rank` · `budget` · `mixed` · `none` (the account-level lean among decaying campaigns)

> Semantics: `budget` driver → raise budget (money recovers reach). `rank` driver → fix bid/Quality
> (**never** a budget raise). `mixed` → fix rank first, then fund. `none` → keep. The trend label is the
> trajectory; the driver is the cause of any decline (and the headroom for a winner).

## Schema
```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "skill": "impression-share",
    "grain": "weekly (from daily)",
    "period": { "from": "2026-03-26", "to": "2026-06-23", "weeks_after_trim": 12 }
  },

  // Canonical synthesis — EXACTLY three strings. LLM-written. The orchestrator renders it as the opener.
  "synthesis": {
    "headline":  "One sentence: the biggest-impact mover (named campaign) + its lever.",
    "diagnosis": "Is the account gaining or losing visibility overall, and is the dominant driver budget or rank?",
    "action":    "The single highest-impact fix now — which campaign, which lever, why."
  },

  // One entry per Search campaign, ranked by impressions (impact). process.py fills everything except
  // the LLM's polish of recommendation prose.
  "campaigns": [
    {
      "campaign": "Acme_Health_SEM_(HD)",
      "current": {                         // SNAPSHOT mode — current period (~30d, impression-weighted)
        "is": 0.29, "top": 0.21, "abs_top": 0.11,        // overall · top-of-page · absolute-top IS
        "rank_lost": 0.15, "budget_lost": 0.56, "rank_lost_top": 0.13,
        "cap": "budget", "verdict": "budget_limited"     // budget-vs-rank cap (incl. top-of-page)
      },
      "trend_label": "Winning",            // enum — the trajectory
      "is_now":  0.24,                     // last full weekly IS (0-1)
      "is_then": 0.12,                     // first full weekly IS (0-1)
      "is_slope_pct_per_week": 6.1,        // smoothed slope, % of mean per week
      "driver": "budget",                  // enum — cause of decline / remaining headroom
      "rank_lost_recent":   0.18,          // recent impression-weighted rank loss (0-1)
      "budget_lost_recent": 0.41,          // recent impression-weighted budget loss (0-1)
      "impressions": 44980,                // total over the window — the impact rank key
      "weeks": 12,                         // trimmed weekly points classified
      "low_volume": false,                 // true -> thin; soften the verdict
      "series": [0.12, 0.12, 0.15, 0.14, 0.17, 0.14, 0.17, 0.24, 0.30, 0.33, 0.20, 0.24],  // weekly IS curve
      "recommendation": {
        "where": "Acme_Health_SEM_(HD)",
        "what":  "Raise the daily budget — it's the cap, not the auction.",
        "why":   "Impression share nearly doubled (12%→24%) and the remaining loss is budget (41% to budget vs 18% to rank) — fundable demand."
      }
    }
  ],

  // Account-level roll-up → the section summary.
  "rollup": {
    "dominant_driver": "budget",                 // enum: lean among decaying campaigns ("none" if no decliners)
    "decaying_by_impact": [ /* Losing/Crashing/Crashed campaign names, ordered by impressions */ ],
    "growing":           [ /* Winning/New names */ ],
    "stable":            [ /* Healthy/Volatile names */ ],
    "counts": { "decaying": 0, "growing": 5, "stable": 8, "total": 13 }
  }
}
```

## Rules
- `synthesis` is **exactly three strings** — `headline`, `diagnosis`, `action`. No `highlights`.
- Every `trend_label` / `driver` / `dominant_driver` uses an **enum** value above — never free text.
- **Rank `campaigns[]` by `impressions`** (impact), not by % move — a small % on a big campaign beats a
  big % on a micro-test.
- **A `rank`-driven decline NEVER emits a budget raise** — it's a bid/Quality/relevance fix. Routing
  rank loss to "raise budget" is the cardinal error of this skill.
- **Pair the label with the level.** A `Healthy` campaign at a low IS with high rank/budget loss is
  "capped/flattening", not "fine" — say so in the recommendation.
- **`low_volume:true` → soften.** Don't raise an alarm on a thin/noisy micro-campaign.
- **No competitor attribution.** Budget vs rank is sayable; *which rival* took the rank loss is not
  (Auction Insights unavailable). Never imply it.
- Each `recommendation` names the **exact campaign + exact lever** in language a non-technical owner can
  act on (`where` / `what` / `why`). See [`../../../_framework/writing.md`](../../../_framework/writing.md).

## Render handoff — the `impression-share-trend-monitor` component
The visual lives in **`porter-reporting`** (`components/google-ads/impression-share-trend-monitor`) — the
analysis ↔ component split. For that component, each `campaigns[]` entry additionally carries these
**monitor-render fields** (emitted alongside the analysis fields above; the component RECEIVES and
renders them — it never recomputes the driver or re-aggregates):

| Field | What | Source |
|---|---|---|
| `spend` | 90-day cost — the ranking key | paired cost query (pull metric-free per the budget-field gotcha, or `cost_micros`) |
| `weeks` | week labels after edge-trim, aligned to the arrays | `process.py` weekly buckets |
| `got` (= `series`) · `rank` · `budget` | the weekly impression-weighted decomposition, **0–100, summing to 100** per week | `process.py` weekly impression-weighting |
| `prior_is` / `recent_is` | the **4-week-vs-prior-4-week** averages (the change column; comparable across campaigns) | `process.py` |
| `short` (≈ `low_volume`) | < 8 weeks of history → narrower window flag | `process.py` |
