import json, sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

A = json.load(open('data/analysis.json'))
wd = A['week_dates']; n = A['n']; x = np.arange(n)
PS = A['page_series']
MK = A.get('metric', 'clicks')   # metric key (clicks for GSC, sessions for GA4, ...)
COL = {"Crashing":"#b8002a","Crashed":"#d83933","Losing":"#e08e0b",
       "Winning":"#1a9e5c","New":"#2a7de1","Volatile":"#8a8a8a","Healthy":"#9aa0a6"}

# only pages with meaningful traffic
pages = [p for p in A['pages'] if p['total'] >= 150]

def short(url):
    u = url.replace('https://portermetrics.com','').replace('https://','')
    return u if len(u) <= 40 else u[:38]+'…'

# suspicion sort per label: surface the most-likely-wrong first
def suspicion(label):
    if label == 'Losing':   return lambda p:-p['slope_pct']            # most positive slope = most suspect
    if label == 'Winning':  return lambda p: p['recent_slope_pct']     # falling recently = suspect
    if label == 'New':      return lambda p:-p['pct_off_peak']         # high off-peak = spiked&fell
    if label == 'Crashing': return lambda p: p.get('crashing_pct',0)   # mild drop = suspect
    if label == 'Crashed':  return lambda p:-(p['recent3']/max(p['mean'],1e-9))  # higher recent = suspect
    if label == 'Healthy':  return lambda p:-p['pct_off_peak']         # far off peak = suspect
    if label == 'Volatile':   return lambda p: p['cv']                   # low cv = suspect
    return lambda p: 0

def grid(items, title, fname, ncol=3):
    if not items:
        return 0
    items = items[:9]
    nr = (len(items)+ncol-1)//ncol
    fig, axes = plt.subplots(nr, ncol, figsize=(ncol*3.6, nr*2.4))
    fig.patch.set_facecolor('white')
    axes = np.atleast_1d(axes).ravel()
    for ax, p in zip(axes, items):
        y = np.array(PS[p['page']][MK], float)
        c = COL.get(p['label'], '#666')
        ax.plot(x, y, color=c, lw=1.8); ax.fill_between(x, y, color=c, alpha=0.10)
        pk = int(np.argmax(y)); ax.scatter([pk],[y[pk]], s=14, color=c, zorder=5)
        ax.set_title(f"{short(p['page'])}\nsp {p['slope_pct']:+.1f} · rec {p['recent_slope_pct']:+.0f} · off {p['pct_off_peak']*100:.0f}% · cv {p['cv']:.2f}",
                     fontsize=9, loc='left')
        ax.set_ylim(0, max(y.max()*1.15, 1)); ax.tick_params(labelsize=6)
        ax.set_xticks([0, n//2, n-1]); ax.set_xticklabels([wd[0][5:], wd[n//2][5:], wd[-1][5:]], fontsize=6)
        for s in ('top','right'): ax.spines[s].set_visible(False)
    for ax in axes[len(items):]: ax.axis('off')
    fig.suptitle(title, fontsize=12, fontweight='bold', x=0.01, ha='left')
    fig.tight_layout(rect=[0,0,1,0.96])
    fig.savefig(f'charts/qa_{fname}.png', dpi=145, bbox_inches='tight'); plt.close(fig)
    return len(items)

from collections import Counter
dist = Counter(p['label'] for p in pages)
order = ['Crashing','Crashed','Losing','Winning','New','Volatile','Healthy']
for lab in order:
    its = sorted([p for p in pages if p['label']==lab], key=suspicion(lab))
    k = grid(its, f"{lab}  (n={dist.get(lab,0)} of pages>=150 clicks) — most-suspect first", lab.lower())
    print(f"{lab:<9} total={dist.get(lab,0):>3}  shown(suspects)={k}")
