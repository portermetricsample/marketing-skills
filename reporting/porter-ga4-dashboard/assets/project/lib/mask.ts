/**
 * MASKED SAMPLE DATA ENGINE.
 *
 * This report is a fully-masked copy of a real GA4 dashboard: it contains NO
 * live data and is never allowed to hit the data plane. Instead, every
 * `porter.query()` is answered locally by `maskResult(spec)`, which synthesizes
 * a deterministic, self-consistent universe from the requested fields + range.
 *
 * Design goals:
 *  - ONE canonical daily series drives everything, so a KPI computed on one page
 *    (e.g. total sessions on Conversions) reconciles with the same metric
 *    aggregated elsewhere (Time Matrix, Audiences, Content).
 *  - Dimension breakdowns distribute the range totals by fixed share vectors, so
 *    "top N" tables are stable and internally coherent (rates don't contradict).
 *  - Period-over-period deltas fall out naturally because the series is
 *    date-seeded — the previous range yields its own deterministic numbers.
 *  - Deterministic (no Math.random) so audit renders are reproducible.
 *
 * Because query() returns these rows WITHOUT sending a bridge RPC, the cloud /
 * local audit records 0 queried charts and 0 errors → it passes with no live
 * account behind the report.
 */
import type { QuerySpec, QueryResult, ChartData } from './porter';
import { F } from './ga4';

// ── deterministic PRNG helpers ───────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function rand01(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** ±frac deterministic jitter around 1, seeded by a string. */
function jit(key: string, frac: number): number {
  return 1 + (rand01(hashStr(key)) - 0.5) * 2 * frac;
}

// ── canonical daily universe ─────────────────────────────────────────────────
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type DayStat = Record<string, number> & { date: string };

function dayStat(iso: string): DayStat {
  const dow = new Date(iso + 'T00:00:00Z').getUTCDay();
  const weekend = dow === 0 || dow === 6 ? 0.62 : 1;
  // gentle upward trend across the year so 12-month ranges look alive
  const dayIdx = Math.floor(new Date(iso + 'T00:00:00Z').getTime() / 86400000);
  const trend = 1 + ((dayIdx % 365) / 365) * 0.18;
  const sessions = Math.round(1180 * weekend * trend * jit(iso + 's', 0.16));
  const activeUsers = Math.round(sessions * 0.8 * jit(iso + 'au', 0.05));
  const totalUsers = Math.round(sessions * 0.86 * jit(iso + 'tu', 0.04));
  const newUsers = Math.round(activeUsers * 0.58 * jit(iso + 'nu', 0.08));
  const engagedSessions = Math.round(sessions * 0.63 * jit(iso + 'es', 0.06));
  const screenPageViews = Math.round(sessions * 2.4 * jit(iso + 'pv', 0.08));
  const eventCount = Math.round(sessions * 6.2 * jit(iso + 'ev', 0.07));
  const keyEvents = Math.round(sessions * 0.072 * jit(iso + 'ke', 0.14));
  const userEngagementDuration = Math.round(sessions * 82 * jit(iso + 'ed', 0.1));
  return {
    date: iso,
    [F.sessions]: sessions,
    [F.activeUsers]: activeUsers,
    [F.totalUsers]: totalUsers,
    [F.newUsers]: newUsers,
    [F.engagedSessions]: engagedSessions,
    [F.screenPageViews]: screenPageViews,
    [F.eventCount]: eventCount,
    [F.keyEvents]: keyEvents,
    [F.userEngagementDuration]: userEngagementDuration,
  } as DayStat;
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (let d = new Date(s), i = 0; d <= e && i < 800; d.setUTCDate(d.getUTCDate() + 1), i++) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out.length ? out : [start];
}

function rangeTotals(days: string[]): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const d of days) {
    const st = dayStat(d);
    for (const k of Object.keys(st)) if (k !== 'date') acc[k] = (acc[k] ?? 0) + (st[k] as number);
  }
  return acc;
}

// ── dimension catalogs (masked — generic, brand-neutral) ─────────────────────
const DIMENSIONS = new Set<string>([
  F.date, F.dayOfWeekName, F.hour, F.eventName, F.sessionDefaultChannelGroup, F.sessionSourceMedium,
  F.country, F.city, F.region, F.userAgeBracket, F.userGender, F.language, F.brandingInterest,
  F.deviceCategory, F.platform, F.browser, F.operatingSystem, F.audienceName, F.newVsReturning,
  F.pagePath, F.pageTitle, F.landingPage, F.hostName, F.searchTerm,
]);

type Cat = { rows: Array<{ label: string; extra?: Record<string, string> }>; base: number[]; conv?: number[] };

function cat(pairs: Array<[string, number]>): Cat {
  return { rows: pairs.map(([label]) => ({ label })), base: pairs.map(([, w]) => w) };
}

const COUNTRIES = cat([
  ['United States', 32], ['United Kingdom', 14], ['India', 11], ['Germany', 8], ['Canada', 7],
  ['Australia', 5.5], ['Brazil', 5], ['France', 4], ['Spain', 3.5], ['Netherlands', 3], ['Mexico', 2.6], ['Italy', 2.3],
]);
const CITY_ROWS: Array<[string, string, number]> = [
  ['New York', 'United States', 9], ['London', 'United Kingdom', 7.5], ['San Francisco', 'United States', 6],
  ['Toronto', 'Canada', 5], ['Bengaluru', 'India', 4.6], ['Berlin', 'Germany', 4], ['Sydney', 'Australia', 3.6],
  ['Paris', 'France', 3.2], ['Madrid', 'Spain', 2.8], ['Amsterdam', 'Netherlands', 2.5],
];
const CITIES: Cat = {
  rows: CITY_ROWS.map(([label, country]) => ({ label, extra: { [F.country]: country } })),
  base: CITY_ROWS.map(([, , w]) => w),
};
const CHANNELS: Cat = {
  rows: [['Organic Search'], ['Direct'], ['Paid Search'], ['Organic Social'], ['Referral'], ['Email'], ['Display'], ['Paid Social']].map(([l]) => ({ label: l })),
  base: [34, 24, 13, 9, 8, 6, 3.5, 2.5],
  conv: [30, 18, 22, 6, 7, 12, 2, 3], // paid search + email convert above their traffic share
};
const SOURCES: Cat = {
  rows: ['google / organic', '(direct) / (none)', 'google / cpc', 'bing / organic', 'newsletter / email', 'linkedin.com / referral', 't.co / referral', 'facebook / cpc', 'chatgpt.com / referral', 'duckduckgo / organic'].map((l) => ({ label: l })),
  base: [30, 22, 12, 6, 6, 5, 4, 4, 3.5, 2.5],
  conv: [26, 16, 20, 5, 12, 6, 3, 5, 4, 2],
};
const EVENTS: Cat = {
  rows: ['page_view', 'session_start', 'scroll', 'user_engagement', 'first_visit', 'view_search_results', 'click', 'form_start', 'generate_lead', 'sign_up'].map((l) => ({ label: l })),
  base: [40, 18, 12, 10, 6, 4, 4, 3, 2, 1], // eventCount distribution
  conv: [0, 0, 0, 0, 0, 0, 0, 0, 72, 28], // keyEvents only on the two key events
};
const AGES = cat([['18-24', 12], ['25-34', 31], ['35-44', 26], ['45-54', 16], ['55-64', 9], ['65+', 6]]);
const GENDERS = cat([['male', 54], ['female', 44], ['unknown', 6]]);
const LANGUAGES = cat([['en-us', 46], ['en-gb', 12], ['es-es', 8], ['de-de', 6], ['fr-fr', 5], ['pt-br', 4], ['en-in', 4], ['nl-nl', 3]]);
const INTERESTS = cat([['Technology/Analytics', 18], ['Business/Marketing', 16], ['Media & Entertainment', 12], ['Shoppers', 10], ['Software', 9], ['Finance/Investing', 7], ['Travel', 6], ['unknown', 9]]);
const DEVICES = cat([['desktop', 62], ['mobile', 33], ['tablet', 5]]);
const BROWSERS = cat([['Chrome', 58], ['Safari', 20], ['Edge', 9], ['Firefox', 6], ['Samsung Internet', 3], ['Opera', 2]]);
const OSES = cat([['Windows', 44], ['macOS', 24], ['iOS', 16], ['Android', 12], ['Linux', 4]]);
const AUDIENCES = cat([['All Users', 100], ['New users', 52], ['Returning users', 48], ['Engaged sessions', 44], ['Recently active users', 30], ['Purchasers', 6]]);
const NEWRET = cat([['new', 58], ['returning', 42]]);
const PAGES: Cat = {
  rows: ['/', '/pricing', '/features', '/blog', '/integrations', '/blog/analytics-guide', '/about', '/contact', '/signup', '/login', '/templates', '/docs', '/customers', '/blog/marketing-reports', '/dashboard'].map((l) => ({ label: l })),
  base: [22, 13, 11, 9, 8, 7, 5, 4, 4, 3.5, 3.2, 3, 2.6, 2.3, 2],
  conv: [4, 26, 8, 3, 5, 4, 1, 2, 30, 1, 3, 2, 4, 2, 5], // signups convert on /signup + /pricing
};
const TITLES = cat([['Home', 22], ['Pricing', 13], ['Features', 11], ['Blog', 9], ['Integrations', 8], ['About', 5], ['Contact', 4], ['Sign up', 4], ['Templates', 3.5], ['Docs', 3]]);
const LANDING: Cat = {
  rows: ['/', '/pricing', '/blog/analytics-guide', '/features', '/integrations', '/signup', '/templates', '/blog', '/docs', '/customers'].map((l) => ({ label: l })),
  base: [26, 14, 12, 9, 8, 6, 5, 5, 3, 2.5],
};
const SEARCH = cat([['pricing', 30], ['templates', 18], ['api', 12], ['integrations', 10], ['ga4', 8], ['dashboard', 7], ['export pdf', 6], ['looker studio', 5], ['support', 4], ['webhook', 3]]);

function catalogFor(dim: string): Cat | null {
  switch (dim) {
    case F.country: return COUNTRIES;
    case F.city: return CITIES;
    case F.sessionDefaultChannelGroup: return CHANNELS;
    case F.sessionSourceMedium: return SOURCES;
    case F.eventName: return EVENTS;
    case F.userAgeBracket: return AGES;
    case F.userGender: return GENDERS;
    case F.language: return LANGUAGES;
    case F.brandingInterest: return INTERESTS;
    case F.deviceCategory: return DEVICES;
    case F.platform: return DEVICES;
    case F.browser: return BROWSERS;
    case F.operatingSystem: return OSES;
    case F.audienceName: return AUDIENCES;
    case F.newVsReturning: return NEWRET;
    case F.pagePath: return PAGES;
    case F.pageTitle: return TITLES;
    case F.landingPage: return LANDING;
    case F.searchTerm: return SEARCH;
    case F.region: return cat([['California', 12], ['England', 10], ['Texas', 8], ['Maharashtra', 7], ['Ontario', 6], ['Bavaria', 5], ['New South Wales', 4]]);
    case F.hostName: return cat([['acmeanalytics.io', 96], ['www.acmeanalytics.io', 4]]);
    default: return null;
  }
}

// ── distribution ─────────────────────────────────────────────────────────────
function normalize(w: number[]): number[] {
  const s = w.reduce((a, b) => a + b, 0) || 1;
  return w.map((x) => x / s);
}

function isMetric(field: string): boolean {
  return !DIMENSIONS.has(field);
}

/** Round a value for a metric; engagement duration & counts stay integers. */
function r0(n: number): number {
  return Math.max(0, Math.round(n));
}

function chartData(columns: string[], rows: Record<string, unknown>[]): ChartData {
  return { columns, rows, meta: { masked: true } };
}

// ── main entry ───────────────────────────────────────────────────────────────
export function maskResult(spec: QuerySpec): QueryResult {
  const fields = spec.fields ?? [];
  const dims = fields.filter((f) => DIMENSIONS.has(f));
  const metrics = fields.filter(isMetric);
  const range = spec.date_range ?? { start: '2026-01-01', end: '2026-01-30' };
  const days = eachDay(range.start, range.end);
  const totals = rangeTotals(days);

  // 1) date series ─ one row per day
  if (dims.includes(F.date)) {
    let rows = days.map((d) => {
      const st = dayStat(d);
      const row: Record<string, unknown> = {};
      for (const f of fields) row[f] = f === F.date ? d : (st[f] as number) ?? 0;
      return row;
    });
    rows = applySort(rows, spec);
    return chartData(fields, limit(rows, spec));
  }

  // 2) day-of-week × hour heatmap
  if (dims.includes(F.dayOfWeekName) && dims.includes(F.hour)) {
    const dayW = [1, 1.32, 1.36, 1.34, 1.3, 1.18, 0.7]; // Sun..Sat (Mon–Thu peak)
    const hourCurve = Array.from({ length: 24 }, (_, h) => {
      // business-hours bell curve, low overnight
      const x = (h - 13) / 5.2;
      return 0.12 + Math.exp(-0.5 * x * x);
    });
    const gridW: number[] = [];
    const cells: Array<{ day: string; hour: number }> = [];
    for (let d = 0; d < 7; d++)
      for (let h = 0; h < 24; h++) {
        cells.push({ day: WEEKDAY[d], hour: h });
        gridW.push(dayW[d] * hourCurve[h] * jit(`${d}-${h}`, 0.12));
      }
    const wn = normalize(gridW);
    const totSess = totals[F.sessions] ?? 0;
    let rows = cells.map((c, i) => {
      const row: Record<string, unknown> = {};
      for (const f of fields) {
        if (f === F.dayOfWeekName) row[f] = c.day;
        else if (f === F.hour) row[f] = c.hour;
        else row[f] = r0(totSess * wn[i]); // sessions (only metric requested here)
      }
      return row;
    });
    rows = applySort(rows, spec);
    return chartData(fields, limit(rows, spec));
  }

  // 3) single-dimension breakdown
  if (dims.length) {
    const dim = dims[0];
    const c = catalogFor(dim);
    if (c) {
      const baseN = normalize(c.base);
      const convN = normalize(c.conv ?? c.base);
      let rows = c.rows.map((rr, i) => {
        const row: Record<string, unknown> = {};
        for (const f of fields) {
          if (f === dim) row[f] = rr.label;
          else if (rr.extra && f in rr.extra) row[f] = rr.extra[f];
          else if (DIMENSIONS.has(f)) row[f] = rr.extra?.[f] ?? '';
          else {
            const share = f === F.keyEvents ? convN[i] : baseN[i];
            row[f] = r0((totals[f] ?? 0) * share);
          }
        }
        return row;
      });
      rows = applySort(rows, spec);
      return chartData(fields, limit(rows, spec));
    }
  }

  // 4) totals — single aggregated row over the range
  const row: Record<string, unknown> = {};
  for (const f of fields) row[f] = DIMENSIONS.has(f) ? '' : r0(totals[f] ?? 0);
  return chartData(fields, [row]);
}

function applySort(rows: Record<string, unknown>[], spec: QuerySpec): Record<string, unknown>[] {
  const sort = spec.sort;
  if (!sort || !sort.length) return rows;
  const { field, direction } = sort[0];
  const dir = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

function limit(rows: Record<string, unknown>[], spec: QuerySpec): Record<string, unknown>[] {
  return spec.limit && spec.limit > 0 ? rows.slice(0, spec.limit) : rows;
}
