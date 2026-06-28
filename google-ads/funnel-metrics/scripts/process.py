#!/usr/bin/env python3
"""
process.py — Funnel Metrics core (deterministic). No AI.

Takes two Porter `query_data` totals dumps (current period + previous period), builds the
SUMAS funnel (Visibility -> Engagement -> Conversion, each with volume + efficiency + rate),
and computes every metric AND its vs-previous-period change.

CRITICAL: every rate/cost is computed from the BASE COUNTS — the native ratio fields
(ctr, average_cpc, conversions_from_interactions_rate, value_per_conversion,
cost_per_conversion) are unreliable at the account aggregate (validated: native conv-rate
returned 0.0 with 100 conversions). Only base counts aggregate correctly. So we query counts
and derive the rest here.

Inputs (both the {columns, rows} shape Porter returns; account-totals = 1 row each):
  --current   the period being reported
  --previous  the equal-length window immediately before it
  --out       findings JSON
"""
import argparse, json
from collections import OrderedDict

# Base-count fields we trust (everything else is derived from these).
IMPR = "google_ads_impressions"
CLK  = "google_ads_clicks"
COST = "google_ads_cost_micros"          # already in account currency
CONV = "google_ads_conversions"          # primary (= Google UI)
VAL  = "google_ads_conversions_value"
ALLC = "google_ads_all_conversions"
IS_TOP   = "google_ads_search_top_impression_share"
IS_ATOP  = "google_ads_search_absolute_top_impression_share"
IS_LRANK = "google_ads_search_rank_lost_top_impression_share"
IS_LBUD  = "google_ads_search_budget_lost_top_impression_share"


def load_row(path):
    with open(path) as f:
        d = json.load(f)
    cols = d["columns"]
    rows = [dict(zip(cols, r)) for r in d["rows"]]
    # account-totals query returns a single row; if segmented, sum the base counts.
    if not rows:
        return {}
    if len(rows) == 1:
        return rows[0]
    agg = {}
    for f in (IMPR, CLK, COST, CONV, VAL, ALLC):
        agg[f] = sum(num(r.get(f)) for r in rows)
    # IS can't be summed; keep the impressions-weighted average as an approximation.
    tot_impr = agg[IMPR] or 1
    for f in (IS_TOP, IS_ATOP, IS_LRANK, IS_LBUD):
        agg[f] = sum(num(r.get(f)) * num(r.get(IMPR)) for r in rows) / tot_impr
    return agg


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def safe(n, d):
    return n / d if d else None


def derive(row):
    """All funnel metrics computed from base counts."""
    impr, clk = num(row.get(IMPR)), num(row.get(CLK))
    cost, conv = num(row.get(COST)), num(row.get(CONV))
    val = num(row.get(VAL))
    return {
        "impressions": impr,
        "clicks": clk,
        "cost": cost,
        "conversions": conv,
        "value": val,
        "cpm": safe(cost * 1000, impr),
        "cpc": safe(cost, clk),
        "ctr": safe(clk, impr),                 # fraction (×100 for %)
        "cpa": safe(cost, conv),
        "roas": safe(val, cost),
        "conv_rate": safe(conv, clk),           # fraction
        "aov": safe(val, conv),
        "is_top": num(row.get(IS_TOP)),         # % (approx at account total)
        "is_abs_top": num(row.get(IS_ATOP)),
        "is_lost_rank": num(row.get(IS_LRANK)),
        "is_lost_budget": num(row.get(IS_LBUD)),
    }


def cell(cur, prev, higher_is_better):
    """One metric vs previous period."""
    delta = None
    if cur is not None and prev not in (None, 0):
        delta = round((cur - prev) / prev * 100, 1)
    good = None
    if delta is not None:
        up = delta > 0
        good = (up == higher_is_better) if delta != 0 else None
    return OrderedDict([
        ("current", round(cur, 4) if cur is not None else None),
        ("previous", round(prev, 4) if prev is not None else None),
        ("delta_pct", delta),
        ("better", good),
    ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--current", required=True)
    ap.add_argument("--previous", required=True)
    ap.add_argument("--out", default="../data/findings.json")
    a = ap.parse_args()

    cur = derive(load_row(a.current))
    prev = derive(load_row(a.previous))
    is_ecom = cur["value"] > 0  # business-model auto-detect

    def C(metric, higher_is_better):
        return cell(cur[metric], prev[metric], higher_is_better)

    funnel = OrderedDict()
    funnel["visibility"] = OrderedDict([
        ("impressions", C("impressions", True)),
        ("cpm", C("cpm", False)),
        ("is_top_pct", C("is_top", True)),
        ("is_abs_top_pct", C("is_abs_top", True)),
        ("is_lost_rank_pct", C("is_lost_rank", False)),
        ("is_lost_budget_pct", C("is_lost_budget", False)),
        ("_note", "Impression Share is approximate at account total (per-campaign weighting recommended)."),
    ])
    funnel["engagement"] = OrderedDict([
        ("clicks", C("clicks", True)),
        ("cpc", C("cpc", False)),
        ("ctr", C("ctr", True)),
    ])
    conv = OrderedDict([
        ("conversions", C("conversions", True)),
        ("cpa", C("cpa", False)),
        ("conv_rate", C("conv_rate", True)),
    ])
    if is_ecom:
        conv["value"] = C("value", True)
        conv["roas"] = C("roas", True)
        conv["aov"] = C("aov", True)
    funnel["conversion"] = conv

    out = OrderedDict([
        ("business_model", "ecommerce" if is_ecom else "lead-gen"),
        ("spend", OrderedDict([("current", round(cur["cost"], 2)), ("previous", round(prev["cost"], 2))])),
        ("funnel", funnel),
    ])
    with open(a.out, "w") as f:
        json.dump(out, f, indent=2)

    # ---- readable print
    def arrow(c):
        if c["delta_pct"] is None:
            return "  —"
        s = "+" if c["delta_pct"] >= 0 else ""
        mark = "" if c["better"] is None else ("✅" if c["better"] else "🔴")
        return f"{s}{c['delta_pct']}% {mark}"

    print(f"FUNNEL ({out['business_model']}) — spend ${cur['cost']:,.0f} vs ${prev['cost']:,.0f}")
    print(f"VISIBILITY  impr {cur['impressions']:,.0f} ({arrow(funnel['visibility']['impressions'])})  "
          f"CPM ${cur['cpm'] or 0:,.2f} ({arrow(funnel['visibility']['cpm'])})  "
          f"IS-top {cur['is_top']:.1f}% ({arrow(funnel['visibility']['is_top_pct'])})  "
          f"[lost rank {cur['is_lost_rank']:.0f}% / budget {cur['is_lost_budget']:.0f}%]")
    print(f"ENGAGEMENT  clicks {cur['clicks']:,.0f} ({arrow(funnel['engagement']['clicks'])})  "
          f"CPC ${cur['cpc'] or 0:,.2f} ({arrow(funnel['engagement']['cpc'])})  "
          f"CTR {(cur['ctr'] or 0)*100:.2f}% ({arrow(funnel['engagement']['ctr'])})")
    line = (f"CONVERSION  conv {cur['conversions']:,.1f} ({arrow(conv['conversions'])})  "
            f"CPA ${cur['cpa'] or 0:,.2f} ({arrow(conv['cpa'])})  "
            f"CvR {(cur['conv_rate'] or 0)*100:.2f}% ({arrow(conv['conv_rate'])})")
    if is_ecom:
        line += f"  ROAS {cur['roas']:.2f} ({arrow(conv['roas'])})  AOV ${cur['aov']:,.0f} ({arrow(conv['aov'])})"
    print(line)
    print(f"  → {a.out}")


if __name__ == "__main__":
    main()
