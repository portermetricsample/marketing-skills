#!/usr/bin/env python3
"""
structure-audit — DETERMINISTIC core (no LLM).

Input: the raw query_data JSON (schema {columns:[...], rows:[[...]]}) from the
'structure' query (see query.json). Accepts a file path or stdin.

Output (stdout, JSON):
  - convention: inferred convention (naming schemes, channels, biddings)
  - findings:   deterministic findings with severity (checks A/B/C/D)
  - theme_suspects: (keyword, ad_group, campaign) pairs that are theme-misalignment candidates
                    -> THIS is the only thing the LLM judges (check 1, semantic)

General: doesn't hardcode one account's tokens. Redundancy intentionality is decided
by the product CODE (parentheses), not by fixed lists.
"""
import sys, json, re
from collections import defaultdict

def load(src):
    raw = open(src).read() if src else sys.stdin.read()
    return json.loads(raw)

def expected_mt(agname):
    n = agname.lower()
    if "broad" in n: return {"BROAD"}
    if "phrase & exact" in n or "phrase/exact" in n or "phrase / exact" in n: return {"PHRASE", "EXACT"}
    if "exact" in n and "phrase" not in n: return {"EXACT"}
    if "phrase" in n and "exact" not in n: return {"PHRASE"}
    return None

def code_of(camp):
    m = re.search(r'\(([^)]+)\)', camp)
    return m.group(1) if m else None

def scheme_of(camp):
    # scheme = prefix before the first strong separator
    return re.split(r'[_| ]', camp.strip())[0]

GENERIC_AG = re.compile(r'^(ad group \d+|group|individual|long tail|competitors|untitled.*)$', re.I)

def main():
    d = load(sys.argv[1] if len(sys.argv) > 1 else None)
    # optional account profile (see ../../../_framework/account-profile.md) for the cross-product
    # check. WITHOUT it, that one check runs in degraded generic mode (derived from names).
    profile = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and sys.argv[2].endswith(".json") else {}
    idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: r[idx[n]] if n in idx else ""

    camp_meta = {}                  # camp -> (channel, bidding)
    ag_kws = defaultdict(list)       # (camp, ag) -> [(kw, mt)]
    kw_locs = defaultdict(set)       # (kw, mt) -> {(camp, ag)}
    for r in d["rows"]:
        camp, ag = g(r, "google_ads_campaign_name"), g(r, "google_ads_ad_group_name")
        kw, mt = g(r, "google_ads_keyword_info_text"), g(r, "google_ads_keyword_info_match_type")
        camp_meta[camp] = (g(r, "google_ads_campaign_advertising_channel_type"),
                           g(r, "google_ads_campaign_bidding_strategy_type"))
        ag_kws[(camp, ag)].append((kw, mt)); kw_locs[(kw, mt)].add((camp, ag))

    campaigns = set(camp_meta); adgroups = set(ag_kws)
    findings = []
    def add(check, severity, where, detail, fix):
        findings.append({"check": check, "severity": severity, "where": where, "detail": detail, "fix": fix})

    # --- A: match-type in the ad group name ---
    for (camp, ag), items in ag_kws.items():
        exp = expected_mt(ag)
        if not exp: continue
        bad = [kw for kw, mt in items if mt not in exp]
        if bad:
            pct = round(100 * len(bad) / len(items))
            sev = "high" if pct >= 30 else ("medium" if pct >= 10 else "low")
            add("match_type_in_name", sev, f"{camp} / {ag}",
                f"{len(bad)}/{len(items)} keywords ({pct}%) are not [{'/'.join(sorted(exp))}]",
                "split out the keywords of the correct match, or rename the ad group")

    # --- B: redundancy (concentrated; intentional vs accidental by CODE) ---
    within_camp = defaultdict(lambda: defaultdict(set))   # camp -> kw -> {ag}
    cross = defaultdict(set)                               # (kw,mt) -> {camp}
    for (kw, mt), locs in kw_locs.items():
        if len(locs) < 2: continue
        camps = {c for c, a in locs}
        for c, a in locs:
            within_camp[c][(kw, mt)].add(a)
        if len(camps) >= 2:
            cross[(kw, mt)] = camps
    # within-campaign hotspots (severity SCALED by magnitude)
    for camp, kws in within_camp.items():
        dup = {k: ags for k, ags in kws.items() if len(ags) >= 2}
        if len(dup) >= 5:
            n_ag = len(set(a for ags in dup.values() for a in ags))
            sev = "high" if (len(dup) > 50 or n_ag >= 8) else ("medium" if len(dup) > 15 else "low")
            add("redundancy_within_campaign", sev, camp,
                f"{len(dup)} keywords duplicated across {n_ag} ad groups of the same campaign",
                "consolidate ad groups; one owner per keyword")
    # cross-campaign: intentional if they share a product code, accidental if not
    acc = [(kw, mt, camps) for (kw, mt), camps in cross.items()
           if len({code_of(c) for c in camps}) > 1]
    if acc:
        add("redundancy_cross_product", "medium",
            f"{len(acc)} keywords",
            "same keyword across campaigns of DIFFERENT product code (cross-product)",
            "negative/consolidate to the correct product")

    # --- C: naming (schemes + generic ad groups) ---
    schemes = defaultdict(list)
    for c in campaigns: schemes[scheme_of(c)].append(c)
    if len(schemes) > 1:
        sev = "medium" if len(schemes) <= 2 else "high"
        add("naming_schemes", sev, "account",
            f"{len(schemes)} naming schemes coexist: {dict((k, len(v)) for k, v in schemes.items())}",
            "unify to one scheme or document why they differ")
    generic = sorted({ag for (c, ag) in adgroups if GENERIC_AG.match(ag.strip())})
    if generic:
        add("generic_ad_group_names", "medium", "several campaigns",
            f"{len(generic)} ad groups with generic/non-thematic names: {generic[:8]}",
            "rename by theme/intent")

    # --- D: name vs real config (bidding/channel) ---
    for c, (ch, bid) in camp_meta.items():
        n = c.lower()
        if "roas" in n and bid not in ("MAXIMIZE_CONVERSION_VALUE", "TARGET_ROAS"):
            add("name_vs_config", "medium", c, f"name says ROAS but bidding={bid}", "rename or adjust the strategy")
        if "demandgen" in n and ch != "DEMAND_GEN":
            add("name_vs_config", "medium", c, f"name says Demandgen but channel={ch}", "fix name/type")
        if re.search(r'\bsem\b', n) and ch != "SEARCH":
            add("name_vs_config", "medium", c, f"name says SEM but channel={ch}", "fix name/type")

    # --- theme_suspects: the ONLY thing for the LLM (check 1, semantic) ---
    # CROSS-PRODUCT: keyword whose product family differs from its campaign's family.
    # The advertiser's product vocabulary comes from the PROFILE (not hardcoded). Without a
    # profile, it is derived generically from campaign names (degraded — may be noisier).
    def product_word(camp):
        toks = [t for t in re.split(r'[_| ]', camp) if t]
        return toks[1].lower() if len(toks) > 1 else ""
    prod = profile.get("products", {})
    # word -> family code. Prefer the profile; else derive (2nd token -> parenthesis code).
    word_code = {k.lower(): v for k, v in prod.get("code_of_line", {}).items()}
    if not word_code:
        for c in campaigns:
            w, code = product_word(c), code_of(c)
            if w.isalpha() and len(w) > 2 and code: word_code[w] = code
    # keyword topic -> family code, via the profile's keyword lexicon when present.
    kw_lex = {k.lower(): word_code.get(v.lower(), v) for k, v in prod.get("keyword_lexicon", {}).items()}
    topic_code = kw_lex or word_code  # without a lexicon, match on the line words themselves
    seen = set(); ths = []
    for (camp, ag), items in ag_kws.items():
        own_code = code_of(camp)
        for kw, mt in items:
            kl = kw.lower()
            foreign = [(w, cd) for w, cd in topic_code.items()
                       if cd != own_code and re.search(r'\b' + re.escape(w) + r'\b', kl)]
            own_words = [w for w, cd in topic_code.items() if cd == own_code]
            if foreign and not any(re.search(r'\b' + re.escape(w) + r'\b', kl) for w in own_words):
                key = (kw, ag)
                if key in seen: continue
                seen.add(key)
                ths.append({"keyword": kw, "ad_group": ag, "campaign": camp,
                            "own_code": own_code, "foreign": f"{foreign[0][0]}({foreign[0][1]})"})

    sev_rank = {"high": 0, "medium": 1, "low": 2}
    findings.sort(key=lambda f: sev_rank.get(f["severity"], 9))
    out = {
        "convention": {
            "campaigns": len(campaigns), "ad_groups": len(adgroups),
            "naming_schemes": {k: len(v) for k, v in schemes.items()},
            "channels": sorted({ch for ch, _ in camp_meta.values()}),
            "biddings": sorted({b for _, b in camp_meta.values()}),
            "product_codes": sorted({code_of(c) for c in campaigns if code_of(c)}),
        },
        "findings": findings,
        "theme_suspects": ths,
        "theme_suspects_count": len(ths),
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
