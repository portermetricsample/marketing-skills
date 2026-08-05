/**
 * Google Search Console report — account, fields and analysis helpers.
 * Field ids come from list_fields(connector="google-search-console").
 * CTR is derived client-side (clicks/impressions); position is aggregated
 * impression-weighted when combining rows client-side.
 */

export const CONNECTOR = 'google-search-console';

// Native property id (canonical allowlist id) — NOT the signed MCP ref.
export const ACCOUNTS = [
  {
    id: 'sc-domain:acmeanalytics.io',
    name: 'sc-domain:acmeanalytics.io',
    component_name: CONNECTOR,
    source_user_id: 'masked',
    company_id: 'masked',
  },
];

export const F = {
  date: 'google_search_console_date',
  query: 'google_search_console_query',
  page: 'google_search_console_page',
  country: 'google_search_console_country',
  device: 'google_search_console_device',
  clicks: 'google_search_console_clicks',
  impressions: 'google_search_console_impressions',
  position: 'google_search_console_position',
} as const;

// Search Console metric palette — CSS vars so dark mode can lighten them
// (light/dark values live in styles/globals.css).
export const C = {
  clicks: 'var(--m-clicks)',
  impressions: 'var(--m-impressions)',
  ctr: 'var(--m-ctr)',
  position: 'var(--m-position)',
} as const;

export type Row = Record<string, unknown>;

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
export function int(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}
export function compact(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}
export function posFmt(n: number): string {
  return n ? n.toFixed(1) : '—';
}
export function ctrOf(clicks: number, impressions: number): number {
  return impressions ? (clicks / impressions) * 100 : 0;
}

/** Impression-weighted average position across rows. */
export function wPosition(rows: Array<{ impressions: number; position: number }>): number {
  let wp = 0;
  let w = 0;
  for (const r of rows) {
    if (r.position > 0 && r.impressions > 0) {
      wp += r.position * r.impressions;
      w += r.impressions;
    }
  }
  return w ? wp / w : 0;
}

/** Normalize a raw query/page row into typed numbers. */
export function normRow(r: Row) {
  return {
    query: String(r[F.query] ?? ''),
    page: String(r[F.page] ?? ''),
    clicks: num(r[F.clicks]),
    impressions: num(r[F.impressions]),
    position: num(r[F.position]),
  };
}
export type NRow = ReturnType<typeof normRow>;

// ---- Branded split ------------------------------------------------------
const BRAND_TOKENS = ['acme'];
export function isBranded(q: string): boolean {
  const s = q.toLowerCase();
  return BRAND_TOKENS.some((t) => s.includes(t));
}

// ---- CTR-by-position benchmark curve ------------------------------------
/** Impression-weighted CTR per rounded position 1..20 from query rows. */
export function ctrCurve(rows: NRow[]): { pos: number; ctr: number; impressions: number }[] {
  const buckets = new Map<number, { clicks: number; impressions: number }>();
  for (const r of rows) {
    const p = Math.round(r.position);
    if (p < 1 || p > 20 || r.impressions <= 0) continue;
    const b = buckets.get(p) ?? { clicks: 0, impressions: 0 };
    b.clicks += r.clicks;
    b.impressions += r.impressions;
    buckets.set(p, b);
  }
  const out: { pos: number; ctr: number; impressions: number }[] = [];
  for (let p = 1; p <= 20; p++) {
    const b = buckets.get(p);
    if (b && b.impressions > 0) out.push({ pos: p, ctr: ctrOf(b.clicks, b.impressions), impressions: b.impressions });
  }
  return out;
}

/** Expected CTR at a (fractional) position from the curve, linear on rounded buckets. */
export function expectedCtr(curve: { pos: number; ctr: number }[], position: number): number | null {
  if (!curve.length) return null;
  const p = Math.round(position);
  const exact = curve.find((c) => c.pos === p);
  if (exact) return exact.ctr;
  let best: { pos: number; ctr: number } | null = null;
  for (const c of curve) {
    if (!best || Math.abs(c.pos - p) < Math.abs(best.pos - p)) best = c;
  }
  return best ? best.ctr : null;
}

// ---- Keyword cannibalization ---------------------------------------------
export type CannibalGroup = {
  query: string;
  clicks: number;
  impressions: number;
  pages: NRow[];
  /** share of impressions NOT captured by the top page (0..1) — fragmentation. */
  fragmentation: number;
};

/**
 * Group query+page rows by query; keep queries served by 2+ pages where the
 * secondary pages have real weight (>=15% of impressions or >=5 clicks).
 */
export function cannibalGroups(rows: NRow[]): CannibalGroup[] {
  const by = new Map<string, NRow[]>();
  for (const r of rows) {
    if (!r.query || !r.page) continue;
    const list = by.get(r.query) ?? [];
    list.push(r);
    by.set(r.query, list);
  }
  const out: CannibalGroup[] = [];
  for (const [query, pages] of by) {
    if (pages.length < 2) continue;
    const sorted = [...pages].sort((a, b) => b.impressions - a.impressions);
    const impressions = sorted.reduce((s, p) => s + p.impressions, 0);
    const clicks = sorted.reduce((s, p) => s + p.clicks, 0);
    if (impressions <= 0) continue;
    const rest = impressions - sorted[0].impressions;
    const restClicks = clicks - sorted[0].clicks;
    const fragmentation = rest / impressions;
    if (fragmentation < 0.15 && restClicks < 5) continue;
    out.push({ query, clicks, impressions, pages: sorted, fragmentation });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}

// ---- Countries ------------------------------------------------------------
const A3: Record<string, string> = {
  usa: 'United States', gbr: 'United Kingdom', can: 'Canada', aus: 'Australia', ind: 'India',
  deu: 'Germany', fra: 'France', esp: 'Spain', ita: 'Italy', nld: 'Netherlands', bra: 'Brazil',
  mex: 'Mexico', arg: 'Argentina', col: 'Colombia', chl: 'Chile', per: 'Peru', ecu: 'Ecuador',
  ury: 'Uruguay', ven: 'Venezuela', bol: 'Bolivia', cri: 'Costa Rica', pan: 'Panama', dom: 'Dominican Rep.',
  gtm: 'Guatemala', hnd: 'Honduras', slv: 'El Salvador', nic: 'Nicaragua', pry: 'Paraguay', pri: 'Puerto Rico',
  prt: 'Portugal', irl: 'Ireland', bel: 'Belgium', che: 'Switzerland', aut: 'Austria', swe: 'Sweden',
  nor: 'Norway', dnk: 'Denmark', fin: 'Finland', pol: 'Poland', cze: 'Czechia', rou: 'Romania',
  hun: 'Hungary', grc: 'Greece', bgr: 'Bulgaria', hrv: 'Croatia', srb: 'Serbia', svk: 'Slovakia',
  ukr: 'Ukraine', rus: 'Russia', tur: 'Turkey', isr: 'Israel', are: 'United Arab Emirates', sau: 'Saudi Arabia',
  qat: 'Qatar', egy: 'Egypt', zaf: 'South Africa', nga: 'Nigeria', ken: 'Kenya', mar: 'Morocco',
  jpn: 'Japan', kor: 'South Korea', chn: 'China', twn: 'Taiwan', hkg: 'Hong Kong', sgp: 'Singapore',
  mys: 'Malaysia', tha: 'Thailand', vnm: 'Vietnam', phl: 'Philippines', idn: 'Indonesia', pak: 'Pakistan',
  bgd: 'Bangladesh', lka: 'Sri Lanka', npl: 'Nepal', nzl: 'New Zealand', lux: 'Luxembourg', ltu: 'Lithuania',
  lva: 'Latvia', est: 'Estonia', svn: 'Slovenia', isl: 'Iceland', mlt: 'Malta', cyp: 'Cyprus',
};
export function countryName(code: string): string {
  const c = String(code || '').toLowerCase();
  return A3[c] ?? (c ? c.toUpperCase() : '—');
}

// ---- Dates ----------------------------------------------------------------
/** The connector returns dates as YYYYMMDD — normalize to YYYY-MM-DD. */
export function toIso(raw: string): string {
  const s = String(raw ?? '').trim();
  if (s.length === 8 && !s.includes('-') && !Number.isNaN(Number(s))) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  return s;
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function weekdayOf(raw: string): string {
  const d = new Date(toIso(raw) + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? '' : WEEKDAYS[d.getUTCDay()];
}
export function shortDate(raw: string): string {
  const iso = toIso(raw);
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
}
