---
name: image-optimizer
description: "Make a page's images light and SEO-ready in one pass. Converts JPG/PNG to WebP, downscales oversized images, and compresses them (often 70–90% lighter) to speed up load time / LCP — then Claude looks at each image and writes its alt text and title, and wires everything into the HTML (webp src, width/height to stop layout shift, lazy-loading). Use when the user says /image-optimizer, or asks to optimize / compress images, convert images to WebP, make images lighter or the page faster, reduce image weight, or auto-write alt text / image titles / image descriptions for SEO and accessibility. Pairs with /landing-page-audit, which detects heavy or un-described images."
user_invocable: true
---

# Image Optimizer — lighter images + auto alt & title

Images are almost always the #1 thing slowing a landing page down. This skill makes them
light **and** SEO-ready: it compresses/converts them, and Claude writes the alt text and
title by actually looking at each image — then wires it all into the page.

## The prompt a user gives
> "Optimize the images on this landing page — convert them to WebP, make them as light as
> possible, and write the alt text and title for each one."

## The 3-step pipeline

**1 · Compress + convert** (script does it — measurable)
```bash
cd scripts
python3 optimize_images.py ./path/to/images        # folder (recursive) or one file
#   --quality 80     WebP quality 0-100 (default 80; 78–85 is the sweet spot)
#   --max-width 1920 downscale anything wider (default 1920)
#   --outdir DIR     write .webp somewhere else (default: next to originals)
```
Writes `.webp` files and a `manifest.json` — one entry per image with its new size,
width, height, and **empty `alt` / `title` fields**. Prints before→after weight.

**2 · Write alt + title** (Claude does it — vision)
Open each `original` (or `webp`) image with the **Read tool** so you can actually see it,
then fill its `alt` and `title` in `manifest.json`. Follow the rules below.

**3 · Wire it into the page** (script does it)
```bash
python3 apply_to_html.py page.html manifest.json
```
For every matching `<img>` it swaps `src` → the `.webp`, adds `width`/`height` (stops the
layout from jumping — fixes CLS), adds `loading="lazy"` + `decoding="async"`, and writes
the `alt` + `title`. Backs up the original to `page.html.bak`.

Then re-run `/landing-page-audit` on the page to confirm Speed and image-alt improved.

## How to write alt vs title (do this well — it's the SEO/accessibility part)

**Alt text** — what the image *is/does*, for screen readers and search:
- Describe the content and its purpose in ~8–15 words. Be specific.
- **No** "image of…" / "picture of…" (screen readers already say "image").
- Weave in the page's topic naturally **only if it's honestly what the image shows** —
  never keyword-stuff.
- Decorative image with no meaning? Use empty `alt=""` (set `"alt": ""` in the manifest)
  so screen readers skip it. Don't invent a description for a divider or background.
- Text inside the image? Put that text in the alt.

**Title** — a short, human hover label / caption (≤ 60 chars). Fine to be more
marketing-flavored than alt (e.g. "Fall Sale — up to 40% off"). Optional; skip if it adds
nothing.

Good: `alt="Woman comparing two life-insurance quotes on a laptop"` ·
`title="Compare quotes in minutes"`
Bad: `alt="image of insurance life quotes cheap best insurance 2026"` (stuffed, dishonest).

## Notes & limits
- **AVIF** compresses even smaller but needs extra libs; WebP is the safe, universal
  default and is what this ships. Add AVIF later if the client's CDN supports it.
- WebP keeps transparency (PNGs with alpha are fine).
- The script strips metadata and downscales — keep originals (it never deletes them).
- `apply_to_html.py` matches images by filename. If the page builds `src` dynamically
  (a framework/CMS), update the component or asset pipeline instead — same manifest.
- Real photos usually drop 70–90%; already-compressed or noisy images drop less. The
  weight numbers printed are real file sizes, before and after.
