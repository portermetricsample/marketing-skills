#!/usr/bin/env python3
"""
structure-map — DETERMINISTIC core (decode of the naming convention).

Input: the raw query_data JSON ({columns, rows}) with at least campaign_name; ideally
also ad_group_name, channel_type, bidding_type, match_type.

Output (stdout, JSON):
  - grammar: inferred separators/structure
  - segmentation_params: dimensions -> distinct values (the filters/groupings)
  - code_to_lines: family(code) -> product lines hierarchy
  - ad_group_subsegments: the sub-segment dimension (persona/condition/coverage/intent/geo)
  - ambiguous_tokens: tokens that don't map to a known dimension -> for the LLM / dictionary

General: derives the vocabularies from the account itself; doesn't hardcode an advertiser's products.
"""
import sys, json, re
from collections import defaultdict, Counter

KNOWN = {
    "type": {"sem": "Search", "demandgen": "Demand Gen", "pmax": "Performance Max", "shopping": "Shopping", "video": "Video"},
    "funnel": {"tofu": "TOFU", "mofu": "MOFU", "bofu": "BOFU"},
    "match": {"broadmatch": "Broad", "broad": "Broad", "phrase": "Phrase", "exact": "Exact"},
    "test": {"test": "Test", "split": "Split"},
}
AGE = re.compile(r'\b(\d{2}-\d{2}|\d{2}\+)\b')

def main():
    d = json.load(open(sys.argv[1]))
    idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: r[idx[n]] if n in idx else ""
    camp_meta = {}; camp_ags = defaultdict(set)
    for r in d["rows"]:
        c = g(r, "google_ads_campaign_name")
        camp_meta[c] = (g(r, "google_ads_campaign_advertising_channel_type"), g(r, "google_ads_campaign_bidding_strategy_type"))
        a = g(r, "google_ads_ad_group_name")
        if a: camp_ags[c].add(a)
    campaigns = list(camp_meta)

    seps = Counter(ch for c in campaigns for ch in c if ch in "_-|")
    grammar = {"separators": [s for s, _ in seps.most_common()], "has_code_parens": any("(" in c for c in campaigns)}

    seg = defaultdict(set); code_lines = defaultdict(set); ambiguous = Counter()
    def pword(c):
        toks = [t for t in re.split(r'[_| ]', c) if t]
        return toks[1] if len(toks) > 1 else ""
    for c in campaigns:
        toks = [t for t in re.split(r'[_|()\[\] ]', c) if t]
        seg["program"].add(toks[0] if toks else "")
        m = re.search(r'\(([^)]+)\)', c); code = m.group(1) if m else None
        if code: seg["product_code"].add(code)
        line = pword(c)
        if line: seg["product_line"].add(line);
        if code and line: code_lines[code].add(line)
        ch, bid = camp_meta[c]
        seg["type_real"].add(ch); seg["bidding_real"].add(bid)
        low = c.lower()
        for k, lab in KNOWN["funnel"].items():
            if re.search(r'\b'+k+r'\b', low): seg["funnel"].add(lab)
        for k, lab in KNOWN["test"].items():
            if k in low: seg["test"].add(lab)
        for a in AGE.findall(c): seg["audience_age"].add(a)
        # unmapped tokens (ambiguous candidates): short uppercase like AO, GI, Embedded
        for t in toks:
            tl = t.lower()
            mapped = (t == code or tl == line.lower() or tl in KNOWN["type"] or tl in KNOWN["funnel"]
                      or tl in KNOWN["test"] or "life" in tl or AGE.match(t) or tl in ("sem",))
            if not mapped and re.match(r'^[A-Za-z]{2,10}$', t) and t not in ("Insurance",):
                ambiguous[t] += 1

    # ad group sub-segments (the intermediate-level dimension)
    SUB = [(r'senior','Seniors'),(r'famil','Families'),(r'couple','Couples'),(r'young','Young'),
           (r'self[- ]?employ|freelanc','Self-Employed'),(r'province|\[','Geo'),(r'amount','Amounts'),
           (r'term length','TermLength'),(r'guaranteed','GuaranteedIssue'),(r'pre-existing|severe|organ|heart|diabetic','HighRisk'),
           (r'chiro|physio','Chiro/Physio'),(r'mental','MentalHealth'),(r'prescription','Prescriptions'),
           (r'no medical|instant','NoMedical'),(r'affordable|cheap|low cost|reasonable|inexpensive','Affordable'),(r'best','Best'),(r'buy|get','BuyIntent')]
    subseg = Counter()
    for c, ags in camp_ags.items():
        for a in ags:
            for pat, lab in SUB:
                if re.search(pat, a.lower()): subseg[lab] += 1; break

    out = {
        "grammar": grammar,
        "segmentation_params": {k: sorted(v) for k, v in seg.items()},
        "code_to_lines": {k: sorted(v) for k, v in sorted(code_lines.items())},
        "ad_group_subsegments": dict(subseg.most_common()),
        "ambiguous_tokens": dict(ambiguous.most_common()),
        "note_for_llm": "Resolve ambiguous_tokens with site research or the team dictionary; do not invent.",
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
