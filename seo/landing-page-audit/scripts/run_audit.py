#!/usr/bin/env python3
"""
run_audit.py — Full technical + performance audit of a landing page (or any URL).

    python run_audit.py <url> [--desktop] [--json out.json]

Runs three engines against the LIVE page and grades every criterion pass/warn/fail:
    perf.py     Speed & Core Web Vitals  (Lighthouse lab + CrUX real-user field, via PSI API)
    onpage.py   Metadata, structure, images, JSON-LD, Open Graph, hreflang  (live HTML)
    indexing.py robots.txt allowed? in sitemap?  (live files)

Thresholds are the official web.dev / Google numbers — see ../references/thresholds.md.
Nothing here is assumed: each grade traces to a value read from the page or a Google API.
"""
import argparse
import json
import sys

try:
    import perf, onpage, indexing
except ImportError:
    from . import perf, onpage, indexing  # type: ignore

PASS, WARN, FAIL, NA = "PASS", "WARN", "FAIL", "NA"
ICON = {PASS: "✓", WARN: "!", FAIL: "✕", NA: "–"}


def _f(findings, group, check, status, value="", note=""):
    findings.append({"group": group, "check": check, "status": status,
                     "value": value, "note": note})


def _field_or_lab(field, lab_val, key):
    """Prefer real-user field p75; fall back to lab. Returns (value, source)."""
    if field and key in field and field[key].get("p75") is not None:
        return field[key]["p75"], "field (real users)"
    return lab_val, "lab (Lighthouse)"


def grade(url, strategy="mobile"):
    findings = []
    psi = perf.extract(perf.run_psi(url, strategy))
    op = onpage.audit_html(url)
    idx = indexing.audit_indexing(url)

    # ---------------- SPEED ----------------
    if "error" in psi:
        _f(findings, "Speed", "PageSpeed Insights", NA, "", psi.get("error", ""))
    else:
        lab = psi["lab"]
        fp = psi.get("field_page") or psi.get("field_origin")
        # LCP
        lcp, src = _field_or_lab(fp, lab.get("LCP_ms"), "LCP_ms")
        if lcp is not None:
            st = PASS if lcp < 2500 else (WARN if lcp < 4000 else FAIL)
            _f(findings, "Speed", "LCP (loads)", st, f"{lcp/1000:.1f}s", f"good <2.5s · {src}")
        # INP (field only; TBT is the lab proxy)
        if fp and "INP_ms" in fp:
            inp = fp["INP_ms"]["p75"]
            st = PASS if inp < 200 else (WARN if inp < 500 else FAIL)
            _f(findings, "Speed", "INP (responds)", st, f"{inp}ms", "good <200ms · field (real users)")
        else:
            tbt = lab.get("TBT_ms")
            _f(findings, "Speed", "INP (responds)", NA,
               f"TBT {tbt:.0f}ms" if tbt is not None else "",
               "no field data yet — TBT is the lab proxy; INP needs real traffic")
        # CLS
        cls, src = _field_or_lab(fp, lab.get("CLS"), "CLS")
        if cls is not None:
            st = PASS if cls < 0.1 else (WARN if cls < 0.25 else FAIL)
            _f(findings, "Speed", "CLS (stability)", st, f"{cls:.3f}", f"good <0.1 · {src}")
        # overall lab perf score
        ps = lab.get("performance_score")
        if ps is not None:
            st = PASS if ps >= 90 else (WARN if ps >= 50 else FAIL)
            _f(findings, "Speed", "Lighthouse performance", st, f"{ps}/100", strategy + " lab score")

    # ---------------- FINDABLE ----------------
    if "error" in op:
        _f(findings, "Findable", "Fetch page", FAIL, "", op.get("install") or op.get("error", ""))
    else:
        http = op["http"]
        _f(findings, "Findable", "HTTPS", PASS if http["https"] else FAIL,
           http["final_url"], "")
        st = PASS if http["status"] == 200 else (WARN if http["status"] < 400 else FAIL)
        _f(findings, "Findable", "HTTP status", st, str(http["status"]),
           f"{len(http['redirect_chain'])} redirect(s)" if http["redirect_chain"] else "")
        # noindex — the silent killer
        _f(findings, "Findable", "noindex tag", FAIL if op["robots"]["noindex"] else PASS,
           op["robots"]["meta"] or op["robots"]["x_robots_tag"] or "none",
           "a stray noindex makes the page un-rankable" if op["robots"]["noindex"] else "")
        # robots.txt
        allowed = idx["robots"].get("allowed")
        _f(findings, "Findable", "robots.txt allows it",
           PASS if allowed else (FAIL if allowed is False else NA),
           "allowed" if allowed else ("blocked" if allowed is False else "unknown"))
        # title
        tl = op["title"]["length"]
        st = FAIL if tl == 0 else (WARN if (tl < 30 or tl > 60) else PASS)
        _f(findings, "Findable", "Title", st, f'{tl} chars', op["title"]["text"][:70])
        # meta description
        ml = op["meta_description"]["length"]
        st = FAIL if ml == 0 else (WARN if (ml < 70 or ml > 160) else PASS)
        _f(findings, "Findable", "Meta description", st, f"{ml} chars", "")
        # canonical
        can = op["canonical"]
        st = FAIL if not can["href"] else (PASS if can["self_referencing"] else WARN)
        _f(findings, "Findable", "Canonical", st,
           "self" if can["self_referencing"] else (can["href"][:70] or "missing"), "")
        # sitemap
        _f(findings, "Findable", "In sitemap", PASS if idx["sitemap"]["in_sitemap"] else WARN,
           "found" if idx["sitemap"]["in_sitemap"] else "not found", "")
        # hreflang
        hl = op["hreflang"]
        _f(findings, "Findable", "hreflang", PASS if hl else NA,
           ", ".join(sorted({h["lang"] for h in hl})) if hl else "none",
           "reciprocity not verified from a single page" if hl else "")

    # ---------------- STRUCTURED ----------------
    if "error" not in op:
        h = op["headings"]
        st = PASS if h["h1_count"] == 1 else (FAIL if h["h1_count"] == 0 else WARN)
        _f(findings, "Structured", "One H1", st, f'{h["h1_count"]} found',
           (h["h1"][0][:70] if h["h1"] else ""))
        _f(findings, "Structured", "Heading order", WARN if h["skipped_levels"] else PASS,
           ", ".join(h["skipped_levels"]) if h["skipped_levels"] else "clean", "")
        im = op["images"]
        na = len(im["missing_alt"])
        _f(findings, "Structured", "Image alt text", PASS if na == 0 else WARN,
           f"{na}/{im['total']} missing", "")
        lf = len(im["legacy_format"])
        _f(findings, "Structured", "Next-gen images", PASS if lf == 0 else WARN,
           f"{lf}/{im['total']} legacy", "convert to WebP/AVIF")
        jl = op["json_ld"]
        if jl["blocks"] == 0:
            _f(findings, "Structured", "JSON-LD schema", WARN, "none", "add schema.org markup")
        elif not jl["valid"]:
            _f(findings, "Structured", "JSON-LD schema", FAIL, "invalid JSON", "")
        else:
            st = PASS if jl["matches_visible_text"] else WARN
            _f(findings, "Structured", "JSON-LD schema", st,
               ", ".join(jl["types"]) or "valid",
               "" if jl["matches_visible_text"] else "schema text not found on page")
        og = op["open_graph"]
        have = [k for k in ("title", "description", "image") if og.get(k)]
        _f(findings, "Structured", "Open Graph", PASS if len(have) == 3 else WARN,
           f"{len(have)}/3", "for social share previews")

    # ---------------- MOBILE ----------------
    if "error" not in op:
        _f(findings, "Mobile", "Viewport meta", PASS if op["viewport"] else FAIL,
           op["viewport"][:50] or "missing", "")
    if "error" not in psi:
        diag = psi.get("diagnostics", {})
        tt = diag.get("tap-targets", {})
        if tt:
            sc = tt.get("score")
            st = PASS if (sc is None or sc >= 0.9) else WARN
            _f(findings, "Mobile", "Tap targets", st, tt.get("display") or "", "≥ 48px")
        ri = diag.get("uses-responsive-images", {})
        if ri:
            sc = ri.get("score")
            _f(findings, "Mobile", "Responsive images", PASS if (sc is None or sc >= 0.9) else WARN,
               ri.get("display") or "", "")
        ps = psi["lab"].get("performance_score")
        if ps is not None and strategy == "mobile":
            st = PASS if ps >= 90 else (WARN if ps >= 50 else FAIL)
            _f(findings, "Mobile", "Fast on phones", st, f"{ps}/100", "mobile Lighthouse score")

    return {"url": url, "strategy": strategy, "findings": findings,
            "raw": {"perf": psi, "onpage": op, "indexing": idx}}


def render(report):
    groups = ["Speed", "Findable", "Structured", "Mobile"]
    counts = {PASS: 0, WARN: 0, FAIL: 0, NA: 0}
    out = []
    out.append("")
    out.append("=" * 68)
    out.append(f"  LANDING PAGE AUDIT  —  {report['url']}  ({report['strategy']})")
    out.append("=" * 68)
    for g in groups:
        rows = [f for f in report["findings"] if f["group"] == g]
        if not rows:
            continue
        out.append(f"\n  {g.upper()}")
        for r in rows:
            counts[r["status"]] = counts.get(r["status"], 0) + 1
            val = f"  — {r['value']}" if r["value"] else ""
            note = f"   ({r['note']})" if r["note"] else ""
            out.append(f"    [{ICON[r['status']]}] {r['check']:<22}{val}{note}")
    out.append("\n" + "-" * 68)
    out.append(f"  {counts[PASS]} pass · {counts[WARN]} warn · {counts[FAIL]} fail · {counts[NA]} n/a")
    out.append("-" * 68 + "\n")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--desktop", action="store_true", help="audit desktop strategy (default: mobile)")
    ap.add_argument("--json", metavar="FILE", help="also write the full report + raw data to FILE")
    args = ap.parse_args()
    url = args.url if "://" in args.url else "https://" + args.url
    report = grade(url, "desktop" if args.desktop else "mobile")
    print(render(report))
    if args.json:
        with open(args.json, "w") as fh:
            json.dump(report, fh, indent=2)
        print(f"  full report + raw data → {args.json}\n")
    # exit non-zero if anything failed (handy in CI)
    if any(f["status"] == FAIL for f in report["findings"]):
        sys.exit(1)


if __name__ == "__main__":
    main()
