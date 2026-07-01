#!/usr/bin/env python3
"""
Design-system audit HTML  ->  Porter reports-v2 bundle (static / baked, no charts).

Turns the standalone audit file (rendered from google-ads/reporting/audit/pages/main.html, the Porter Design
System template) into the 3-file bundle `create_report` expects for the "blank" variant:
  - style.css        : porter-tokens.css (inlined verbatim) + the audit <style> block
  - pages/main.html  : font links + <link rel="stylesheet" href="style.css"> + the #audit body + SDK/report.js
  - report.js        : static, /* porter:no-compare */ (the design IS the deliverable)

WHY inline the tokens: a hosted report is self-contained and cannot reach ~/porter-design/. The
tokens file defines themes via [data-theme="…"] selectors, so they resolve on the <div id="audit"
data-theme="…"> wrapper once inlined.

DEPLOY-SAFE INPUT (see references/deploy.md, Step 1): the standalone HTML must already
  (a) wrap its content in <div id="audit" data-theme="cream">…</div>,
  (b) have its <style> selectors scoped under #audit, and
  (c) have the dev .theme-switch block + script removed.
This script ASSEMBLES; it does not rewrite CSS. It warns if the input still looks unscoped.

Usage:
  python3 to_porter_bundle.py <audit.html> <out-dir> [porter-tokens.css]
  (tokens path defaults to ~/porter-design/dist/porter-tokens.css)
Then deploy with create_report(template_version, variant="blank", files=[...3...],
  pages=[{id:"main",...}], config={"charts":{}}, visibility="PRIVATE"). See references/deploy.md.
"""
import os, re, sys

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
    if len(sys.argv) not in (3, 4):
        sys.exit("usage: to_porter_bundle.py <audit.html> <out-dir> [porter-tokens.css]")
    src = open(sys.argv[1], encoding="utf-8").read()
    out = sys.argv[2]
    tokens_path = sys.argv[3] if len(sys.argv) == 4 else os.path.expanduser(
        "~/porter-design/dist/porter-tokens.css")
    tokens = open(tokens_path, encoding="utf-8").read()

    style = re.search(r"<style>(.*?)</style>", src, re.S)
    body = re.search(r'(<div id="audit".*?</div>)\s*(?:<script|</body>|$)', src, re.S)
    if not style:
        sys.exit("input has no <style> block")
    if not body:
        sys.exit('input has no <div id="audit" …>…</div> wrapper — run deploy.md Step 1 first '
                 '(wrap content in #audit, scope the style, strip the dev switcher)')

    audit_css = style.group(1).strip()
    if re.search(r'(^|\n)\s*body\s*\{', audit_css):
        sys.stderr.write("WARNING: audit <style> still has a bare `body{…}` selector — it will bleed "
                         "into Porter's chrome. Scope it under #audit (see references/deploy.md).\n")

    os.makedirs(os.path.join(out, "pages"), exist_ok=True)
    open(os.path.join(out, "style.css"), "w", encoding="utf-8").write(
        "/* porter-tokens.css (inlined) */\n" + tokens.strip() + "\n\n/* audit layout */\n" + audit_css + "\n")
    open(os.path.join(out, "report.js"), "w", encoding="utf-8").write(REPORT_JS)
    page = (FONTS + '<link rel="stylesheet" href="style.css" />\n\n'
            + body.group(1).strip()
            + '\n\n<script src="/sdk.js"></script>\n<script src="report.js"></script>\n')
    open(os.path.join(out, "pages", "main.html"), "w", encoding="utf-8").write(page)

    for f in ("report.js", "style.css", "pages/main.html"):
        p = os.path.join(out, f)
        print(f"{f:18s} {os.path.getsize(p):>7d} bytes")
    print(f"\nbundle ready in {out} — deploy via create_report (see references/deploy.md)")


if __name__ == "__main__":
    main()
