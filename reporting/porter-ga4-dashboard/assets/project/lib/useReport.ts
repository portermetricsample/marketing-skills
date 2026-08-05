/**
 * Report data logic — LOGIC/WIRING ONLY. These hooks handle the reactive data
 * layer (date range, period-over-period comparison, loading/error/retry) so the
 * report you build stays declarative. This file is not about visual style; style
 * lives in your components + globals.css.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  porter,
  isQueryError,
  type QuerySpec,
  type QueryResult,
  type ChartData,
  type AccountUniverse,
  type Filter,
} from './porter';

export type Preset =
  | 'today' | 'yesterday'
  | '7d' | '14d' | '28d' | '30d' | '90d' | '12m'
  | 'this_week' | 'last_week' | 'this_month' | 'last_month'
  | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year'
  | 'custom';
export type Range = { start: string; end: string };

export const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '14d', label: 'Last 14 days' },
  { id: '28d', label: 'Last 28 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'this_quarter', label: 'This quarter' },
  { id: 'last_quarter', label: 'Last quarter' },
  { id: 'this_year', label: 'This year' },
  { id: 'last_year', label: 'Last year' },
];

/** Compare mode: off, vs the previous equal-length period, or vs the same range last year. */
export type CompareMode = 'none' | 'prev' | 'year';

// Transient upstream hiccups surface as these codes; the wrapper only auto-retries
// token_expired, so the report retries them itself (a blank chart on a one-off 5xx
// is worse than a short wait).
const RETRYABLE = new Set(['unknown', 'query_failed', 'transport_error', 'rate_limited', 'blend_schema_not_warmed']);

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function presetRange(p: Exclude<Preset, 'custom'>, now = new Date()): Range {
  const end = new Date(now);
  const start = new Date(now);
  const lastDays = (n: number) => start.setDate(end.getDate() - (n - 1));
  const mondayOf = (d: Date) => {
    const x = new Date(d);
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Monday start
    return x;
  };
  switch (p) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case '7d': lastDays(7); break;
    case '14d': lastDays(14); break;
    case '28d': lastDays(28); break;
    case '30d': lastDays(30); break;
    case '90d': lastDays(90); break;
    case '12m':
      start.setFullYear(end.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      break;
    case 'this_week':
      start.setTime(mondayOf(end).getTime());
      break;
    case 'last_week': {
      const mon = mondayOf(end);
      start.setTime(mon.getTime());
      start.setDate(start.getDate() - 7);
      end.setTime(mon.getTime());
      end.setDate(end.getDate() - 1);
      break;
    }
    case 'this_month':
      start.setDate(1);
      break;
    case 'last_month':
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0); // last day of previous month
      break;
    case 'this_quarter':
      start.setMonth(end.getMonth() - (end.getMonth() % 3), 1);
      break;
    case 'last_quarter': {
      const qStart = end.getMonth() - (end.getMonth() % 3);
      start.setMonth(qStart - 3, 1);
      end.setMonth(qStart, 0);
      break;
    }
    case 'this_year':
      start.setMonth(0, 1);
      break;
    case 'last_year':
      start.setFullYear(start.getFullYear() - 1, 0, 1);
      end.setFullYear(end.getFullYear() - 1, 11, 31);
      break;
  }
  return { start: isoDay(start), end: isoDay(end) };
}

/** The same calendar range one year earlier (for "vs Last Year"). */
export function yearAgoRange(range: Range): Range {
  const shift = (s: string) => {
    const d = new Date(s + 'T00:00:00Z');
    d.setUTCFullYear(d.getUTCFullYear() - 1);
    return isoDay(d);
  };
  return { start: shift(range.start), end: shift(range.end) };
}

/** The equal-length period immediately before `range` (for % vs previous period). */
export function previousRange(range: Range): Range {
  const s = new Date(range.start + 'T00:00:00Z');
  const e = new Date(range.end + 'T00:00:00Z');
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const prevEnd = new Date(s);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  return { start: isoDay(prevStart), end: isoDay(prevEnd) };
}

// Global concurrency gate (gold-standard perf rule: cap ~6 concurrent queries,
// exponential backoff on rate_limited so a page full of charts can't stampede
// the data plane).
const MAX_CONCURRENT = 6;
let inFlight = 0;
const waiters: (() => void)[] = [];
async function acquire(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++;
    return;
  }
  await new Promise<void>((res) => waiters.push(res));
  inFlight++;
}
function release(): void {
  inFlight--;
  const next = waiters.shift();
  if (next) next();
}

async function runQuery(spec: QuerySpec): Promise<QueryResult> {
  await acquire();
  try {
    let r = await porter.query(spec);
    for (let i = 0; i < 4 && isQueryError(r) && RETRYABLE.has(r.error.code); i++) {
      const rateLimited = r.error.code === 'rate_limited';
      await new Promise((res) => setTimeout(res, (rateLimited ? 1500 : 600) * Math.pow(2, i)));
      r = await porter.query(spec);
    }
    return r;
  } finally {
    release();
  }
}

export type ReportQuery = {
  /** Current-period rows, or null while loading / on error. */
  data: ChartData | null;
  /** Previous-period rows when `compare` is on (for deltas), else null. */
  prev: ChartData | null;
  loading: boolean;
  /** Human-readable error message, or null. */
  error: string | null;
  /** True when the query was skipped because the account selector is empty (no
   *  source accounts selected). Charts can render a "select an account" state
   *  instead of an error. */
  empty: boolean;
  retry: () => void;
};

type QueryState = { data: ChartData | null; prev: ChartData | null; loading: boolean; error: string | null; empty: boolean };

/**
 * Reactive data query. Re-runs whenever `base`, `range` or `compare` change.
 * When `compare` is true it also fetches the previous equal-length period so you
 * can show % deltas. Every query() MUST include `accounts` (or a blend id) — that
 * lives in `base`. Retries transient upstream errors.
 *
 * If `base.accounts` is a defined-but-empty array (and there's no blend id) the
 * query is SKIPPED, not fired — an empty accounts list is a server-side
 * bad_request. This is the cold-load state before useAccounts() resolves, and the
 * deselect-all state; the hook resolves to `{ empty: true }` and re-runs once the
 * selection is non-empty (accounts is part of the effect key).
 */
export function useReportQuery(
  base: Omit<QuerySpec, 'date_range'>,
  range: Range,
  compare: boolean | CompareMode = false
): ReportQuery {
  const mode: CompareMode = compare === true ? 'prev' : compare === false ? 'none' : compare;
  const [state, setState] = useState<QueryState>({
    data: null,
    prev: null,
    loading: true,
    error: null,
    empty: false,
  });
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify({ base, range, compare });

  useEffect(() => {
    let alive = true;
    const noAccounts =
      Array.isArray(base.accounts) && base.accounts.length === 0 && !base.blend_query_destination_id;
    if (noAccounts) {
      setState({ data: null, prev: null, loading: false, error: null, empty: true });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null, empty: false }));
    (async () => {
      const prevRange = mode === 'year' ? yearAgoRange(range) : previousRange(range);
      const [cur, prev] = await Promise.all([
        runQuery({ ...base, date_range: range }),
        mode !== 'none' ? runQuery({ ...base, date_range: prevRange }) : Promise.resolve(null as QueryResult | null),
      ]);
      if (!alive) return;
      if (isQueryError(cur)) {
        const e = cur.error;
        setState({ data: null, prev: null, loading: false, error: e.message?.trim() || `Query failed (${e.code}).`, empty: false });
        return;
      }
      setState({ data: cur, prev: prev && !isQueryError(prev) ? prev : null, loading: false, error: null, empty: false });
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

/**
 * Date-range state for the report's own DateRangeControl. Owns preset/custom and
 * mirrors the active range into the wrapper URL (deep-link / share / PDF) via
 * porter.emitState — no wrapper round-trip; the report is the source of truth.
 */
export function useDateRange(initial: Preset = '30d') {
  // seed from the wrapper URL state so deep-links / refresh keep the range
  const seeded = typeof window !== 'undefined' ? (porter.initialState as { start?: string; end?: string } | undefined) : undefined;
  const [preset, setPreset] = useState<Preset>(seeded?.start && seeded?.end ? 'custom' : initial);
  const [custom, setCustom] = useState<Range>(() =>
    seeded?.start && seeded?.end ? { start: seeded.start, end: seeded.end } : presetRange('30d')
  );
  const range: Range = preset === 'custom' ? custom : presetRange(preset);
  return { preset, setPreset, custom, setCustom, range };
}

/**
 * Source-account selector state. Fetches the report's account universe (its
 * declared accounts_used) once and holds the selected ids — default: ALL, so the
 * report uses every configured account until the viewer narrows it.
 *
 * SINGLE-SOURCE report — spread `accounts` into your query base:
 *
 *   const { accounts, ...sel } = useAccounts();
 *   const q = useReportQuery({ connector: 'facebook-ads', accounts, fields }, range);
 *   // <AccountSelector universe={sel.universe} selectedIds={sel.selectedIds}
 *   //                  setSelectedIds={sel.setSelectedIds} />
 *
 * MULTI-SOURCE report — pass PER-CONNECTOR accounts with accountsFor(connector),
 * so a Facebook chart never gets Google account ids (a flat `accounts` would leak
 * every selected id into every chart):
 *
 *   const { accountsFor, ...sel } = useAccounts();
 *   const fb = useReportQuery({ connector: 'facebook-ads', accounts: accountsFor('facebook-ads'), fields }, range);
 *   const ga = useReportQuery({ connector: 'google-ads',   accounts: accountsFor('google-ads'),   fields }, range);
 *
 * It is NOT a filter: the selection scopes which source accounts the queries run
 * against (bounded by accounts_used). When nothing is selected, useReportQuery
 * skips the query and reports `{ empty: true }` (no failing round-trip).
 */
export function useAccounts() {
  const [universe, setUniverse] = useState<AccountUniverse>({ accounts: [], by_connector: {}, connectors: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    porter.getAccounts().then((u) => {
      if (!alive) return;
      setUniverse(u);
      setSelectedIds(u.accounts.map((a) => a.id)); // default: all selected
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  // Query-ready account refs ({id}); the plane resolves each id to its trusted
  // stored account, so passing just the id is enough (and safe).
  const accounts = selectedIds.map((id) => ({ id }));
  // Per-connector refs for multi-source reports: only the selected ids that
  // belong to `connector`. Feed this into each chart's query so connectors stay
  // isolated (the runtime also drops cross-connector ids as defense-in-depth).
  const accountsFor = useCallback(
    (connector: string) =>
      selectedIds.filter((id) => (universe.by_connector[connector] ?? []).includes(id)).map((id) => ({ id })),
    [selectedIds, universe]
  );
  return { universe, selectedIds, setSelectedIds, accounts, accountsFor, ready };
}

/** Operators supported by a dimension filter (subset of the server's OPERATOR_MAP). */
export type FilterOp = 'equals' | 'not_equals' | 'in' | 'not_in' | 'contains' | 'not_contains';

/**
 * Dimension-value filter state (e.g. "filter this report to a campaign"). This is
 * a REAL, server-side filter: the returned `filters` go into your query base and
 * reach GetData as `dimensionsFilters` — do NOT fetch all rows and filter them in
 * JS (that breaks with the row limit + server aggregation and never scales).
 *
 *   const { value, setValue, filters } = useFilter('campaign_name');
 *   const opts = useDimensionValues('campaign_name', { accounts, range });
 *   const q = useReportQuery({ connector: 'facebook-ads', accounts, fields, filters }, range);
 *   // <FilterSelect label="Campaign" value={value} setValue={setValue} options={opts.values} />
 *
 * `value = null`/`''`/`[]` means "All" → `filters` is undefined → no filter → all rows.
 * Use `operator: 'in'` with a string[] value for a multi-select filter.
 */
export function useFilter(field: string, operator: FilterOp = 'equals') {
  const [value, setValue] = useState<string | string[] | null>(null);
  const isEmpty = value == null || (Array.isArray(value) ? value.length === 0 : value === '');
  const filters: Filter[][] | undefined = isEmpty
    ? undefined
    : [[{ fieldName: field, operator, values: Array.isArray(value) ? value : [value] }]];
  return { value, setValue, filters };
}

/**
 * Distinct values of a dimension, for populating a filter dropdown's options. Runs
 * ONE lightweight query for just that dimension (bounded by `limit`, default 1000)
 * and de-dupes client-side — this only builds the options list; the actual report
 * filtering stays server-side via useFilter's `filters`. Re-runs when field,
 * accounts or range change. Skips until `accounts` is non-empty (mirrors useReportQuery).
 */
export function useDimensionValues(
  field: string,
  opts: { accounts?: Array<{ id: string }>; range: Range; connector?: string; limit?: number }
): { values: string[]; loading: boolean } {
  const { accounts, range, connector, limit = 1000 } = opts;
  const [values, setValues] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const key = JSON.stringify({ field, accounts, range, connector, limit });
  useEffect(() => {
    if (Array.isArray(accounts) && accounts.length === 0) {
      setValues([]);
      return;
    }
    let alive = true;
    setLoading(true);
    porter.query({ connector, accounts, fields: [field], date_range: range, limit }).then((r) => {
      if (!alive) return;
      setLoading(false);
      if (isQueryError(r)) {
        setValues([]);
        return;
      }
      const seen = new Set<string>();
      for (const row of r.rows) {
        const v = row[field];
        if (v != null && v !== '') seen.add(String(v));
      }
      setValues(Array.from(seen).sort((a, b) => a.localeCompare(b)));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { values, loading };
}

// ---- number helpers ----
export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function sumField(d: ChartData | null, field: string): number {
  if (!d) return 0;
  return d.rows.reduce((s, r) => s + num(r[field]), 0);
}
/** % change of cur vs prev, or null when prev is 0/absent. */
export function deltaPct(cur: number, prev: number): number | null {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
}
