# Content Decay Analysis — source-agnostic engine

Detects which pages/sections **lose** or **gain** traffic over time by reading the
shape of each weekly curve like the eye would — not with a single fixed window.

**Not tied to any one website.** Thresholds are relative to the dataset, the time
axis is derived from the data, and categorization is generic by default. Works with
Google Search Console (clicks) and Google Analytics 4 (sessions) out of the box, and
any other source via a column mapping.

## Quick start
```bash
python3 analyze.py            # GSC by default (SOURCE in analyze.py)
CD_SOURCE=ga4 python3 analyze.py
python3 render.py             # publish charts + view.html
python3 qa.py                 # self-QA grids, one image per label
```

## Configuration (no code edits needed)
All via the `CONFIG`/presets at the top of `analyze.py`, overridable by env vars:

| Setting | Env var | Default | What it does |
|---|---|---|---|
| Source preset | `CD_SOURCE` | `gsc` | `gsc` / `ga4` / `custom` (column mapping) |
| Keep threshold | `CD_MIN_SHARE` | `0.0002` | keep entities with ≥ this **share** of total traffic (relative → adapts to any site size) |
| Categorization | `CD_CATEGORIZE` | `path1` | `path1` (group by URL path segment) or `none` |
| Custom rules | `CD_RULES` | — | load `categories_<name>.py` (e.g. `CD_RULES=porter`) |
| Crash sensitivity | `CD_CRASH_PCTILE` | `85` | crash alerts only on entities above this percentile of weekly volume |

**Nothing is hardcoded to a site:** there are no absolute click counts and no
site-specific URLs in the engine. Site-specific grouping lives in optional files like
`categories_porter.py` (an example), loaded only if you ask for it.

### Use your own data (`custom`)
Point the `custom` preset at a JSON `{columns, rows}` or a CSV, and map three columns:
`entity_col` (page/URL), `period_col` (date `YYYY-MM-DD`/`YYYYMMDD` or GSC week `YYYYWW`),
`metric_col` (clicks/sessions/visits). Optional `metric2_col`. Daily data is bucketed
into weeks automatically.

## How it works
1. Each entity becomes a weekly series, **smoothed** (3-week rolling mean) to denoise.
2. Several signals are computed at once (not one window):
   `slope_pct`, `recent_slope_pct`, `pct_off_peak`, `weeks_since_peak`,
   `w4/w8/w13` (recent vs prior), `cv` (volatility), `crashing_*`, and the key
   discriminator **`vs_base`** = current level ÷ starting level.

## Labels
| Label | Meaning |
|---|---|
| **Crashing** | Sudden recent drop from a healthy baseline (alert) |
| **Crashed** | Collapsed: now at ~zero |
| **New** | Recently emerging with traction |
| **Losing** | Real sustained decline (negative trend, or now below its own baseline while off peak) |
| **Winning** | Sustained upward trend, near its peak |
| **Volatile** | Volatile, no clear trend |
| **Healthy** | Stable / sound (default) |

### The key discriminator (`vs_base`)
What separates a false positive from a real loss is **not the slope** — it's where the
current level sits vs. where it started. A winner easing off a spike stays well above its
baseline (`vs_base ≫ 1`) → not a loss. A page that truly fades returns to/below baseline
(`vs_base < 0.75`) → Losing.

## Validation (self-QA loop)
Calibrated by a loop: render every curve → look at it → compare label vs. shape by eye →
fix the rule → repeat until they agree. See `qa.py` (one image per label, most-suspect
cases first). Verified on GSC; engine also runs unchanged on real GA4 data.

## Files
- `analyze.py` — generic engine → `data/analysis.json`
- `render.py` — published charts (`charts/*.png`, `view.html`)
- `qa.py` — self-verification grids (`charts/qa_*.png`)
- `categories_porter.py` — **example** site-specific grouping (optional, `CD_RULES=porter`)
- `snapshot/` — daily GA4 + GSC snapshot
