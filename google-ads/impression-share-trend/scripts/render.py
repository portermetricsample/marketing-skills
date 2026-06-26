#!/usr/bin/env python3
"""Render impression-share-trend findings.json -> a self-contained narrative HTML report.

Demo renderer (the orchestrator's formats/* is the production path). Stdlib only; inline SVG sparklines.
Usage:  python3 render.py findings.json report.html
"""
import json, sys, html

LABEL_COLOR = {"Winning": "#1a7f37", "New": "#0969da", "Healthy": "#57606a",
               "Volatile": "#9a6700", "Losing": "#cf222e", "Crashing": "#cf222e",
               "Crashed": "#82071e"}
LABEL_WORD = {"Winning": "Growing", "New": "New", "Healthy": "Steady", "Volatile": "Volatile",
              "Losing": "Declining", "Crashing": "Crashing", "Crashed": "Crashed"}


def sparkline(series, color, w=170, h=40, pad=4):
    if not series:
        return ""
    lo, hi = min(series), max(series)
    rng = (hi - lo) or 1.0
    n = len(series)
    pts = []
    for i, v in enumerate(series):
        x = pad + (w - 2 * pad) * (i / (n - 1) if n > 1 else 0)
        y = pad + (h - 2 * pad) * (1 - (v - lo) / rng)
        pts.append(f"{x:.1f},{y:.1f}")
    dot = pts[-1].split(",")
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<polyline fill="none" stroke="{color}" stroke-width="2" points="{" ".join(pts)}"/>'
            f'<circle cx="{dot[0]}" cy="{dot[1]}" r="2.6" fill="{color}"/></svg>')


def pct(x):
    return f"{x*100:.0f}%"


def card(c):
    color = LABEL_COLOR.get(c["trend_label"], "#57606a")
    word = LABEL_WORD.get(c["trend_label"], c["trend_label"])
    rec = c["recommendation"]
    thin = ' <span class="thin">thin volume</span>' if c.get("low_volume") else ""
    return f"""
    <div class="card">
      <div class="spark">{sparkline(c['series'], color)}</div>
      <div class="body">
        <div class="row1">
          <span class="name">{html.escape(c['campaign'])}</span>
          <span class="chip" style="background:{color}">{word}</span>
        </div>
        <div class="row2">
          IS {pct(c['is_then'])} → <b>{pct(c['is_now'])}</b>
          &nbsp;·&nbsp; driver: <b>{c['driver']}</b>
          &nbsp;·&nbsp; {c['impressions']:,} impressions{thin}
        </div>
        <div class="rec"><b>{html.escape(rec['what'])}</b><br><span>{html.escape(rec['why'])}</span></div>
      </div>
    </div>"""


def section(title, items, sub):
    if not items:
        return ""
    cards = "".join(card(c) for c in items)
    return f'<h2>{title} <span class="count">{len(items)}</span></h2><p class="sub">{sub}</p>{cards}'


def main(findings_path, out_path):
    d = json.load(open(findings_path))
    syn = d.get("synthesis", {})
    camps = d["campaigns"]
    meta = d.get("meta", {})
    growing = [c for c in camps if c["trend_label"] in ("Winning", "New")]
    declining = [c for c in camps if c["trend_label"] in ("Losing", "Crashing", "Crashed")]
    steady = [c for c in camps if c["trend_label"] in ("Healthy", "Volatile")]
    period = meta.get("period", {})
    per = f"{period.get('from','')} → {period.get('to','')}" if period else ""

    doc = f"""<!doctype html><html><head><meta charset="utf-8">
<title>Impression Share Trend — {html.escape(str(meta.get('account','')))}</title>
<style>
 body{{font:15px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1f2328;max-width:880px;margin:40px auto;padding:0 20px}}
 h1{{font-size:24px;margin:0 0 2px}} .meta{{color:#57606a;margin:0 0 24px}}
 .synth{{background:#f6f8fa;border:1px solid #d0d7de;border-radius:10px;padding:16px 18px;margin-bottom:28px}}
 .synth .hl{{font-size:17px;font-weight:600;margin-bottom:8px}}
 .synth div{{margin:4px 0}}
 h2{{font-size:18px;margin:30px 0 2px;border-top:1px solid #eaeef2;padding-top:18px}}
 .count{{font-size:13px;color:#57606a;font-weight:400}} .sub{{color:#57606a;margin:2px 0 12px;font-size:13px}}
 .card{{display:flex;gap:16px;align-items:flex-start;border:1px solid #d0d7de;border-radius:10px;padding:12px 14px;margin:10px 0}}
 .spark{{flex:0 0 auto;padding-top:2px}}
 .body{{flex:1}} .row1{{display:flex;justify-content:space-between;align-items:center}}
 .name{{font-weight:600}} .chip{{color:#fff;font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px}}
 .row2{{color:#57606a;font-size:13px;margin:3px 0 8px}} .thin{{color:#9a6700}}
 .rec{{font-size:13.5px}} .rec span{{color:#424a53}}
</style></head><body>
<h1>Impression Share — Trend &amp; Driver</h1>
<p class="meta">{html.escape(str(meta.get('account','')))} · Google Ads Search · {per}</p>
<div class="synth">
  <div class="hl">{html.escape(syn.get('headline','') or '')}</div>
  <div>📉 <b>Diagnosis:</b> {html.escape(syn.get('diagnosis','') or '')}</div>
  <div>🎯 <b>Action:</b> {html.escape(syn.get('action','') or '')}</div>
</div>
{section("📉 Declining", declining, "Losing reach over time — act, routed by the driver (budget vs rank).")}
{section("📈 Growing", growing, "Gaining reach. The driver shows where the remaining headroom is.")}
{section("➡️ Steady", steady, "Holding. Read the level too: flat-high is fine; flat-low with high loss is capped.")}
</body></html>"""
    open(out_path, "w").write(doc)
    print(f"wrote {out_path} — {len(camps)} campaigns ({len(growing)} growing, {len(steady)} steady, {len(declining)} declining)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("usage: render.py findings.json report.html", file=sys.stderr); sys.exit(1)
    main(sys.argv[1], sys.argv[2])
