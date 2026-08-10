#!/usr/bin/env python3
"""
optimize_images.py — Make images as light as possible: convert to WebP, resize
oversized ones, compress, strip metadata. Writes a manifest.json for the next step
(Claude fills in alt + title by looking at each image).

    python3 optimize_images.py ./assets                 # whole folder (recursive)
    python3 optimize_images.py hero.png --quality 82    # one file
    python3 optimize_images.py ./assets --max-width 1600 --outdir ./assets/webp

Needs:  pip install pillow
"""
import argparse
import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

SRC_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff"}


def human(n):
    n = float(n)
    for u in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.0f} {u}" if u == "B" else f"{n:.1f} {u}"
        n /= 1024
    return f"{n:.1f} GB"


def optimize(path, quality=80, max_width=1920, outdir=None):
    if Image is None:
        print("Missing dependency. Run:  pip install pillow", file=sys.stderr)
        sys.exit(2)
    p = Path(path)
    files = [p] if p.is_file() else sorted(
        f for f in p.rglob("*") if f.suffix.lower() in SRC_EXTS
    )
    manifest, total_before, total_after = [], 0, 0
    for f in files:
        try:
            im = Image.open(f)
            im.load()
        except Exception as e:
            print(f"  skip {f.name}: {e}", file=sys.stderr)
            continue
        before = f.stat().st_size
        w, h = im.size
        if w > max_width:
            h = max(1, round(h * max_width / w))
            w = max_width
            im = im.resize((w, h), Image.LANCZOS)
        if im.mode in ("P", "LA"):
            im = im.convert("RGBA")
        elif im.mode == "CMYK":
            im = im.convert("RGB")
        out_dir = Path(outdir) if outdir else f.parent
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / (f.stem + ".webp")
        im.save(out, "WEBP", quality=quality, method=6)  # method=6 = best compression
        after = out.stat().st_size
        total_before += before
        total_after += after
        manifest.append({
            "original": str(f), "webp": str(out),
            "width": w, "height": h,
            "before_bytes": before, "after_bytes": after,
            "saved_pct": round((1 - after / before) * 100) if before else 0,
            "alt": "", "title": "",   # <-- Claude fills these by looking at the image
        })
        print(f"  {f.name:<34} {human(before):>9} → {human(after):>9}  (-{manifest[-1]['saved_pct']}%)")
    return manifest, total_before, total_after


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path", help="image file or folder")
    ap.add_argument("--quality", type=int, default=80, help="WebP quality 0-100 (default 80)")
    ap.add_argument("--max-width", type=int, default=1920, help="downscale wider images (default 1920)")
    ap.add_argument("--outdir", default=None, help="write .webp here (default: next to originals)")
    ap.add_argument("--manifest", default="manifest.json")
    a = ap.parse_args()

    print(f"\n  Optimizing images in: {a.path}  (quality {a.quality}, max width {a.max_width}px)\n")
    manifest, tb, ta = optimize(a.path, a.quality, a.max_width, a.outdir)
    if not manifest:
        print("\n  No images found.\n")
        return
    json.dump(manifest, open(a.manifest, "w"), indent=2)
    saved = round((1 - ta / tb) * 100) if tb else 0
    print("\n  " + "-" * 52)
    print(f"  {len(manifest)} images · {human(tb)} → {human(ta)}  (-{saved}% total)")
    print(f"  manifest → {a.manifest}")
    print("  Next: Claude reads each image and fills in alt + title, then run apply_to_html.py\n")


if __name__ == "__main__":
    main()
