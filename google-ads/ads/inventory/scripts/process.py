#!/usr/bin/env python3
"""Creative Inventory — deterministic core (PRODUCER of creative_graph).

Universal for any Google Ads account in any industry. Code knows Google's vocabulary
(RSA shape, field types, char limits, pin slots); the advertiser's vocabulary (brand /
competitor segments) comes from the optional account_profile — never hardcoded.

Usage:
  process.py creative.json [metrics.json] [extensions.json] [account_profile.json] > creative_graph.json
  (use '-' to skip a positional input)

Inputs are saved GAQL `report.query` result files ({status, body:[{results:[...]}]}):
  creative.json   -> Q_CREATIVE: ad_group_ad incl. responsive_search_ad.headlines/descriptions.
                     THE AUTHORITATIVE STRUCTURE (≤15 H / ≤4 D per ad, with pin + perf label).
  metrics.json    -> Q_METRICS:  ad_group_ad_asset_view (per-asset impr/clicks/conv/cost).
                     Used ONLY to attach metrics by (ad_id, field, text). [optional]
  extensions.json -> Q_EXT:      campaign_asset (sitelink/callout/snippet text). [optional]
  account_profile.json (from structure-map) -> segment labels. [optional]

WHY two sources: ad_group_ad_asset_view OVER-reports an ad's headlines (it returns churned /
auto-created assets — 40+ for a 15-headline ad). The ad's own responsive_search_ad arrays are the
true current creative. So structure = the ad arrays; asset_view = metrics only.
"""
import json, re, sys

LIMIT = {"headline": 30, "description": 90}
AD_TYPE = {"RESPONSIVE_SEARCH_AD": "RSA", "EXPANDED_TEXT_AD": "ETA", "TEXT_AD": "TEXT"}
DKI_RE = re.compile(r"\{key\s*word", re.I)

def rows(path):
    if not path or path == "-":
        return []
    doc = json.load(open(path))
    return [r for b in doc.get("body", []) for r in b.get("results", [])]

def num(x):
    try: return int(x)
    except (TypeError, ValueError):
        try: return float(x)
        except (TypeError, ValueError): return 0

def pin_of(pf):
    m = re.search(r"_(\d)$", pf or "")
    return m.group(1) if m else "none"

def segment_of(name, profile):
    if not profile:
        return "unknown", "none"
    n = name.lower()
    for t in profile.get("brand_terms", []):
        if t and t.lower() in n: return "brand", "profile"
    for t in profile.get("competitors", []):
        if t and t.lower() in n: return "competitor_conquest", "profile"
    return "generic", "profile"

def main(argv):
    creative_p = argv[0]
    metrics_p = argv[1] if len(argv) > 1 else None
    ext_p = prof_p = None
    for a in argv[2:]:
        if "profile" in a: prof_p = a
        elif a and a != "-": ext_p = a
    profile = json.load(open(prof_p)) if prof_p else None

    # ---- metrics map from asset_view: (ad_id, field, text) -> summed metrics ----
    metrics = {}
    for r in rows(metrics_p):
        av = r.get("adGroupAdAssetView", {})
        ft = av.get("fieldType")
        if ft not in ("HEADLINE", "DESCRIPTION"): continue
        aid = r.get("adGroupAd", {}).get("ad", {}).get("id")
        text = r.get("asset", {}).get("textAsset", {}).get("text", "")
        m = r.get("metrics", {})
        k = (aid, "headline" if ft == "HEADLINE" else "description", text)
        g = metrics.setdefault(k, {"impressions": 0, "clicks": 0, "conv": 0.0, "cost": 0.0})
        g["impressions"] += num(m.get("impressions", 0)); g["clicks"] += num(m.get("clicks", 0))
        g["conv"] += num(m.get("conversions", 0)); g["cost"] += num(m.get("costMicros", 0)) / 1e6

    def attach(aid, field, text):
        g = metrics.get((aid, field, text), {"impressions": 0, "clicks": 0, "conv": 0.0, "cost": 0.0})
        return {"impressions": g["impressions"], "clicks": g["clicks"],
                "conv": round(g["conv"], 1), "cost": round(g["cost"]), "served": g["impressions"] > 0}

    def mk_item(field, text, pin, label, approval, aid):
        it = {"text": text, "pin": pin, "char_len": len(text), "limit": LIMIT[field],
              "perf_label": label or "NOT_APPLICABLE", "approval": approval or "UNKNOWN",
              "dki": bool(DKI_RE.search(text))}
        it.update(attach(aid, field, text))
        return it

    # ---- tree from the AUTHORITATIVE ad arrays ----
    tree, ad_types_seen = [], {}
    for r in rows(creative_p):
        ad = r.get("adGroupAd", {}); a = ad.get("ad", {})
        t = a.get("type", ""); ad_types_seen[t] = ad_types_seen.get(t, 0) + 1
        aid = a.get("id")
        cmp_ = r.get("campaign", {}).get("name", ""); agn = r.get("adGroup", {}).get("name", "")
        seg, seg_src = segment_of(cmp_ + " " + agn, profile)
        urls = a.get("finalUrls") or []
        node = {"ad_id": aid, "ad_name": a.get("name", ""), "ad_type": AD_TYPE.get(t, "OTHER"),
                "campaign": cmp_, "ad_group": agn, "segment": seg, "segment_source": seg_src,
                "ad_strength": ad.get("adStrength", "UNKNOWN"),
                "final_url": urls[0] if urls else None, "final_url_suffix": a.get("finalUrlSuffix"),
                "headlines": [], "descriptions": []}
        rsa = a.get("responsiveSearchAd"); eta = a.get("expandedTextAd")
        if rsa:
            for h in rsa.get("headlines", []):
                node["headlines"].append(mk_item("headline", h.get("text", ""), pin_of(h.get("pinnedField")),
                    h.get("assetPerformanceLabel"), (h.get("policySummaryInfo") or {}).get("approvalStatus"), aid))
            for d in rsa.get("descriptions", []):
                node["descriptions"].append(mk_item("description", d.get("text", ""), pin_of(d.get("pinnedField")),
                    d.get("assetPerformanceLabel"), (d.get("policySummaryInfo") or {}).get("approvalStatus"), aid))
        elif eta:  # legacy flat fallback
            for key in ("headlinePart1", "headlinePart2", "headlinePart3"):
                if eta.get(key): node["headlines"].append(mk_item("headline", eta[key], "none", None, None, aid))
            for key in ("description", "description2"):
                if eta.get(key): node["descriptions"].append(mk_item("description", eta[key], "none", None, None, aid))
        # else OTHER: no text assets here -> recorded in coverage
        if node["headlines"] or node["descriptions"]:
            tree.append(node)

    # ---- rollup: unique (field, text) across ads ----
    roll = {}
    for node in tree:
        for field, items in (("headline", node["headlines"]), ("description", node["descriptions"])):
            for it in items:
                g = roll.setdefault((field, it["text"]), {"field": field, "text": it["text"],
                    "char_len": it["char_len"], "limit": it["limit"], "dki": it["dki"], "n_ads": 0,
                    "ad_groups": set(), "segments": set(), "pinned_somewhere": False,
                    "perf_labels": set(), "approvals": set(), "served_any": False,
                    "impressions": 0, "clicks": 0, "conv": 0.0, "cost": 0})
                g["n_ads"] += 1; g["ad_groups"].add(node["ad_group"]); g["segments"].add(node["segment"])
                g["perf_labels"].add(it["perf_label"]); g["approvals"].add(it["approval"])
                if it["pin"] != "none": g["pinned_somewhere"] = True
                if it["served"]: g["served_any"] = True
                g["impressions"] += it["impressions"]; g["clicks"] += it["clicks"]
                g["conv"] += it["conv"]; g["cost"] += it["cost"]
    rollup = [{"field": g["field"], "text": g["text"], "char_len": g["char_len"], "limit": g["limit"],
               "dki": g["dki"], "n_ads": g["n_ads"], "n_ad_groups": len(g["ad_groups"]),
               "segments": sorted(g["segments"]), "pinned_somewhere": g["pinned_somewhere"],
               "perf_labels": sorted(g["perf_labels"]), "approvals": sorted(g["approvals"]),
               "served_any": g["served_any"], "impressions": g["impressions"], "clicks": g["clicks"],
               "conv": round(g["conv"], 1), "cost": g["cost"]} for g in roll.values()]
    rollup.sort(key=lambda x: -x["impressions"])

    # ---- extensions ----
    ext = {"sitelinks": [], "callouts": [], "snippets": []}; seen = set()
    for r in rows(ext_p):
        a = r.get("asset", {})
        if a.get("sitelinkAsset"):
            v = a["sitelinkAsset"].get("linkText")
            if v and ("s", v) not in seen: seen.add(("s", v)); ext["sitelinks"].append(v)
        elif a.get("calloutAsset"):
            v = a["calloutAsset"].get("calloutText")
            if v and ("c", v) not in seen: seen.add(("c", v)); ext["callouts"].append(v)
        elif a.get("structuredSnippetAsset"):
            s = a["structuredSnippetAsset"]; key = ("ss", s.get("header"), tuple(s.get("values", [])))
            if key not in seen: seen.add(key); ext["snippets"].append({"header": s.get("header"), "values": s.get("values", [])})

    # ---- coverage ----
    not_mapped, nonrsa = [], {}
    REASONS = {"ETA": "legacy Expanded Text Ad (flat fields, mapped)",
               "TEXT": "legacy Text Ad (flat fields, mapped)",
               "OTHER": "non-RSA ad type (Display/Video/Demand Gen) — different asset model, see campaign-types.md"}
    for t, n in ad_types_seen.items():
        mapped = AD_TYPE.get(t, "OTHER")
        if mapped == "OTHER":
            not_mapped.append({"ad_type_raw": t, "ads": n, "reason": REASONS["OTHER"]})
    out = {
        "meta": {"connector": "google-ads", "skill": "google-ads-creative-inventory",
                 "period": {"preset": "last_30_days"}, "structure_source": "ad.responsive_search_ad arrays",
                 "metrics_source": "ad_group_ad_asset_view (joined by text)", "profile_used": bool(profile)},
        "synthesis": {"headline": "", "diagnosis": "", "action": ""},  # LLM fills
        "creative_graph": {
            "tree": tree, "rollup": rollup, "extensions": ext,
            "coverage": {"ads_mapped": len(tree),
                         "unique_headlines": sum(1 for g in rollup if g["field"] == "headline"),
                         "unique_descriptions": sum(1 for g in rollup if g["field"] == "description"),
                         "ad_types_seen": ad_types_seen, "not_mapped": not_mapped,
                         "note": "PMax / Shopping do not appear in ad_group_ad; map asset groups / feed separately (see campaign-types.md)."},
        },
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: process.py creative.json [metrics.json] [extensions.json] [account_profile.json]", file=sys.stderr); sys.exit(1)
    main(sys.argv[1:])
