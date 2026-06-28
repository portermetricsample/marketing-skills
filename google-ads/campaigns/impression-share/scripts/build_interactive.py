#!/usr/bin/env python3
"""Interactive spend-ranked monitor with drill-down: each row expands to its full weekly stacked chart.
Emits an inline widget fragment (argv2) and a standalone HTML (argv3)."""
import json, sys
from process import load_rows, to_date, weekly_series, F_DATE, F_CAMP, F_IS, F_RANK, F_BUDGET, F_IMPR
from collections import defaultdict, Counter

CAMPS = [
    ("Acme_Auto_SEM_(TL)", "Auto (non-brand)", 184200),
    ("Acme_Home_SEM_(HD)", "Home", 52400),
    ("Acme_Life_SEM_(TL)", "Life", 39800),
    ("Acme_Health_SEM_(HD)", "Health", 31100),
    ("Acme_Renters_SEM_(HA)", "Renters", 19600),
    ("Acme_Pet_SEM_Test_(HA)", "Pet (test)", 8900),
    ("Acme_Brand_SEM_(BR)", "Brand", 7300),
]
WANT = {n for n, _, _ in CAMPS}

rows = load_rows(json.load(open(sys.argv[1])))
by = defaultdict(list)
for r in rows:
    if r.get(F_CAMP) not in WANT:
        continue
    is_ = float(r.get(F_IS) or 0); rk = float(r.get(F_RANK) or 0); bg = float(r.get(F_BUDGET) or 0)
    if is_ == 0 and rk == 0 and bg == 0:
        continue
    by[r.get(F_CAMP)].append({"date": str(r.get(F_DATE)), "is": is_, "rank": rk, "budget": bg, "impr": float(r.get(F_IMPR) or 0)})

all_dates = sorted({d["date"] for v in by.values() for d in v})
dmin, dmax = to_date(all_dates[0]), to_date(all_dates[-1])

mon = []
for name, lab, spend in CAMPS:
    wk = weekly_series(sorted(by.get(name, []), key=lambda r: r["date"]), dmin, dmax)
    if len(wk) < 2:
        continue
    got = [round(w["is"] * 100, 1) for w in wk]
    rank = [round(w["rank"] * 100, 1) for w in wk]
    budget = [round(w["budget"] * 100, 1) for w in wk]
    weeks = [w["week"][-3:] for w in wk]
    last3 = wk[-3:]; imp = sum(w["impr"] for w in last3) or 1
    rw = sum(w["rank"] * w["impr"] for w in last3) / imp * 100
    bw = sum(w["budget"] * w["impr"] for w in last3) / imp * 100
    gw = sum(w["is"] * w["impr"] for w in last3) / imp * 100
    drv = "rank" if rw - bw > 5 else ("budget" if bw - rw > 5 else "mixed")
    n = len(wk); win = 4 if n >= 8 else max(1, n // 2)
    rcw = wk[-win:]; prw = wk[-2 * win:-win]
    ri = sum(x["is"] * x["impr"] for x in rcw) / (sum(x["impr"] for x in rcw) or 1) * 100
    pi = sum(x["is"] * x["impr"] for x in prw) / (sum(x["impr"] for x in prw) or 1) * 100
    mon.append({"label": lab, "spend": spend, "weeks": weeks, "got": got, "rank": rank, "budget": budget,
                "prior_is": round(pi, 1), "recent_is": round(ri, 1), "short": n < 8, "win": win,
                "gw": round(gw, 1), "rw": round(rw, 1), "bw": round(bw, 1), "driver": drv})

mon.sort(key=lambda m: -m["spend"])
CNT = Counter(m["driver"] for m in mon)
DATA = json.dumps([{"label": m["label"], "weeks": m["weeks"], "got": m["got"], "rank": m["rank"], "budget": m["budget"]} for m in mon])
DRVC = {"rank": "#BA7517", "budget": "#D85A30", "mixed": "#888780"}


def spark(got):
    w, h, pad = 150, 34, 4
    lo, hi = min(got), max(got); rng = (hi - lo) or 1; n = len(got)
    pts = " ".join(f"{pad+(w-2*pad)*(i/(n-1) if n>1 else 0):.1f},{pad+(h-2*pad)*(1-(v-lo)/rng):.1f}" for i, v in enumerate(got))
    lx, ly = pts.split()[-1].split(",")
    return (f'<svg width="{w}" height="{h}" style="overflow:visible"><polyline fill="none" stroke="#57606a" stroke-width="1.8" points="{pts}"/>'
            f'<circle cx="{lx}" cy="{ly}" r="2.6" fill="#1f2328"/></svg>')


def whybar(m):
    tot = (m["gw"] + m["rw"] + m["bw"]) or 1
    seg = lambda v, c: f'<span style="display:inline-block;height:10px;width:{v/tot*100:.1f}%;background:{c}"></span>'
    return ('<span style="display:inline-flex;width:100%;border-radius:2px;overflow:hidden">'
            + seg(m["gw"], "#1D9E75") + seg(m["rw"], "#BA7517") + seg(m["bw"], "#D85A30") + '</span>')


GRID = "grid-template-columns:18px 196px 150px 74px 150px;gap:12px"


def rowhtml(m, i, varcss):
    sec = "var(--color-text-secondary)" if varcss else "#57606a"
    pri = "var(--color-text-primary)" if varcss else "#1f2328"
    bord = "var(--color-border-tertiary)" if varcss else "#eaeef2"
    d = m["recent_is"] - m["prior_is"]
    arrow = "▲" if d > 1 else ("▼" if d < -1 else "▬")
    dcol = "#1a7f37" if d > 1 else ("#cf222e" if d < -1 else "#888780")
    sval = f"${m['spend']/1000:.1f}k" if m["spend"] >= 1000 else f"${m['spend']}"
    shorttag = '<div style="font-size:10px;color:#888780">short hist.</div>' if m["short"] else ''
    head = (f'<div onclick="tg({i})" style="display:grid;{GRID};align-items:center;padding:11px 0;cursor:pointer">'
            f'<span id="cv{i}" style="color:#888780;font-size:11px">▸</span>'
            f'<div><div style="font-weight:500;color:{pri}">{m["label"]}</div><div style="font-size:12px;color:{sec};margin-top:2px">{sval}</div></div>'
            f'<div>{spark(m["got"])}<div style="font-size:11.5px;color:{sec};margin-top:1px">{round(m["prior_is"])}% → {round(m["recent_is"])}%</div></div>'
            f'<div><div style="font-size:14px;color:{dcol};font-weight:500">{arrow} {abs(round(d))} pts</div>{shorttag}</div>'
            f'<div>{whybar(m)}<div style="font-size:11.5px;margin-top:3px;color:{sec}">limited by: <b style="color:{DRVC[m["driver"]]}">{m["driver"]}</b></div></div></div>'
            f'<div id="dt{i}" style="display:none;padding:2px 0 16px 30px">'
            f'<div style="font-size:12px;color:{sec};margin:0 0 6px">Weekly breakdown — green height = impression share; amber/coral = where reach was lost</div>'
            f'<div style="position:relative;width:100%;max-width:560px;height:200px"><canvas id="cn{i}" role="img" aria-label="Weekly impression share composition for {m["label"]}"></canvas></div></div>')
    return f'<div class="mrow" data-drv="{m["driver"]}" style="border-top:0.5px solid {bord}">{head}</div>'


def chips(varcss):
    txt = "var(--color-text-primary)" if varcss else "#1f2328"
    base = f"font-size:12px;padding:4px 11px;border-radius:20px;border:0.5px solid rgba(136,135,128,0.4);cursor:pointer;color:{txt};white-space:nowrap"
    dot = {"rank": "#BA7517", "budget": "#D85A30", "mixed": "#888780"}
    out = [f'<span class="chip" data-f="all" onclick="flt(\'all\')" style="{base}">All ({len(mon)})</span>']
    for d in ("rank", "budget", "mixed"):
        if CNT.get(d):
            out.append(f'<span class="chip" data-f="{d}" onclick="flt(\'{d}\')" style="{base}">'
                       f'<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:{dot[d]}"></span> {d.capitalize()} ({CNT[d]})</span>')
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px">' + "".join(out) + '</div>'


def legend(varcss):
    sec = "var(--color-text-secondary)" if varcss else "#57606a"
    sw = lambda c, t: f'<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:{c};vertical-align:-1px"></span> {t}</span>'
    return (f'<div style="display:flex;flex-wrap:wrap;gap:14px;font-size:12px;margin:0 0 4px;color:{sec}">'
            f'<span style="opacity:.85">where reach is lost:</span>{sw("#1D9E75","got")}{sw("#BA7517","rank (auction)")}{sw("#D85A30","budget (money)")}</div>')


def headerrow(varcss):
    sec = "var(--color-text-secondary)" if varcss else "#57606a"
    return (f'<div style="display:grid;{GRID};font-size:11.5px;color:{sec};padding:8px 0 2px">'
            f'<span></span><span>Campaign · 90d spend ↓</span><span>IS over time (own scale)</span><span>change (4w)</span><span>why (now)</span></div>')


SCRIPT = ('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>'
          '<script>const D=' + DATA + ';const CH={};'
          'function tg(i){var dt=document.getElementById("dt"+i),op=dt.style.display==="block";'
          'dt.style.display=op?"none":"block";document.getElementById("cv"+i).textContent=op?"▸":"▾";'
          'if(!op&&!CH[i]){var c=D[i];CH[i]=new Chart(document.getElementById("cn"+i),{type:"bar",'
          'data:{labels:c.weeks,datasets:[{label:"got",data:c.got,backgroundColor:"#1D9E75"},{label:"rank",data:c.rank,backgroundColor:"#BA7517"},{label:"budget",data:c.budget,backgroundColor:"#D85A30"}]},'
          'options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(x){return x.dataset.label+": "+Math.round(x.parsed.y)+"%"}}}},'
          'scales:{x:{stacked:true,ticks:{color:"#888780"},grid:{display:false}},y:{stacked:true,min:0,max:100,ticks:{color:"#888780",callback:function(v){return v+"%"}},grid:{color:"rgba(136,135,128,0.18)"}}}}});}}'
          'function flt(f){document.querySelectorAll(".mrow").forEach(function(r){r.style.display=(f==="all"||r.dataset.drv===f)?"":"none"});'
          'document.querySelectorAll(".chip").forEach(function(c){var on=c.dataset.f===f;c.style.fontWeight=on?"500":"400";c.style.borderColor=on?"#888780":"rgba(136,135,128,0.4)";c.style.background=on?"rgba(136,135,128,0.12)":"transparent"})}'
          'flt("all");</script>')

SR = '<h2 class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Spend-ranked impression share monitor; click a campaign to expand its weekly breakdown.</h2>'

# inline fragment (CSS vars)
frag = SR + chips(True) + legend(True) + headerrow(True) + "".join(rowhtml(m, i, True) for i, m in enumerate(mon)) + SCRIPT
open(sys.argv[2], "w").write(frag)

# standalone (hardcoded light)
html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acme Insurance — Impression Share Monitor</title>
<style>body{{font:15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2328;background:#fff;max-width:780px;margin:32px auto;padding:0 22px}}
h1{{font-size:23px;font-weight:600;margin:0 0 2px}} .sub{{color:#57606a;margin:0 0 16px}} .cap{{color:#57606a;font-size:13.5px;margin:16px 0 0}}</style></head><body>
<h1>Acme Insurance — Impression Share Monitor</h1>
<p class="sub">Sorted by spend (90d) · each campaign on its own scale · click a row to expand its weekly breakdown · Mar 26 – Jun 23, 2026</p>
{chips(False)}
{legend(False)}
{headerrow(False)}
{"".join(rowhtml(m, i, False) for i, m in enumerate(mon))}
<p class="cap">Overview → detail: the row shows which campaigns matter (spend), which way they move and roughly why (mini-bar = latest). <b>Change (4w)</b> = the average impression share of the last 4 weeks vs the 4 weeks before it (so it's comparable across campaigns, unlike a single first-vs-last week); the two numbers under the sparkline are those two 4-week averages. "short hist." marks campaigns with under 8 weeks of data, where the window is narrower. Click a campaign to unfold its full week-by-week stacked chart, where the green height traces the impression share itself and amber/coral show where reach was lost.</p>
{SCRIPT}
</body></html>'''
open(sys.argv[3], "w").write(html)
print("rows:", len(mon), "| order:", [m["label"] for m in mon])
