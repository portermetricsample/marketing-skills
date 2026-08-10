---
name: linkedin-posts-research
description: Scrape LinkedIn posts you pass AND analyze them through Porter's 4-level content cascade (strategy → content → copy → style) in a SINGLE run, ending in a self-contained Porter HTML report. Combines the `linkedin-post-scraper` (data) with the `posts` framework (analysis). Auto-detects mode per post — Juan's/Porter's own posts get a banks-aware diagnosis, everyone else's get a pure teardown. Trigger on "analyze these LinkedIn posts", "tear down this LinkedIn post", "break down these LinkedIn posts", "scrape and analyze this LinkedIn URL", or a pasted linkedin.com/posts/... URL when the intent is analysis. Output: posts.json + analysis.json + report.html.
---

# LinkedIn Posts Research

One execution, three moves: **scrape → analyze with the cascade → render the Porter report.** This is the combiner Juan asked for — it wires the scraper and the analysis framework so passing a few LinkedIn URLs produces a finished teardown.

- **Facts come from the scrape** (author, copy, engagement, media). Never invent a number.
- **The breakdown comes from you** (Claude), applying the `posts` cascade. Qualitative only.

## When to trigger

- "analyze / tear down / break down these LinkedIn posts" (+ URLs)
- "scrape and analyze this LinkedIn post"
- a pasted `linkedin.com/posts/...` URL where the intent is analysis, not just capture

If the user only wants the raw data, use `linkedin-post-scraper` alone.

## The pipeline

Pick a run dir, e.g. `data/<slug>-<date>/`. All three steps write there.

### 1 — Scrape

```bash
cd /Users/juan/marketing-skills/research/channels/linkedin-post-scraper/scripts
python3 li_scrape.py --out <RUNDIR> "URL1" "URL2" ...
```

Read `<RUNDIR>/posts.json`. Any post with `ok:false` is a blocked carousel/document/restricted post — mention it to the user; it still appears in the report as a "not readable" card. Analyze only the `ok:true` posts.

### 2 — Analyze with the cascade (you write `analysis.json`)

**Read the framework first**, then walk each readable post *backwards* through it (analyse mode):

- Framework + rules: `/Users/juan/projects/porter-marketing/content/skills/posts/SKILL.md`
- The wiring (element → bank): `.../content/skills/posts/references/framework-map.md`
- Shared banks: `.../content/foundation/` (strategy, pain-points, insights, use-cases, angles, hooks…)

**Auto-detect mode per post** from `author.name` / `author.profile_url`:
- **own** — author is Juan Bello / Porter Metrics (handles: `juanjose`, `juan-bello`, `portermetrics`, "Porter Metrics"). Diagnose against Porter's strategy + banks: name each level's variables, **cite the bank entry or flag a gap — never invent one**, and diagnose upstream (a flat CTA points to the insight, a flat insight to the topic). Gaps = what's missing or flat and the level above to fix.
- **external** — anyone else. Pure teardown: name each level's variables **as observed in the post** (reverse-engineer their hook, angle, concept, structure). Don't force them onto Porter's banks. Gaps = what a Porter version would change / the lever worth stealing.

Write `<RUNDIR>/analysis.json`:

```jsonc
{
  "title": "...", "subtitle": "...",
  "posts": [{
    "url": "<must match posts.json exactly>",
    "mode": "own" | "external",
    "verdict": "one line — what the post does well / whether it works",
    "cascade": {
      "strategy": { "positioning": "...", "messaging": "...", "campaign": "..." },
      "content":  { "audience": "...", "topic": "...", "pain": "...", "use_case": "...", "benefit": "..." },
      "copy":     { "insight": "...", "concept": "...", "angle": "...", "hook": "...", "structure": "...", "cta": "..." },
      "style":    { "voice": "...", "figures": "...", "triggers": "..." }
    },
    "attributes": { "goal": "...", "language": "...", "seasonality": "...", "third_parties": "..." },
    "gaps": ["...", "..."]
  }]
}
```

Rules that carry over from the `posts` framework:
- **The concept is required** — one arguable sentence fusing pain + insight; if you can only restate the topic, say so.
- **Surface gaps, don't fill them.** Use the literal string `"gap"` (or leave empty) for a variable that isn't present — the report renders it in flagged italic. Absent ≠ wrong.
- **One audience, one pain per post.** If a post blends segments, name that as a finding.
- Omit `use_case`, `benefit`, `offer`, `campaign`, `seasonality` when the post genuinely doesn't have them.

### 3 — Render the Porter report

```bash
cd /Users/juan/marketing-skills/research/channels/linkedin-posts-research/scripts
python3 li_report.py --data <RUNDIR> --title "<Title>" --out <RUNDIR>/report.html
```

Self-contained HTML (base64 media, opens offline), Porter design system: left = the real post + engagement, right = the color-coded 4-level cascade + verdict + attributes + gaps. Runs facts-only if `analysis.json` is missing. Add `--no-embed` to skip downloading media.

Show the user the report (screenshot or open it), and summarize the cross-post read: recurring hooks/angles, what the winners share, the levers worth reusing.

## Fact / judgment boundary (same as meta/tiktok research)

Numbers (reactions, comments, shares, followers, char count, dates) come only from `posts.json`. You write only the qualitative cascade attributes. Engagement is a **public signal, not a verdict** — a high-reaction post tells you what resonated, not that the copy is "correct." For external posts every "what works" read is inference from public signals; say so.

## Limitations to state up front

- Carousels, document/PDF posts, and restricted/deleted posts can't be read without cookies (`ok:false`). Text + single-image posts read fine.
- LinkedIn doesn't expose impressions/reach for other people's posts — only reactions/comments/shares are public.
- `followers` is frequently null from the actor; don't present its absence as data.

## Roadmap

- Own-post batch mode: pull Juan's recent posts via `harvestapi/linkedin-profile-posts` (already in `linkedin-content-system`) and run the cascade across all of them for a weekly "what's landing" read.
- Cross-post comparison view (rank readable posts by engagement, cluster by dominant angle) — the natural next report section.
