"""
top.py — absolute-impact layer for performance_decay.

The % classification can over-weight tiny pages (a page going 20 -> 10 is -50%
but barely matters). This layer ranks by ABSOLUTE volume and ABSOLUTE change —
the pages that actually move the needle. Read it ALONGSIDE the hierarchy and the
labels: % tells you the shape, absolute tells you the size of the bet.

Δ/wk = (avg of last 3 weeks) − (avg of first 3 weeks), on the smoothed series:
how many clicks/sessions PER WEEK this entity now gains or loses vs the start.
"""
import json, os
import numpy as np
from decay_core import smooth

A = json.load(open('data/analysis.json'))
n = A['n']; MK = A['metric']; PS = A['page_series']
lab = {p['page']: p['label'] for p in A['pages']}
cat = {p['page']: p.get('category', '') for p in A['pages']}
TOPN = int(os.environ.get("CD_TOPN", "20"))

def short(u): return u.replace('https://portermetrics.com', '').replace('https://', '')

rows = []
for p, ser in PS.items():
    y = np.asarray(ser[MK], float); ys = smooth(y)
    base = float(ys[:max(1, n // 3)].mean())
    recent = float(ys[-3:].mean())
    rows.append(dict(page=p, total=float(y.sum()), label=lab.get(p, ''),
                     cat=cat.get(p, ''), dwk=recent - base,
                     pct=(recent / base - 1) * 100 if base > 1e-9 else float('inf')))

out = []
def line(r):
    pc = f"{r['pct']:+.0f}%" if r['pct'] != float('inf') else "new"
    return (f"  {r['total']:>9,.0f}  Δ/sem {r['dwk']:+7.1f}  {pc:>6}  "
            f"{r['label']:<9} {short(r['page'])[:54]}")

out.append(f"ABSOLUTE-IMPACT LAYER · metric={MK} · {n} semanas\n" + "="*92)
out.append(f"\n■ TOP {TOPN} POR VOLUMEN (las que más pesan hoy)")
out.append(f"  {'total':>9}  {'Δ/sem':>12}  {'%':>6}  estado / página")
for r in sorted(rows, key=lambda r:-r['total'])[:TOPN]:
    out.append(line(r))

out.append(f"\n▲ TOP {TOPN} GANADORAS EN ABSOLUTO (más clics/sem ganados)")
for r in sorted(rows, key=lambda r:-r['dwk'])[:TOPN]:
    out.append(line(r))

out.append(f"\n▼ TOP {TOPN} PERDEDORAS EN ABSOLUTO (más clics/sem perdidos — prioridad)")
for r in sorted(rows, key=lambda r: r['dwk'])[:TOPN]:
    out.append(line(r))

# how concentrated is traffic — the 80/20 reality
tot = sum(r['total'] for r in rows)
cum = 0; k = 0
for r in sorted(rows, key=lambda r:-r['total']):
    cum += r['total']; k += 1
    if cum >= 0.8 * tot: break
out.append(f"\nConcentración: {k} páginas ({k/len(rows)*100:.0f}% del total) = 80% del tráfico.")

report = "\n".join(out)
print(report)
open('data/top_impact.txt', 'w').write(report)
