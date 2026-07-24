/**
 * Instagram-Insights report visuals — Sparkline, Donut, Heatmap and the
 * annotated "new followers" chart. Dependency-free SVG; colors follow the theme.
 */
import { useRef, useState } from 'react';

type Fmt = (n: number) => string;
const nf = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDay(key: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(key);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}`;
  const d = new Date(key);
  return Number.isNaN(d.getTime()) ? key : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/* ── Sparkline (KPI cards) ─────────────────────────────────────────── */
export function Sparkline({ values, color, height = 34 }: { values: number[]; color: string; height?: number }) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return <div style={{ height }} />;
  const W = 240;
  const H = height;
  const pad = 3;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, '')}-${pts.length}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── Donut ─────────────────────────────────────────────────────────── */
export type Slice = { label: string; value: number; color: string };
export function Donut({ slices, format = nf }: { slices: Slice[]; format?: Fmt }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="state-empty">No data for this range.</div>;
  const R = 66;
  const r = 44;
  const C = 84;
  let acc = 0;
  const segs = slices.map((s) => {
    const frac = s.value / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang: number, rad: number) => `${(C + rad * Math.cos(ang)).toFixed(2)},${(C + rad * Math.sin(ang)).toFixed(2)}`;
    const d = `M ${p(a0, R)} A ${R} ${R} 0 ${large} 1 ${p(a1, R)} L ${p(a1, r)} A ${r} ${r} 0 ${large} 0 ${p(a0, r)} Z`;
    return { ...s, d, frac };
  });
  return (
    <div className="donut-wrap">
      <svg width={C * 2} height={C * 2} viewBox={`0 0 ${C * 2} ${C * 2}`} role="img" aria-label="distribution">
        {segs.map((s, i) => (
          <path
            key={i}
            d={s.d}
            fill={s.color}
            opacity={hover == null || hover === i ? 1 : 0.35}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ transition: 'opacity .15s' }}
          />
        ))}
        <text x={C} y={C - 4} textAnchor="middle" fontFamily="var(--font-display)" fontSize="24" fontWeight="800" fill="var(--ink)">
          {format(hover == null ? total : segs[hover].value)}
        </text>
        <text x={C} y={C + 15} textAnchor="middle" fontSize="11" fill="var(--muted)">
          {hover == null ? 'total' : `${(segs[hover].frac * 100).toFixed(0)}%`}
        </text>
      </svg>
      <div className="donut-legend">
        {segs.map((s, i) => (
          <div className="legend-row" key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="legend-swatch" style={{ background: s.color }} />
            <span className="legend-name">{s.label}</span>
            <span className="legend-val">{format(s.value)}</span>
            <span className="legend-pct">{(s.frac * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Heatmap (day × hour) ──────────────────────────────────────────── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export function Heatmap({ matrix }: { matrix: number[][] /* [7][24] */ }) {
  const [tip, setTip] = useState<{ d: number; h: number; v: number } | null>(null);
  const max = Math.max(1, ...matrix.flat());
  const shade = (v: number) => {
    if (v <= 0) return 'var(--panel-2)';
    const t = 0.18 + 0.82 * Math.sqrt(v / max);
    return `rgba(255, 61, 129, ${t.toFixed(3)})`;
  };
  return (
    <div>
      <div className="heat">
        <div className="heat-rowlabels" style={{ gridTemplateRows: `repeat(7, 1fr)` }}>
          {DAYS.map((d) => (
            <div className="heat-rowlabel" key={d} style={{ height: 20 }}>{d}</div>
          ))}
        </div>
        <div className="heat-grid" style={{ gridTemplateColumns: `repeat(24, 1fr)`, gridTemplateRows: `repeat(7, 1fr)` }}>
          {matrix.map((row, d) =>
            row.map((v, h) => (
              <div
                key={`${d}-${h}`}
                className="heat-cell"
                style={{ background: shade(v), height: 20 }}
                onMouseEnter={() => setTip({ d, h, v })}
                onMouseLeave={() => setTip(null)}
                title={`${DAYS[d]} ${String(h).padStart(2, '0')}:00 · ${nf(v)}`}
              />
            ))
          )}
        </div>
      </div>
      <div className="heat-xaxis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>
      <div className="heat-legend">
        <span>Less</span>
        <div className="heat-scale">
          {[0.15, 0.35, 0.55, 0.78, 1].map((t) => (
            <span key={t} style={{ background: `rgba(255,61,129,${t})` }} />
          ))}
        </div>
        <span>More{tip ? ` · ${DAYS[tip.d]} ${String(tip.h).padStart(2, '0')}:00 = ${nf(tip.v)}` : ''}</span>
      </div>
    </div>
  );
}

/* ── Annotated new-followers area chart ────────────────────────────────
 * Each post published in the range is drawn as a CIRCLE holding the post's
 * own thumbnail, sitting on the line at that day — hover for its stats. */
export type PostMarker = { date: string; caption: string; likes: number; engagement: number; media_url?: string };
export function FollowersChart({
  points,
  markers,
  height = 280,
}: {
  points: { label: string; value: number }[];
  markers: PostMarker[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <div className="state-empty">No data for this range.</div>;
  const W = 980;
  const H = height;
  const padX = 16;
  const padTop = 34; // room for a circle sitting on a peak
  const padBot = 30;
  const vals = points.map((p) => p.value);
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);
  const span = max - min || 1;
  const idxOf = (label: string) => points.findIndex((p) => p.label === label);
  const xf = (i: number) => padX + (i / Math.max(points.length - 1, 1)) * (W - padX * 2);
  const yf = (v: number) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${xf(i).toFixed(1)},${yf(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${xf(points.length - 1).toFixed(1)},${(H - padBot).toFixed(1)} L${xf(0).toFixed(1)},${(H - padBot).toFixed(1)} Z`;

  const placed = markers.map((m) => ({ m, i: idxOf(m.date) })).filter((o) => o.i >= 0);
  // px position of each marker as % (x) + px (y); the svg is height-fixed, width-fluid
  const leftPct = (i: number) => (xf(i) / W) * 100;
  const topPx = (i: number) => yf(points[i].value);

  // x-axis: a few evenly spaced day labels
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, k, a) => a.indexOf(v) === k);

  return (
    <div className="fc-wrap" style={{ height: H }}>
      <svg className="fc-svg" viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label="new followers over time">
        <defs>
          <linearGradient id="fc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#fc-grad)" />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* post-thumbnail circles sitting on the line */}
      {placed.map(({ m, i }, k) => (
        <div
          key={k}
          className={`fc-marker${hover === k ? ' is-hover' : ''}`}
          style={{ left: `${leftPct(i)}%`, top: topPx(i) }}
          onMouseEnter={() => setHover(k)}
          onMouseLeave={() => setHover(null)}
        >
          {m.media_url ? (
            <img src={m.media_url} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          ) : (
            <span className="fc-marker-dot" />
          )}
        </div>
      ))}

      {/* x-axis day labels */}
      <div className="fc-axis">
        {ticks.map((i) => (
          <span key={i} style={{ left: `${leftPct(i)}%` }}>{fmtDay(points[i].label)}</span>
        ))}
      </div>

      {hover != null && placed[hover] && (
        <div
          className="chart-tip fc-tip"
          style={{ left: `${leftPct(placed[hover].i)}%`, top: Math.max(0, topPx(placed[hover].i) - 96), transform: `translateX(${leftPct(placed[hover].i) > 55 ? '-104%' : '4%'})` }}
        >
          <div style={{ display: 'flex', gap: 9 }}>
            {placed[hover].m.media_url && (
              <img src={placed[hover].m.media_url} alt="" width={40} height={50} referrerPolicy="no-referrer" style={{ objectFit: 'cover', borderRadius: 6, flex: 'none' }} onError={(e) => ((e.currentTarget.style.display = 'none'))} />
            )}
            <div>
              <div className="chart-tip-label">{fmtDay(placed[hover].m.date)}</div>
              <div style={{ fontSize: 12, lineHeight: 1.35, margin: '2px 0 4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{placed[hover].m.caption || '—'}</div>
              <div className="chart-tip-label">♥ {nf(placed[hover].m.likes)} · {nf(placed[hover].m.engagement)} interactions</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
