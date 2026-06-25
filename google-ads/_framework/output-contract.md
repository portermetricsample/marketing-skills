# Output contract — what every analysis skill EMITS

This is the **handoff to `porter-reporting`**. Each analysis skill (audit check, funnel-metrics,
financial-overview…) produces **content only** — findings, verdicts, recommendations, numbers — in
the shape below. It does **NOT** render anything; [`porter-reporting`](https://github.com/portermetricsample/porter-reporting)
consumes this exact shape and turns it into a report / dashboard / presentation / **audit**. Its
mirror is `porter-reporting/_foundation/input-contract.md` — keep the two in sync.

> Boundary: **analysis = what it means** (this file) · **reporting = how it's assembled** ·
> **design-system = how it looks**. The same output → any document type.
>
> ⚠️ **Being revisited:** the **assembly by format** (executive report / dashboard / slides / alert /
> chat) now lives in [`_orchestrator/`](../_orchestrator/README.md), not in `porter-reporting`. Use
> cases still emit the object below unchanged; the orchestrator places it into a format skeleton.
> This boundary line needs a rewrite to reflect that — see the orchestrator README's "Boundary note".

## The canonical object

```jsonc
{
  "meta": {
    "account": "Acme Insurance",
    "connector": "google-ads",
    "period": { "from": "2026-05-01", "to": "2026-05-31", "comparison": "previous-period" },
    "currency": "CAD"
  },

  // The executive synthesis — the TOP layer (3 sentences, insight-first). Reporting renders this
  // as the opener, BEFORE any section. See account-audit/README "executive synthesis".
  "synthesis": {
    "headline":  "Spend ▲12% but ROAS fell 2.28→1.88 — more conversions, each worth less.",
    "diagnosis": "Top of funnel is fine (CTR up to 2.9%); the drag is conversion VALUE, not the funnel.",
    "action":    "Cut Auto/Bundle/Home (~$7k at ~0 ROAS); fund Acme_LifeBroadMatch_ROAS (best ROAS 2.87, losing 19% of impressions to budget)."
  },

  // One entry per analysis skill / audit section.
  "checks": [
    {
      "id": "value-based-bidding",
      "title": "Value-Based Bidding",
      "question": "Are campaigns on a value strategy, with a target that tracks reality?",  // the client/Acme question
      "verdict": "review",                 // account-level: "ok" | "review" | "broken" | "n/a"
      "scorecards": [                       // optional context numbers (→ reporting scorecards/table)
        { "label": "Spend", "value": 150000, "unit": "currency", "delta": 0.12 }
      ],
      "findings": [                         // the per-entity findings (→ reporting findings table)
        {
          "entity": { "level": "campaign", "name": "Acme_Health_SEM_(HD)" },  // level ∈ campaign|ad_group|keyword|ad|conversion_action|segment|account
          "state":  "broken",               // "ok" | "flag" | "raise" | "cut" | "review" | "broken"
          "spend":  14332,                  // for ranking by dollars (optional)
          "evidence": { "strategy": "MAXIMIZE_CONVERSIONS", "conversion_value": 0, "conversions": 63 },
          "recommendation": {               // ALWAYS executable + plain (cluster rule)
            "where": "Acme_Health_SEM_(HD)",
            "what":  "First give its conversions a value (see Conversion Tracking), then switch bidding to value-based (setting: Maximize Conversion Value).",
            "why":   "Today it chases the number of leads, not the leads that actually pay."
          }
        }
      ],
      "rollup": {                           // → reporting section summary
        "byState": { "broken": 2, "review": 1, "ok": 3 },
        "topFixes": [ /* the highest-$ recommendations, ordered */ ]
      }
    }
  ]
}
```

## The rules behind the shape
- **`verdict` / `state` are produced HERE** (the analysis owns severity — resolves reporting's open
  question). Reporting just renders the state as a chip; it does not re-judge.
- **`recommendation` is always `{where, what, why}`** — exact entity + plain language (the
  [account-audit output rule](../google-ads/account-audit/README.md)). No bare jargon.
- **`synthesis` is mandatory for an assembled audit** — the insight-first opener; the `checks` are
  its evidence.
- **Numbers carry `delta` vs the previous period** where applicable — reporting's table/scorecard
  contract assumes every metric has its comparison.
- **Content only** — no HTML/colors/layout here; that's reporting + design-system.

## Producers (today)
account-audit cluster (8 Acme sections + spend-allocation, bid-strategy, landing-cro),
keyword-ad-landing-alignment, keyword-ad-landing-metrics, funnel-metrics, financial-overview.
Each one's `framework.md` already defines its own findings/verdict/recommendation — this file is
the **common envelope** they all fit into so reporting can consume any of them uniformly.
