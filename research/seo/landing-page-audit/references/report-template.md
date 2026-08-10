# Report template — how to present the audit to the user

Mirror this when you hand results back. Marketer audience: plain English, damage-ordered,
each claim tied to a measured value. Don't dump the raw table — lead with the verdict.

---

**Landing page audit — `https://acme.com/fall-sale`** · mobile · 11 pass · 4 warn · 1 fail

**🔴 Fix first (breaks ranking or costs money)**
1. **Stray `noindex` tag** — the page tells Google *"don't index me."* It will never rank
   or serve as an ad landing page until this is removed. *(found in `<meta robots>`)*
2. **LCP 4.2s** — the hero is a 2.4 MB PNG that loads before anything else. Slow load
   hurts conversion *and* your Google Ads Quality Score. → convert to WebP, set dimensions.

**🟡 Worth improving**
- **Not in the sitemap** — Google may take longer to find it. → add it to `/sitemap.xml`.
- **Title is 7 chars** — too short to earn the click or rank. → write a 50–60 char title
  with the offer.
- **8 of 10 images are JPG/PNG** — heavier than needed. → serve WebP/AVIF.

**🟢 Passing** — HTTPS, canonical, one H1, alt text, JSON-LD (matches the page), Open
Graph, viewport, robots.txt allows crawling, hreflang EN/ES/PT.

**Want me to fix the red + yellow items in the code now?** Everything above was measured
against the live page — I can apply the fixes and re-run the audit in this same session.

---

Notes for the presenter:
- Always name the **source** of a speed number ("real users" vs "lab") when it matters.
- If Speed is `n/a` (no PSI key / rate-limited), say so plainly and tell them to set
  `PSI_API_KEY` — don't silently drop the whole group.
- If the mobile group warns, offer to drive **Playwright** at 375px for a deeper check
  (horizontal scroll, tap-target sizes on a real viewport).
