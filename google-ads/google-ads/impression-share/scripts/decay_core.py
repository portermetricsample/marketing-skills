"""
decay_core — shared trend math (VENDORED from the `performance_decay` skill, verbatim).

Pure functions over a numeric weekly series. No globals, no I/O, no site
assumptions. Vendored here so this skill is self-contained; keep in sync with
~/.claude/skills/performance_decay/scripts/decay_core.py if that engine changes.
"""
import numpy as np


def smooth(y, w=3):
    y = np.asarray(y, float)
    out = np.empty(len(y))
    for i in range(len(y)):
        a, b = max(0, i - w // 2), min(len(y), i + w // 2 + 1)
        out[i] = y[a:b].mean()
    return out


def signals(y, n=None, weeks=None):
    """All trend signals for one series. n defaults to len(y)."""
    y = np.asarray(y, float)
    if n is None:
        n = len(y)
    ys = smooth(y, 3)
    total = float(y.sum()); mean = float(ys.mean())
    x = np.arange(n)
    slope = float(np.polyfit(x, ys, 1)[0]) if mean > 0 else 0.0
    slope_pct = (slope / mean * 100) if mean > 0 else 0.0

    def win(k):
        if n < 2 * k: return None
        recent = y[-k:].mean(); prior = y[-2 * k:-k].mean()
        if prior == 0: return None if recent == 0 else 1.0
        return float((recent - prior) / prior)

    w4, w8, w13 = win(4), win(8), win(13)
    windows = [w for w in (w4, w8, w13) if w is not None]
    n_down = sum(1 for w in windows if w < -0.10)
    n_up = sum(1 for w in windows if w > 0.10)
    k = min(6, n)
    yr = ys[-k:]; mr = yr.mean()
    recent_slope = float(np.polyfit(np.arange(k), yr, 1)[0]) if mr > 0 else 0.0
    recent_slope_pct = (recent_slope / mr * 100) if mr > 0 else 0.0
    peak = float(ys.max()); peak_i = int(ys.argmax())
    recent3 = float(ys[-3:].mean())
    pct_off_peak = (peak - recent3) / peak if peak > 0 else 0.0
    weeks_since_peak = n - 1 - peak_i
    cv = float(y.std() / y.mean()) if y.mean() > 0 else 0.0
    first_third = ys[:n // 3].mean(); last_third = ys[-n // 3:].mean()
    emerging = first_third <= 0.08 * max(last_third, 1e-9) and last_third > 0
    vs_base = recent3 / first_third if first_third > 1e-9 else (10.0 if recent3 > 0 else 0.0)
    near_zero_finish = bool((ys[-3:].mean() < 0.2 * ys.mean())) if ys.mean() > 0 else False
    crashing_pct = None; crashing_z = None; crashing_baseline_healthy = False
    if n >= 8:
        recent_n = max(1, min(3, n // 10))
        baseline_n = max(4, n // 3)
        if n >= recent_n + baseline_n:
            recent = y[-recent_n:]
            baseline = y[-(recent_n + baseline_n):-recent_n]
            bm = float(baseline.mean()); bs = float(baseline.std()); rm = float(recent.mean())
            crashing_pct = ((rm - bm) / bm) if bm > 0 else None
            crashing_z = ((rm - bm) / bs) if bs > 0 else None
            crashing_baseline_healthy = bm >= 0.7 * mean and bm > 0
    peak_week = weeks[peak_i] if weeks is not None else peak_i
    return dict(total=total, mean=mean, slope=slope, slope_pct=slope_pct,
                recent_slope_pct=recent_slope_pct,
                w4=w4, w8=w8, w13=w13, n_down=n_down, n_up=n_up,
                peak=peak, peak_week=peak_week, weeks_since_peak=weeks_since_peak,
                pct_off_peak=pct_off_peak, recent3=recent3, cv=cv, emerging=bool(emerging),
                vs_base=vs_base, near_zero_finish=near_zero_finish,
                crashing_pct=crashing_pct, crashing_z=crashing_z,
                crashing_baseline_healthy=crashing_baseline_healthy)


def classify(s, crash_min_volume):
    """Map signals -> one label. RELATIVE crash gate (crash_min_volume)."""
    sp, rsp, off, cv, wsp = s["slope_pct"], s["recent_slope_pct"], s["pct_off_peak"], s["cv"], s["weeks_since_peak"]
    nzf = s.get("near_zero_finish", False)
    cpct = s.get("crashing_pct"); cz = s.get("crashing_z")
    cbh = s.get("crashing_baseline_healthy", False)
    vb = s["vs_base"]
    if cbh and not nzf and s["mean"] >= crash_min_volume and (
        (cpct is not None and cpct < -0.50) or
        (cpct is not None and cpct < -0.30 and cz is not None and cz < -2.5)
    ):
        return "Crashing"
    if nzf:
        return "Crashed"
    if s["emerging"] and off < 0.35 and wsp <= 4:
        return "New"
    if sp < -1.0 and s["n_down"] >= 2:
        return "Losing"
    if off >= 0.40 and rsp < 2 and (vb < 0.75 or (vb < 0.95 and sp < 0)):
        return "Losing"
    if sp > 1.0 and rsp > -1 and off < 0.30 and s["n_up"] >= 1:
        return "Winning"
    if cv >= 0.45 and abs(sp) < 1.5:
        return "Volatile"
    return "Healthy"
