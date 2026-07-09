"""
indexing.py — Crawlability & discovery, checked against the live files.

  - robots.txt: is the URL allowed for Googlebot? (urllib.robotparser)
  - sitemap: is the URL listed? (from robots.txt Sitemap: lines, else /sitemap.xml;
    follows one level of sitemap-index).

Uses only the standard library.
"""
import gzip
import re
from urllib.parse import urlparse, urljoin
from urllib.robotparser import RobotFileParser
import urllib.request

UA = "landing-page-audit/1.0"


def _get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        raw = r.read()
        if url.endswith(".gz") or r.headers.get("Content-Encoding") == "gzip":
            try:
                raw = gzip.decompress(raw)
            except Exception:
                pass
        return raw.decode("utf-8", "replace")


def robots_check(url):
    p = urlparse(url)
    origin = f"{p.scheme}://{p.netloc}"
    robots_url = origin + "/robots.txt"
    out = {"robots_url": robots_url, "exists": False, "allowed": None, "sitemaps": []}
    try:
        txt = _get(robots_url)
        out["exists"] = True
        out["sitemaps"] = re.findall(r"(?im)^\s*sitemap:\s*(\S+)", txt)
        rp = RobotFileParser()
        rp.parse(txt.splitlines())
        out["allowed"] = rp.can_fetch("Googlebot", url)
    except Exception as e:
        out["error"] = str(e)
        out["allowed"] = True  # no robots.txt => allowed by default
    return out


def _urls_in_sitemap(xml):
    return re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", xml, re.I)


def sitemap_check(url, sitemap_urls, max_children=25):
    p = urlparse(url)
    origin = f"{p.scheme}://{p.netloc}"
    candidates = list(dict.fromkeys(sitemap_urls or [])) or [origin + "/sitemap.xml"]
    target = url.split("#")[0].rstrip("/")
    checked, found = [], False
    for sm in candidates:
        try:
            xml = _get(sm)
        except Exception:
            checked.append({"sitemap": sm, "ok": False})
            continue
        checked.append({"sitemap": sm, "ok": True})
        locs = _urls_in_sitemap(xml)
        # sitemap index? -> loc entries are themselves sitemaps
        if "<sitemapindex" in xml.lower():
            for child in locs[:max_children]:
                try:
                    cxml = _get(child)
                except Exception:
                    continue
                if any(l.split("#")[0].rstrip("/") == target for l in _urls_in_sitemap(cxml)):
                    found = True
                    break
        else:
            if any(l.split("#")[0].rstrip("/") == target for l in locs):
                found = True
        if found:
            break
    return {"in_sitemap": found, "sitemaps_checked": checked}


def audit_indexing(url):
    rb = robots_check(url)
    sm = sitemap_check(url, rb.get("sitemaps"))
    return {"robots": rb, "sitemap": sm}


if __name__ == "__main__":
    import sys, json
    print(json.dumps(audit_indexing(sys.argv[1] if len(sys.argv) > 1 else "https://web.dev/"), indent=2))
