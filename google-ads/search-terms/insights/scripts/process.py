#!/usr/bin/env python3
"""
search-term-insights — the DOLLAR-QUANTIFIED insights synthesizer for the Search Terms dashboard.

It does NOT classify anything new. It JOINS the outputs of the cluster's axes — `labeling` (the per-term
tags) and `performance` (the money) (+ optional `intent-discovery` clusters) — and rolls them into the
spec's insights card: one row per criterion, each in DOLLARS, leading with a TOTAL.

The seven lanes (the spec's six + the one we split out so a relevant term is never mislabeled):
  1. Irrelevant   (measured)  Σ spend on terms with a relevance `leak` verdict        -> add negatives
  2. Wasteful     (measured)  Σ waste-spend on terms that are RELEVANT but losing money -> review / fix
  3. Duplicate    (estimated) overlap spend flowing through non-owner keywords          -> resolve cannibalization
  4. Competitor   (measured)  Σ spend on competitor terms                               -> comparison angle / policy
  5. Branded      (estimated) CPA savings if brand traffic were recaptured              -> contain brand
  6. Opportunity·intents (estimated) projected value of uncovered intents               -> new keywords
  7. Opportunity·angles  (estimated) projected lift from new ad angles                  -> new creative

CRITICAL HONESTY RULE: every row carries a `basis` of "measured" (a sum of real spend) or "estimated"
(a projection / model). `totalPotential` sums ALL rows (to match the spec); `measuredPotential` sums
only the measured rows — lead with the solid number, never present a projection as a fact.

Usage: process.py <labeling.json> <performance.json> [intent.json] [context.json]
  context.json = { brand_cpa?:num, branded_default_savings?:0.30, competitor_policy?:"reallocate"|"negative" }
Emits JSON: { insights: { totalPotential, measuredPotential, rows[] } }.
"""
import sys, os, json


def load(path):
    return json.load(open(path)) if path and os.path.exists(path) else None


def money(x):
    return round(float(x or 0), 2)


def top_terms(items, n=2):
    """Name the loudest offenders for the rationale (term + its spend)."""
    s = sorted(items, key=lambda t: -money(t.get("cost")))[:n]
    return ", ".join('"%s" ($%s)' % (t["term"], money(t.get("cost"))) for t in s)


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: process.py <labeling.json> <performance.json> [intent.json] [context.json]")
    labeling = load(sys.argv[1]) or {}
    performance = load(sys.argv[2]) or {}
    intent = load(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].endswith(".json") else None
    ctx = {}
    for a in sys.argv[3:]:
        d = load(a)
        if d and "labeling" not in a and "performance" not in a and "intent" not in a:
            ctx = d
    brand_cpa = ctx.get("brand_cpa")
    branded_default_savings = ctx.get("branded_default_savings", 0.30)
    competitor_policy = ctx.get("competitor_policy", "reallocate")

    lterms = labeling.get("terms", [])
    # term -> performance verdict (money is authoritative here)
    perf = {t["term"]: t for t in performance.get("terms", [])}

    # --- helpers over the labeling tag vector ---
    def is_leak(t):
        return any((p.get("relevance") == "leak") for p in t["tags"].get("relevance", []) or [])

    leak_set = {t["term"] for t in lterms if is_leak(t)}

    rows = []

    # 1) IRRELEVANT (measured) — terms with a leak verdict → negatives (the leak you stop)
    irr = [t for t in lterms if is_leak(t)]
    if irr:
        d = money(sum(money(t.get("cost")) for t in irr))
        rows.append({"criterion": "Irrelevant", "tone": "pink", "basis": "measured",
                     "action": "Add %d term%s as negatives" % (len(irr), "" if len(irr) == 1 else "s"),
                     "rationale": "%s drew real spend on searches outside the keyword's intent — exclude them."
                                  % top_terms(irr),
                     "dollars": d, "sub": "recoverable"})

    # 2) WASTEFUL but RELEVANT (measured) — performance=waste AND not a leak → review/fix, never a negative-as-irrelevant
    waste_rel = [pt for term, pt in perf.items() if pt.get("class") == "waste" and term not in leak_set]
    if waste_rel:
        d = money(sum(money(pt.get("dollars_at_risk") or pt.get("cost")) for pt in waste_rel))
        rows.append({"criterion": "Wasteful", "tone": "amber", "basis": "measured",
                     "action": "Review %d wasteful term%s" % (len(waste_rel), "" if len(waste_rel) == 1 else "s"),
                     "rationale": "%s are RIGHT-FIT searches still losing money — fix the landing/bid before cutting, don't negative a real customer."
                                  % top_terms([{"term": p["term"], "cost": p["cost"]} for p in waste_rel]),
                     "dollars": d, "sub": "review / fix"})

    # 3) DUPLICATE (estimated) — overlap spend through non-owner keywords (proxy; per-keyword split unavailable)
    dup = [t for t in lterms if t["tags"].get("cannibalized")]
    if dup:
        est = 0.0
        for t in dup:
            can = t["tags"].get("cannibalization") or {}
            competing = can.get("competing_keywords") or []
            n = max(len(competing), 1)
            non_owner_share = max(n - 1, 0) / n        # owner keeps 1/n; the rest is the wasted overlap
            est += money(t.get("cost")) * non_owner_share
        rows.append({"criterion": "Duplicate", "tone": "yellow", "basis": "estimated",
                     "action": "Resolve %d cannibalization%s" % (len(dup), "" if len(dup) == 1 else "s"),
                     "rationale": "%s are caught by 2+ keywords; the looser copies split the signal — route each to its owner. (Overlap $ is a proxy: per-keyword spend isn't exposed.)"
                                  % top_terms(dup),
                     "dollars": money(est), "sub": "wasted overlap"})

    # 4) COMPETITOR (measured) — real spend on competitor terms, available to reallocate
    comp = [t for t in lterms if t["tags"].get("brand_class") == "competitor"]
    if comp:
        d = money(sum(money(t.get("cost")) for t in comp))
        action = "Explore a comparison angle" if competitor_policy == "reallocate" else "Negative competitor terms"
        rows.append({"criterion": "Competitor", "tone": "aqua", "basis": "measured",
                     "action": action,
                     "rationale": "%s is spend on competitor searches — %s." % (
                         top_terms(comp),
                         "reallocate or build a deliberate comparison" if competitor_policy == "reallocate"
                         else "exclude per brand policy"),
                     "dollars": d, "sub": "reallocate" if competitor_policy == "reallocate" else "recoverable"})

    # 5) BRANDED recapture (estimated) — brand terms leaking out of the brand campaign → CPA savings
    brand_leak = [t for t in lterms
                  if t["tags"].get("brand_class") == "brand" and t["tags"].get("brand_contained") is False]
    if brand_leak:
        est = 0.0
        for t in brand_leak:
            cost = money(t.get("cost")); conv = money(t.get("conversions"))
            cur_cpa = (cost / conv) if conv > 0 else None
            if brand_cpa and cur_cpa and brand_cpa < cur_cpa:
                est += cost * (1 - brand_cpa / cur_cpa)
            else:
                est += cost * branded_default_savings     # no brand-CPA known → flat assumption
        rows.append({"criterion": "Branded", "tone": "purple", "basis": "estimated",
                     "action": "Recapture brand traffic",
                     "rationale": "%s are brand searches served by non-brand campaigns — move them to the brand campaign for cheaper conversions.%s"
                                  % (top_terms(brand_leak),
                                     "" if brand_cpa else " (Savings assume a %d%% lower brand CPA — set brand_cpa to make it exact.)" % int(branded_default_savings * 100)),
                     "dollars": money(est), "sub": "CPA savings"})

    # 6 & 7) OPPORTUNITY (estimated) — from intent-discovery clusters if present, else the labeling handoffs
    opp_intents_dollars, opp_intents_n, opp_angle_dollars, opp_angle_n = 0.0, 0, 0.0, 0
    if intent and intent.get("clusters"):
        for c in intent["clusters"]:
            opp_intents_n += 1
            # projected = demonstrated demand (clicks) * the account conv-rate * benchmark CPA (untapped value)
            clicks = money(c.get("clicks"))
            cr = float((performance.get("meta") or {}).get("account_conv_rate") or 0)
            bench = float((performance.get("meta") or {}).get("benchmark_cpa") or 0)
            opp_intents_dollars += clicks * cr * bench
            if c.get("ad_angle"):
                opp_angle_n += 1
                opp_angle_dollars += clicks * 0.10 * bench   # rough lift proxy
    else:
        handoffs = [t for t in lterms if t.get("recommended_action") == "hand_to_content"
                    or (t["tags"].get("cannibalization") or {}).get("needs_own_keyword")]
        opp_intents_n = len(handoffs)
        cr = float((performance.get("meta") or {}).get("account_conv_rate") or 0)
        bench = float((performance.get("meta") or {}).get("benchmark_cpa") or 0)
        for t in handoffs:
            clicks = money(t.get("clicks"))
            opp_intents_dollars += clicks * cr * bench
    if opp_intents_n:
        rows.append({"criterion": "Opportunity", "tone": "green", "basis": "estimated",
                     "action": "New keywords · uncovered intents",
                     "rationale": "%d intent%s show real demand no keyword covers well — build the keyword/landing they ask for. (Projected from demand × account conv-rate × benchmark CPA.)"
                                  % (opp_intents_n, "" if opp_intents_n == 1 else "s"),
                     "dollars": money(opp_intents_dollars), "sub": "untapped intents"})
    if opp_angle_n:
        rows.append({"criterion": "Opportunity", "tone": "green", "basis": "estimated",
                     "action": "New ad angles · creative",
                     "rationale": "%d cluster%s want a different message than the current ads — test the angle. (Rough lift proxy.)"
                                  % (opp_angle_n, "" if opp_angle_n == 1 else "s"),
                     "dollars": money(opp_angle_dollars), "sub": "untapped angles"})

    rows.sort(key=lambda r: -r["dollars"])
    total = money(sum(r["dollars"] for r in rows))
    measured = money(sum(r["dollars"] for r in rows if r["basis"] == "measured"))

    print(json.dumps({
        "insights": {
            "totalPotential": total,
            "measuredPotential": measured,     # the solid number — lead with this, not the projection-inflated total
            "rows": rows,
        }
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
