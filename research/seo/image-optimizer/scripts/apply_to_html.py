#!/usr/bin/env python3
"""
apply_to_html.py — Wire the optimized images into a page. For every <img> whose
filename matches the manifest, it swaps the src to the .webp, adds width/height
(kills layout shift / CLS), adds loading="lazy" + decoding="async", and writes the
alt + title Claude generated. Backs up the original to <file>.bak first.

    python3 apply_to_html.py page.html manifest.json

Needs:  pip install beautifulsoup4
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependency. Run:  pip install beautifulsoup4", file=sys.stderr)
    sys.exit(2)


def _stem(src):
    return Path(src.split("?")[0].split("#")[0]).stem


def _swap_filename(src, new_name):
    """Replace only the last path segment, keep the directory."""
    if "/" in src:
        return re.sub(r"[^/]+$", new_name, src)
    return new_name


def apply(html_path, manifest_path):
    manifest = json.load(open(manifest_path))
    by_stem = {_stem(e["original"]): e for e in manifest}
    html = Path(html_path).read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    changed = 0
    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or ""
        e = by_stem.get(_stem(src))
        if not e:
            continue
        img["src"] = _swap_filename(src, Path(e["webp"]).name)
        img["width"] = str(e["width"])
        img["height"] = str(e["height"])
        img["loading"] = "lazy"
        img["decoding"] = "async"
        if e.get("alt"):
            img["alt"] = e["alt"]
        if e.get("title"):
            img["title"] = e["title"]
        changed += 1

    if changed:
        Path(str(html_path) + ".bak").write_text(html, encoding="utf-8")
        Path(html_path).write_text(str(soup), encoding="utf-8")
    missing_alt = [e["webp"] for e in manifest if not e.get("alt")]
    print(f"\n  Updated {changed} <img> tag(s) in {html_path}")
    if changed:
        print(f"  backup → {html_path}.bak")
    if missing_alt:
        print(f"  ! {len(missing_alt)} image(s) still have no alt — have Claude fill the manifest first.")
    print()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("manifest")
    a = ap.parse_args()
    apply(a.html, a.manifest)


if __name__ == "__main__":
    main()
