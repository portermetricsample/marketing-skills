#!/usr/bin/env python3
"""
search-term-labeling — DETERMINISTIC merge core (the COMPOSITION layer of the cluster).

It produces ONE multi-label profile per SEARCH TERM by COMPOSING the sibling skills — it does
NOT re-implement their judgments (that is the whole point: merge, never fork):

  - cannibalization  -> REUSES ../duplicates/scripts/process.py  (run as a subprocess on the
                        SAME raw query_data JSON; its owner-selection + intentional-segment guard
                        are the single source of truth, not copied here).
  - brand class      -> brand-vs-nonbrand rule (brand / competitor / generic) from the per-account
                        term lists  (see ../../../../_framework/brand-vs-nonbrand.md).
  - intent type      -> intent-discovery modifier dictionaries  (kept in sync with
                        ../../intent-discovery/references/framework.md). Deterministic regex first;
                        the LLM resolves the ambiguous ones (term left as intent:null here).
  - relevance        -> NOT computed here. Relevance is an LLM judgment per (term x keyword) pair;
                        this script only EMITS the pairs that need a verdict (see framework.md).

GRAIN (the trap this skill exists to respect):
  brand_class / intent / cannibalized are properties of the TERM      -> one tag per term.
  relevance is a property of the (TERM x KEYWORD) pair                 -> a NESTED list, one entry
  per keyword that triggered the term (a cannibalized term has SEVERAL relevance verdicts at once).

Usage:
  process.py <data.json> <context.json> [account_profile.json]
    data.json            = raw query_data output {columns, rows} (the superset query in query.json)
    context.json         = { "brand_terms": [...], "competitor_terms": [...], "geo_terms": [...] }
                           per-account input; never hardcode advertiser vocabulary.
    account_profile.json = optional; forwarded to duplicates for product-line detection.

Emits JSON: { "terms": [...], "rollup": {...}, "cannibalization_engine": "ok|unavailable" }
The LLM then fills each term's relevance[] verdicts + the final recommended_action, and writes the
3-string synthesis. See ../references/output.md.
"""
import sys, os, re, json, csv, subprocess
from collections import defaultdict

# ---------- intent modifier dictionaries (source of truth: intent-discovery/framework.md) ----------
# Keep these IN SYNC with ../../intent-discovery/references/framework.md. Single primary label by
# the precedence below; ALL matched modifiers are also reported so no signal is lost (multi-intent
# terms keep every tag). Order = which label wins when several match.
INTENT_PRECEDENCE = ["comparison", "cost", "persona", "informational", "geo", "transactional"]
INTENT_PATTERNS = {
    "cost":          [r"\bcost\b", r"\bprice", r"how much", r"\bcheap", r"affordable",
                      r"\brates?\b", r"\bpremium", r"\bquotes?\b"],
    "comparison":    [r"\bbest\b", r"\btop\b", r"\bvs\b", r"versus", r"\bcompare", r"comparison",
                      r"\breviews?\b", r"alternatives?"],
    "informational": [r"what is", r"how to", r"\bguide", r"explained", r"do i need", r"worth it",
                      r"meaning", r"\?", r"\bwhy\b", r"\bwhat\b"],
    "persona":       [r"\bfor (seniors|young|families|family|students?|women|men|self[- ]employed|"
                      r"couples|parents|kids|business|smb)\b", r"\bfor [a-z]+s\b"],
    "geo":           [r"near me", r"\bnearby\b"],   # + optional geo_terms from context
    "transactional": [r"\bbuy\b", r"\bget\b", r"\bapply\b", r"\bonline\b", r"sign ?up", r"purchase",
                      r"\border\b", r"enroll", r"\bsignup\b"],
}


def load_rows(path):
    """Read raw query_data JSON {columns, rows}; tolerant of missing metric columns."""
    d = json.load(open(path))
    idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: (r[idx[n]] if n in idx else "")
    def num(r, n):
        try:
            return float(g(r, n) or 0)
        except (TypeError, ValueError):
            return 0.0
    rows = []
    for r in d["rows"]:
        rows.append({
            "term": g(r, "google_ads_search_term"),
            "kw":   g(r, "google_ads_keyword_info_text"),
            "mt":   (g(r, "google_ads_keyword_info_match_type") or "").upper(),
            "camp": g(r, "google_ads_campaign_name"),
            "ag":   g(r, "google_ads_ad_group_name"),
            "cost": num(r, "google_ads_cost_micros"),
            "impr": num(r, "google_ads_impressions"),
            "clk":  num(r, "google_ads_clicks"),
            "conv": num(r, "google_ads_conversions"),
        })
    return rows


def run_term_routing(data_path, profile_path):
    """Reuse the sibling cannibalization engine. Returns {term -> cannibalization dict} or None."""
    here = os.path.dirname(os.path.abspath(__file__))
    routing = os.path.normpath(os.path.join(here, "..", "duplicates", "scripts", "process.py"))
    if not os.path.exists(routing):
        return None
    cmd = [sys.executable, routing, data_path] + ([profile_path] if profile_path else [])
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if out.returncode != 0:
            return None
        res = json.loads(out.stdout)
    except (subprocess.SubprocessError, json.JSONDecodeError, OSError):
        return None
    cannib = {}
    for a in res.get("actionable", []):
        cannib[a["term"]] = {
            "cannibalized": True,
            "pattern": a.get("pattern"),
            "owner": a.get("owner"),
            "competing_keywords": a.get("competing_keywords", []),
            "negatives": a.get("negatives", []),
            "review_segment": a.get("review_segment", []),
            "needs_own_keyword": a.get("term_has_no_exact_owner", False),
        }
    intentional = {s["term"] for s in res.get("skipped_intentional", [])}
    return {"actionable": cannib, "intentional": intentional}


def _norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def _lev(a, b):
    """Levenshtein edit distance (stdlib only)."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


# Misspelling fuzzy match. This is a CANDIDATE NET, not a verdict — every hit is flagged
# `needs_confirm` for the LLM to adjudicate (see framework.md "Edge cases are LLM-adjudicated").
# So MISSPELL_SIM is a RECALL KNOB: lean it loose (catch more); the LLM filters. It still sits above
# generic near-words (e.g. "insure" scores 0.75 vs a coined brand "insurely") so the obvious
# non-matches stay out. Only fuzzy-match
# DISTINCTIVE (long, coined) brand tokens.
MISSPELL_SIM = 0.80
MIN_BRAND_TOKEN = 5


def brand_match(term, brand_terms, competitor_terms):
    """brand-vs-nonbrand.md rule, now misspelling-aware. Returns (class, kind):
      kind = 'exact' | 'misspelling' | None.
    Brand wins over competitor (keeps the non-brand baseline honest). Competitor stays EXACT-only —
    competitor names are often common words (e.g. 'Canada Life') and fuzzy-matching them false-positives."""
    t = (term or "").lower()
    # 1) exact word-boundary contain
    for b in brand_terms:
        if b and re.search(r"\b" + re.escape(b.lower()) + r"\b", t):
            return ("brand", "exact")
    # 2) MISSPELLING of a distinctive brand token (deterministic fuzzy; flagged for LLM/human confirm).
    #    Candidates = each word + each adjacent word-pair joined (catches "even roll" -> "evenroll").
    words = t.split()
    cands = {_norm(w) for w in words}
    for i in range(len(words) - 1):
        cands.add(_norm(words[i] + words[i + 1]))
    cands.add(_norm(t))
    cands.discard("")
    for b in brand_terms:
        bn = _norm(b)
        if len(bn) < MIN_BRAND_TOKEN:
            continue
        for c in cands:
            if not c or c == bn:
                continue
            d = _lev(c, bn)
            if d and (1 - d / max(len(c), len(bn))) >= MISSPELL_SIM:
                return ("brand", "misspelling")
    # 3) competitor (exact only)
    for c in competitor_terms:
        if c and re.search(r"\b" + re.escape(c.lower()) + r"\b", t):
            return ("competitor", "exact")
    return ("generic", None)


def is_brand_campaign(camp, markers):
    c = (camp or "").lower()
    return any(m in c for m in markers)


def competitor_ambiguity(term, competitor_terms, geo_terms):
    """A competitor tag is AMBIGUOUS (brand-the-company vs generic) when the matched name is a
    common-word compound or overlaps the geo vocabulary — e.g. 'canada life insurance' could be the
    Canada Life brand OR 'life insurance in Canada'. Single distinctive coined names (manulife,
    desjardins) are confident. This only FLAGS; the LLM decides. Known miss: single-word common-word
    brands (Ladder, Ethos) — add those to context if needed."""
    t = (term or "").lower()
    geoset = {g.lower() for g in geo_terms}
    for c in competitor_terms:
        cl = (c or "").lower()
        if cl and re.search(r"\b" + re.escape(cl) + r"\b", t):
            words = cl.split()
            return (len(words) > 1) or any(w in geoset for w in words)
    return False


def cannibal_geo_isolated(cannib, geo_terms):
    """Cross-geo guard: if the competing keywords sit in campaigns naming DIFFERENT geos, they may be
    geo-targeted and NOT actually competing -> flag for the LLM (don't auto-negative). Only FLAGS."""
    if not cannib:
        return False
    camps = {cannib["owner"]["campaign"]}
    camps |= {n["campaign"] for n in cannib.get("negatives", [])}
    camps |= {r["campaign"] for r in cannib.get("review_segment", [])}
    geos = set()
    for cm in camps:
        cl = (cm or "").lower()
        for gt in geo_terms:
            if gt and gt.lower() in cl:
                geos.add(gt.lower())
    return len(geos) >= 2


def classify_intent(term, geo_terms):
    t = (term or "").lower()
    matched = []
    for name, pats in INTENT_PATTERNS.items():
        if any(re.search(p, t) for p in pats):
            matched.append(name)
    if geo_terms and "geo" not in matched:
        if any(re.search(r"\b" + re.escape(gt.lower()) + r"\b", t) for gt in geo_terms):
            matched.append("geo")
    primary = next((i for i in INTENT_PRECEDENCE if i in matched), None)
    return primary, sorted(matched, key=lambda x: INTENT_PRECEDENCE.index(x))


def disposition_hint(cls, brand_contained, intent_primary, cannib, conv):
    """PRELIMINARY only. The LLM finalizes recommended_action AFTER it assigns relevance verdicts
    (a `leak` verdict overrides everything -> add_negative). See framework.md for the full ladder."""
    if cls == "brand" and brand_contained is False:
        # A brand search (incl. misspelling) served OUTSIDE the brand campaign -> contain it.
        # This fires even with ONE catching keyword, which `route_to_owner` (needs 2+) would miss.
        return "contain_brand"
    if cannib and cannib.get("cannibalized"):
        # Primary action is always to ROUTE (negative the losers). `needs_own_keyword` is a
        # SECONDARY handoff flag (carried in tags), not a replacement action — see framework.md.
        return "route_to_owner"
    if cls == "competitor":
        return "brand_policy"
    if intent_primary in ("informational", "comparison", "cost") and conv == 0:
        return "hand_to_content"
    return "keep"


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: process.py <data.json> <context.json> [account_profile.json]")
    data_path, ctx_path = sys.argv[1], sys.argv[2]
    profile_path = sys.argv[3] if len(sys.argv) > 3 else None

    ctx = json.load(open(ctx_path)) if os.path.exists(ctx_path) else {}
    brand_terms = ctx.get("brand_terms", [])
    competitor_terms = ctx.get("competitor_terms", [])
    geo_terms = ctx.get("geo_terms", [])
    # substrings that mark the designated BRAND campaign (containment check). Per-account override.
    brand_markers = [m.lower() for m in ctx.get("brand_campaign_markers",
                     ["brand", "(br)", "_br_", "_br ", " br ", "-br-", "_brand", "brand_"])]

    rows = load_rows(data_path)
    routing = run_term_routing(data_path, profile_path)
    cannib_map = (routing or {}).get("actionable", {})
    intentional = (routing or {}).get("intentional", set())

    # Containment is only assessable if the account actually HAS a brand campaign. If none matches a
    # marker, leave brand_contained = None (don't flood every brand term as a "leak").
    has_brand_campaign = any(is_brand_campaign(r["camp"], brand_markers) for r in rows)

    byterm = defaultdict(list)
    for r in rows:
        byterm[r["term"]].append(r)

    terms = []
    for term, locs in byterm.items():
        cost = round(sum(l["cost"] for l in locs))
        impr = round(sum(l["impr"] for l in locs))
        clk = round(sum(l["clk"] for l in locs))
        conv = round(sum(l["conv"] for l in locs), 2)

        # distinct triggering keywords -> the (term x keyword) pairs the LLM must judge for relevance
        seen, triggers = set(), []
        for l in locs:
            k = ((l["kw"] or "").lower(), l["mt"])
            if k in seen:
                continue
            seen.add(k)
            triggers.append({"keyword": l["kw"], "match_type": l["mt"], "relevance": None})

        cls, kind = brand_match(term, brand_terms, competitor_terms)
        intent_primary, intent_matched = classify_intent(term, geo_terms)
        cannib = cannib_map.get(term)

        # Brand containment: is a brand-classified term served OUTSIDE the brand campaign?
        # Only assessable when the account has a brand campaign at all (else stays None).
        brand_contained, brand_leak = None, []
        if cls == "brand" and has_brand_campaign:
            seen_lk = set()
            for l in locs:
                if not is_brand_campaign(l["camp"], brand_markers):
                    key = (l["camp"], (l["kw"] or "").lower())
                    if key not in seen_lk:
                        seen_lk.add(key)
                        brand_leak.append({"campaign": l["camp"], "ad_group": l["ag"],
                                           "keyword": l["kw"], "match": l["mt"]})
            brand_contained = (len(brand_leak) == 0)

        # Edge cases -> PROVISIONAL: flag for the LLM to adjudicate, never decided by the net alone
        # (see framework.md "Edge cases are LLM-adjudicated, NOT regex").
        comp_ambiguous = (cls == "competitor" and competitor_ambiguity(term, competitor_terms, geo_terms))
        geo_isolated = cannibal_geo_isolated(cannib, geo_terms)
        # needs_confirm GATES a destructive action (negative / contain / route). Intent resolution is
        # its own non-destructive LLM step (`intent: null`) and is NOT a confirm-gate — keeping it out
        # stops the gate from drowning in head/navigational terms.
        confirm = []
        if kind == "misspelling":
            confirm.append("brand_misspelling")        # is it the brand, or a real word with its own intent?
        if comp_ambiguous:
            confirm.append("competitor_common_word")   # brand-the-company vs generic (e.g. Canada Life)
        if geo_isolated:
            confirm.append("maybe_geo_isolated")        # cross-geo: do these campaigns actually compete?

        terms.append({
            "term": term,
            "cost": cost,
            "impressions": impr,
            "clicks": clk,
            "conversions": conv,
            "tags": {
                "brand_class": cls,                                # brand | competitor | generic (provisional if misspelling/ambiguous)
                "brand_match_kind": kind,                          # exact | misspelling | None
                "brand_contained": brand_contained,                # True | False | None (not brand)
                "brand_leak": brand_leak,                          # non-brand campaigns/keywords catching a brand term
                "competitor_ambiguous": comp_ambiguous,            # common-word competitor name -> LLM confirms
                "intent": intent_primary,                          # primary; null -> LLM resolves
                "intent_matched": intent_matched,                  # every modifier matched (nothing lost)
                "cannibalized": bool(cannib),                      # term-level (from duplicates)
                "maybe_geo_isolated": geo_isolated,                # cross-geo cannibalization -> LLM confirms
                "intentional_segmentation": term in intentional,   # same keyword replicated (not cannibal.)
                "cannibalization": cannib,                         # owner/competing/negatives or null
                "relevance": triggers,                             # NESTED (term x keyword) — LLM fills verdict
            },
            "needs_confirm": bool(confirm),                        # a deterministic edge case the LLM MUST adjudicate
            "confirm_reasons": confirm,                            # which edge case(s) — see framework.md
            "disposition_hint": disposition_hint(cls, brand_contained, intent_primary, cannib, conv),
            "recommended_action": None,                            # LLM finalizes (see framework.md ladder)
        })

    terms.sort(key=lambda x: -x["cost"])

    rollup = {
        "terms_count": len(terms),
        "cannibalized_count": sum(1 for t in terms if t["tags"]["cannibalized"]),
        "brand_campaign_detected": has_brand_campaign,
        "needs_confirm_count": sum(1 for t in terms if t.get("needs_confirm")),
        "brand_leak_count": sum(1 for t in terms if t["tags"].get("brand_contained") is False),
        "brand_misspelling_count": sum(1 for t in terms if t["tags"].get("brand_match_kind") == "misspelling"),
        "byBrandClass": _count(terms, lambda t: t["tags"]["brand_class"]),
        "byIntent": _count(terms, lambda t: t["tags"]["intent"] or "unresolved"),
        "byDispositionHint": _count(terms, lambda t: t["disposition_hint"]),
    }
    print(json.dumps({
        "cannibalization_engine": "ok" if routing is not None else "unavailable",
        "terms": terms,
        "rollup": rollup,
    }, ensure_ascii=False, indent=2))


def _count(terms, key):
    c = defaultdict(int)
    for t in terms:
        c[key(t)] += 1
    return dict(sorted(c.items(), key=lambda kv: -kv[1]))


if __name__ == "__main__":
    main()
