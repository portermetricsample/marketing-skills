#!/usr/bin/env python3
"""
assemble.py — build per-ad-group "journey packets" for the alignment judgment.

It is the DATA layer of the skill (deterministic). It does NOT judge anything.
It joins the four Porter `query_data` pulls + the scraped landing pages into one
compact JSON that the AI then reads and scores against references/framework.md.

Why a script: the search-term pull is huge (thousands of rows) and blows the
context window. This collapses it to one packet per ad group (intent rolled up
to its top keywords + top search terms), so the judgment stays focused and cheap.

Inputs (all the {columns, rows} shape Porter returns; pass file paths):
  --intent   search term x keyword pull   (campaign, ad_group, keyword, match_type,
             search_term, cost, clicks)
  --ads      RSA pull                      (campaign, ad_group, headlines, descriptions,
             final_urls, cost)
  --landings dir of <slug>.json landing-page scrapes (Porter scrape tool) [optional]
  --top-keywords / --top-terms / --top-headlines  how many to keep per packet
  --out      where to write packets.json

Output: { meta, account, journeys:[ {campaign, ad_group, totals, intent, ads,
          destinations:[{url, content}] } ] }
"""
import argparse, json, os, sys
from collections import defaultdict

# ---- Porter field names (Google Ads). Change here if the connector renames them.
CAMP = "google_ads_campaign_name"
AG   = "google_ads_ad_group_name"
KWT  = "google_ads_keyword_info_text"
MTY  = "google_ads_keyword_info_match_type"
STERM= "google_ads_search_term"
COST = "google_ads_cost_micros"          # Porter returns this already in currency units
CLK  = "google_ads_clicks"
CONV = "google_ads_conversions"
CVAL = "google_ads_conversions_value"
ADID = "google_ads_ad_group_ad_ad_id"
HEAD = "google_ads_ad_group_ad_ad_responsive_search_ad_headlines"
DESC = "google_ads_ad_group_ad_ad_responsive_search_ad_descriptions"
FURL = "google_ads_ad_group_ad_ad_final_urls"


def load(path):
    """Read a Porter {columns, rows} dump → list of dicts keyed by column name."""
    with open(path) as f:
        d = json.load(f)
    cols = d["columns"]
    return [dict(zip(cols, r)) for r in d["rows"]], d


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def parse_assets(s):
    """RSA headlines/descriptions arrive as a stringified list of dicts:
       "[{'text': 'X', 'assetPerformanceLabel': 'GOOD'}, ...]".
       Pull the texts out without eval (and without regex)."""
    out, s = [], str(s or "")
    mk, en = "'text': '", "', 'assetPerformanceLabel'"
    i = 0
    while True:
        a = s.find(mk, i)
        if a < 0:
            break
        a += len(mk)
        b = s.find(en, a)
        if b < 0:
            b = s.find("'", a)
        if b < 0:
            b = len(s)
        out.append(s[a:b])
        i = b + 1
    if not out and s.strip() and s.strip() not in ("[]", "None"):
        out = [s.strip()]
    return out


def url_slug(u):
    u = str(u or "").split("?")[0].rstrip("/")
    tail = u.split("/")[-1] if "/" in u else u
    return tail or "homepage"


def norm_url(u):
    u = str(u or "").strip()
    if u.startswith("http://"):
        u = "https://" + u[len("http://"):]
    return u


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intent", required=True)
    ap.add_argument("--ads", required=True)
    ap.add_argument("--landings", default=None)
    ap.add_argument("--account", default="")
    ap.add_argument("--top-keywords", type=int, default=6)
    ap.add_argument("--top-terms", type=int, default=5)
    ap.add_argument("--top-headlines", type=int, default=8)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    intent_rows, intent_meta = load(a.intent)
    ads_rows, _ = load(a.ads)

    # landing content map: by normalized url AND by slug (so either matches)
    landings = {}
    if a.landings and os.path.isdir(a.landings):
        for fn in os.listdir(a.landings):
            if not fn.endswith(".json"):
                continue
            try:
                doc = json.load(open(os.path.join(a.landings, fn)))
            except Exception:
                continue
            content = (doc.get("data", {}) or {}).get("json") or doc.get("json") or doc
            src = ((doc.get("data", {}) or {}).get("metadata", {}) or {}).get("sourceURL")
            landings[fn[:-5]] = content
            if src:
                landings[url_slug(src)] = content

    # ---- aggregate intent per ad group
    J = {}
    for r in intent_rows:
        key = (r.get(CAMP, ""), r.get(AG, ""))
        j = J.setdefault(key, {"cost": 0.0, "clk": 0.0, "conv": 0.0, "cval": 0.0, "kw": {}})
        c = num(r.get(COST))
        j["cost"] += c; j["clk"] += num(r.get(CLK))
        j["conv"] += num(r.get(CONV)); j["cval"] += num(r.get(CVAL))
        kt = r.get(KWT)
        if kt:
            kw = j["kw"].setdefault(kt, {"mt": (r.get(MTY) or "").upper(), "cost": 0.0,
                                         "conv": 0.0, "terms": defaultdict(float)})
            kw["cost"] += c; kw["conv"] += num(r.get(CONV))
            st = r.get(STERM)
            if st:
                kw["terms"][st] += c

    # ---- ads at AD level (one entry per ad_id): each ad's own copy + its own final URL.
    # Granularity matters: two ads in the same group can carry different messages or point
    # to different pages, so the ad↔landing scent must be judged per ad, not group-averaged.
    admap = defaultdict(list)
    for r in ads_rows:
        key = (r.get(CAMP, ""), r.get(AG, ""))
        urls = [norm_url(u) for u in (parse_assets(r.get(FURL)) or ([r.get(FURL)] if r.get(FURL) else []))]
        admap[key].append({
            "ad_id": r.get(ADID),
            "cost": round(num(r.get(COST)), 2),
            "conversions": round(num(r.get(CONV)), 2),
            "headlines": parse_assets(r.get(HEAD))[:a.top_headlines],
            "descriptions": parse_assets(r.get(DESC))[:4],
            "final_url": urls[0] if urls else None,
            "all_final_urls": urls,
        })

    # ---- build packets
    journeys = []
    for (camp, ag), j in J.items():
        kws = sorted(j["kw"].items(), key=lambda kv: -kv[1]["cost"])[:a.top_keywords]
        intent = []
        for kw, o in kws:
            terms = sorted(o["terms"].items(), key=lambda kv: -kv[1])[:a.top_terms]
            intent.append({
                "keyword": kw, "match_type": o["mt"].title(),
                "cost": round(o["cost"], 2), "conversions": round(o["conv"], 2),
                "top_search_terms": [{"term": t, "cost": round(c, 2)} for t, c in terms],
            })
        ads = sorted(admap.get((camp, ag), []), key=lambda x: -(x["cost"] or 0))
        for ad in ads:
            ad["landing_content"] = landings.get(url_slug(ad["final_url"])) if ad["final_url"] else None
        # destinations = unique landing URLs across this group's ads (for the landing check)
        seen = {}
        for ad in ads:
            u = ad["final_url"]
            if u and u not in seen:
                seen[u] = {"url": u, "content": ad["landing_content"]}
        dests = list(seen.values())
        cost = j["cost"]; conv = j["conv"]; clk = j["clk"]
        journeys.append({
            "campaign": camp, "ad_group": ag,
            "totals": {
                "cost": round(cost, 2), "clicks": round(clk, 2),
                "conversions": round(conv, 2), "conversions_value": round(j["cval"], 2),
            },
            "intent": intent,
            "ads": ads,            # AD-LEVEL: each ad's copy + its own final URL + scraped page
            "destinations": dests,  # unique pages this group sends to (for the landing check)
        })
    journeys.sort(key=lambda x: -(x["totals"]["cost"] or 0))

    out = {
        "meta": {
            "account": a.account,
            "date_range": intent_meta.get("date_range_resolved"),
            "journeys_analyzed": len(journeys),
            "note": "Costs are in currency units. Judge against references/framework.md.",
        },
        "journeys": journeys,
    }
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    tc = sum(j["totals"]["cost"] or 0 for j in journeys)
    print(f"Wrote {len(journeys)} journeys to {a.out}  (total ${tc:,.0f})")


if __name__ == "__main__":
    main()
