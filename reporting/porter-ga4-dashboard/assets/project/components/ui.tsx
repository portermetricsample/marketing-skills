/**
 * UI primitives — LOGIC/WIRING ONLY. These give you loading/error/empty handling
 * and a KPI-with-delta for free. The look is a neutral placeholder built on the
 * design tokens in styles/globals.css — RESTYLE EVERYTHING to the brand/report you
 * are building. Do not ship this exact look.
 */
import type { ReactNode } from 'react';

/** A pulsing placeholder box. Use for skeleton loaders. */
export function Skeleton({ height = 16, width = '100%', radius = 8 }: { height?: number | string; width?: number | string; radius?: number }) {
  return <div className="skeleton" style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

/** A few stacked skeleton lines (chart placeholder). */
export function SkeletonChart({ height = 160 }: { height?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton height={height} radius={12} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton height={12} width="20%" />
        <Skeleton height={12} width="20%" />
        <Skeleton height={12} width="20%" />
      </div>
    </div>
  );
}

/**
 * Wraps any data view with uniform loading (skeleton) / error (with retry) /
 * empty / data states. Pass a query from useReportQuery. This makes skeleton +
 * error handling the DEFAULT — always use it around a chart or table.
 */
export function ChartFrame({
  title,
  loading,
  error,
  retry,
  empty,
  skeletonHeight = 160,
  children,
}: {
  title?: string;
  loading: boolean;
  error: string | null;
  retry?: () => void;
  /** true when the query succeeded but returned no rows. */
  empty?: boolean;
  skeletonHeight?: number;
  children: ReactNode;
}) {
  return (
    <div className="card">
      {title && <div className="card-title">{title}</div>}
      {loading ? (
        <SkeletonChart height={skeletonHeight} />
      ) : error ? (
        <div className="state-error">
          <span>{error}</span>
          {retry && (
            <button className="btn-ghost" onClick={retry}>
              Retry
            </button>
          )}
        </div>
      ) : empty ? (
        <div className="state-empty">No data for this range.</div>
      ) : (
        children
      )}
    </div>
  );
}

/** A KPI value with an optional delta vs the previous period. */
export function KpiValue({
  label,
  value,
  delta,
  loading,
  /** when true, a negative delta is "good" (e.g. cost per lead going down). */
  lowerIsBetter,
}: {
  label: string;
  value: string;
  delta?: number | null;
  loading?: boolean;
  lowerIsBetter?: boolean;
}) {
  const up = delta != null && delta >= 0;
  const good = delta == null ? undefined : lowerIsBetter ? !up : up;
  return (
    <div className="card kpi-card">
      <div className="kpi-label">{label}</div>
      {loading ? (
        <Skeleton height={30} width="70%" />
      ) : (
        <>
          <div className="kpi">{value}</div>
          {delta != null && (
            <div className={`kpi-delta ${good ? 'is-up' : 'is-down'}`}>
              {up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% <span className="kpi-delta-note">vs prev.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Insights block — closes every page with 3-6 sentences computed from the
 * queried data at render time (never hardcoded numbers). Hidden while empty.
 */
export function Insights({ items }: { items: (string | null | undefined)[] }) {
  const sentences = items.filter(Boolean) as string[];
  if (!sentences.length) return null;
  return (
    <div className="insights">
      <div className="insights-label">Insights</div>
      <p>{sentences.join(' ')}</p>
    </div>
  );
}
