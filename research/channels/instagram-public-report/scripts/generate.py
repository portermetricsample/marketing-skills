#!/usr/bin/env python3
"""
Instagram Public Report — generator.

Account-agnostic. Reads an audit.json (assembled by Claude from Porter MCP
instagram-public-data pulls) and emits a self-contained report:
  - report.html      (standalone, for local preview / Claude artifact)
  - report_data.ts   (BRAND + REPORT_HTML, to drop into the Porter report template)

All thumbnails + avatar are downloaded, resized (sips) and embedded as data URIs
so the report never depends on Instagram's expiring signed URLs. Every number is
DERIVED here from the raw posts — the narrative lines are templated, never typed
per brand, so prose can't contradict the charts.

Usage:
  python3 generate.py <audit.json> [out_dir]

Requires: macOS `sips` (resize) + `curl` (download) + network (run with the
sandbox OFF). Fonts are read from ../assets/fonts.
"""
import json, base64, html, os, re, sys, subprocess
from datetime import datetime
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "..", "assets", "fonts")

def load_font(name):
    return base64.b64encode(open(os.path.join(FONTS, name), "rb").read()).decode()

def dl_embed(url, tmp, px=600, q=58):
    """Download an image, resize longest side to px, return data URI or ''. """
    if not url:
        return ""
    raw, small = tmp + ".raw", tmp + ".s.jpg"
    try:
        subprocess.run(["curl", "-sS", "--compressed", "-A", "Mozilla/5.0", "-o", raw, url],
                       check=False, timeout=40)
        if not os.path.exists(raw) or os.path.getsize(raw) < 500:
            return ""
        subprocess.run(["sips", "-Z", str(px), "-s", "format", "jpeg", "-s", "formatOptions", str(q),
                        raw, "--out", small], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
        if not os.path.exists(small):
            return ""
        return "data:image/jpeg;base64," + base64.b64encode(open(small, "rb").read()).decode()
    except Exception:
        return ""

def fnum(n): return f"{int(round(n)):,}"
def compact(n):
    n = float(n)
    if n >= 1_000_000: return f"{n/1_000_000:.2f}M".replace('.00', '')
    if n >= 1_000: return f"{n/1000:.1f}K".replace('.0', '')
    return str(int(round(n)))

DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
BLOCKS = ['00–03','03–06','06–09','09–12','12–15','15–18','18–21','21–24']
MONTHS_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

def parse_ts(ts): return datetime.strptime(ts[:19], '%Y-%m-%dT%H:%M:%S')
def label_from_ts(ts, typ):
    d = parse_ts(ts)
    return f"{typ} · {MONTHS_ABBR[d.month-1]} {d.day}"

def main():
    audit_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(audit_path))
    os.makedirs(out_dir, exist_ok=True)
    tmp_dir = os.path.join(out_dir, "_imgs"); os.makedirs(tmp_dir, exist_ok=True)
    A = json.load(open(audit_path))

    brand = A["brand"]; handle = A.get("handle", brand)
    prof = A["profile"]; posts = A["posts"]; recent = A["recent"]; creators = A.get("creators", [])
    win = A.get("windows", {}); collab = A.get("collab", {})
    generated = A.get("generated", "")

    fonts = {"b7": load_font("bricolage-grotesque-700.woff2"), "b8": load_font("bricolage-grotesque-800.woff2"),
             "h4": load_font("hanken-grotesk-400.woff2"), "h6": load_font("hanken-grotesk-600.woff2"),
             "m5": load_font("ibm-plex-mono-500.woff2")}

    # ---------- images ----------
    avatar = dl_embed(prof.get("avatar_url", ""), os.path.join(tmp_dir, "avatar"), px=220, q=72)
    for p in recent:
        p["_img"] = dl_embed(p.get("img_url", ""), os.path.join(tmp_dir, p["code"]))

    # ---------- engagement stats (posts that carry likes; else all) ----------
    eng = [p for p in posts if p.get("likes") is not None]
    if not eng: eng = posts
    eng_sorted = sorted(eng, key=lambda p: p.get("likes", 0), reverse=True)
    likes = [p.get("likes", 0) for p in eng]
    comments = [p.get("comments", 0) for p in eng]
    total_l, total_c = sum(likes), sum(comments)
    slk = sorted(likes)
    n = len(slk)
    median = (slk[n//2] if n % 2 else (slk[n//2 - 1] + slk[n//2]) / 2) if n else 0
    mean = total_l / n if n else 0
    conv = (total_c / total_l * 100) if total_l else 0
    K_VIRAL = 3 if n >= 12 else 1
    top_likes = sum(likes_ for likes_ in slk[-K_VIRAL:])
    viral_pct = round(top_likes / total_l * 100) if total_l else 0

    # format mix (over eng set)
    fmt = OrderedDict()
    for p in eng:
        t = p["type"]
        t = "Reels" if t in ("Reel", "Video") else t
        fmt[t] = fmt.get(t, 0) + 1
    fmt_items = sorted(fmt.items(), key=lambda kv: -kv[1])
    # by-format typical (median) + best likes
    def med(xs): xs = sorted(xs); m = len(xs); return (xs[m//2] if m % 2 else (xs[m//2-1]+xs[m//2])/2) if m else 0
    fmt_likes = {}
    for p in eng:
        t = "Reels" if p["type"] in ("Reel", "Video") else p["type"]
        fmt_likes.setdefault(t, []).append(p.get("likes", 0))

    # ---------- frequency (all posts) ----------
    dts = [(parse_ts(p["ts"]), p["type"]) for p in posts]
    months = OrderedDict()
    dmin, dmax = min(d for d, _ in dts), max(d for d, _ in dts)
    y, m = dmin.year, dmin.month
    while (y, m) <= (dmax.year, dmax.month):
        months[f"{y:04d}-{m:02d}"] = 0
        m += 1
        if m > 12: m = 1; y += 1
    for d, _ in dts: months[f"{d.year:04d}-{d.month:02d}"] += 1
    grid = [[0]*8 for _ in range(7)]
    for d, _ in dts: grid[d.weekday()][d.hour//3] += 1
    gmax = max(max(r) for r in grid) or 1
    wtot = {dd: 0 for dd in DAYS}
    for d, _ in dts: wtot[DAYS[d.weekday()]] += 1
    block_tot = [sum(grid[i][j] for i in range(7)) for j in range(8)]
    hot_j = max(range(8), key=lambda j: block_tot[j])
    hot_block, hot_n = BLOCKS[hot_j], block_tot[hot_j]
    top_days = sorted(wtot, key=lambda k: -wtot[k])[:2]
    busiest = max(months, key=lambda k: months[k]); quiet = min(months, key=lambda k: months[k])

    # ---------- carousel depth ----------
    slides = [p.get("slides", 0) for p in recent if p.get("slides", 0) > 1]
    car_avg = sum(slides)/len(slides) if slides else 0
    car_rng = f"{min(slides)}–{max(slides)}" if slides else "—"

    # ================= HTML pieces =================
    PLAY = '<span class="play"><svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="12" fill="rgba(0,0,0,.55)"/><path d="M9 7.5v9l7-4.5z" fill="#fff"/></svg></span>'
    bcls = {"Carousel": "c", "Reel": "r", "Image": "i", "Video": "r"}
    cards = []
    for p in recent:
        play = PLAY if p.get("is_video") else ""
        slide = f'<span class="slidechip">▤ {p["slides"]}</span>' if p.get("slides", 0) > 1 else ''
        cr = p.get("creators", [])
        if cr:
            links = " ".join(f'<a href="https://www.instagram.com/{h}/" target="_blank" rel="noopener">@{h}</a>' for h in cr)
            crl = f'<div class="pcreator">🤝 {links}</div>'
        else:
            crl = '<div class="pcreator none">no creator tagged</div>'
        kind = 'reel' if p.get("is_video") else 'p'
        cards.append(f'''<article class="pcard">
  <div class="pimg"><img src="{p["_img"]}" loading="lazy" alt="">{play}<span class="tbadge {bcls.get(p["type"],"c")}">{p["type"]}</span>{slide}</div>
  <div class="pbody">
    <p class="pcap">{html.escape(p["caption"])}</p>
    {crl}
    <div class="pmeta"><span>{p["date"]}</span></div>
    <div class="pstats"><span title="Likes">♥ {fnum(p["likes"])}</span><span title="Comments">💬 {fnum(p["comments"])}</span></div>
    <a class="popen" href="https://www.instagram.com/{kind}/{p["code"]}/" target="_blank" rel="noopener">View on Instagram ↗</a>
  </div>
</article>''')
    carousel = "\n".join(cards)

    # monthly bars
    mmax = max(months.values()) or 1
    seen_year = set()
    mcols = []
    for k, v in months.items():
        yy, mm = k.split("-"); lab = MONTHS_ABBR[int(mm)-1]
        if mm == "01" or yy not in seen_year:
            lab += "’" + yy[2:]
            seen_year.add(yy)
        h = int(6 + 150*v/mmax) if v > 0 else 3
        mcols.append(f'<div class="mcol" title="{lab}: {v} posts"><span class="mcount">{v}</span><span class="mbar{ " zero" if v==0 else ""}" style="height:{h}px"></span><span class="mlab">{lab}</span></div>')
    monthcols = "".join(mcols)

    # heatmap
    hm = ['<div class="hm-corner"></div>'] + [f'<div class="hm-h">{b}</div>' for b in BLOCKS]
    for i, day in enumerate(DAYS):
        hm.append(f'<div class="hm-d">{day}</div>')
        for j in range(8):
            c = grid[i][j]
            st = f'background:rgba(214,41,118,{0.10+0.90*(c/gmax):.2f})' if c > 0 else ''
            hm.append(f'<div class="hm-c" style="{st}" title="{day} {BLOCKS[j]} UTC — {c}">{c if c>0 else ""}</div>')
    heatmap = "".join(hm)
    wmax = max(wtot.values()) or 1
    wkbars = "".join(f'<div class="wkrow"><span class="wkd">{d}</span><span class="wktrack"><span class="wkfill{ " hot" if d in top_days else ""}" style="width:{100*wtot[d]/wmax:.0f}%"></span></span><span class="wkv">{wtot[d]}</span></div>' for d in DAYS)

    # format donut (top 3) + table
    total_fmt = sum(v for _, v in fmt_items) or 1
    palette = ["#4f5bd5", "#d62976", "#fa7e1e", "#feda75"]
    donut = []
    off = 25
    for idx, (t, v) in enumerate(fmt_items[:4]):
        pct = 100*v/total_fmt
        donut.append(f'<circle cx="21" cy="21" r="15.9" fill="none" stroke="{palette[idx%4]}" stroke-width="6" stroke-dasharray="{pct:.1f} {100-pct:.1f}" stroke-dashoffset="{off:.1f}"/>')
        off -= pct
    donut_svg = "".join(donut)
    legend = "".join(f'<div><span class="sw" style="background:{palette[idx%4]}"></span> {t} — <b>{v} · {round(100*v/total_fmt)}%</b></div>' for idx, (t, v) in enumerate(fmt_items[:4]))
    frows = "".join(f'<tr><td><span class="pill {bcls.get(t.rstrip("s"),"c")}">{t}</span></td><td class="n">~{compact(med(fmt_likes[t]))}</td><td class="n">{compact(max(fmt_likes[t]))}</td></tr>' for t, _ in fmt_items[:4])

    # viral bars (top K)
    vir = eng_sorted[:K_VIRAL]
    vmax = vir[0].get("likes", 1) or 1
    virbars = "".join(f'<div class="bar"><span class="nm">{label_from_ts(p["ts"],("Reels" if p["type"] in ("Reel","Video") else p["type"]))}</span><span class="trk"><span class="fl v" style="width:{100*p.get("likes",0)/vmax:.0f}%"></span></span><span class="vn">{compact(p.get("likes",0))}</span></div>' for p in vir)

    # top posts table (top 8) — note from a recent post with matching likes, else viral tag
    recent_by_likes = {p["likes"]: p["caption"] for p in recent}
    trows = []
    for i, p in enumerate(eng_sorted[:8]):
        t = "Reels" if p["type"] in ("Reel", "Video") else p["type"]
        d = parse_ts(p["ts"])
        note = "Viral" if i < K_VIRAL else "—"
        if p.get("likes") in recent_by_likes:
            cap = recent_by_likes[p["likes"]]
            note = (cap[:34] + "…") if len(cap) > 34 else cap
        trows.append(f'<tr><td>{MONTHS_ABBR[d.month-1]} {d.day}</td><td><span class="pill {bcls.get(t.rstrip("s"),"c")}">{t}</span></td><td>{html.escape(note)}</td><td class="n">{fnum(p.get("likes",0))}</td><td class="n">{fnum(p.get("comments",0))}</td></tr>')
    toptable = "".join(trows)

    # creators
    cmax = max((c["likes"] for c in creators), default=1) or 1
    crows = "".join(f'<div class="crow"><span class="crank">{i}</span><a class="chandle" href="https://www.instagram.com/{c["handle"]}/" target="_blank" rel="noopener">@{c["handle"]}</a><span class="ctype">{c["type"]}</span><span class="cbartrack"><span class="cbar" style="width:{100*c["likes"]/cmax:.0f}%"></span></span><span class="cposts">{c["posts"]}×</span><span class="clikes">{compact(c["likes"])}</span></div>' for i, c in enumerate(creators, 1))
    tagged = collab.get("tagged_posts", 0); tot_cp = collab.get("total_posts", win.get("creator_posts_n", len(recent)))
    uniq = collab.get("unique_handles", len(creators)); hashtag = collab.get("hashtag", ""); htpct = collab.get("hashtag_pct", 0)
    collab_rate = round(100*tagged/tot_cp) if tot_cp else 0
    top_creator = creators[0]["handle"] if creators else ""

    # templated narrative bits
    eng_n = win.get("eng_n", len(eng)); freq_n = win.get("freq_n", len(posts)); vis_n = win.get("visuals_n", len(recent))
    following_ratio = f"{round(prof['followers']/prof['follows']):,} : 1" if prof.get("follows") else "—"
    cadence_note = f"a {months[busiest]}-post surge in {MONTHS_ABBR[int(busiest[5:])-1]} {busiest[:4]}, and a quiet {MONTHS_ABBR[int(quiet[5:])-1]} ({months[quiet]})"

    body = build_html(locals())
    open(os.path.join(out_dir, "report.html"), "w").write("<title>" + html.escape(brand) + " · Instagram Report</title>\n" + body)
    # report_data.ts (strip the title we just added — the Next template owns <head>)
    ts = "export const BRAND = " + json.dumps(brand) + ";\n"
    ts += "export const REPORT_HTML = " + json.dumps(body) + ";\n"
    open(os.path.join(out_dir, "report_data.ts"), "w").write(ts)
    print("wrote report.html + report_data.ts to", out_dir)
    print(f"  followers {compact(prof['followers'])} · {freq_n} posts · viral {viral_pct}% · median {compact(median)} · conv {conv:.2f}% · creators {len(creators)}")


def build_html(v):
    f = v["fonts"]
    CSS = CSS_TEMPLATE.replace("__B7__", f["b7"]).replace("__B8__", f["b8"]).replace("__H4__", f["h4"]).replace("__H6__", f["h6"]).replace("__M5__", f["m5"])
    prof = v["prof"]
    avatar_el = f'<span class="avatar"><img src="{v["avatar"]}" alt=""></span>' if v["avatar"] else '<span class="avatar" style="background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#4f5bd5)"></span>'
    gen_chip = ('<span class="chip">Generated <b>' + v["generated"] + '</b></span>') if v.get("generated") else ''
    if v.get("hashtag"):
        hashtag_card = ('<div class="card" style="margin-top:13px"><div style="font-family:\'Bric\';font-weight:700;font-size:16px;margin-bottom:6px">Hashtag &amp; language</div>'
                        '<ul class="alist on" style="margin-top:4px"><li>Brand hashtag <span class="hl">' + v["hashtag"] + '</span> on ~' + str(v["htpct"]) + '% of posts</li>'
                        '<li>Captions are short, talent-led</li></ul></div>')
    else:
        hashtag_card = ''
    lead_txt = (" @" + v["top_creator"] + " leads by reach.") if v.get("top_creator") else ''
    website_html = (' · <a class="hlink" href="' + prof["website"] + '" target="_blank" rel="noopener">' + re.sub(r"^https?://", "", prof["website"]) + ' ↗</a>') if prof.get("website") else ''
    following_span = ('<span><b>' + fnum(prof["follows"]) + '</b> following</span>') if prof.get("follows") else ''
    return f'''<style>{CSS}</style>
<div class="page"><div class="wrap">
  <div class="hd">
    {avatar_el}
    <div>
      <h1><span class="grad">@{v["handle"]}</span></h1>
      <div class="hstats"><span><b>{compact(prof["followers"])}</b> followers</span>{following_span}<span><b>{fnum(prof["media_count"])}</b> posts</span></div>
      <div class="hbio">{html.escape(prof.get("bio",""))}{website_html}</div>
    </div>
  </div>
  <div class="meta">
    <span class="chip">Instagram public report · <b>Porter MCP</b></span>
    {gen_chip}
    <span class="chip">Frequency <b>{v["freq_n"]} posts</b> · Visuals <b>{v["vis_n"]}</b></span>
  </div>

  <section class="blk"><h2>The headline</h2>
    <div class="insight"><div class="big grad">{v["viral_pct"]}%</div>
      <p>of all likes across the recent {v["eng_n"]} posts came from just the <b>top {v["K_VIRAL"]} posts</b>. @{v["handle"]}'s feed is driven by a small set of standout posts — the <b>median</b> (~{compact(v["median"])} likes) is the honest day-to-day benchmark, not the mean ({compact(v["mean"])}).</p>
    </div>
  </section>

  <section class="blk"><h2>Deeper signals</h2>
    <div class="grid k4">
      <div class="card kpi"><div class="lab">Following ratio</div><div class="val">{v["following_ratio"]}</div><div class="foot">{compact(prof["followers"])} followers ÷ {fnum(prof["follows"]) if prof.get("follows") else "—"}</div></div>
      <div class="card kpi"><div class="lab">Conversation rate</div><div class="val">{v["conv"]:.2f}%</div><div class="foot">comments ÷ likes · {v["eng_n"]} posts</div></div>
      <div class="card kpi"><div class="lab">Carousel depth</div><div class="val">~{v["car_avg"]:.1f}</div><div class="foot g">slides / carousel · range {v["car_rng"]}</div></div>
      <div class="card kpi"><div class="lab">Collab rate</div><div class="val">{v["collab_rate"]}%</div><div class="foot">of {v["tot_cp"]} recent posts tag a creator</div></div>
    </div>
  </section>

  <section class="blk">
    <div class="chead"><span class="h">Latest posts</span><span class="n">newest first · ▤ = carousel slides · scroll →</span></div>
    <div class="carousel">
      {v["carousel"]}
    </div>
  </section>

  <section class="blk"><h2>Creators &amp; collaborators · {v["tot_cp"]} recent posts</h2>
    <div class="card">
      <div class="crow chead2"><span class="crank">#</span><span class="chandle">Creator</span><span class="ctype">Type</span><span class="cbartrack">Reach — combined likes</span><span class="cposts">Posts</span><span class="clikes"></span></div>
      {v["crows"]}
      <div class="note"><b>{v["tagged"]} of {v["tot_cp"]} posts ({v["collab_rate"]}%) tag a creator</b> — {v["uniq"]} unique handles.{lead_txt} Handles are read from caption text (Instagram strips the "@"), so this is best-effort extraction. Bar = combined likes of the posts each creator appears in.</div>
    </div>
    {hashtag_card}
  </section>

  <section class="blk"><h2>Publishing frequency over time · {v["freq_n"]} posts</h2>
    <div class="card">
      <div class="months">{v["monthcols"]}</div>
      <div class="note">Posts published each month — {v["cadence_note"]}. Busiest and quietest months tell you when campaigns run.</div>
    </div>
  </section>

  <section class="blk"><h2>Publishing rhythm · weekday × hour of day (UTC)</h2>
    <div class="grid k2">
      <div class="card">
        <div class="hmwrap"><div class="heatmap">{v["heatmap"]}</div></div>
        <div class="hm-leg"><span>fewer</span><span class="hm-scale"><i style="background:#141416"></i><i style="background:rgba(214,41,118,.28)"></i><i style="background:rgba(214,41,118,.55)"></i><i style="background:rgba(214,41,118,.82)"></i><i style="background:rgba(214,41,118,1)"></i></span><span>more posts</span></div>
        <div class="note">Hotspot: <span class="hl">{v["hot_block"]} UTC</span> ({v["hot_n"]} of {v["freq_n"]} posts). Times are <b>UTC</b>, not audience-local.</div>
      </div>
      <div class="card">
        <h2 style="margin-bottom:12px">Posts by weekday</h2>
        {v["wkbars"]}
        <div class="note"><span class="hl">{" & ".join(v["top_days"])}</span> lead by volume.</div>
      </div>
    </div>
  </section>

  <section class="blk"><h2>Format mix &amp; performance · recent {v["eng_n"]} posts</h2>
    <div class="grid k2">
      <div class="card mix">
        <svg width="150" height="150" viewBox="0 0 42 42"><circle cx="21" cy="21" r="15.9" fill="none" stroke="#1c1c20" stroke-width="6"/>{v["donut_svg"]}<text x="21" y="20" text-anchor="middle" fill="#fff" font-size="7" font-family="Bric" font-weight="700">{v["eng_n"]}</text><text x="21" y="27" text-anchor="middle" fill="#9a9aa2" font-size="3.3">posts</text></svg>
        <div class="legend">{v["legend"]}</div>
      </div>
      <div class="card"><table><thead><tr><th>Format</th><th class="n">Typical (median)</th><th class="n">Best post</th></tr></thead><tbody>{v["frows"]}</tbody></table>
        <div class="note">Typical = median likes for that format; best = its single top post.</div>
      </div>
    </div>
  </section>

  <section class="blk"><h2>Standout posts · top by likes</h2>
    <div class="card">
      {v["virbars"]}
      <div class="note" style="margin-top:14px"><b>Top {v["K_VIRAL"]} posts</b> account for {v["viral_pct"]}% of all likes in the {v["eng_n"]}-post window.</div>
      <table style="margin-top:14px"><thead><tr><th>Date</th><th>Format</th><th>Note</th><th class="n">Likes</th><th class="n">Comments</th></tr></thead><tbody>{v["toptable"]}</tbody></table>
    </div>
  </section>

  <footer>Instagram public data via Porter Metrics · @{v["handle"]}. Frequency &amp; rhythm on the {v["freq_n"]} most-recent posts; engagement &amp; format on the recent {v["eng_n"]}; visuals on the latest {v["vis_n"]}. Median = the typical post (mean skewed by the top posts). Times UTC. Public data has no reach/impressions — engagement is likes+comments only.</footer>
</div></div>'''


CSS_TEMPLATE = """
@font-face{font-family:'Bric';src:url(data:font/woff2;base64,__B7__) format('woff2');font-weight:700}
@font-face{font-family:'Bric';src:url(data:font/woff2;base64,__B8__) format('woff2');font-weight:800}
@font-face{font-family:'Hank';src:url(data:font/woff2;base64,__H4__) format('woff2');font-weight:400}
@font-face{font-family:'Hank';src:url(data:font/woff2;base64,__H6__) format('woff2');font-weight:600}
@font-face{font-family:'Mono';src:url(data:font/woff2;base64,__M5__) format('woff2');font-weight:500}
:root{--bg:#000;--card:#0c0c0e;--card2:#141416;--line:rgba(255,255,255,.09);--ink:#fff;--muted:#9a9aa2;--p:#d62976;--o:#fa7e1e;--y:#feda75;--b:#4f5bd5;--v:#962fbf;--good:#4ade80}
*{box-sizing:border-box;margin:0;padding:0}
.page{background:var(--bg);color:var(--ink);font-family:'Hank',-apple-system,BlinkMacSystemFont,sans-serif;line-height:1.5;padding:30px 20px 70px;min-height:100vh}
.wrap{max-width:1060px;margin:0 auto}
.grad{background:linear-gradient(90deg,var(--y),var(--o),var(--p),var(--b));-webkit-background-clip:text;background-clip:text;color:transparent}
h1{font-family:'Bric';font-weight:800;font-size:34px;letter-spacing:-.02em;line-height:1}
h2{font-family:'Bric';font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);margin-bottom:14px}
.hd{display:flex;align-items:center;gap:18px;margin-bottom:8px}
.avatar{width:76px;height:76px;border-radius:50%;padding:3px;background:linear-gradient(45deg,#feda75,#fa7e1e,#d62976,#4f5bd5);flex:0 0 auto;display:block}
.avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #000}
.hstats{font-family:'Mono';font-size:12.5px;color:var(--muted);margin-top:8px;display:flex;gap:16px;flex-wrap:wrap}
.hstats b{color:var(--ink)}
.hbio{font-size:14px;margin-top:8px;max-width:640px}
.hlink{color:var(--b);text-decoration:none;font-family:'Mono';font-size:12.5px}
.meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.chip{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:var(--muted)}
.chip b{color:var(--ink)}
section.blk{margin-top:36px}
.grid{display:grid;gap:13px}.k4{grid-template-columns:repeat(4,1fr)}.k2{grid-template-columns:1fr 1fr}
@media(max-width:820px){.k4{grid-template-columns:repeat(2,1fr)}.k2{grid-template-columns:1fr}}
.card{background:linear-gradient(180deg,var(--card2),var(--card));border:1px solid var(--line);border-radius:16px;padding:18px}
.kpi .lab{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
.kpi .val{font-family:'Bric';font-weight:800;font-size:28px;letter-spacing:-.02em;margin-top:6px}
.kpi .foot{font-family:'Mono';font-size:11px;color:var(--muted);margin-top:8px}
.kpi .foot.g{color:var(--good)}
.insight{background:linear-gradient(120deg,rgba(214,41,118,.16),rgba(79,91,213,.14));border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:22px;display:flex;gap:20px;align-items:center;flex-wrap:wrap}
.insight .big{font-family:'Bric';font-weight:800;font-size:52px;line-height:1}
.insight p{flex:1;min-width:250px;font-size:14.5px}
.chead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.chead .h{font-family:'Bric';font-weight:700;font-size:20px}.chead .n{color:var(--muted);font-size:12.5px}
.carousel{display:grid;grid-auto-flow:column;grid-auto-columns:248px;gap:14px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x mandatory}
.carousel::-webkit-scrollbar{height:8px}.carousel::-webkit-scrollbar-thumb{background:#2a2a30;border-radius:8px}
.pcard{scroll-snap-align:start;background:var(--card);border:1px solid var(--line);border-radius:15px;overflow:hidden;display:flex;flex-direction:column}
.pimg{position:relative;aspect-ratio:1/1;background:#1a1a1e;overflow:hidden}
.pimg img{width:100%;height:100%;object-fit:cover;display:block}
.play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.tbadge{position:absolute;top:10px;left:10px;font-family:'Mono';font-size:10px;padding:3px 8px;border-radius:6px;backdrop-filter:blur(6px);text-transform:uppercase;letter-spacing:.04em}
.tbadge.c{background:rgba(79,91,213,.85);color:#fff}.tbadge.r{background:rgba(214,41,118,.85);color:#fff}.tbadge.i{background:rgba(250,126,30,.85);color:#111}
.slidechip{position:absolute;top:10px;right:10px;font-family:'Mono';font-size:10px;padding:3px 7px;border-radius:6px;background:rgba(0,0,0,.6);color:#fff;backdrop-filter:blur(6px)}
.pbody{padding:13px 14px 15px;display:flex;flex-direction:column;gap:9px;flex:1}
.pcap{font-size:13px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;min-height:56px}
.pcreator{font-family:'Mono';font-size:11.5px;color:#ff8bc0}.pcreator a{color:#ff8bc0;text-decoration:none}.pcreator a:hover{text-decoration:underline}.pcreator.none{color:#55555f}
.pmeta{font-family:'Mono';font-size:11px;color:var(--muted)}
.pstats{display:flex;gap:14px;font-family:'Mono';font-size:13px}.pstats span:first-child{color:var(--p)}
.popen{margin-top:auto;font-size:12px;color:var(--b);text-decoration:none;font-weight:600}.popen:hover{text-decoration:underline}
.months{display:flex;align-items:flex-end;gap:10px;height:200px;padding-top:10px}
.mcol{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:6px;height:100%}
.mcount{font-family:'Mono';font-size:12px}.mbar{width:100%;max-width:46px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,var(--p),var(--v))}.mbar.zero{background:#2a2a30}
.mlab{font-family:'Mono';font-size:10.5px;color:var(--muted)}
.hmwrap{overflow-x:auto}
.heatmap{display:grid;grid-template-columns:44px repeat(8,1fr);gap:4px;min-width:560px}
.hm-h{font-family:'Mono';font-size:9.5px;color:var(--muted);text-align:center;padding-bottom:2px}
.hm-d{font-family:'Mono';font-size:11px;color:var(--muted);display:flex;align-items:center}
.hm-c{height:32px;border-radius:6px;background:#141416;display:flex;align-items:center;justify-content:center;font-family:'Mono';font-size:11px;color:#fff;border:1px solid rgba(255,255,255,.04)}
.hm-leg{display:flex;align-items:center;gap:8px;margin-top:12px;font-family:'Mono';font-size:10.5px;color:var(--muted)}
.hm-scale{display:flex;gap:3px}.hm-scale i{width:16px;height:12px;border-radius:3px;display:block}
.mix{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.legend div{display:flex;align-items:center;gap:8px;font-size:13.5px;margin-bottom:9px}.sw{width:11px;height:11px;border-radius:3px}
.wkrow{display:grid;grid-template-columns:38px 1fr 40px;align-items:center;gap:11px;margin-bottom:9px;font-family:'Mono';font-size:12px}
.wkd{color:var(--muted)}.wktrack{background:#1c1c20;border-radius:7px;height:18px;overflow:hidden}
.wkfill{height:100%;border-radius:7px;background:linear-gradient(90deg,var(--b),var(--v))}.wkfill.hot{background:linear-gradient(90deg,var(--o),var(--p))}
.wkv{text-align:right}
.bar{display:grid;grid-template-columns:200px 1fr 78px;align-items:center;gap:12px;margin-bottom:9px;font-size:12.5px}
.bar .nm{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.trk{background:#1c1c20;border-radius:7px;height:20px;overflow:hidden}.fl{height:100%;border-radius:7px;background:linear-gradient(90deg,var(--p),var(--y))}
.bar .vn{text-align:right;font-family:'Mono'}
@media(max-width:620px){.bar{grid-template-columns:1fr}.bar .vn{text-align:left}}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line)}
th{color:var(--muted);font-family:'Mono';font-size:10.5px;text-transform:uppercase;letter-spacing:.06em}
td.n{text-align:right;font-family:'Mono';white-space:nowrap}
.pill{font-family:'Mono';font-size:10px;padding:2px 7px;border-radius:5px}
.pill.c{background:rgba(79,91,213,.2);color:#9aa6ff}.pill.r{background:rgba(214,41,118,.2);color:#ff8bc0}.pill.i{background:rgba(250,126,30,.2);color:#ffbe86}
.crow{display:grid;grid-template-columns:26px 150px 150px 1fr 44px 62px;align-items:center;gap:12px;padding:9px 2px;border-bottom:1px solid var(--line);font-size:13px}
.crow.chead2{color:var(--muted);font-family:'Mono';font-size:10.5px;text-transform:uppercase;letter-spacing:.05em}
.crank{font-family:'Mono';color:var(--muted);text-align:center}
.chandle{color:var(--ink);text-decoration:none;font-weight:600}.chandle:hover{color:#ff8bc0;text-decoration:underline}
.ctype{color:var(--muted);font-size:12px}
.cbartrack{background:#1c1c20;border-radius:6px;height:16px;overflow:hidden;color:var(--muted)}.cbar{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--p),var(--o))}
.cposts{font-family:'Mono';color:var(--muted);text-align:right;font-size:12px}.clikes{font-family:'Mono';text-align:right;font-weight:600}
@media(max-width:820px){.crow{grid-template-columns:22px 1fr 62px;gap:9px}.crow .ctype,.crow .cbartrack,.crow .cposts{display:none}}
.alist{list-style:none;margin-top:8px;font-size:13px}.alist li{padding:6px 0 6px 22px;position:relative;color:#d6d6dc}
.alist li:before{position:absolute;left:0;top:6px}.alist.on li:before{content:"✓";color:var(--good)}
.note{color:var(--muted);font-size:12px;margin-top:12px}.hl{color:var(--p);font-weight:600}
footer{margin-top:42px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}
"""

if __name__ == "__main__":
    main()
