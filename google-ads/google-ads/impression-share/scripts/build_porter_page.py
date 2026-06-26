#!/usr/bin/env python3
"""Acme Insurance impression-share monitor rendered in the Porter Metrics design system (standalone HTML)."""
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

# Porter palette
GOT, RANK, BUD = "#2DD4BF", "#6701e6", "#EC4899"   # got=aqua, rank=purple, budget=pink
DARK, INK, MUTED, LINE = "#1a0340", "#0a0a0a", "#6b7280", "#ece9f2"
UP, DOWN = "#0d9488", "#be185d"
DRVC = {"rank": RANK, "budget": BUD, "mixed": MUTED}

rows = load_rows(json.load(open(sys.argv[1])))
by = defaultdict(list)
for r in rows:
    if r.get(F_CAMP) not in WANT:
        continue
    is_ = float(r.get(F_IS) or 0); rk = float(r.get(F_RANK) or 0); bg = float(r.get(F_BUDGET) or 0)
    if is_ == 0 and rk == 0 and bg == 0:
        continue
    by[r.get(F_CAMP)].append({"date": str(r.get(F_DATE)), "is": is_, "rank": rk, "budget": bg, "impr": float(r.get(F_IMPR) or 0)})

ad = sorted({d["date"] for v in by.values() for d in v}); dmin, dmax = to_date(ad[0]), to_date(ad[-1])
mon = []
for name, lab, spend in CAMPS:
    wk = weekly_series(sorted(by.get(name, []), key=lambda r: r["date"]), dmin, dmax)
    if len(wk) < 2:
        continue
    got = [round(w["is"] * 100, 1) for w in wk]
    rank = [round(w["rank"] * 100, 1) for w in wk]
    budget = [round(w["budget"] * 100, 1) for w in wk]
    weeks = [w["week"][-3:] for w in wk]
    l3 = wk[-3:]; im = sum(w["impr"] for w in l3) or 1
    gw = sum(w["is"] * w["impr"] for w in l3) / im * 100
    rw = sum(w["rank"] * w["impr"] for w in l3) / im * 100
    bw = sum(w["budget"] * w["impr"] for w in l3) / im * 100
    drv = "rank" if rw - bw > 5 else ("budget" if bw - rw > 5 else "mixed")
    n = len(wk); win = 4 if n >= 8 else max(1, n // 2)
    ri = sum(x["is"] * x["impr"] for x in wk[-win:]) / (sum(x["impr"] for x in wk[-win:]) or 1) * 100
    pi = sum(x["is"] * x["impr"] for x in wk[-2 * win:-win]) / (sum(x["impr"] for x in wk[-2 * win:-win]) or 1) * 100
    mon.append({"label": lab, "spend": spend, "weeks": weeks, "got": got, "rank": rank, "budget": budget,
                "prior": round(pi, 1), "recent": round(ri, 1), "short": n < 8,
                "gw": round(gw, 1), "rw": round(rw, 1), "bw": round(bw, 1), "driver": drv})

mon.sort(key=lambda m: -m["spend"])
CNT = Counter(m["driver"] for m in mon)
DATA = json.dumps([{"label": m["label"], "weeks": m["weeks"], "got": m["got"], "rank": m["rank"], "budget": m["budget"]} for m in mon])


def spark(got):
    w, h, pad = 150, 34, 4
    lo, hi = min(got), max(got); rng = (hi - lo) or 1; n = len(got)
    pts = " ".join(f"{pad+(w-2*pad)*(i/(n-1) if n>1 else 0):.1f},{pad+(h-2*pad)*(1-(v-lo)/rng):.1f}" for i, v in enumerate(got))
    lx, ly = pts.split()[-1].split(",")
    return (f'<svg width="{w}" height="{h}" style="overflow:visible"><polyline fill="none" stroke="{RANK}" stroke-width="2" points="{pts}"/>'
            f'<circle cx="{lx}" cy="{ly}" r="3" fill="{DARK}"/></svg>')


def whybar(m):
    tot = (m["gw"] + m["rw"] + m["bw"]) or 1
    seg = lambda v, c: f'<span style="display:inline-block;height:11px;width:{v/tot*100:.1f}%;background:{c}"></span>'
    return f'<span style="display:inline-flex;width:100%;overflow:hidden">{seg(m["gw"],GOT)}{seg(m["rw"],RANK)}{seg(m["bw"],BUD)}</span>'


GRID = "grid-template-columns:20px 192px 150px 80px 150px;gap:14px"


def row(m, i):
    d = m["recent"] - m["prior"]
    arrow = "▲" if d > 1 else ("▼" if d < -1 else "—")
    dcol = UP if d > 1 else (DOWN if d < -1 else MUTED)
    sval = f"${m['spend']/1000:.1f}k" if m["spend"] >= 1000 else f"${m['spend']}"
    short = '<div class="sh">short history</div>' if m["short"] else ''
    return (f'<div class="mrow" data-drv="{m["driver"]}">'
            f'<div class="rh" onclick="tg({i})">'
            f'<span id="cv{i}" class="chev">▸</span>'
            f'<div><div class="cn">{m["label"]}</div><div class="num sp">{sval}</div></div>'
            f'<div>{spark(m["got"])}<div class="num sub">{round(m["prior"])}% → {round(m["recent"])}%</div></div>'
            f'<div><div class="num d" style="color:{dcol}">{arrow} {abs(round(d))} pts</div>{short}</div>'
            f'<div>{whybar(m)}<div class="sub">limited by <b style="color:{DRVC[m["driver"]]}">{m["driver"]}</b></div></div>'
            f'</div>'
            f'<div id="dt{i}" class="detail"><div class="sub" style="margin:0 0 8px">Weekly breakdown — the aqua height is the impression share itself; purple/pink show where reach was lost</div>'
            f'<div class="cwrap"><canvas id="cn{i}" role="img" aria-label="Weekly composition for {m["label"]}"></canvas></div></div>')


def chip(f, label, dot=None):
    d = f'<span class="dot" style="background:{dot}"></span>' if dot else ''
    return f'<button class="chip" data-f="{f}" onclick="flt(\'{f}\')">{d}{label}</button>'


chips = (chip("all", f"All ({len(mon)})") + chip("rank", f"Rank ({CNT.get('rank',0)})", RANK)
         + chip("budget", f"Budget ({CNT.get('budget',0)})", BUD)
         + (chip("mixed", f"Mixed ({CNT['mixed']})", MUTED) if CNT.get("mixed") else ""))

legend = (f'<span class="lg"><span class="sw" style="background:{GOT}"></span>got</span>'
          f'<span class="lg"><span class="sw" style="background:{RANK}"></span>rank (auction)</span>'
          f'<span class="lg"><span class="sw" style="background:{BUD}"></span>budget (money)</span>')

html = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Acme Insurance — Impression Share · Porter Metrics</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
 *{{box-sizing:border-box;margin:0;padding:0}}
 :root{{--p:{RANK};--dark:{DARK};--ink:{INK};--muted:{MUTED};--line:{LINE};--aqua:{GOT};--pink:{BUD};--yellow:#fbbf24}}
 body{{font-family:'Inter',-apple-system,sans-serif;color:var(--ink);background:#fff;-webkit-font-smoothing:antialiased;font-feature-settings:"ss01" 1}}
 .mono{{font-family:'IBM Plex Mono',monospace}} .num{{font-family:'IBM Plex Mono',monospace}}
 /* hero */
 .hero{{background:var(--dark);color:#fff;padding:64px 40px 56px}}
 .hero-in{{max-width:880px;margin:0 auto}}
 .brand{{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--aqua);margin-bottom:32px}}
 .eyebrow{{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#c4b5fd;margin-bottom:18px}}
 .hero h1{{font-size:clamp(40px,6vw,76px);font-weight:800;line-height:0.95;letter-spacing:-2.5px}}
 .hero h1 b{{font-weight:900;color:var(--yellow)}}
 .meta{{font-family:'IBM Plex Mono',monospace;font-size:14px;color:#c4b5fd;margin-top:26px;letter-spacing:-0.2px}}
 /* body */
 .wrap{{max-width:880px;margin:0 auto;padding:48px 40px 72px}}
 .sec-eyebrow{{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--p);margin-bottom:14px}}
 h2{{font-size:clamp(28px,3.6vw,40px);font-weight:800;line-height:1.0;letter-spacing:-1.5px;margin-bottom:14px}}
 .lead{{font-size:18px;font-weight:500;line-height:1.5;color:#3a3a44;max-width:680px;margin-bottom:30px}}
 .controls{{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin:0 0 18px}}
 .chips{{display:flex;gap:8px;flex-wrap:wrap}}
 .chip{{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:500;padding:6px 13px;border-radius:999px;border:1.5px solid var(--line);background:#fff;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:6px;letter-spacing:0.3px}}
 .chip.on{{border-color:var(--dark);background:var(--dark);color:#fff}}
 .dot{{width:8px;height:8px;border-radius:2px;display:inline-block}}
 .legend{{display:flex;gap:16px;font-size:12px;color:var(--muted);font-weight:500;flex-wrap:wrap;margin-left:auto}}
 .lg{{display:flex;align-items:center;gap:6px}} .sw{{width:11px;height:11px;border-radius:2px}}
 .colhead{{display:grid;{GRID};font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);padding:0 0 6px}}
 .mrow{{border-top:1px solid var(--line)}}
 .rh{{display:grid;{GRID};align-items:center;padding:14px 0;cursor:pointer}}
 .chev{{color:var(--muted);font-size:11px}}
 .cn{{font-weight:600;font-size:15px}} .sp{{font-size:13px;color:var(--muted);margin-top:3px}}
 .num.sub{{font-size:11.5px;color:var(--muted);margin-top:2px}} .sub{{font-size:11.5px;color:var(--muted)}}
 .d{{font-size:14px;font-weight:600}} .sh{{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);margin-top:2px}}
 .detail{{display:none;padding:4px 0 20px 34px}} .cwrap{{position:relative;width:100%;max-width:580px;height:210px}}
 .foot{{font-size:13.5px;color:var(--muted);line-height:1.6;margin-top:26px;border-top:1px solid var(--line);padding-top:18px}}
 .foot b{{color:var(--ink);font-weight:600}}
</style></head><body>
<div class="wrap">
 <div class="controls"><div class="chips">{chips}</div><div class="legend">{legend}</div></div>
 <div class="colhead"><span></span><span>Campaign · 90d spend</span><span>IS over time</span><span>change · 4w</span><span>where reach is lost</span></div>
 {''.join(row(m, i) for i, m in enumerate(mon))}
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
const D={DATA};const CH={{}};
function tg(i){{var dt=document.getElementById("dt"+i),op=dt.style.display==="block";dt.style.display=op?"none":"block";document.getElementById("cv"+i).textContent=op?"▸":"▾";
 if(!op&&!CH[i]){{var c=D[i];CH[i]=new Chart(document.getElementById("cn"+i),{{type:"bar",data:{{labels:c.weeks,datasets:[
  {{label:"got",data:c.got,backgroundColor:"{GOT}"}},{{label:"rank",data:c.rank,backgroundColor:"{RANK}"}},{{label:"budget",data:c.budget,backgroundColor:"{BUD}"}}]}},
  options:{{responsive:true,maintainAspectRatio:false,plugins:{{legend:{{display:false}},tooltip:{{callbacks:{{label:function(x){{return x.dataset.label+": "+Math.round(x.parsed.y)+"%"}}}}}}}},
  scales:{{x:{{stacked:true,grid:{{display:false}},ticks:{{color:"{MUTED}",font:{{family:"IBM Plex Mono"}}}}}},y:{{stacked:true,min:0,max:100,grid:{{color:"{LINE}"}},ticks:{{color:"{MUTED}",font:{{family:"IBM Plex Mono"}},callback:function(v){{return v+"%"}}}}}}}}}}}});}}}}
function flt(f){{document.querySelectorAll(".mrow").forEach(function(r){{r.style.display=(f==="all"||r.dataset.drv===f)?"":"none"}});
 document.querySelectorAll(".chip").forEach(function(c){{c.classList.toggle("on",c.dataset.f===f)}});}}
flt("all");
</script></body></html>'''

open(sys.argv[2], "w").write(html)
print("wrote", sys.argv[2], "|", len(html), "bytes | rows:", len(mon))
