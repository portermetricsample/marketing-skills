/**
 * Interactive charts — dependency-free SVG with hover tooltips, Y-axis value
 * gridlines and first/last X labels (Google-look). Colors come from CSS vars /
 * props so they follow the skin.
 */
import { useRef, useState } from 'react';

type Point = { label: string; value: number };
type Fmt = (n: number) => string;

const defaultFmt: Fmt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);

export function LineChart({
  points,
  prev,
  color = 'var(--accent)',
  height = 200,
  format = defaultFmt,
  yLabel,
}: {
  points: Point[];
  /** previous-period series (dashed overlay), aligned by index */
  prev?: Point[];
  color?: string;
  height?: number;
  format?: Fmt;
  /** Y-axis unit label, e.g. "Key events" */
  yLabel?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  if (!points.length) return <div className="state-empty">No data for this range.</div>;

  const W = 960;
  const H = height;
  const padL = 62, padR = 12, padT = yLabel ? 26 : 12, padB = 22;
  const vals = points.map((p) => p.value);
  const prevVals = (prev ?? []).map((p) => p.value);
  const max = Math.max(1, ...vals, ...prevVals);
  const min = Math.min(0, ...vals, ...prevVals);
  const x = (i: number) => padL + (i / Math.max(points.length - 1, 1)) * (W - padL - padR);
  const y = (v: number) => padT + ((max - v) / (max - min || 1)) * (H - padT - padB);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padB} L${x(0).toFixed(1)},${H - padB} Z`;
  // previous-period overlay: align by index across the same number of buckets
  const px = (i: number, n: number) => padL + (i / Math.max(n - 1, 1)) * (W - padL - padR);
  const prevLine = (prev ?? [])
    .map((p, i) => `${i ? 'L' : 'M'}${px(i, prev!.length).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ');

  const ticks = [max, (max + min) / 2, min];

  const onMove = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((rel - padL) / (W - padL - padR)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  const gid = `lg-${Math.round(max)}-${points.length}`;
  return (
    <div ref={wrapRef} className="chart-wrap" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="line chart" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.24" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yLabel && (
          <text x={2} y={13} textAnchor="start" fontSize="11" fill="var(--muted)">
            {yLabel}
          </text>
        )}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="var(--row-line)" strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 3.5} textAnchor="end" fontSize="11" fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        <text x={padL} y={H - 6} textAnchor="start" fontSize="11" fill="var(--muted)">
          {points[0].label}
        </text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="11" fill="var(--muted)">
          {points[points.length - 1].label}
        </text>
        <path d={area} fill={`url(#${gid})`} />
        {prevLine && (
          <path d={prevLine} fill="none" stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="4 4" strokeLinejoin="round" strokeLinecap="round" opacity="0.75" />
        )}
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && (
          <>
            <line x1={x(hover)} y1={padT} x2={x(hover)} y2={H - padB} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(points[hover].value)} r="4" fill={color} stroke="var(--panel)" strokeWidth="2" />
          </>
        )}
      </svg>
      {hover != null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})` }}
        >
          <div className="chart-tip-label">{points[hover].label}</div>
          <div className="chart-tip-value">{format(points[hover].value)}</div>
          {prev && prev[Math.round((hover / Math.max(points.length - 1, 1)) * (prev.length - 1))] != null && (
            <div className="chart-tip-prev">
              prev: {format(prev[Math.round((hover / Math.max(points.length - 1, 1)) * (prev.length - 1))].value)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BarChart({
  points,
  format = defaultFmt,
  max: maxProp,
  caption,
}: {
  points: Point[];
  format?: Fmt;
  max?: number;
  /** small axis caption under the bars, e.g. "Active users" */
  caption?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (!points.length) return <div className="state-empty">No data for this range.</div>;
  const max = Math.max(1, maxProp ?? Math.max(...points.map((p) => p.value)));
  return (
    <div>
      <div className="bars">
        {points.map((p, i) => (
          <div key={i} className={`bar-row${hover === i ? ' is-hover' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="bar-label" title={p.label}>
              {p.label}
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(p.value / max) * 100}%` }} />
            </div>
            <div className="bar-value">{format(p.value)}</div>
          </div>
        ))}
      </div>
      {caption && <div className="bars-caption">{caption}</div>}
    </div>
  );
}
