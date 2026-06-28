#!/usr/bin/env python3
"""
assemble.py — build per-ad-group "journey packets" for the alignment judgment.

THIN PLUMBING ONLY (deterministic). It does NOT judge anything. It joins the two
Porter `query_data` pulls (intent + ads) with the scraped landing pages into one
compact JSON ("packets.json") that the AI then reads and scores against
references/framework.md.

Why a script at all: the search-term pull is huge (thousands of rows) and blows the
context window. This collapses it to one packet per ad group (intent rolled up to its
top keywords + top search terms), so the AI judgment stays focused and cheap.

What IS deterministic here (and only this — the "universal, computable" half):
  - roll the huge search-term dump up to one packet per (campaign, ad_group)
  - parse the RSA headline/description blobs into clean text lists (serialization-agnostic)
  - join each landing page to its ad on the CANONICAL FULL URL (host + path) — never the
    last path segment, which collided (/en/pricing vs /fr/pricing both -> "pricing")
  - carry each landing page as its <title> (metadata) + raw markdown (capped), for the AI to read

What is NOT here (the AI does it, reading packets.json — the "judgment" half):
  - identify the H1 / hero, write destination.page_summary, find the mismatch word
  - grade L1-L4, the verdict, the break type, the on_intent flag, the roll-up

NB: no conversions / clicks / Quality Score here — alignment judges WORDS only. Those are
performance / Google's grade and live in the sibling keyword-ad-landing-metrics skill.

Inputs (all the {columns, rows} shape Porter returns; pass file paths):
  --intent   search term x keyword pull   (campaign, ad_group, keyword, match_type,
             search_term, cost)
  --ads      RSA pull                      (campaign, ad_group, ad_id, headlines,
             descriptions, final_urls, cost)
  --landings dir of landing-page scrape .json files (Porter scrape tool, markdown format).
             Joined by the metadata.sourceURL INSIDE each file, NOT the filename. [optional]
  --out      where to write packets.json

Output: { meta, journeys:[ {campaign, ad_group, spend, ad_count, landing_count, intent[],
  pairings[], destinations[]} ] } where each pairing is one ad joined to its OWN landing
  page (the judgment unit) carrying light dest fields, and destinations[] holds the markdown
  ONCE per unique page so a 3-ad/1-page group never duplicates a 12k-char page.
"""
import argparse, ast, json, os
from collections import defaultdict
from urllib.parse import urlsplit, urlunsplit

# ---- Porter field names (Google Ads). Change here if the connector renames them.
CAMP = "google_ads_campaign_name"
AG   = "google_ads_ad_group_name"
KWT  = "google_ads_keyword_info_text"
MTY  = "google_ads_keyword_info_match_type"
STERM= "google_ads_search_term"
COST = "google_ads_cost_micros"          # Porter returns this already in currency units
ADID = "google_ads_ad_group_ad_ad_id"
HEAD = "google_ads_ad_group_ad_ad_responsive_search_ad_headlines"
DESC = "google_ads_ad_group_ad_ad_responsive_search_ad_descriptions"
FURL = "google_ads_ad_group_ad_ad_final_urls"

MARKDOWN_CAP = 12000   # keep big pages from blowing context; head of page = highest weight


def load(path):
    """Read a Porter {columns, rows} dump -> list of dicts keyed by column name."""
    with open(path) as f:
        d = json.load(f)
    cols = d["columns"]
    return [dict(zip(cols, r)) for r in d["rows"]], d


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def parse_assets(v):
    """RSA headlines/descriptions/final_urls arrive as a list — but the serialization
    varies: an actual list, a JSON string, or a python-repr string like
    "[{'text': 'X', 'assetPerformanceLabel': 'GOOD'}]". Deserialize robustly (json ->
    ast.literal_eval), then pull the texts. NEVER silently dump the whole blob as a
    single 'headline' (the old marker-scan failure mode)."""
    if v is None:
        return []
    parsed = v
    if isinstance(v, str):
        s = v.strip()
        if not s or s in ("[]", "None", "null"):
            return []
        parsed = None
        for loader in (json.loads, ast.literal_eval):
            try:
                parsed = loader(s)
                break
            except (ValueError, SyntaxError):
                parsed = None
        if parsed is None:
            return [s]                       # last-ditch: opaque string, keep it whole
    if isinstance(parsed, dict):
        parsed = [parsed]
    if not isinstance(parsed, (list, tuple)):
        return [str(parsed).strip()]
    out = []
    for item in parsed:
        if isinstance(item, dict):
            t = item.get("text")
            if t:
                out.append(str(t))
        elif item not in (None, ""):
            out.append(str(item))
    return out


def canon_url(u):
    """Canonical key for joining an ad's final_url to a scraped page's sourceURL.
    Force https, lowercase host, strip trailing slash, drop query + fragment.
    REPLACES the old last-path-segment slug, which collided: /en/pricing and /fr/pricing
    both became 'pricing' -> the wrong scraped page got attached. Query is dropped on
    purpose (Google final_urls usually carry tracking params the scrape's sourceURL won't
    echo); an account that genuinely routes by query-param is an AI-side edge to flag."""
    u = str(u or "").strip()
    if not u:
        return ""
    if u.startswith("http://"):
        u = "https://" + u[len("http://"):]
    elif not u.startswith("https://"):
        u = "https://" + u
    s = urlsplit(u)
    return urlunsplit(("https", s.netloc.lower(), s.path.rstrip("/"), "", ""))


def load_landings(dir_path):
    """canonical URL -> {markdown, truncated, source_url} from the scrape .json files.
    Keyed by the metadata.sourceURL inside each file, NOT the filename, so the join never
    depends on how the file was named."""
    landings = {}
    if not (dir_path and os.path.isdir(dir_path)):
        return landings
    for fn in os.listdir(dir_path):
        if not fn.endswith(".json"):
            continue
        try:
            doc = json.load(open(os.path.join(dir_path, fn)))
        except Exception:
            continue
        data = doc.get("data", doc) or {}
        md = data.get("markdown") or doc.get("markdown") or ""
        meta = (data.get("metadata") or doc.get("metadata") or {}) or {}
        src = meta.get("sourceURL") or meta.get("url") or doc.get("url")
        # The page's own <title> / og:title is the MOST RELIABLE hero/identity signal:
        # onlyMainContent can push the visible hero below a form, so the first markdown
        # heading is often NOT the hero. Carry the title (free in the scrape metadata).
        title = meta.get("title") or meta.get("ogTitle") or meta.get("og:title")
        og_desc = meta.get("ogDescription") or meta.get("description") or meta.get("og:description")
        truncated = False
        if md and len(md) > MARKDOWN_CAP:
            md, truncated = md[:MARKDOWN_CAP], True
        content = {"markdown": md, "truncated": truncated, "source_url": src,
                   "title": title, "meta_description": og_desc}
        if src:
            landings[canon_url(src)] = content
    return landings


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
    landings = load_landings(a.landings)

    # ---- aggregate intent per ad group (SPEND only — words skill, no conversions/clicks)
    J = {}
    for r in intent_rows:
        key = (r.get(CAMP, ""), r.get(AG, ""))
        j = J.setdefault(key, {"spend": 0.0, "kw": {}})
        c = num(r.get(COST))
        j["spend"] += c
        kt = r.get(KWT)
        if kt:
            kw = j["kw"].setdefault(kt, {"mt": (r.get(MTY) or "").upper(),
                                         "spend": 0.0, "terms": defaultdict(float)})
            kw["spend"] += c
            st = r.get(STERM)
            if st:
                kw["terms"][st] += c

    # ---- ads at AD level (one entry per ad_id): each ad's own copy + its own final URL.
    # Two ads in one group can carry different copy or point to different pages, so the
    # ad<->landing scent must be judged per ad, not group-averaged.
    admap = defaultdict(list)
    for r in ads_rows:
        key = (r.get(CAMP, ""), r.get(AG, ""))
        raw_urls = parse_assets(r.get(FURL)) or ([r.get(FURL)] if r.get(FURL) else [])
        urls = [canon_url(u) for u in raw_urls if u]
        admap[key].append({
            "ad_id": r.get(ADID),
            "spend": round(num(r.get(COST)), 2),
            "headlines": parse_assets(r.get(HEAD))[:a.top_headlines],
            "descriptions": parse_assets(r.get(DESC))[:4],
            "final_url": urls[0] if urls else None,
            "all_final_urls": urls,
        })

    # ---- build packets
    journeys = []
    for (camp, ag), j in J.items():
        kws = sorted(j["kw"].items(), key=lambda kv: -kv[1]["spend"])[:a.top_keywords]
        intent = []
        for kw, o in kws:
            terms = sorted(o["terms"].items(), key=lambda kv: -kv[1])[:a.top_terms]
            intent.append({
                "keyword": kw, "match_type": o["mt"].title(),
                "spend": round(o["spend"], 2),
                # on_intent is the AI's call (judgment) — not set here.
                "top_search_terms": [{"term": t, "spend": round(c, 2)} for t, c in terms],
            })
        ads = sorted(admap.get((camp, ag), []), key=lambda x: -(x["spend"] or 0))
        # destinations = unique landing pages this group's ads point to; markdown attached
        # ONCE per page (don't duplicate a 12k-char page across every ad in the group).
        seen = {}
        for ad in ads:
            u = ad["final_url"]
            if u and u not in seen:
                content = landings.get(u)
                seen[u] = {
                    "url": u,
                    "scraped": bool(content and content.get("markdown")),
                    "page_title": content.get("title") if content else None,          # most reliable hero signal
                    "meta_description": content.get("meta_description") if content else None,
                    "markdown": content.get("markdown") if content else None,
                    "truncated": bool(content and content.get("truncated")),
                }
        dests = list(seen.values())
        # pairings = the JUDGMENT UNIT: one per ad, each joined to ITS OWN landing page.
        # Carries only the LIGHT destination fields (url/title/meta) — the heavy markdown
        # stays once in destinations[] so a 3-ad/1-page group never duplicates the page text.
        # The AI grades L2/L3/L4 + a verdict PER pairing against the shared intent[]; it must
        # NOT claim a keyword->ad link (Google rotates ads within a group — not in the data).
        pairings = []
        for ad in ads:
            d = seen.get(ad["final_url"])
            pairings.append({
                "ad_id": ad["ad_id"],
                "spend": ad["spend"],
                "headlines": ad["headlines"],
                "descriptions": ad["descriptions"],
                "final_url": ad["final_url"],
                "destination": {
                    "url": d["url"] if d else ad["final_url"],
                    "scraped": d["scraped"] if d else False,
                    "page_title": d["page_title"] if d else None,
                    "meta_description": d["meta_description"] if d else None,
                },
            })
        journeys.append({
            "campaign": camp, "ad_group": ag,
            "spend": round(j["spend"], 2),   # the headline ranking number (-> finding.spend)
            "ad_count": len(ads),            # badge: distinct ads in this group
            "landing_count": len(dests),     # badge: distinct landing pages
            "intent": intent,                # shared across the group (NOT per-pairing)
            "pairings": pairings,            # ad -> its own landing (judge each one)
            "destinations": dests,           # unique pages w/ markdown (read these; one per page)
        })
    journeys.sort(key=lambda x: -(x["spend"] or 0))

    out = {
        "meta": {
            "account": a.account,
            "date_range": intent_meta.get("date_range_resolved"),
            "journeys_analyzed": len(journeys),
            "note": "Spend is in account currency. Judge WORDS only against references/framework.md. "
                    "Fill destination.h1 / page_summary / mismatch_word by READING each destination: "
                    "lead with `page_title` (the page's own <title> — the most reliable hero signal), "
                    "then the `markdown` body (weight the top most). Empty markdown -> scraped:false -> "
                    "L3/L4 unknown -> verdict cannot be 'aligned'.",
        },
        "journeys": journeys,
    }
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    tc = sum(j["spend"] or 0 for j in journeys)
    print(f"Wrote {len(journeys)} journeys to {a.out}  (total ${tc:,.0f})")


if __name__ == "__main__":
    main()
