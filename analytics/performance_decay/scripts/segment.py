"""
segment.py — hierarchical, top-down drill-down for performance_decay.

Instead of a flat list of N pages going up/down, roll the SAME trend
classification up a tree and read it level by level, drilling only where the
signal is. Default tree: Language -> Content category -> Topic/platform.

  Level 1  Language        EN stable · ES up · PT down  -> where to look
  Level 2  Content type    within that language, which categories move
  Level 3  Topic/platform  exactly which content explains it

Reads data/analysis.json (produced by analyze.py) and re-runs the validated
signals+classify on each aggregated node, so a category's label means the same
thing as a page's label.
"""
import json, os, re
import numpy as np
from decay_core import signals, classify

A = json.load(open('data/analysis.json'))
n = A['n']; weeks = A['week_dates']; MK = A['metric']
PS = A['page_series']
cmv = A.get('crash_min_volume', 5.0)

# hierarchy detectors (pluggable, default generic)
def strip_url(u): return re.sub(r'^https?://', '', str(u).lower()).split('?')[0]
try:
    import categories_porter as CP
    LANG_RULES = getattr(CP, 'LANG_RULES', None); LANG_DEFAULT = getattr(CP, 'LANG_DEFAULT', 'All')
    TOPIC_RULES = getattr(CP, 'TOPIC_RULES', None); TOPIC_DEFAULT = getattr(CP, 'TOPIC_DEFAULT', 'General')
except Exception:
    LANG_RULES = TOPIC_RULES = None; LANG_DEFAULT = 'All'; TOPIC_DEFAULT = 'General'

def match(url, rules, default):
    if not rules: return default
    u = strip_url(url)
    for label, subs in rules:
        if any(s in u for s in subs): return label
    return default

def lang_of(p):  return match(p, LANG_RULES, LANG_DEFAULT)
def topic_of(p): return match(p, TOPIC_RULES, TOPIC_DEFAULT)
def cat_of(p):   return pcat.get(p, 'Other')

pcat = {pg['page']: pg.get('category', 'Other') for pg in A['pages']}
PAGES = [pg['page'] for pg in A['pages']]

# the hierarchy: ordered list of (level name, key function)
LEVELS = [("Language", lang_of), ("Category", cat_of), ("Topic", topic_of)]
FOCUS = os.environ.get("CD_FOCUS")          # e.g. CD_FOCUS=ES expands only that L1
ACTIONABLE = {"Losing", "Winning", "Crashing", "Crashed", "New"}

def node_series(pages):
    y = np.zeros(n)
    for p in pages: y += np.asarray(PS[p][MK], float)
    return y

def node_stats(pages):
    s = signals(node_series(pages), n, weeks)
    return s, classify(s, cmv)

def arrow(label):
    return {"Winning":"▲","New":"✦","Losing":"▼","Crashing":"▼▼","Crashed":"✖",
            "Volatile":"≈","Healthy":"·"}.get(label,"·")

def fmt(name, pages, indent):
    s, lab = node_stats(pages)
    vb = s['vs_base']; vbtxt = f"{(vb-1)*100:+.0f}% vs inicio" if vb < 9 else "nuevo"
    pad = "  " * indent
    return (f"{pad}{arrow(lab)} {name:<26} {s['total']:>9,.0f}  "
            f"slope {s['slope_pct']:+5.1f}%/sem  {vbtxt:>14}  -> {lab}"), lab

out = []
root_pages = PAGES
rs, rlab = node_stats(root_pages)
out.append(f"SITIO COMPLETO  {rs['total']:,.0f} {MK}  slope {rs['slope_pct']:+.1f}%/sem  -> {rlab}")
out.append("="*92)

# Level 1
by_l1 = {}
for p in PAGES: by_l1.setdefault(lang_of(p), []).append(p)
for l1 in sorted(by_l1, key=lambda k:-node_series(by_l1[k]).sum()):
    if FOCUS and l1 != FOCUS:
        line,_ = fmt(f"[{l1}]", by_l1[l1], 0); out.append(line + "   (usa CD_FOCUS para expandir)")
        continue
    line, _ = fmt(f"[{l1}]", by_l1[l1], 0); out.append(""); out.append(line)
    # Level 2
    by_l2 = {}
    for p in by_l1[l1]: by_l2.setdefault(cat_of(p), []).append(p)
    for l2 in sorted(by_l2, key=lambda k:-node_series(by_l2[k]).sum()):
        line2, lab2 = fmt(l2, by_l2[l2], 1); out.append(line2)
        # Level 3 — only drill where the category is actually moving
        s2,_ = node_stats(by_l2[l2])
        if lab2 in ACTIONABLE or abs(s2['slope_pct']) >= 1.5:
            by_l3 = {}
            for p in by_l2[l2]: by_l3.setdefault(topic_of(p), []).append(p)
            ranked = sorted(by_l3, key=lambda k:-node_series(by_l3[k]).sum())
            for l3 in ranked[:6]:
                if node_series(by_l3[l3]).sum() < rs['total']*0.0008: continue
                line3,_ = fmt(l3, by_l3[l3], 2); out.append(line3)

report = "\n".join(out)
print(report)
open('data/segmentation.txt','w').write(report)
