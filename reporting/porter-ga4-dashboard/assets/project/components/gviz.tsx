/**
 * Google-look visual components shared by the report views:
 *  - Donut          — SVG donut with legend (Google categorical palette)
 *  - DayHourHeatmap — day-of-week × hour grid, blue heat ramp
 *  - TimeMatrix     — metrics (rows) × periods (columns), newest first, leading
 *                     Total, per-row heat. Logic ported from porter-reporting's
 *                     charts/breakdown-matrix (time breakdown), restyled to the
 *                     Google blue tonal ramp instead of design-system tokens.
 */
import { useMemo, useState } from 'react';

/** Google categorical chart palette (GA4-style: blue first). */
export const GOOGLE_SERIES = ['#1a73e8', '#e8710a', '#f9ab00', '#1e8e3e', '#d01884', '#9334e6', '#12b5cb', '#ea4335'];

/**
 * Blue tonal heat ramp — resolved through CSS variables (--heat-1..5 /
 * --heat-ink-1..5) so both the light and dark themes define their own ramp.
 */
export function heatColor(v: number, min: number, max: number): { bg: string; ink: string } {
  if (!isFinite(v) || max <= min) return { bg: 'transparent', ink: 'var(--ink)' };
  const t = (v - min) / (max - min);
  const i = 1 + Math.max(0, Math.min(4, Math.floor(t * 5)));
  return { bg: `var(--heat-${i})`, ink: `var(--heat-ink-${i})` };
}

// ── Donut ────────────────────────────────────────────────────────────────────
export function Donut({
  slices,
  format = (n) => new Intl.NumberFormat('en-US').format(Math.round(n)),
  centerLabel,
}: {
  slices: { label: string; value: number }[];
  format?: (n: number) => string;
  centerLabel?: string;
}) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="state-empty">No data for this range.</div>;
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" width="150" height="150" role="img" aria-label="donut chart">
        {slices.map((s, i) => {
          const frac = s.value / total;
          const off = acc; acc += frac;
          return (
            <circle
              key={i} cx="70" cy="70" r={R} fill="none"
              stroke={GOOGLE_SERIES[i % GOOGLE_SERIES.length]} strokeWidth="16"
              strokeDasharray={`${Math.max(frac * C - 1.5, 0.01)} ${C}`}
              strokeDashoffset={-off * C}
              transform="rotate(-90 70 70)"
            />
          );
        })}
        <text x="70" y="68" textAnchor="middle" className="donut-center">{format(total)}</text>
        {centerLabel && <text x="70" y="82" textAnchor="middle" className="donut-center-label">{centerLabel}</text>}
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div className="leg" key={i}>
            <span className="dot" style={{ background: GOOGLE_SERIES[i % GOOGLE_SERIES.length] }} />
            <span>{s.label}</span>
            <span className="leg-val">{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day × hour heatmap ───────────────────────────────────────────────────────
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export function DayHourHeatmap({
  rows,
  dayField,
  hourField,
  valueField,
  format = (n) => new Intl.NumberFormat('en-US').format(Math.round(n)),
}: {
  rows: Record<string, unknown>[];
  dayField: string;
  hourField: string;
  valueField: string;
  format?: (n: number) => string;
}) {
  const { days, cells, max } = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const r of rows) {
      const raw = String(r[dayField] ?? '').toLowerCase();
      const day = DAY_ORDER.find((d) => raw.startsWith(d.slice(0, 3))) ?? raw;
      const hour = Number(r[hourField]);
      const v = Number(r[valueField]) || 0;
      if (!isFinite(hour) || hour < 0 || hour > 23 || !day) continue;
      if (!map.has(day)) map.set(day, new Array(24).fill(0));
      map.get(day)![hour] += v;
    }
    const known = DAY_ORDER.filter((d) => map.has(d));
    const days = known.length ? known : Array.from(map.keys()).slice(0, 7);
    let max = 0;
    for (const d of days) for (const v of map.get(d) ?? []) max = Math.max(max, v);
    return { days, cells: map, max };
  }, [rows, dayField, hourField, valueField]);

  if (!days.length || !max) return <div className="state-empty">No data for this range.</div>;
  return (
    <div className="heatmap" style={{ gridTemplateColumns: `52px repeat(24, 1fr)` }}>
      <div />
      {Array.from({ length: 24 }, (_, h) => (
        <div key={h} className="hm-hour">{h % 3 === 0 ? h : ''}</div>
      ))}
      {days.map((d) => (
        <DayRow key={d} label={DAY_SHORT[d] ?? d} values={cells.get(d) ?? []} max={max} format={format} />
      ))}
    </div>
  );
}

function DayRow({ label, values, max, format }: { label: string; values: number[]; max: number; format: (n: number) => string }) {
  return (
    <>
      <div className="hm-label">{label}</div>
      {Array.from({ length: 24 }, (_, h) => {
        const v = values[h] ?? 0;
        const { bg } = heatColor(v, 0, max);
        return <div key={h} className="hm-cell" style={{ background: v ? bg : 'var(--hover)' }} title={`${label} ${h}:00 — ${format(v)}`} />;
      })}
    </>
  );
}

// ── Time matrix (metrics × periods) ─────────────────────────────────────────
export type Granularity = 'day' | 'week' | 'month' | 'quarter';

export type MatrixMetric = {
  key: string;
  label: string;
  group?: string;
  format: (n: number) => string;
  /** derive the display value from the aggregated base sums; default: sum of `key` */
  value?: (sums: Record<string, number>) => number;
  /** heat: lower is better (e.g. average position) */
  invert?: boolean;
};

const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function parseDay(s: unknown): number | null {
  const t = String(s ?? '').replace(new RegExp('-', 'g'), '');
  if (t.length < 8) return null;
  const y = +t.slice(0, 4), m = +t.slice(4, 6), d = +t.slice(6, 8);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}
export function periodStart(ms: number, g: Granularity): number {
  const dt = new Date(ms), y = dt.getUTCFullYear(), mo = dt.getUTCMonth();
  if (g === 'day') return ms;
  if (g === 'month') return Date.UTC(y, mo, 1);
  if (g === 'quarter') return Date.UTC(y, mo - (mo % 3), 1);
  const off = (dt.getUTCDay() + 6) % 7; // Monday start
  return ms - off * 86400000;
}
export function periodLabel(ms: number, g: Granularity): string {
  const dt = new Date(ms), y = dt.getUTCFullYear(), mo = dt.getUTCMonth(), day = dt.getUTCDate();
  if (g === 'day') return `${MONS[mo]} ${day}`;
  if (g === 'month') return `${MONS[mo]} ${y}`;
  if (g === 'quarter') return `Q${Math.floor(mo / 3) + 1} ${y}`;
  const e = new Date(ms + 6 * 86400000);
  return `${MONS[mo]} ${day} – ${MONS[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

export function TimeMatrix({
  rows,
  dateField,
  baseFields,
  metrics,
  initialGranularity = 'week',
}: {
  rows: Record<string, unknown>[];
  dateField: string;
  /** raw count fields to aggregate per period */
  baseFields: string[];
  metrics: MatrixMetric[];
  initialGranularity?: Granularity;
}) {
  const [gran, setGran] = useState<Granularity>(initialGranularity);

  const { periods, totals } = useMemo(() => {
    const buckets = new Map<number, Record<string, number>>();
    const grand: Record<string, number> = {};
    for (const f of baseFields) grand[f] = 0;
    for (const r of rows) {
      const ms = parseDay(r[dateField]);
      if (ms == null) continue;
      const p = periodStart(ms, gran);
      if (!buckets.has(p)) {
        const o: Record<string, number> = {};
        for (const f of baseFields) o[f] = 0;
        buckets.set(p, o);
      }
      const o = buckets.get(p)!;
      for (const f of baseFields) {
        const v = Number(r[f]) || 0;
        o[f] += v;
        grand[f] += v;
      }
    }
    const periods = Array.from(buckets.entries())
      .sort((a, b) => b[0] - a[0]) // newest first
      .map(([ms, sums]) => ({ ms, label: periodLabel(ms, gran), sums }));
    return { periods, totals: grand };
  }, [rows, dateField, baseFields, gran]);

  if (!periods.length) return <div className="state-empty">No data for this range.</div>;

  const valueOf = (m: MatrixMetric, sums: Record<string, number>) => (m.value ? m.value(sums) : sums[m.key] ?? 0);

  // group rows: emit a group header when the group changes
  const rowsOut: { type: 'group'; label: string }[] | any = [];
  let lastGroup: string | undefined;
  for (const m of metrics) {
    if (m.group && m.group !== lastGroup) {
      rowsOut.push({ type: 'group', label: m.group });
      lastGroup = m.group;
    }
    rowsOut.push({ type: 'metric', m });
  }

  const GRANS: Granularity[] = ['day', 'week', 'month', 'quarter'];
  return (
    <div>
      <div className="chips" style={{ marginBottom: 12 }} role="group" aria-label="View by">
        {GRANS.map((g) => (
          <button key={g} className={gran === g ? 'chip chip--on' : 'chip'} onClick={() => setGran(g)}>
            {g[0].toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="mx-metric">Metric</th>
              <th>Total</th>
              {periods.map((p) => (
                <th key={p.ms}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsOut.map((r: any, i: number) =>
              r.type === 'group' ? (
                <tr className="mx-group" key={`g${i}`}>
                  <td colSpan={periods.length + 2}>{r.label}</td>
                </tr>
              ) : (
                <MatrixRow key={r.m.key} metric={r.m} periods={periods} totals={totals} valueOf={valueOf} />
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixRow({
  metric,
  periods,
  totals,
  valueOf,
}: {
  metric: MatrixMetric;
  periods: { ms: number; label: string; sums: Record<string, number> }[];
  totals: Record<string, number>;
  valueOf: (m: MatrixMetric, sums: Record<string, number>) => number;
}) {
  const vals = periods.map((p) => valueOf(metric, p.sums));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return (
    <tr>
      <td className="mx-metric">{metric.label}</td>
      <td className="mx-total">{metric.format(valueOf(metric, totals))}</td>
      {periods.map((p, i) => {
        const { bg, ink } = heatColor(metric.invert ? max + min - vals[i] : vals[i], min, max);
        return (
          <td key={p.ms}>
            <span className="mx-cell" style={{ background: bg, color: ink, padding: '3px 7px', display: 'inline-block' }}>
              {metric.format(vals[i])}
            </span>
          </td>
        );
      })}
    </tr>
  );
}


// ── Trend explorer (metric pills × granularity pills + prev-period overlay) ──
export type TrendMetric = {
  id: string;
  label: string;
  format: (n: number) => string;
  color?: string;
  /** value from the aggregated base sums of one period bucket */
  value: (sums: Record<string, number>) => number;
};

function bucketize(
  rows: Record<string, unknown>[],
  dateField: string,
  baseFields: string[],
  g: Granularity
): { ms: number; label: string; sums: Record<string, number> }[] {
  const buckets = new Map<number, Record<string, number>>();
  for (const r of rows) {
    const ms = parseDay(r[dateField]);
    if (ms == null) continue;
    const p = periodStart(ms, g);
    if (!buckets.has(p)) {
      const o: Record<string, number> = {};
      for (const f of baseFields) o[f] = 0;
      buckets.set(p, o);
    }
    const o = buckets.get(p)!;
    for (const f of baseFields) o[f] += Number(r[f]) || 0;
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0]) // oldest → newest for a time axis
    .map(([ms, sums]) => ({ ms, label: periodLabel(ms, g), sums }));
}

export function TrendExplorer({
  rows,
  prevRows,
  dateField,
  baseFields,
  metrics,
  LineChart,
  granularities = ['day', 'week', 'month'],
  initialGranularity = 'day',
}: {
  rows: Record<string, unknown>[];
  /** previous-period rows (dashed overlay); omit or empty to hide the overlay */
  prevRows?: Record<string, unknown>[];
  dateField: string;
  baseFields: string[];
  metrics: TrendMetric[];
  /** the skin's LineChart component (avoids a circular import) */
  LineChart: (props: {
    points: { label: string; value: number }[];
    prev?: { label: string; value: number }[];
    color?: string;
    format?: (n: number) => string;
    yLabel?: string;
  }) => JSX.Element;
  granularities?: Granularity[];
  initialGranularity?: Granularity;
}) {
  const [metricId, setMetricId] = useState(metrics[0]?.id);
  const [gran, setGran] = useState<Granularity>(initialGranularity);
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const cur = useMemo(() => bucketize(rows, dateField, baseFields, gran), [rows, dateField, baseFields, gran]);
  const prev = useMemo(
    () => (prevRows && prevRows.length ? bucketize(prevRows, dateField, baseFields, gran) : []),
    [prevRows, dateField, baseFields, gran]
  );

  const points = cur.map((b) => ({ label: b.label, value: metric.value(b.sums) }));
  const prevPoints = prev.map((b) => ({ label: b.label, value: metric.value(b.sums) }));

  return (
    <div>
      <div className="trend-controls">
        <div className="pills" role="group" aria-label="Metric">
          {metrics.map((m) => (
            <button key={m.id} className={m.id === metric.id ? 'pill pill--on' : 'pill'} onClick={() => setMetricId(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="pills" role="group" aria-label="Granularity">
          {granularities.map((g) => (
            <button key={g} className={g === gran ? 'pill pill--on' : 'pill'} onClick={() => setGran(g)}>
              {g[0].toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {points.length ? (
        <LineChart
          points={points}
          prev={prevPoints.length ? prevPoints : undefined}
          color={metric.color}
          format={metric.format}
          yLabel={metric.label}
        />
      ) : (
        <div className="state-empty">No data for this range.</div>
      )}
    </div>
  );
}
