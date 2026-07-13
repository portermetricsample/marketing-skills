#!/usr/bin/env python3
"""
search-term-performance — DETERMINISTIC money judge for the Google Ads search-terms report.

Reads the search-terms report, AGGREGATES every row of the same search term (a term arrives once per
triggering keyword / match type / campaign), and judges the MONEY each term makes or wastes — ranked
by spend. It does NOT judge the matching (that is `relevance`) or who should own the term (that is
`duplicates`). Discipline: irrelevant != poor performance.

Per term it classifies:
  - WINNING  : converts at/under the account benchmark CPA (or ROAS >= target for ecommerce).
  - WATCH    : converts but above the benchmark, OR too few clicks to judge yet (thin-data floor).
  - WASTE    : real spend, ~0 conversions, past the floor -> the burning dollars.
and sets a destination (promote_to_exact / leave / add_negative) + the dollars_at_risk.

COST SCALE (verified live 2026-06-23 on a production account): the `google_ads_cost_micros` field is returned
by Porter ALREADY converted to currency units (it reads 166.01, NOT 166007841). Do NOT divide by 1e6.

Usage: process.py <data.json> [context.json]
  data.json    = raw query_data {columns, rows}: search_term + keyword_info_match_type + cost_micros
                 + clicks + conversions + conversions_value + campaign_name.
  context.json = { target_cpa?:num, roas_target?:num, min_clicks_floor?:int } (all optional).
Emits JSON: { meta, terms[], rollup }. The LLM adds the 3-string synthesis.
"""
import sys, os, json, math
from collections import defaultdict
from statistics import median


def load_rows(path):
    d = json.load(open(path))
    idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: (r[idx[n]] if n in idx else "")

    def num(r, n):
        try:
            return float(g(r, n) or 0)
        except (TypeError, ValueError):
            return 0.0

    out = []
    for r in d["rows"]:
        out.append({
            "term": g(r, "google_ads_search_term"),
            "match_type": (g(r, "google_ads_keyword_info_match_type") or "").upper(),
            "campaign": g(r, "google_ads_campaign_name"),
            "cost": num(r, "google_ads_cost_micros"),       # already currency — NOT /1e6
            "clicks": num(r, "google_ads_clicks"),
            "conv": num(r, "google_ads_conversions"),
            "value": num(r, "google_ads_conversions_value"),
        })
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: process.py <data.json> [context.json]")
    rows = load_rows(sys.argv[1])
    ctx = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else {}
    target_cpa = ctx.get("target_cpa")          # account tCPA if known -> overrides the median
    roas_target = ctx.get("roas_target", 1.0)   # ecommerce break-even (or the desired floor)

    # 1) Aggregate every row of the same term (base counts add up correctly; ratios do NOT).
    agg = {}
    for r in rows:
        a = agg.get(r["term"])
        if a is None:
            a = agg[r["term"]] = {"cost": 0.0, "clicks": 0.0, "conv": 0.0, "value": 0.0,
                                  "match_types": set(), "campaigns": set()}
        a["cost"] += r["cost"]; a["clicks"] += r["clicks"]
        a["conv"] += r["conv"]; a["value"] += r["value"]
        if r["match_type"]:
            a["match_types"].add(r["match_type"])
        if r["campaign"]:
            a["campaigns"].add(r["campaign"])

    total_cost = sum(a["cost"] for a in agg.values())
    total_clicks = sum(a["clicks"] for a in agg.values())
    total_conv = sum(a["conv"] for a in agg.values())
    total_value = sum(a["value"] for a in agg.values())
    # Business model. Auto-detect (value present -> ROAS) is a DEFAULT, not a verdict: many lead-gen
    # accounts assign a conversion VALUE to leads (e.g. $200/form) — that must NOT flip them to ROAS.
    # `model: "lead_gen" | "ecommerce"` in context forces it (verified need: real lead-gen accounts value their leads).
    model = ctx.get("model")
    if model == "lead_gen":
        ecommerce = False
    elif model == "ecommerce":
        ecommerce = True
    else:
        ecommerce = total_value > 0              # auto: value present -> ROAS, else lead-gen (CPA)

    # 2) Benchmark = account tCPA if given, else the MEDIAN CPA across converting terms (this account,
    #    not a generic threshold). None when nothing converts -> we cannot crown winners, only flag waste.
    conv_cpas = [a["cost"] / a["conv"] for a in agg.values() if a["conv"] > 0 and a["cost"] > 0]
    benchmark_cpa = target_cpa if target_cpa else (round(median(conv_cpas), 2) if conv_cpas else None)

    # 3) Thin-data floor: a 0-conversion term is WASTE only once it has had enough clicks that ~1
    #    conversion would have been EXPECTED at the account conversion rate. Below that it is unproven
    #    (Watch), never waste. Fall back to a flat min when the account itself barely converts.
    acct_cr = (total_conv / total_clicks) if total_clicks > 0 else 0
    if acct_cr > 0:
        floor = math.ceil(1.0 / acct_cr)
    else:
        floor = ctx.get("min_clicks_floor", 30)
    floor = max(ctx.get("min_clicks_floor", 0) or 0, min(floor, 200))   # clamp to a sane band

    terms = []
    for term, a in agg.items():
        cost = round(a["cost"], 2); clicks = round(a["clicks"]); conv = round(a["conv"], 2)
        value = round(a["value"], 2)
        cpa = round(cost / conv, 2) if conv > 0 else None
        conv_rate = round(conv / clicks, 4) if clicks > 0 else 0.0
        roas = round(value / cost, 2) if cost > 0 else 0.0
        mtypes = sorted(a["match_types"]); campaigns = sorted(a["campaigns"])

        # --- classify on the money only ---
        if conv > 0:
            if ecommerce:
                cls = "winning" if roas >= roas_target else "watch"
            elif benchmark_cpa is not None:
                cls = "winning" if cpa <= benchmark_cpa else "watch"
            else:
                cls = "watch"                       # converts but no benchmark to beat
        else:
            cls = "waste" if clicks >= floor else "watch"   # 0 conv: waste only past the floor

        # --- destination ---
        non_exact = [m for m in mtypes if m and m != "EXACT"]
        if cls == "winning" and non_exact:
            destination = "promote_to_exact"
        elif cls == "waste":
            destination = "add_negative"
        else:
            destination = "leave"

        # --- dollars at risk: the money this verdict is actually about ---
        dollars_at_risk = cost if cls == "waste" else 0.0

        terms.append({
            "term": term, "match_types": mtypes, "campaigns": campaigns,
            "cost": cost, "clicks": clicks, "conversions": conv,
            "value": value if ecommerce else None,
            "cpa": cpa, "conv_rate": conv_rate, "roas": roas if ecommerce else None,
            "class": cls, "destination": destination,
            "dollars_at_risk": round(dollars_at_risk, 2),
            "below_floor": (conv == 0 and clicks < floor),
        })

    terms.sort(key=lambda t: -t["cost"])

    by_class = defaultdict(lambda: {"count": 0, "cost": 0.0})
    for t in terms:
        by_class[t["class"]]["count"] += 1
        by_class[t["class"]]["cost"] = round(by_class[t["class"]]["cost"] + t["cost"], 2)

    print(json.dumps({
        "meta": {
            "skill": "search-term-performance",
            "account_type": "ecommerce" if ecommerce else "lead_gen",
            "benchmark_cpa": benchmark_cpa,
            "benchmark_source": "target_cpa" if target_cpa else ("median_converting" if conv_cpas else "none"),
            "thin_data_floor_clicks": floor,
            "account_conv_rate": round(acct_cr, 4),
            "roas_target": roas_target if ecommerce else None,
            "totals": {"cost": round(total_cost, 2), "clicks": round(total_clicks),
                       "conversions": round(total_conv, 2),
                       "value": round(total_value, 2) if ecommerce else None},
        },
        "terms": terms,
        "rollup": {
            "terms_count": len(terms),
            "byClass": {k: dict(v) for k, v in by_class.items()},
            "waste_cost": round(sum(t["cost"] for t in terms if t["class"] == "waste"), 2),
            "winning_cost": round(sum(t["cost"] for t in terms if t["class"] == "winning"), 2),
            "watch_cost": round(sum(t["cost"] for t in terms if t["class"] == "watch"), 2),
        },
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
