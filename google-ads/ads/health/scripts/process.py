#!/usr/bin/env python3
"""Creative Health — deterministic core. Flags ONLY the two creative money-losers across accounts:
broken/dead landing URLs and disapproved/limited ads. (Ad-Strength hygiene is out of scope.)

Usage:  python3 process.py manifest.json > findings.json

manifest.json:
{
  "generated_at": "2026-06-23",
  "accounts": [
    { "account": "Acme Insurance", "account_id": "1234567890-1234567890",
      "ads_file": "/abs/ads.json",            # GAQL: enabled ads + final_urls + policy_summary.approval_status
      "url_health_file": "/abs/url_health.json",  # { "<url>": <http_code> }  (0 = no response)
      "cost_file": "/abs/cost.json" }          # OPTIONAL { "<ad_id>": <cost_usd> } -> urgency
  ]
}
Inputs are GAQL `report.query` result files ({status, body:[{results:[...]}]}).
"""
import json, sys

FLAG_APPROVAL = {"DISAPPROVED", "APPROVED_LIMITED"}

def rows(path):
    if not path: return []
    doc = json.load(open(path))
    return [r for b in doc.get("body", []) for r in b.get("results", [])]

def is_broken(code):
    return code is not None and (code == 0 or code >= 400)

def scan_account(entry):
    ads = rows(entry.get("ads_file"))
    health = json.load(open(entry["url_health_file"])) if entry.get("url_health_file") else {}
    cost = json.load(open(entry["cost_file"])) if entry.get("cost_file") else None

    broken = {}          # url -> {url, code, ad_count, campaigns:set, spend, served}
    disapproved = []
    for r in ads:
        ad = r.get("adGroupAd", {}); a = ad.get("ad", {})
        aid = a.get("id")
        cmp_ = r.get("campaign", {}).get("name", ""); agn = r.get("adGroup", {}).get("name", "")
        urls = a.get("finalUrls") or []
        approval = (ad.get("policySummary", {}) or {}).get("approvalStatus")
        spend = (cost or {}).get(aid)

        if approval in FLAG_APPROVAL:
            disapproved.append({"campaign": cmp_, "ad_group": agn, "ad_id": aid,
                                "approval": approval, "url": urls[0] if urls else None})
        for u in urls:
            if is_broken(health.get(u)):
                g = broken.setdefault(u, {"url": u, "code": health.get(u), "ad_count": 0,
                                          "campaigns": set(), "spend": 0.0, "any_spend": False})
                g["ad_count"] += 1; g["campaigns"].add(cmp_)
                if isinstance(spend, (int, float)): g["spend"] += spend; g["any_spend"] = g["any_spend"] or spend > 0

    def urgency(g):
        if cost is None: return "unknown"
        return "urgent" if g["any_spend"] else "latent"

    broken_out = [{"url": g["url"], "code": g["code"], "urgency": urgency(g),
                   "ad_count": g["ad_count"], "campaigns": sorted(g["campaigns"]),
                   "spend": round(g["spend"], 2) if cost is not None else None}
                  for g in sorted(broken.values(), key=lambda g: (-g["spend"], -g["ad_count"]))]
    return {"account": entry.get("account"), "account_id": entry.get("account_id"),
            "ads_scanned": len(ads), "issue_count": len(broken_out) + len(disapproved),
            "broken_urls": broken_out, "disapproved_ads": disapproved}

def main(manifest_path):
    m = json.load(open(manifest_path))
    accounts = [scan_account(e) for e in m.get("accounts", [])]
    with_issues = [a for a in accounts if a["issue_count"] > 0]
    total_broken = sum(len(a["broken_urls"]) for a in accounts)
    total_dis = sum(len(a["disapproved_ads"]) for a in accounts)
    worst = sorted(with_issues, key=lambda a: (-a["issue_count"], -len(a["broken_urls"])))
    out = {
        "meta": {"connector": "google-ads", "skill": "google-ads-creative-health",
                 "generated_at": m.get("generated_at", "")},
        "synthesis": {"headline": "", "diagnosis": "", "action": ""},  # LLM fills
        "accounts": accounts,
        "portfolio": {"accounts_scanned": len(accounts), "accounts_with_issues": len(with_issues),
                      "total_broken_urls": total_broken, "total_disapproved_ads": total_dis,
                      "worst": [{"account": a["account"], "account_id": a["account_id"], "issue_count": a["issue_count"]} for a in worst[:10]]},
    }
    print(json.dumps(out, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: process.py manifest.json", file=sys.stderr); sys.exit(1)
    main(sys.argv[1])
