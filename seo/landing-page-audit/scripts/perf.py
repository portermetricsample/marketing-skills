"""
perf.py — Speed & Core Web Vitals via Google's PageSpeed Insights API.

One PSI call returns BOTH:
  - Lab data (Lighthouse, simulated): runs on any URL, always available.
  - Field data (CrUX, real users, p75): only present if the URL/origin has
    enough real Chrome traffic. New pages usually have no field data — that is
    expected, not an error. Lab data still tells you what to fix.

PSI works keyless at low volume (rate-limited). Set PSI_API_KEY env var for
reliable runs:  export PSI_API_KEY=...   (https://developers.google.com/speed/docs/insights/v5/get-started)
"""
import os
import json
import urllib.parse
import urllib.request

PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

# Lighthouse audit ids we care about, mapped to our checklist groups.
DIAGNOSTIC_AUDITS = [
    "modern-image-formats", "uses-optimized-images", "uses-responsive-images",
    "offscreen-images", "unsized-images", "layout-shift-elements",
    "render-blocking-resources", "tap-targets", "viewport", "image-alt",
    "document-title", "meta-description", "hreflang", "canonical",
    "is-crawlable", "structured-data", "http-status-code", "color-contrast",
]

_FIELD_KEYMAP = {
    "LARGEST_CONTENTFUL_PAINT_MS": "LCP_ms",
    "INTERACTION_TO_NEXT_PAINT": "INP_ms",
    "CUMULATIVE_LAYOUT_SHIFT_SCORE": "CLS",
    "EXPERIENCE_TIME_TO_FIRST_BYTE": "TTFB_ms",
}


def run_psi(url, strategy="mobile", api_key=None, timeout=120):
    """Call PSI. strategy is 'mobile' or 'desktop'. Returns parsed JSON or {'error':...}."""
    api_key = api_key or os.environ.get("PSI_API_KEY")
    params = [("url", url), ("strategy", strategy)]
    for cat in ("performance", "accessibility", "best-practices", "seo"):
        params.append(("category", cat))
    if api_key:
        params.append(("key", api_key))
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        PSI_ENDPOINT + "?" + q,
        headers={"User-Agent": "landing-page-audit/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode("utf-8", "replace")[:400]
        except Exception:
            pass
        return {"error": f"PSI HTTP {e.code}", "detail": body,
                "hint": "Rate-limited or invalid URL. Set PSI_API_KEY and retry."}
    except Exception as e:
        return {"error": f"PSI request failed: {e}"}


def _field(psi, block):
    metrics = (psi.get(block) or {}).get("metrics") or {}
    out = {}
    for k, v in metrics.items():
        key = _FIELD_KEYMAP.get(k)
        if not key:
            continue
        p = v.get("percentile")
        if key == "CLS" and isinstance(p, (int, float)):
            p = round(p / 100.0, 3)  # CrUX returns CLS*100 as an integer
        out[key] = {"p75": p, "category": v.get("category")}
    return out or None


def extract(psi):
    """Normalize a PSI response into lab + diagnostics + field data."""
    if not psi or "error" in psi:
        return {"error": (psi or {}).get("error", "no PSI data"),
                "detail": (psi or {}).get("detail")}
    lr = psi.get("lighthouseResult", {})
    audits = lr.get("audits", {})
    cats = lr.get("categories", {})

    def cat_score(name):
        s = cats.get(name, {}).get("score")
        return round(s * 100) if isinstance(s, (int, float)) else None

    def num(a):
        return audits.get(a, {}).get("numericValue")

    lab = {
        "performance_score": cat_score("performance"),
        "accessibility_score": cat_score("accessibility"),
        "best_practices_score": cat_score("best-practices"),
        "seo_score": cat_score("seo"),
        "LCP_ms": num("largest-contentful-paint"),
        "CLS": num("cumulative-layout-shift"),
        "TBT_ms": num("total-blocking-time"),   # lab proxy for INP
        "FCP_ms": num("first-contentful-paint"),
        "TTFB_ms": num("server-response-time"),
        "speed_index_ms": num("speed-index"),
    }
    diagnostics = {}
    for a in DIAGNOSTIC_AUDITS:
        au = audits.get(a)
        if au is None:
            continue
        diagnostics[a] = {
            "score": au.get("score"),
            "title": au.get("title"),
            "display": au.get("displayValue"),
        }
    return {
        "lab": lab,
        "diagnostics": diagnostics,
        "field_page": _field(psi, "loadingExperience"),
        "field_origin": _field(psi, "originLoadingExperience"),
        "final_url": psi.get("id"),
    }


if __name__ == "__main__":
    import sys
    u = sys.argv[1] if len(sys.argv) > 1 else "https://web.dev/"
    strat = sys.argv[2] if len(sys.argv) > 2 else "mobile"
    print(json.dumps(extract(run_psi(u, strat)), indent=2))
