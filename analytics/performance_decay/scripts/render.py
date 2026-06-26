import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

A = json.load(open('data/analysis.json'))
wd = A['week_dates']; n = A['n']
x = np.arange(n)
MK = A.get('metric', 'clicks')   # metric key (clicks for GSC, sessions for GA4, ...)
COL = {"Crashing":"#b8002a", "Crashed":"#d83933", "Losing":"#e08e0b",
       "Winning":"#1a9e5c", "New":"#2a7de1",
       "Volatile":"#8a8a8a", "Healthy":"#9aa0a6"}

def short(url):
    u = url.replace('https://portermetrics.com','').replace('https://','')
    return u if len(u) <= 38 else u[:36]+'…'

def grid(items, gety, title, fname, ncol=4):
    nr = (len(items)+ncol-1)//ncol
    fig, axes = plt.subplots(nr, ncol, figsize=(ncol*3.1, nr*2.0))
    fig.patch.set_facecolor('white')
    axes = np.atleast_1d(axes).ravel()
    for ax, it in zip(axes, items):
        y = np.array(gety(it), float)
        c = COL.get(it['label'], '#666')
        ax.plot(x, y, color=c, lw=1.8)
        ax.fill_between(x, y, color=c, alpha=0.10)
        pk = int(np.argmax(y))
        ax.scatter([pk],[y[pk]], s=14, color=c, zorder=5)
        ax.set_title(f"{it.get('name', it.get('category'))}\n{it['label']} · slope {it['slope_pct']:+.1f}%/wk · off-peak {it['pct_off_peak']*100:.0f}%",
                     fontsize=7.5, loc='left')
        ax.set_ylim(0, max(y.max()*1.15, 1))
        ax.tick_params(labelsize=6); ax.set_xticks([0, n//2, n-1])
        ax.set_xticklabels([wd[0][5:], wd[n//2][5:], wd[-1][5:]], fontsize=6)
        for s in ('top','right'): ax.spines[s].set_visible(False)
    for ax in axes[len(items):]: ax.axis('off')
    fig.suptitle(title, fontsize=12, fontweight='bold', x=0.01, ha='left')
    fig.tight_layout(rect=[0,0,1,0.97])
    fig.savefig(f'charts/{fname}', dpi=110, bbox_inches='tight')
    plt.close(fig)
    print("wrote charts/"+fname)

# categories
cats = sorted(A['categories'], key=lambda c:-c['total'])
grid(cats, lambda c: c['series'][MK], "Categories — weekly organic clicks (6 months)", "categories.png")

# pages: rank decliners and gainers among meaningful pages (>=300 clicks)
PS = A['page_series']
pages = [p for p in A['pages'] if p['total'] >= 300]
for p in pages: p['name'] = short(p['page'])
decay = sorted([p for p in pages if p['label'] in ('Crashing','Crashed','Losing')],
               key=lambda p:(p['slope_pct']))[:12]
grow  = sorted([p for p in pages if p['label'] in ('Winning','New')],
               key=lambda p:-p['slope_pct'])[:12]
grid(decay, lambda p: PS[p['page']][MK], "Top LOSING / CRASHING / CRASHED pages (organic clicks, 6mo)", "pages_decay.png")
grid(grow,  lambda p: PS[p['page']][MK], "Top WINNING / NEW pages (organic clicks, 6mo)", "pages_grow.png")

# console rankings
def w(v): return f"{v*100:+.0f}%" if v is not None else "n/a"
print("\n===== TOP DECAYING PAGES =====")
for p in decay:
    print(f"{p['slope_pct']:+5.1f}%/wk off-peak {p['pct_off_peak']*100:>3.0f}% 13w {w(p['w13'])} | {p['total']:>6,.0f} | {short(p['page'])} [{p['label']}]")
print("\n===== TOP GROWING PAGES =====")
for p in grow:
    print(f"{p['slope_pct']:+5.1f}%/wk off-peak {p['pct_off_peak']*100:>3.0f}% 13w {w(p['w13'])} | {p['total']:>6,.0f} | {short(p['page'])} [{p['label']}]")

from collections import Counter
print("\nlabel distribution (pages >=50 clicks):", dict(Counter(p['label'] for p in A['pages'])))
