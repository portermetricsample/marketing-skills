"""
onpage.py — On-page technical SEO + structure, read straight from the live HTML.

Covers: HTTP status / redirects / HTTPS, <title>, meta description, meta robots
+ X-Robots-Tag header, canonical, viewport, <html lang>, H1 count + heading order,
images (alt / next-gen format / width+height / lazy), JSON-LD (valid + matches
visible text), Open Graph / Twitter cards, hreflang alternates.

Needs:  pip install requests beautifulsoup4
"""
import json
import re
from urllib.parse import urlparse, urljoin

try:
    import requests
except ImportError:
    requests = None
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None

UA = "Mozilla/5.0 (compatible; landing-page-audit/1.0; +https://portermetrics.com)"
NEXT_GEN = (".webp", ".avif", ".svg")


def _deps_ok():
    missing = []
    if requests is None:
        missing.append("requests")
    if BeautifulSoup is None:
        missing.append("beautifulsoup4")
    return missing


def fetch(url, timeout=30):
    r = requests.get(url, headers={"User-Agent": UA}, timeout=timeout, allow_redirects=True)
    redirects = [h.headers.get("Location") or h.url for h in r.history]
    return {
        "status": r.status_code,
        "final_url": r.url,
        "https": r.url.startswith("https://"),
        "redirect_chain": redirects,
        "headers": {k.lower(): v for k, v in r.headers.items()},
        "html": r.text,
    }


def _text_of(soup):
    for t in soup(["script", "style", "noscript"]):
        t.extract()
    return re.sub(r"\s+", " ", soup.get_text(" ")).lower()


def audit_html(url):
    missing = _deps_ok()
    if missing:
        return {"error": "missing deps", "install": "pip install " + " ".join(missing)}
    try:
        page = fetch(url)
    except Exception as e:
        return {"error": f"fetch failed: {e}"}

    soup = BeautifulSoup(page["html"], "html.parser")
    page_text = _text_of(BeautifulSoup(page["html"], "html.parser"))
    final = page["final_url"]

    # --- title / meta description ---
    title = (soup.title.string or "").strip() if soup.title else ""
    md = soup.find("meta", attrs={"name": re.compile("^description$", re.I)})
    meta_desc = (md.get("content") or "").strip() if md else ""

    # --- robots (meta + header) ---
    mr = soup.find("meta", attrs={"name": re.compile("^robots$", re.I)})
    meta_robots = (mr.get("content") or "").lower() if mr else ""
    x_robots = page["headers"].get("x-robots-tag", "").lower()
    noindex = ("noindex" in meta_robots) or ("noindex" in x_robots)

    # --- canonical ---
    can = soup.find("link", attrs={"rel": re.compile("canonical", re.I)})
    canonical = (can.get("href") or "").strip() if can else ""
    canonical_abs = urljoin(final, canonical) if canonical else ""
    canonical_self = bool(canonical_abs) and canonical_abs.split("#")[0].rstrip("/") == final.split("#")[0].rstrip("/")

    # --- viewport / lang ---
    vp = soup.find("meta", attrs={"name": re.compile("^viewport$", re.I)})
    viewport = (vp.get("content") or "").strip() if vp else ""
    html_lang = (soup.find("html").get("lang") or "").strip() if soup.find("html") else ""

    # --- headings ---
    headings = [(int(h.name[1]), h.get_text(" ", strip=True)) for h in soup.find_all(re.compile("^h[1-6]$"))]
    h1s = [t for lvl, t in headings if lvl == 1]
    skips = []
    prev = 0
    for lvl, _ in headings:
        if prev and lvl > prev + 1:
            skips.append(f"h{prev}->h{lvl}")
        prev = lvl

    # --- images ---
    imgs = soup.find_all("img")
    img_total = len(imgs)
    no_alt, legacy_fmt, no_dims, no_lazy = [], [], [], []
    for i in imgs:
        src = i.get("src") or i.get("data-src") or ""
        if i.get("alt") is None:
            no_alt.append(src[:80])
        low = src.lower().split("?")[0]
        if low and not low.endswith(NEXT_GEN) and not low.startswith("data:"):
            legacy_fmt.append(src[:80])
        if not (i.get("width") and i.get("height")):
            no_dims.append(src[:80])
        if (i.get("loading") or "").lower() != "lazy":
            no_lazy.append(src[:80])

    # --- JSON-LD ---
    ld_blocks, ld_types, ld_valid, ld_match = [], [], True, False
    for s in soup.find_all("script", attrs={"type": re.compile("ld\\+json", re.I)}):
        raw = s.string or s.get_text() or ""
        try:
            data = json.loads(raw)
        except Exception:
            ld_valid = False
            continue
        ld_blocks.append(data)
        for obj in (data if isinstance(data, list) else [data]):
            if isinstance(obj, dict):
                t = obj.get("@type")
                if t:
                    ld_types.extend(t if isinstance(t, list) else [t])
                # does schema text appear on the page? (name/headline heuristic)
                for f in ("name", "headline"):
                    val = obj.get(f)
                    if isinstance(val, str) and len(val) > 4 and val.lower() in page_text:
                        ld_match = True

    # --- Open Graph / Twitter ---
    def prop(p):
        m = soup.find("meta", attrs={"property": p}) or soup.find("meta", attrs={"name": p})
        return (m.get("content") or "").strip() if m else ""
    og = {"title": prop("og:title"), "description": prop("og:description"),
          "image": prop("og:image"), "twitter_card": prop("twitter:card")}

    # --- hreflang ---
    hreflang = []
    for l in soup.find_all("link", attrs={"rel": re.compile("alternate", re.I)}):
        hl = l.get("hreflang")
        if hl:
            hreflang.append({"lang": hl, "href": l.get("href")})

    return {
        "http": {"status": page["status"], "final_url": final, "https": page["https"],
                 "redirect_chain": page["redirect_chain"]},
        "title": {"text": title, "length": len(title)},
        "meta_description": {"text": meta_desc, "length": len(meta_desc)},
        "robots": {"meta": meta_robots, "x_robots_tag": x_robots, "noindex": noindex},
        "canonical": {"href": canonical_abs, "self_referencing": canonical_self},
        "viewport": viewport,
        "html_lang": html_lang,
        "headings": {"h1_count": len(h1s), "h1": h1s, "skipped_levels": skips, "total": len(headings)},
        "images": {"total": img_total, "missing_alt": no_alt, "legacy_format": legacy_fmt,
                   "missing_dimensions": no_dims, "not_lazy": no_lazy},
        "json_ld": {"blocks": len(ld_blocks), "types": sorted(set(ld_types)),
                    "valid": ld_valid, "matches_visible_text": ld_match},
        "open_graph": og,
        "hreflang": hreflang,
    }


if __name__ == "__main__":
    import sys
    print(json.dumps(audit_html(sys.argv[1] if len(sys.argv) > 1 else "https://web.dev/"), indent=2))
