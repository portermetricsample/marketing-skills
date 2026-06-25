#!/usr/bin/env python3
"""
term-routing — DETERMINISTIC core (no LLM in the typical case).

Usage: process.py <data.csv|data.json> [account_profile.json]

WHAT IT DETECTS
  Cannibalization = one SEARCH TERM matched by 2+ DIFFERENT keywords (different keyword TEXT)
  competing to serve the same query — whether they sit in:
    - different ad groups of the SAME campaign  (intra-campaign),
    - different campaigns of the same product line (cross-campaign), or
    - different product lines                    (cross-product).
  The harm is NOT "bidding against yourself" (one auction, one keyword wins). The harm is ROUTING:
  a looser/less-relevant keyword wins the query a more-relevant one should own — which also splits
  the query's conversion/quality signal across keywords and can show the wrong ad.

  Intentional segmentation = the SAME keyword deliberately replicated across segment/test campaigns
  (age / geo / audience / *_Test). That is ONE distinct keyword for the term -> NOT cannibalization
  -> left alone (reported under skipped_intentional for transparency).

THE FIX (per term)
  Consolidate under the best OWNER, chosen by: right product line -> match specificity (exact>phrase>
  broad) -> keyword-text closeness to the term -> spend. Emit the term as a NEGATIVE in every OTHER
  keyword's ad group so the owner serves it. Negatives that would land inside a segment/test campaign
  are quarantined to `review_segment` (don't disturb an intentional test automatically).

INPUT (CSV columns or raw query_data JSON {columns, rows}):
  search_term, keyword(_info_text), match_type, campaign, ad_group, cost
Optional 2nd arg: account profile (../../../_framework/account-profile.md) mapping product words->lines.
  Without it: generic mode (campaign 2nd token = line). NO advertiser vocabulary is hardcoded.
"""
import sys, json, csv, re
from collections import defaultdict

SPEC = {"EXACT": 3, "PHRASE": 2, "BROAD": 1}
# Markers of an intentional segment/test campaign (age / geo / audience / explicit test).
SEGMENT_RE = re.compile(
    r"(_test\b|\btest\b|embedded|\bgi\b|_gi_|\d{2}\s*-\s*\d{2}|6[05]\s*\+|\baud(ience)?\b|\[province\]|\[city\])",
    re.I,
)

def load(src):
    if src.endswith(".csv"):
        rows = list(csv.DictReader(open(src)))
        return [{"term": r["search_term"], "kw": r["keyword"], "mt": (r["match_type"] or "").upper(),
                 "camp": r["campaign"], "ag": r["ad_group"], "cost": float(r.get("cost") or 0)} for r in rows]
    d = json.load(open(src)); idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: r[idx[n]] if n in idx else ""
    out = []
    for r in d["rows"]:
        try: cost = float(g(r, "google_ads_cost_micros") or 0)
        except (TypeError, ValueError): cost = 0
        out.append({"term": g(r, "google_ads_search_term"), "kw": g(r, "google_ads_keyword_info_text"),
                    "mt": (g(r, "google_ads_keyword_info_match_type") or "").upper(),
                    "camp": g(r, "google_ads_campaign_name"), "ag": g(r, "google_ads_ad_group_name"),
                    "cost": cost})
    return out

def second_token(camp):
    toks = [t for t in re.split(r"[_| ]", camp or "") if t]
    return toks[1].lower() if len(toks) > 1 else ""

def is_segment(camp):
    return bool(SEGMENT_RE.search(camp or ""))

def main():
    rows = load(sys.argv[1])
    profile = json.load(open(sys.argv[2])) if len(sys.argv) > 2 else {}
    prod = profile.get("products", {})
    line_of_word = {k.lower(): v.lower() for k, v in prod.get("line_of_word", {}).items()}
    kw_lexicon = {k.lower(): v.lower() for k, v in prod.get("keyword_lexicon", {}).items()}

    byterm = defaultdict(list)
    for r in rows:
        byterm[r["term"]].append(r)

    def camp_line(c):
        w = second_token(c)
        return line_of_word.get(w, w)

    # term -> product line (profile lexicon, else fall back to the campaign-line words)
    lex = kw_lexicon or {l: l for l in {camp_line(r["camp"]) for r in rows} if l.isalpha() and len(l) > 2}
    def term_line(term):
        tl = (term or "").lower()
        for word, line in lex.items():
            if re.search(r"\b" + re.escape(word) + r"\b", tl):
                return line
        return None

    def relevance(loc, term, tl):
        """Higher = better owner for this term. Deterministic."""
        kt, tt = (loc["kw"] or "").lower(), (term or "").lower()
        ktok, ttok = set(kt.split()), set(tt.split())
        score = 0
        if tl and camp_line(loc["camp"]) == tl:
            score += 100                                  # right product line dominates
        score += SPEC.get(loc["mt"], 0) * 10             # match specificity (exact>phrase>broad)
        if kt == tt:
            score += 8                                    # keyword text == the term
        elif ttok and ttok <= ktok:
            score += 4                                    # keyword contains the whole term
        elif ktok and ktok <= ttok:
            score += 3                                    # term contains the whole keyword
        else:
            score += len(ktok & ttok)                     # token overlap
        return (score, round(loc["cost"], 6))

    actionable, skipped = [], []
    for term, locs in byterm.items():
        distinct_kw = {(l["kw"] or "").lower() for l in locs}
        cost = round(sum(l["cost"] for l in locs))
        camps = sorted({l["camp"] for l in locs})
        if len(distinct_kw) < 2:
            # only the SAME keyword across 1+ places -> single-keyword or intentional replication
            if len({(l["camp"], l["ag"]) for l in locs}) > 1:
                skipped.append({"term": term, "cost": cost, "distinct_keywords": 1,
                                "campaigns": camps, "reason": "same keyword replicated across segments (intentional)"})
            continue

        tl = term_line(term)
        owner = max(locs, key=lambda l: relevance(l, term, tl))
        ok = (owner["kw"] or "").lower()

        negatives, review_segment, seen = [], [], set()
        for l in locs:
            if (l["kw"] or "").lower() == ok:
                continue                                  # same keyword as owner (incl. intentional copies)
            key = (l["camp"], l["ag"], (l["kw"] or "").lower())
            if key in seen:
                continue
            seen.add(key)
            entry = {"campaign": l["camp"], "ad_group": l["ag"], "match": l["mt"], "keyword": l["kw"]}
            (review_segment if is_segment(l["camp"]) else negatives).append(entry)

        if not negatives and not review_segment:
            continue                                      # only the owner's keyword (no competitor) -> nothing to route

        lines = sorted({camp_line(c) for c in camps})
        if len(lines) > 1:
            pattern = "cross_product"
        elif len(camps) > 1:
            pattern = "cross_campaign_same_line"
        else:
            pattern = "same_campaign_cross_adgroup"

        actionable.append({
            "term": term, "cost": cost, "pattern": pattern, "term_line": tl,
            "owner": {"campaign": owner["camp"], "ad_group": owner["ag"], "match": owner["mt"], "keyword": owner["kw"]},
            "negatives": negatives,
            "review_segment": review_segment,            # negatives that would hit a test/segment campaign — human review
            "term_has_no_exact_owner": all((l["kw"] or "").lower() != (term or "").lower() for l in locs),
            "competing_keywords": sorted(distinct_kw),
        })

    actionable.sort(key=lambda x: -x["cost"])
    skipped.sort(key=lambda x: -x["cost"])
    print(json.dumps({
        "profile_used": bool(profile),
        "actionable": actionable,
        "actionable_count": len(actionable),
        "skipped_intentional": skipped[:20],
        "skipped_count": len(skipped),
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
