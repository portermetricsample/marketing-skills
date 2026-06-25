#!/usr/bin/env python3
"""
Search-term waste n-grams — the DETERMINISTIC half of the search-terms / negatives section.

Account-agnostic (per _framework/account-profile.md: "code the universal, infer the advertiser's
vocabulary"). This script only does the universal math — sum spend, find zero-conversion spend, rank
n-grams by that spend. It does NOT decide which terms are competitor/informational negatives; that's a
relevance judgment the LLM makes (framework.md §4: "negatives are a relevance call, not a performance one").

Input: a Porter `query_data` result file (the JSON the MCP persists for a large pull), with columns that
include a search-term field, `*cost*`, `*conversions*`, and (optional) `*conversions_value*`. Cost is in
account currency already (NOT micros).

Usage:
  python3 ngram.py <result.json> [--brand "policyme,policy me"] [--top 30] [--stop "insurance,life"]

Output: JSON to stdout — totals, zero-conversion waste (+top terms), brand split, and the top
unigrams/bigrams ranked by zero-conversion spend.
"""
import json, sys, argparse, re
from collections import defaultdict

DEFAULT_STOP = {"the", "a", "an", "for", "in", "of", "to", "and", "or", "my", "me", "i", "is", "&", "vs"}


def col(cols, *needles):
    """Find the first column whose name contains all needles (case-insensitive)."""
    for c in cols:
        lc = c.lower()
        if all(n in lc for n in needles):
            return cols.index(c)
    return -1


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--brand", default="", help="comma-separated brand substrings (excluded from waste)")
    ap.add_argument("--stop", default="", help="extra comma-separated stopword tokens")
    ap.add_argument("--top", type=int, default=30)
    args = ap.parse_args()

    data = json.load(open(args.file))
    cols = data["columns"]
    rows = data["rows"]
    i_term = col(cols, "search_term")
    if i_term < 0:
        i_term = col(cols, "term")
    i_cost = col(cols, "cost")
    i_conv = col(cols, "conversion")  # first 'conversion*' = conversions count
    # prefer an exact conversions (not value / not rate)
    for j, c in enumerate(cols):
        lc = c.lower()
        if lc.endswith("conversions") or lc.endswith("_conversions"):
            i_conv = j
    i_val = col(cols, "conversions_value")
    if min(i_term, i_cost, i_conv) < 0:
        sys.exit(f"Could not map columns. Got: {cols}")

    brand = [b.strip().lower() for b in args.brand.split(",") if b.strip()]
    stop = set(DEFAULT_STOP) | {s.strip().lower() for s in args.stop.split(",") if s.strip()}

    tot_cost = tot_conv = tot_val = 0.0
    waste_cost = 0.0
    brand_cost = brand_conv = brand_val = 0.0
    zerovalue_cost = 0
    waste_terms = []
    uni = defaultdict(lambda: [0.0, 0])   # token -> [cost, count]
    bi = defaultdict(lambda: [0.0, 0])

    for r in rows:
        term = (r[i_term] or "").strip()
        cost = fnum(r[i_cost])
        conv = fnum(r[i_conv])
        val = fnum(r[i_val]) if i_val >= 0 else 0.0
        tot_cost += cost; tot_conv += conv; tot_val += val
        is_brand = any(b in term.lower() for b in brand)
        if is_brand:
            brand_cost += cost; brand_conv += conv; brand_val += val
            continue
        if conv > 0 and val == 0:
            zerovalue_cost += 1  # count of such rows; cost tallied below
        if conv == 0:
            waste_cost += cost
            waste_terms.append((term, round(cost, 2)))
            toks = [t for t in re.findall(r"[a-z0-9]+", term.lower()) if t not in stop]
            for t in toks:
                uni[t][0] += cost; uni[t][1] += 1
            for a, b in zip(toks, toks[1:]):
                bi[a + " " + b][0] += cost
                bi[a + " " + b][1] += 1

    def top(d):
        return [{"token": k, "cost": round(v[0], 2), "terms": v[1]}
                for k, v in sorted(d.items(), key=lambda kv: -kv[1][0])[:15]]

    out = {
        "rows": len(rows),
        "totals": {"cost": round(tot_cost, 2), "conversions": round(tot_conv, 2),
                   "conversions_value": round(tot_val, 2)},
        "zero_conversion_waste": {
            "cost": round(waste_cost, 2),
            "share_of_cost": round(waste_cost / tot_cost, 4) if tot_cost else 0,
            "term_count": sum(1 for t in waste_terms),
            "top_terms": sorted(waste_terms, key=lambda x: -x[1])[: args.top],
            "note": "RELEVANT zero-conv terms are a DIAGNOSE item, not waste to cut — the LLM splits out "
                    "the true competitor/informational/off-vertical negatives (framework.md §4).",
        },
        "brand": {"cost": round(brand_cost, 2), "conversions": round(brand_conv, 2),
                  "conversions_value": round(brand_val, 2)} if brand else None,
        "ngrams_by_zero_conv_cost": {"unigrams": top(uni), "bigrams": top(bi)},
    }
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
