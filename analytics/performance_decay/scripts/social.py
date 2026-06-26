import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

A = json.load(open('data/analysis.json'))
n = A['n']; x = np.arange(n); PS = A['page_series']
MK = A.get('metric', 'clicks')

# semantic colors per label
COL = {"Crashing":"#e5484d","Crashed":"#b0144b","Losing":"#f2900d",
       "Winning":"#17a673","New":"#3a73e8","Volatile":"#8a8a8a","Healthy":"#9aa0a6"}
NICE = {"Winning":"Winning","New":"New / Emerging","Healthy":"Healthy",
        "Volatile":"Volatile","Losing":"Losing","Crashing":"Crashing","Crashed":"Crashed"}

from collections import Counter
dist = Counter(p['label'] for p in A['pages'])

# narrative selection: representative pages per label (biggest first), anonymized
PLAN = [("Winning",2),("New",2),("Healthy",1),("Volatile",1),("Losing",3),("Crashing",1),("Crashed",2)]
picked = []
for lab, k in PLAN:
    cand = sorted([p for p in A['pages'] if p['label']==lab], key=lambda p:-p['total'])[:k]
    picked.extend(cand)

rows, cols = 3, 4
fig = plt.figure(figsize=(12, 12.2)); fig.patch.set_facecolor('#ffffff')
gs = fig.add_gridspec(rows+1, cols, height_ratios=[1.15]+[1]*rows,
                      hspace=0.85, wspace=0.28, left=0.05, right=0.95, top=0.95, bottom=0.06)

# ---- header band: title + categorized summary chips ----
hd = fig.add_subplot(gs[0, :]); hd.axis('off'); hd.set_xlim(0,1); hd.set_ylim(0,1)
hd.text(0, 0.86, "Content Decay Analysis", fontsize=30, fontweight='bold', color='#1a1733', va='top')
hd.text(0, 0.60, "Every page auto-classified by how its traffic is trending — losing, gaining, or crashing.",
        fontsize=13.5, color='#6b6880', va='top')

order = ["Winning","New","Healthy","Volatile","Losing","Crashing","Crashed"]
SHORT = {"Winning":"Winning","New":"New","Healthy":"Healthy","Volatile":"Volatile",
         "Losing":"Losing","Crashing":"Crashing","Crashed":"Crashed"}
for j, lab in enumerate(order):
    c = COL[lab]; cnt = dist.get(lab, 0)
    sx = j / len(order)                      # evenly spaced slots
    hd.scatter([sx+0.006], [0.18], s=120, color=c, zorder=5, transform=hd.transAxes)
    hd.text(sx+0.024, 0.18, f"{SHORT[lab]} {cnt}", fontsize=11.5, color='#1a1733',
            va='center', fontweight='medium')

# ---- page cards (anonymized) ----
axes = []
for r in range(rows):
    for cc in range(cols):
        axes.append(fig.add_subplot(gs[r+1, cc]))

for i, (ax, p) in enumerate(zip(axes, picked), start=1):
    y = np.array(PS[p['page']][MK], float)
    c = COL[p['label']]
    ax.plot(x, y, color=c, lw=2.6, solid_capstyle='round')
    ax.fill_between(x, y, color=c, alpha=0.12)
    pk = int(np.argmax(y)); ax.scatter([pk],[y[pk]], s=26, color=c, zorder=6, edgecolor='white', linewidth=1.2)
    ax.set_ylim(0, max(y.max()*1.18, 1)); ax.set_xlim(0, n-1)
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values(): s.set_visible(False)
    # badge on top, page name below it (clearly separated)
    ax.text(0, 1.30, NICE[p['label']].upper(), transform=ax.transAxes,
            fontsize=10, color=c, fontweight='bold', va='bottom')
    ax.text(0, 1.06, f"Page {i}", transform=ax.transAxes,
            fontsize=15, color='#1a1733', fontweight='bold', va='bottom')

for ax in axes[len(picked):]:
    ax.axis('off')

fig.text(0.05, 0.025, "Method: weekly trend + peak + volatility, read like the eye does.  ·  Built as a Claude skill.",
         fontsize=10.5, color='#9aa0a6')
fig.savefig('charts/social_decay.png', dpi=150, bbox_inches='tight', facecolor='#ffffff')
print("wrote charts/social_decay.png   pages shown:", len(picked))
print("distribution:", dict(dist))
