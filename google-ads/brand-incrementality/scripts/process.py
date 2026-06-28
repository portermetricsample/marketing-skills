#!/usr/bin/env python3
"""
brand-incrementality — DETERMINISTIC core.

Splits a Google Ads account's performance into BRANDED vs NON-BRANDED to reveal the incremental
value of the demand-gen (non-brand) effort — the "All searches" vs "Excluding branded" view. Branded
searches convert cheaply and would mostly arrive anyway; non-brand is the net-new engine you judge
budget and scaling on.

TWO MODES (auto-detected):
  A — NO brand campaign exists, but people search the brand (caught in non-brand campaigns, typos
      included) → quantify the brand demand mixed into non-brand + recommend creating a brand campaign.
  B — brand campaign(s) exist → the branded/non-branded split (All / Branded / Non-branded KPIs vs
      previous period) + flag brand LEAKAGE (brand terms served by non-brand campaigns, which secretly
      flatters the non-brand CPA).

GRAIN (both, per the design):
  - Campaign-level naming → the clean headline split (matches the report slide).
  - Search-term-level typo-aware brand detection → reconcile leakage + size uncaptured brand demand.

Usage:
  process.py <campaigns.json> <context.json> [search_terms.json] [campaigns_prev.json]
    campaigns.json      raw query_data {columns, rows}: campaign_name + cost/conv/value/clicks/impr (current)
    context.json        { brand_terms:[...], competitor_terms:[...], brand_campaign_markers?:[...] }
    search_terms.json   (optional) raw query_data: search_term + keyword + campaign + cost/conv(/value)
    campaigns_prev.json (optional) campaign KPIs for the previous period → deltas

Emits JSON: { meta, split, brand_campaigns, leakage?, mode_a?, recommendations }. The LLM adds the
3-string synthesis (strong incremental framing) and adjudicates any misspelling/competitor edge case.
Brand matching MIRRORS google-ads/search-terms/labeling — keep the rubric in sync.
"""
import sys, os, re, json
from collections import defaultdict

MISSPELL_SIM = 0.80
MIN_BRAND_TOKEN = 5
DEFAULT_MARKERS = ["brand", "(br)", "_br_", "_br ", " br ", "-br-", "_brand", "brand_"]
# A campaign the advertiser EXPLICITLY labels non-brand is the opposite of a brand campaign — even
# though "nonbranded" literally contains the substring "brand". These win over any marker match.
NONBRAND_SIGNALS = ["nonbrand", "non-brand", "non brand", "non_brand"]


def _norm(s):
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


def _lev(a, b):
    if a == b:
        return 0
    if not a or not b:
        return len(a) + len(b)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def brand_match(text, brand_terms):
    """exact word-boundary, else a misspelling of a distinctive brand token. Returns 'exact' |
    'misspelling' | None. Mirrors labeling's matcher."""
    t = (text or "").lower()
    for b in brand_terms:
        if b and re.search(r"\b" + re.escape(b) + r"\b", t):
            return "exact"
    words = t.split()
    cands = {_norm(w) for w in words}
    for i in range(len(words) - 1):
        cands.add(_norm(words[i] + words[i + 1]))
    cands.add(_norm(t)); cands.discard("")
    for b in brand_terms:
        bn = _norm(b)
        if len(bn) < MIN_BRAND_TOKEN:
            continue
        for c in cands:
            if c and c != bn:
                d = _lev(c, bn)
                if d and (1 - d / max(len(c), len(bn))) >= MISSPELL_SIM:
                    return "misspelling"
    return None


def load(path):
    d = json.load(open(path))
    idx = {c: i for i, c in enumerate(d["columns"])}
    g = lambda r, n: (r[idx[n]] if n in idx else "")
    def num(r, n):
        try:
            return float(g(r, n) or 0)
        except (TypeError, ValueError):
            return 0.0
    return d, idx, g, num


def is_brand_campaign(name, markers, explicit_names):
    """Identify the brand campaign by a NAMING MARKER ('Brand'/'(BR)'/...) or an explicit name the
    account gave. We deliberately do NOT classify by 'name contains the brand word' — many accounts
    prefix EVERY campaign with the company name, which would mis-flag the whole account as brand.
    The search-term layer catches brand demand the campaign naming misses."""
    n = (name or "").lower()
    if name in explicit_names:
        return True
    # Explicit non-brand label wins (catches "Pmax nonbranded", which contains the substring "brand").
    if any(sig in n for sig in NONBRAND_SIGNALS):
        return False
    return any(m in n for m in markers)


def agg_campaigns(path, markers, explicit_names):
    """Aggregate campaign KPIs into all / branded / nonbranded buckets."""
    d, idx, g, num = load(path)
    buckets = {k: {"spend": 0.0, "conv": 0.0, "value": 0.0, "clicks": 0.0, "impr": 0.0}
               for k in ("all", "branded", "nonbranded")}
    brand_camps = set()
    for r in d["rows"]:
        name = g(r, "google_ads_campaign_name")
        b = is_brand_campaign(name, markers, explicit_names)
        if b:
            brand_camps.add(name)
        cost, conv, val = num(r, "google_ads_cost_micros"), num(r, "google_ads_conversions"), num(r, "google_ads_conversions_value")
        clk, impr = num(r, "google_ads_clicks"), num(r, "google_ads_impressions")
        for k in ("all", "branded" if b else "nonbranded"):
            buckets[k]["spend"] += cost; buckets[k]["conv"] += conv; buckets[k]["value"] += val
            buckets[k]["clicks"] += clk; buckets[k]["impr"] += impr
    return buckets, sorted(brand_camps)


def rates(b):
    spend, conv, val, clk = b["spend"], b["conv"], b["value"], b["clicks"]
    return {
        "spend": round(spend, 2), "conversions": round(conv, 2), "value": round(val, 2),
        "cpa": round(spend / conv, 2) if conv else None,
        "roas": round(val / spend, 2) if spend else 0.0,
        "conv_rate": round(conv / clk, 4) if clk else 0.0,
    }


def deltas(cur, prev):
    """% change cur vs prev for the headline metrics."""
    out = {}
    for k in ("spend", "conversions", "cpa", "roas"):
        c, p = cur.get(k), prev.get(k)
        out[k] = round((c - p) / p, 4) if (p not in (None, 0) and c is not None) else None
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: process.py <campaigns.json> <context.json> [search_terms.json] [campaigns_prev.json]")
    camp_path, ctx_path = sys.argv[1], sys.argv[2]
    st_path = sys.argv[3] if len(sys.argv) > 3 else None
    prev_path = sys.argv[4] if len(sys.argv) > 4 else None

    ctx = json.load(open(ctx_path)) if os.path.exists(ctx_path) else {}
    brand_terms = [b.lower() for b in ctx.get("brand_terms", [])]
    competitor_terms = [c.lower() for c in ctx.get("competitor_terms", [])]
    markers = [m.lower() for m in ctx.get("brand_campaign_markers", DEFAULT_MARKERS)]
    explicit_names = set(ctx.get("brand_campaign_names", []))   # optional override for unmarked brand campaigns

    buckets, brand_camps = agg_campaigns(camp_path, markers, explicit_names)
    has_brand_campaign = len(brand_camps) > 0
    ecommerce = buckets["all"]["value"] > 0

    split = {k: rates(buckets[k]) for k in ("all", "branded", "nonbranded")}
    tot_conv = buckets["all"]["conv"] or 1
    for k in ("all", "branded", "nonbranded"):
        split[k]["share_of_conv"] = round(buckets[k]["conv"] / tot_conv, 4)

    # previous period -> deltas per bucket
    if prev_path and os.path.exists(prev_path):
        pbuckets, _ = agg_campaigns(prev_path, markers, explicit_names)
        for k in ("all", "branded", "nonbranded"):
            split[k]["deltas"] = deltas(split[k], rates(pbuckets[k]))

    # --- search-term reconciliation: typo-aware brand detection ---
    leakage, mode_a = None, None
    if st_path and os.path.exists(st_path):
        d, idx, g, num = load(st_path)
        brand_conv_in_nonbrand = brand_spend_in_nonbrand = 0.0
        brand_conv_total = brand_spend_total = 0.0
        leak_terms, demand_terms = {}, {}
        for r in d["rows"]:
            term = g(r, "google_ads_search_term")
            kind = brand_match(term, brand_terms)
            if not kind:
                continue
            cost, conv = num(r, "google_ads_cost_micros"), num(r, "google_ads_conversions")
            camp = g(r, "google_ads_campaign_name")
            brand_conv_total += conv; brand_spend_total += cost
            in_brand_camp = is_brand_campaign(camp, markers, explicit_names)
            if not in_brand_camp:
                brand_conv_in_nonbrand += conv; brand_spend_in_nonbrand += cost
                leak_terms[term] = leak_terms.get(term, 0) + cost
                demand_terms[term] = demand_terms.get(term, 0) + cost

        top_leak = [t for t, _ in sorted(leak_terms.items(), key=lambda x: -x[1])[:6]]
        if has_brand_campaign and brand_spend_in_nonbrand > 0:
            # adjusted non-brand CPA if the leaked brand conv/spend were removed from non-brand
            nb = buckets["nonbranded"]
            adj_conv = max(nb["conv"] - brand_conv_in_nonbrand, 0)
            adj_spend = max(nb["spend"] - brand_spend_in_nonbrand, 0)
            leakage = {
                "brand_conversions_in_nonbrand": round(brand_conv_in_nonbrand, 2),
                "brand_spend_in_nonbrand": round(brand_spend_in_nonbrand, 2),
                "share_of_nonbrand_conv": round(brand_conv_in_nonbrand / (nb["conv"] or 1), 4),
                "adjusted_nonbrand_cpa": round(adj_spend / adj_conv, 2) if adj_conv else None,
                "sample_terms": top_leak,
            }
        if not has_brand_campaign:
            mode_a = {
                "uncaptured_brand_conversions": round(brand_conv_total, 2),
                "uncaptured_brand_spend": round(brand_spend_total, 2),
                "sample_terms": [t for t, _ in sorted(demand_terms.items(), key=lambda x: -x[1])[:6]],
                "recommend_create_brand_campaign": brand_conv_total > 0 or brand_spend_total > 0,
            }

    # --- recommendations (deterministic; LLM frames the synthesis) ---
    recs = []
    nb_cpa = split["nonbranded"]["cpa"]
    all_cpa = split["all"]["cpa"]
    if not has_brand_campaign and mode_a and mode_a["recommend_create_brand_campaign"]:
        recs.append({
            "where": "Account structure",
            "what": "Create a dedicated brand campaign (exact + phrase on your brand, incl. common misspellings) and add the brand terms as negatives in the non-brand campaigns.",
            "why": f"~{mode_a['uncaptured_brand_conversions']} brand conversions (${mode_a['uncaptured_brand_spend']}) are running through non-brand campaigns today — capturing them cheaply AND removing them from the non-brand baseline shows the real demand-gen CPA.",
        })
    if has_brand_campaign:
        recs.append({
            "where": "Budget / scaling decision",
            "what": "Judge budget and scaling on the EXCLUDING-BRANDED (non-brand) numbers, not the blended account total.",
            "why": f"Blended CPA ${all_cpa} is flattered by cheap brand conversions; the incremental demand-gen CPA is ${nb_cpa}.",
        })
        if leakage:
            recs.append({
                "where": "Non-brand campaigns",
                "what": "Add brand terms (incl. misspellings) as negatives in the non-brand campaigns to stop brand searches leaking in.",
                "why": f"{leakage['brand_conversions_in_nonbrand']} brand conversions (${leakage['brand_spend_in_nonbrand']}) are leaking into non-brand campaigns — flattering the non-brand CPA from ${leakage['adjusted_nonbrand_cpa']} to ${nb_cpa}.",
            })

    print(json.dumps({
        "meta": {
            "connector": "google-ads", "skill": "brand-incrementality",
            "account_type": "ecommerce" if ecommerce else "lead_gen",
            "mode": "A_no_brand_campaign" if not has_brand_campaign else "B_split",
            "has_brand_campaign": has_brand_campaign,
            "brand_terms_used": brand_terms,
        },
        "split": split,
        "brand_campaigns": brand_camps,
        "leakage": leakage,
        "mode_a": mode_a,
        "recommendations": recs,
        "incrementality_note": "Excluding-branded is the demand-gen baseline to scale on; the TRUE incremental number needs a brand-holdout / geo experiment (pause brand in some regions, measure organic pickup).",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
