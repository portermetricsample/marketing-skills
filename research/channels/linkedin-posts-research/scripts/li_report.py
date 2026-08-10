#!/usr/bin/env python3
"""
li_report.py — posts.json + analysis.json → self-contained Porter HTML report

The client-facing deliverable. Two layers, same contract as meta/tiktok research:
- FACTS (from posts.json, automatic): author, headline, followers, date, the post
  copy, engagement (reactions/comments/shares + reaction breakdown), media.
- ANALYSIS (from analysis.json, written by Claude via the `posts` cascade): per
  post the 4-level breakdown (strategy → content → copy → style), a verdict, the
  attributes, and the gaps. Runs with or without analysis.json (facts-only if absent).

Usage:
    python3 li_report.py --data data/run1 --title "..." --out data/run1/report.html
      (reads data/run1/posts.json and data/run1/analysis.json if present)
"""
import argparse
import base64
import html
import json
import mimetypes
from pathlib import Path
from urllib import request as urlrequest

P = {
    "purple": "#6701e6", "dark": "#1a0340", "void": "#12022f", "rich": "#3a0a80",
    "violet": "#8b5cf6", "lavender": "#c4b5fd", "pink": "#EC4899", "pink400": "#F472B6",
    "yellow": "#fbbf24", "aqua": "#2DD4BF", "mint": "#5EEAD4", "ink": "#e9e3ff",
    "muted": "#a99fce", "line": "rgba(196,181,253,.16)", "card": "#20093f",
}

LEVELS = [
    ("strategy", "Strategy", "what Porter says to the market",
     [("positioning", "Positioning"), ("messaging", "Messaging"), ("campaign", "Campaign")]),
    ("content", "Content", "what this post is about, and for whom",
     [("audience", "Audience"), ("topic", "Topic"), ("pain", "Pain point"),
      ("use_case", "Use case"), ("benefit", "Benefit"), ("offer", "Offer")]),
    ("copy", "Copy", "how the post argues, from insight to CTA",
     [("insight", "Insight"), ("concept", "Concept"), ("angle", "Angle"),
      ("hook", "Hook"), ("structure", "Structure"), ("cta", "CTA")]),
    ("style", "Style", "how it sounds",
     [("voice", "Voice"), ("figures", "Rhetorical figures"), ("triggers", "Triggers")]),
]
REACTION_EMOJI = {"like": "👍", "praise": "👏", "appreciation": "💡", "empathy": "❤️",
                  "interest": "💭", "entertainment": "😄"}


def esc(s) -> str:
    return html.escape(str(s)) if s is not None else ""


def data_uri(url: str) -> str | None:
    if not url:
        return None
    try:
        req = urlrequest.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlrequest.urlopen(req, timeout=25) as r:
            raw = r.read()
            ctype = r.headers.get("Content-Type") or mimetypes.guess_type(url)[0] or "image/jpeg"
        if len(raw) > 6_000_000:  # keep the file sane
            return None
        return f"data:{ctype};base64," + base64.b64encode(raw).decode()
    except Exception:
        return None


def fmt(n) -> str:
    n = n or 0
    if n >= 1000:
        return f"{n/1000:.1f}k".replace(".0k", "k")
    return str(n)


def stat_chip(label, val):
    return f'<span class="chip"><b>{fmt(val)}</b> {label}</span>'


def render_reactions(breakdown: dict) -> str:
    if not breakdown:
        return ""
    parts = []
    for k, v in breakdown.items():
        if v:
            parts.append(f'<span class="rx">{REACTION_EMOJI.get(k,"·")} {fmt(v)}</span>')
    return f'<div class="rxrow">{"".join(parts)}</div>' if parts else ""


def render_cascade(cascade: dict) -> str:
    if not cascade:
        return ""
    blocks = []
    for key, title, sub, fields in LEVELS:
        lvl = cascade.get(key) or {}
        rows = []
        for fkey, flabel in fields:
            val = lvl.get(fkey)
            if val is None or str(val).strip() == "":
                continue
            gap = str(val).strip().lower() in ("gap", "missing", "—", "-", "n/a", "none")
            cls = "var gap" if gap else "var"
            rows.append(
                f'<div class="{cls}"><span class="vk">{esc(flabel)}</span>'
                f'<span class="vv">{esc(val)}</span></div>')
        if not rows:
            continue
        blocks.append(
            f'<div class="lvl lvl-{key}"><div class="lvl-h"><span class="lvl-t">{esc(title)}</span>'
            f'<span class="lvl-s">{esc(sub)}</span></div>{"".join(rows)}</div>')
    return f'<div class="cascade">{"".join(blocks)}</div>'


def render_post(post: dict, an: dict, embed: bool) -> str:
    a = post.get("author") or {}
    st = post.get("stats") or {}
    mode = (an.get("mode") or "").lower()
    mode_badge = ""
    if mode == "own":
        mode_badge = '<span class="mode own">Own · banks-aware</span>'
    elif mode in ("external", "competitor"):
        mode_badge = '<span class="mode ext">External · teardown</span>'

    # media thumbnails
    media_html = ""
    if embed:
        thumbs = []
        for m in (post.get("media") or [])[:4]:
            uri = data_uri(m.get("url"))
            if uri:
                thumbs.append(f'<img src="{uri}" alt="media"/>')
        if thumbs:
            media_html = f'<div class="media">{"".join(thumbs)}</div>'

    reshare = ""
    if post.get("is_reshared") and post.get("reshared"):
        rp = post["reshared"]
        reshare = (f'<div class="reshare">↻ reshare of <b>{esc(rp.get("author") or "?")}</b>'
                   f'<div class="rtext">{esc((rp.get("text") or "")[:400])}</div></div>')

    if not post.get("ok"):
        return (f'<section class="post blocked"><div class="phead">'
                f'<div class="who"><div class="nm">Post not readable</div>'
                f'<div class="hd">{esc(post.get("error"))}</div></div></div>'
                f'<a class="src" href="{esc(post.get("url"))}">{esc(post.get("url"))}</a></section>')

    verdict = an.get("verdict")
    gaps = an.get("gaps") or []
    attrs = an.get("attributes") or {}
    attr_chips = "".join(
        f'<span class="attr"><i>{esc(k)}</i> {esc(v)}</span>'
        for k, v in attrs.items() if v)

    text_html = esc(post.get("text") or "").replace("\n", "<br>")

    return f"""
    <section class="post">
      <div class="grid">
        <div class="left">
          <div class="phead">
            <div class="who">
              <div class="nm">{esc(a.get("name") or "—")} {mode_badge}</div>
              <div class="hd">{esc(a.get("headline") or "")}</div>
              <div class="meta">{esc(a.get("followers") and f'{fmt(a.get("followers"))} followers · ' or '')}{esc(post.get("created_at") or "")} · {esc(post.get("type") or "post")}</div>
            </div>
          </div>
          <div class="ptext">{text_html}</div>
          {media_html}
          {reshare}
          <div class="stats">
            {stat_chip("reactions", st.get("reactions"))}
            {stat_chip("comments", st.get("comments"))}
            {stat_chip("shares", st.get("shares"))}
            <span class="chip cc">{esc(post.get("char_count"))} chars</span>
          </div>
          {render_reactions(st.get("reaction_breakdown"))}
          <a class="src" href="{esc(post.get("url"))}">View on LinkedIn ↗</a>
        </div>
        <div class="right">
          {f'<div class="verdict">{esc(verdict)}</div>' if verdict else ''}
          {render_cascade(an.get("cascade"))}
          {f'<div class="attrs">{attr_chips}</div>' if attr_chips else ''}
          {("<div class='gaps'><div class='gh'>Gaps / levers</div>" + "".join(f"<div class='g'>{esc(g)}</div>" for g in gaps) + "</div>") if gaps else ''}
        </div>
      </div>
    </section>"""


CSS = f"""
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:linear-gradient(160deg,{P['void']},{P['dark']});color:{P['ink']};
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.5;padding:40px 20px}}
.wrap{{max-width:1140px;margin:0 auto}}
.hero{{text-align:center;margin-bottom:44px}}
.kicker{{color:{P['pink400']};font-weight:700;letter-spacing:.14em;text-transform:uppercase;font-size:12px}}
h1{{font-size:34px;font-weight:800;margin:10px 0 8px;background:linear-gradient(90deg,{P['lavender']},{P['pink400']});
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}}
.sub{{color:{P['muted']};max-width:680px;margin:0 auto;font-size:15px}}
.post{{background:{P['card']};border:1px solid {P['line']};border-radius:18px;padding:26px;margin-bottom:26px}}
.post.blocked{{opacity:.6}}
.grid{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:28px}}
@media(max-width:840px){{.grid{{grid-template-columns:1fr}}}}
.nm{{font-weight:700;font-size:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}}
.hd{{color:{P['lavender']};font-size:13px;margin-top:2px}}
.meta{{color:{P['muted']};font-size:12px;margin-top:4px}}
.mode{{font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:20px;letter-spacing:.03em}}
.mode.own{{background:rgba(45,212,191,.15);color:{P['mint']};border:1px solid rgba(45,212,191,.35)}}
.mode.ext{{background:rgba(236,72,153,.15);color:{P['pink400']};border:1px solid rgba(236,72,153,.35)}}
.ptext{{margin:16px 0;font-size:14.5px;white-space:normal;color:#f3efff}}
.media{{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}}
.media img{{max-width:100%;max-height:220px;border-radius:10px;border:1px solid {P['line']}}}
.reshare{{border-left:3px solid {P['violet']};padding:8px 12px;margin:12px 0;background:rgba(139,92,246,.08);border-radius:0 10px 10px 0}}
.rtext{{color:{P['muted']};font-size:12.5px;margin-top:4px}}
.stats{{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}}
.chip{{background:rgba(139,92,246,.12);border:1px solid {P['line']};border-radius:20px;padding:5px 12px;font-size:12.5px;color:{P['lavender']}}}
.chip b{{color:{P['ink']}}}
.chip.cc{{opacity:.7}}
.rxrow{{display:flex;gap:12px;margin-top:8px;flex-wrap:wrap}}
.rx{{font-size:12px;color:{P['muted']}}}
.src{{display:inline-block;margin-top:14px;color:{P['pink400']};font-size:12.5px;text-decoration:none;font-weight:600}}
.verdict{{background:linear-gradient(90deg,rgba(103,1,230,.25),rgba(236,72,153,.18));
  border:1px solid {P['line']};border-radius:12px;padding:12px 14px;font-size:14px;font-weight:600;margin-bottom:16px;color:#fff}}
.cascade{{display:flex;flex-direction:column;gap:12px}}
.lvl{{border:1px solid {P['line']};border-radius:12px;padding:12px 14px;background:rgba(18,2,47,.5)}}
.lvl-h{{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}}
.lvl-t{{font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.1em}}
.lvl-strategy .lvl-t{{color:{P['pink400']}}} .lvl-content .lvl-t{{color:{P['violet']}}}
.lvl-copy .lvl-t{{color:{P['aqua']}}} .lvl-style .lvl-t{{color:{P['yellow']}}}
.lvl-s{{color:{P['muted']};font-size:11px}}
.var{{display:grid;grid-template-columns:118px 1fr;gap:10px;padding:3px 0;font-size:13px;align-items:start}}
.vk{{color:{P['muted']};font-size:11.5px;padding-top:1px;text-transform:uppercase;letter-spacing:.03em}}
.vv{{color:#efeaff}}
.var.gap .vv{{color:{P['pink400']};font-style:italic}}
.attrs{{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}}
.attr{{font-size:11.5px;color:{P['lavender']};border:1px dashed {P['line']};border-radius:8px;padding:3px 9px}}
.attr i{{color:{P['muted']};font-style:normal;margin-right:5px;text-transform:uppercase;font-size:10px}}
.gaps{{margin-top:14px;border-top:1px solid {P['line']};padding-top:12px}}
.gh{{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:{P['yellow']};font-weight:700;margin-bottom:6px}}
.g{{font-size:13px;color:{P['lavender']};padding:3px 0 3px 16px;position:relative}}
.g:before{{content:'→';position:absolute;left:0;color:{P['pink400']}}}
.foot{{text-align:center;color:{P['muted']};font-size:12px;margin-top:30px}}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="dir with posts.json (+ optional analysis.json)")
    ap.add_argument("--title", default="LinkedIn Posts — Cascade Teardown")
    ap.add_argument("--subtitle", default="")
    ap.add_argument("--out", default=None)
    ap.add_argument("--no-embed", action="store_true", help="skip downloading/embedding media")
    args = ap.parse_args()

    d = Path(args.data)
    posts = json.loads((d / "posts.json").read_text())
    an_path = d / "analysis.json"
    analysis = json.loads(an_path.read_text()) if an_path.exists() else {}
    by_url = {a.get("url"): a for a in analysis.get("posts", [])}

    subtitle = args.subtitle or analysis.get("subtitle") or \
        f"{sum(1 for p in posts if p.get('ok'))} readable post(s) broken down through Porter's 4-level content cascade."
    title = analysis.get("title") or args.title

    cards = "\n".join(render_post(p, by_url.get(p.get("url"), {}), not args.no_embed) for p in posts)
    doc = f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title><style>{CSS}</style></head><body><div class="wrap">
<div class="hero"><div class="kicker">Porter · LinkedIn Content Teardown</div>
<h1>{esc(title)}</h1><p class="sub">{esc(subtitle)}</p></div>
{cards}
<div class="foot">Strategy → Content → Copy → Style · analyzed with Porter's <b>posts</b> framework · facts from the LinkedIn post, breakdown by Claude.</div>
</div></body></html>"""

    out = Path(args.out or (d / "report.html"))
    out.write_text(doc, encoding="utf-8")
    print(f"✓ report → {out}  ({len(posts)} post(s))")


if __name__ == "__main__":
    main()
