#!/usr/bin/env python3
"""
search-term-ngrams — DETERMINISTIC n-gram aggregator (the Brainlabs search-query-mining method).

Break every SEARCH TERM into 1/2/3-grams (unigram/bigram/trigram), then add up the metrics of every
term that contains each n-gram. A pattern invisible at the single-term level (50 different $2 terms
that all contain "free") becomes one actionable signal in aggregate ($100, 0 conversions -> one
list-level negative). Then: bad n-grams -> negative-keyword candidates; good n-grams -> themes to
expand into keywords / ad groups.

DOCTRINE (see ../references/framework.md): this is a high-recall CANDIDATE NET, not a verdict. The
dangerous calls — a "load-bearing" token that also rides in good traffic, a competitor token, a brand
token — are flagged `needs_confirm` and gated to the LLM. The threshold knobs decide what to SHOW the
LLM, never what to negative.

Usage: process.py <data.json> <context.json>
  data.json    = raw query_data {columns, rows}: search_term + impressions, clicks, cost_micros,
                 conversions, conversions_value.
  context.json = { brand_terms:[...], competitor_terms:[...], target_cpa?:num, roas_breakeven?:num,
                   min_terms?:int, min_cost_waste?:num, win_conv?:int, win_roas?:num, stop_words?:[...] }
Emits JSON: { meta, waste[], winning[], rollup }. The LLM adds synthesis + adjudicates needs_confirm.
"""
import sys, os, re, json
from collections import defaultdict

# Unigram stop words — dropped for 1-grams (meaningless alone) but KEPT inside 2/3-grams, where
# "for free", "near me", "how to", "do i" carry the signal. Extensible via context.stop_words.
STOP = {
    "a", "an", "and", "are", "as", "at", "be", "by", "do", "for", "from", "i", "in", "is", "it",
    "me", "my", "of", "on", "or", "the", "to", "with", "you", "your", "we", "us", "our", "that",
    "this", "can", "vs", "&",
}


def norm_words(term):
    t = re.sub(r"[^a-z0-9 ]+", " ", (term or "").lower())
    return [w for w in t.split() if w]


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
            "impr": num(r, "google_ads_impressions"),
            "clicks": num(r, "google_ads_clicks"),
            "cost": num(r, "google_ads_cost_micros"),
            "conv": num(r, "google_ads_conversions"),
            "value": num(r, "google_ads_conversions_value"),
        })
    return out


def ngrams(words, n):
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: process.py <data.json> <context.json>")
    rows = load_rows(sys.argv[1])
    ctx = json.load(open(sys.argv[2])) if os.path.exists(sys.argv[2]) else {}

    brand_terms = [b.lower() for b in ctx.get("brand_terms", [])]
    competitor_terms = [c.lower() for c in ctx.get("competitor_terms", [])]
    stop = STOP | {s.lower() for s in ctx.get("stop_words", [])}
    target_cpa = ctx.get("target_cpa")
    roas_be = ctx.get("roas_breakeven", 1.0)
    min_terms = ctx.get("min_terms", 2)            # an n-gram must span >= this many distinct terms
    min_cost_waste = ctx.get("min_cost_waste", 0)
    win_conv = ctx.get("win_conv", 2)
    win_roas = ctx.get("win_roas", 2.0)

    total_cost = sum(r["cost"] for r in rows)
    total_value = sum(r["value"] for r in rows)
    total_terms = len(rows)
    ecommerce = total_value > 0                     # value present -> judge on ROAS, else lead-gen (CPA/0-conv)
    broad_cut = max(20, 0.10 * total_terms)         # "load-bearing" token: rides a large share of terms

    agg = {}
    for r in rows:
        words = norm_words(r["term"])
        seen = set()
        for n in (1, 2, 3):
            for gram in ngrams(words, n):
                if n == 1 and (gram in stop or len(gram) <= 1):
                    continue
                if gram in seen:                    # count each n-gram once per term
                    continue
                seen.add(gram)
                a = agg.get(gram)
                if a is None:
                    a = agg[gram] = {"n": n, "cost": 0.0, "clicks": 0.0, "impr": 0.0,
                                     "conv": 0.0, "value": 0.0, "terms": []}
                a["cost"] += r["cost"]; a["clicks"] += r["clicks"]; a["impr"] += r["impr"]
                a["conv"] += r["conv"]; a["value"] += r["value"]
                a["terms"].append((r["term"], r["cost"], r["conv"]))

    def classify(gram):
        if any(re.search(r"\b" + re.escape(b) + r"\b", gram) for b in brand_terms):
            return "brand"
        if any(re.search(r"\b" + re.escape(c) + r"\b", gram) for c in competitor_terms):
            return "competitor"
        return "generic"

    waste, winning, brand_n, comp_n = [], [], 0, 0
    for gram, a in agg.items():
        tc = len(a["terms"])
        if tc < min_terms:
            continue
        cost, conv, value = round(a["cost"], 2), round(a["conv"], 2), round(a["value"], 2)
        cpa = round(cost / conv, 2) if conv > 0 else None
        roas = round(value / cost, 2) if cost > 0 else 0.0
        cls = classify(gram)
        broad = tc >= broad_cut
        sample = [t for t, _, _ in sorted(a["terms"], key=lambda x: -x[1])[:4]]
        rec = {"ngram": gram, "n": a["n"], "class": cls,
               "cost": cost, "clicks": round(a["clicks"]), "impressions": round(a["impr"]),
               "conversions": conv, "value": value, "cpa": cpa, "roas": roas,
               "term_count": tc, "broad": broad, "sample_terms": sample}

        if cls == "brand":
            brand_n += 1
            continue  # brand n-grams = demand capture / defense — never a negative candidate
        if cls == "competitor":
            comp_n += 1

        # WINNING (expand): strong conversions / ROAS
        is_win = (conv >= win_conv) and (
            (ecommerce and roas >= win_roas) or
            (not ecommerce and (target_cpa is None or (cpa is not None and cpa <= target_cpa))))
        # WASTE (negative): spends without paying back
        is_waste = (cost >= min_cost_waste) and (
            (ecommerce and roas < roas_be) or
            (not ecommerce and conv == 0))

        if is_win:
            rec["recommended"] = "expand"
            winning.append(rec)
        elif is_waste:
            reasons = []
            if broad:
                reasons.append("broad_blast_radius")    # a load-bearing token — negativing it blocks a lot
            # Does this generic n-gram ride mostly on BRAND searches? (e.g. "term life" sitting in
            # "acme term life insurance"). Negativing it would block brand traffic — confirm first.
            brand_share = (sum(1 for t, _, _ in a["terms"]
                               if any(re.search(r"\b" + re.escape(b) + r"\b", t.lower()) for b in brand_terms))
                           / tc) if brand_terms else 0
            if brand_share >= 0.30:
                reasons.append("rides_brand_traffic")
            if cls == "competitor":
                reasons.append("competitor_conquest")   # decision, not a mechanical negative
            if ecommerce and conv > 0:
                reasons.append("has_some_conversions")   # low ROAS but not zero — confirm before cutting
            rec["needs_confirm"] = bool(reasons)
            rec["confirm_reasons"] = reasons
            rec["recommended"] = "review" if reasons else "add_negative"
            rec["negative_match"] = "phrase" if a["n"] > 1 else "phrase"  # default phrase; LLM may drop to exact
            waste.append(rec)

    waste.sort(key=lambda x: -x["cost"])
    winning.sort(key=lambda x: (-x["conversions"], -(x["roas"] or 0)))

    print(json.dumps({
        "meta": {"account_type": "ecommerce" if ecommerce else "lead_gen",
                 "total_terms": total_terms, "total_cost": round(total_cost, 2),
                 "roas_breakeven": roas_be, "target_cpa": target_cpa,
                 "broad_cut_terms": round(broad_cut)},
        "waste": waste[:40],
        "winning": winning[:30],
        "rollup": {
            "ngrams_considered": sum(1 for a in agg.values() if len(a["terms"]) >= min_terms),
            "waste_count": len(waste), "winning_count": len(winning),
            "brand_ngrams": brand_n, "competitor_ngrams": comp_n,
            "waste_cost": round(sum(w["cost"] for w in waste), 2),
            "needs_confirm_count": sum(1 for w in waste if w.get("needs_confirm")),
        },
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
