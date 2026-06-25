#!/usr/bin/env python3
"""
Standalone audit HTML  ->  Porter reports-v2 bundle (static / baked, no charts).

Turns the self-contained audit file (the one rendered from references/design/skeleton.html) into the
3-file bundle `create_report` expects for the "blank" variant:
  - style.css        : the <style> block (already scoped under #audit)
  - pages/main.html  : font links + <link rel="stylesheet" href="style.css"> + the <body> content + SDK/report.js
  - report.js        : static, /* porter:no-compare */ (no live charts; the design IS the deliverable)

The CSS is already scoped under #audit, so it drops into Porter's chrome without restyling it.

Usage:
  python3 to_porter_bundle.py <audit.html> <out-dir>
Then deploy with create_report(template_version, variant="blank",
  files=[report.js, style.css, pages/main.html], pages=[{id:main,...}], config={"charts":{}},
  visibility="PRIVATE"). See ../references/tools.md section E.
"""
import re, os, sys

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;'
    '12..96,600;12..96,700;12..96,800&family=Hanken+Grotesk:wght@400;500;600;700&'
    'family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">\n'
)
REPORT_JS = (
    "/* porter:no-compare */\n"
    "// Static, baked Google Ads account audit — the deliverable is the design itself.\n"
    "// No live charts: every number is fixed for the audit window, so there is nothing to render\n"
    "// from a connector and no date controls.\n"
)


def main():
    if len(sys.argv) != 3:
        sys.exit("usage: to_porter_bundle.py <audit.html> <out-dir>")
    src = open(sys.argv[1], encoding="utf-8").read()
    out = sys.argv[2]
    os.makedirs(os.path.join(out, "pages"), exist_ok=True)

    style = re.search(r"<style>(.*?)</style>", src, re.S)
    body = re.search(r"<body>(.*?)</body>", src, re.S)
    if not style or not body:
        sys.exit("input must contain a <style> block and a <body> (the standalone audit HTML)")

    open(os.path.join(out, "style.css"), "w", encoding="utf-8").write(style.group(1).strip() + "\n")
    open(os.path.join(out, "report.js"), "w", encoding="utf-8").write(REPORT_JS)
    page = (
        FONTS
        + '<link rel="stylesheet" href="style.css" />\n\n'
        + body.group(1).strip()
        + '\n\n<script src="/sdk.js"></script>\n<script src="report.js"></script>\n'
    )
    open(os.path.join(out, "pages", "main.html"), "w", encoding="utf-8").write(page)

    for f in ("report.js", "style.css", "pages/main.html"):
        p = os.path.join(out, f)
        print(f"{f:18s} {os.path.getsize(p):>7d} bytes")
    print(f"\nbundle ready in {out} — deploy via create_report (see references/tools.md section E)")


if __name__ == "__main__":
    main()
