/**
 * DATA MASK — anonymizes every value the report displays.
 *
 * This report is a duplicate meant to be shown publicly without leaking the
 * original property's real Search Console intelligence (its ranking queries,
 * page URLs and traffic magnitudes). Rather than filter live data, we replace
 * it entirely: `maskResult()` sits on the single data chokepoint
 * (`porter.query()`), IGNORES whatever the real query returned, and SYNTHESIZES
 * deterministic, internally-consistent fake data shaped to the requested query.
 *
 * Properties of the synthetic data:
 *  - Deterministic (seeded) — identical across the current + comparison fetch,
 *    so tables/charts stay stable and re-render consistently.
 *  - Internally consistent — one canonical "universe" backs every view, so the
 *    Overview totals, the daily trend, the keyword/page/country/device
 *    breakdowns and the query×page cannibalization table all tell ONE coherent
 *    story (their totals reconcile, CTR falls with position, etc.).
 *  - Brand-preserving — a fake brand token ("acme") keeps the branded vs
 *    non-branded split meaningful (see BRAND_TOKENS in lib/gsc.ts).
 *
 * Nothing real is ever fetched, computed from, or shown.
 */

import type { QuerySpec, QueryResult, ChartData } from './porter';

// Field ids — must mirror F in lib/gsc.ts.
const FD = {
  date: 'google_search_console_date',
  query: 'google_search_console_query',
  page: 'google_search_console_page',
  country: 'google_search_console_country',
  device: 'google_search_console_device',
  clicks: 'google_search_console_clicks',
  impressions: 'google_search_console_impressions',
  position: 'google_search_console_position',
};
const CONNECTOR = 'google-search-console';

// Masked identity — the fake brand/domain the report presents.
export const MASK_BRAND = 'Acme Analytics';
export const MASK_TOKEN = 'acme';
export const MASK_DOMAIN = 'acmeanalytics.io';

// ---- deterministic primitives ---------------------------------------------
function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
/** Stable pseudo-random in [0,1) from a seed (no global RNG). */
function rnd(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// ---- fake vocabulary -------------------------------------------------------
const HEADS = [
  'marketing', 'ppc', 'seo', 'social media', 'google ads', 'facebook ads',
  'analytics', 'kpi', 'campaign', 'ecommerce', 'client', 'agency', 'tiktok ads',
  'linkedin ads', 'search console', 'ga4', 'cross channel', 'roi', 'paid search',
  'email marketing', 'looker studio', 'data', 'conversion', 'attribution',
];
const KINDS = [
  'dashboard', 'report', 'reporting tool', 'template', 'software', 'examples',
  'dashboard template', 'analytics', 'metrics', 'tracker',
];
const MODS = [
  '', '', 'free', 'best', 'automated', 'white label', 'monthly', 'online',
  'for agencies', 'for clients', 'real time', 'simple',
];
const BRAND_QUERIES = [
  'acme', 'acme analytics', 'acme dashboard', 'acme pricing', 'acme login',
  'acme reviews', 'acme reporting', 'acme vs supermetrics', 'acme app',
  'acme demo', 'acme templates', 'is acme free', 'acme integrations',
  'acme trial', 'acme dashboards', 'acme reporting tool', 'acme alternative',
];
const PATH_SECTIONS = [
  '', 'pricing', 'features', 'about', 'contact', 'login', 'signup', 'demo',
  'blog', 'integrations', 'templates', 'connectors', 'docs', 'reports',
  'dashboards', 'solutions', 'help',
];
const PATH_SLUGS = [
  'google-ads', 'facebook-ads', 'looker-studio', 'ga4', 'tiktok-ads',
  'linkedin-ads', 'seo-report', 'marketing-dashboard', 'client-reporting',
  'ppc-report', 'social-media-dashboard', 'search-console', 'ecommerce',
  'agency-reporting', 'white-label', 'cross-channel', 'kpi-dashboard',
  'monthly-report', 'campaign-report', 'roi-tracking',
];

// Deduped, deterministically-ordered vocabularies. Query strings MUST be unique
// across the universe: the Keywords view keys its previous-period lookup by the
// query STRING, so any duplicate would collide there and manufacture an absurd
// period-over-period delta (e.g. a top query matched to a tiny namesake).
const NONBRAND_POOL: string[] = (() => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const kind of KINDS)
    for (const head of HEADS)
      for (const mod of MODS) {
        const q = [mod, head, kind].filter(Boolean).join(' ');
        if (!seen.has(q)) {
          seen.add(q);
          out.push(q);
        }
      }
  return out;
})();
const BRAND_POOL: string[] = (() => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const q of BRAND_QUERIES)
    if (!seen.has(q)) {
      seen.add(q);
      out.push(q);
    }
  for (const head of HEADS)
    for (const kind of KINDS) {
      const q = `${MASK_TOKEN} ${head} ${kind}`;
      if (!seen.has(q)) {
        seen.add(q);
        out.push(q);
      }
    }
  return out;
})();

function isBrandedRank(rank: number): boolean {
  // ~15% branded, sprinkled across the ranking (incl. a couple at the top).
  return rank === 0 || rank === 4 || rank % 7 === 2;
}

function fakePage(rank: number): string {
  const h = hash32('p' + rank);
  const section = PATH_SECTIONS[h % PATH_SECTIONS.length];
  let path = section ? `/${section}` : '/';
  if (['blog', 'integrations', 'templates', 'connectors', 'docs', 'reports', 'dashboards'].includes(section)) {
    path += `/${PATH_SLUGS[(h >>> 5) % PATH_SLUGS.length]}`;
    if (section === 'blog') path += `-${1 + ((h >>> 11) % 20)}`;
  }
  return `https://www.${MASK_DOMAIN}${path}`;
}

// ---- CTR-by-position curve (so clicks derive from position realistically) --
function ctrForPosition(p: number): number {
  // ~30% at pos 1, decaying; floored so deep positions still get a trickle.
  return Math.max(0.002, 0.32 * Math.exp(-0.36 * (p - 1)));
}

// ---- the canonical universe (memoized per range factor) --------------------
type Q = { q: string; branded: boolean; clicks: number; impressions: number; position: number };
type P = { page: string; clicks: number; impressions: number; position: number };

const QN = 480; // distinct queries in the universe
const PN = 140; // distinct pages in the universe

/** A smooth per-range factor so the current vs comparison period differ (deltas
 *  read as gentle growth: more recent start date → slightly higher volume). */
function rangeFactor(range?: { start: string; end: string }): number {
  if (!range?.start) return 1;
  const d = new Date(range.start + 'T00:00:00Z').getTime();
  if (!Number.isFinite(d)) return 1;
  const days = d / 86400000; // days since epoch
  const base = 1 + (days - 20500) * 0.0009; // ~ +0.9%/day drift vs a fixed ref
  const jitter = 0.97 + rnd(hash32(range.start)) * 0.06; // ±3% texture
  return Math.max(0.55, Math.min(1.6, base * jitter));
}

/** Days (YYYY-MM-DD) inclusive between start..end, capped for safety. */
function daysBetween(range?: { start: string; end: string }): string[] {
  if (!range?.start || !range?.end) return [];
  const s = new Date(range.start + 'T00:00:00Z').getTime();
  const e = new Date(range.end + 'T00:00:00Z').getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return [];
  const out: string[] = [];
  for (let t = s; t <= e && out.length < 400; t += 86400000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** A small time signal for the range's start (≈ [-0.5, 0.5]); paired with a
 *  per-query trend it makes each keyword move by a DIFFERENT amount between the
 *  current and comparison period, so period-over-period deltas vary per row
 *  instead of every row showing the same global %. */
function rangePhase(range?: { start: string; end: string }): number {
  if (!range?.start) return 0;
  const d = new Date(range.start + 'T00:00:00Z').getTime();
  if (!Number.isFinite(d)) return 0;
  return Math.max(-0.5, Math.min(0.5, (d / 86400000 - 20650) * 0.004));
}

function buildQueries(factor: number, phase: number): Q[] {
  const out: Q[] = [];
  let bi = 0; // branded pool cursor
  let ni = 0; // non-branded pool cursor
  for (let i = 0; i < QN; i++) {
    const branded = isBrandedRank(i);
    // Draw a UNIQUE string from the appropriate pool (sequential cursor, not a
    // hash — guarantees no two ranks share a string). Same rank → same string in
    // every call and every period, so cross-period joins line up 1:1.
    const q = branded ? BRAND_POOL[bi++ % BRAND_POOL.length] : NONBRAND_POOL[ni++ % NONBRAND_POOL.length];
    // Per-query trend applied through the range phase (kept on clicks AND
    // impressions equally so CTR stays put but magnitudes drift per keyword).
    const trend = (rnd(hash32('tr' + i)) - 0.5) * 0.8; // ±0.4
    const mult = Math.max(0.4, 1 + trend * phase);
    // Zipf-ish impressions by rank.
    const jig = 0.75 + rnd(hash32('qi' + i)) * 0.5;
    const impressions = Math.max(3, Math.round((190000 / Math.pow(i + 2, 1.16)) * jig * factor * mult));
    // Positions spread 1..26 so the CTR curve has a full shape.
    const position = +(1 + (rnd(hash32('qp' + i)) * 25)).toFixed(1);
    let ctr = ctrForPosition(position) * (0.7 + rnd(hash32('qc' + i)) * 0.6);
    if (branded) ctr *= 1.9; // brand terms convert harder
    const clicks = Math.min(impressions, Math.round(impressions * ctr));
    out.push({ q, branded, clicks, impressions, position });
  }
  return out;
}

function buildPages(queries: Q[]): P[] {
  const totalC = queries.reduce((s, r) => s + r.clicks, 0);
  const totalI = queries.reduce((s, r) => s + r.impressions, 0);
  const raw: P[] = [];
  let sc = 0;
  let si = 0;
  for (let i = 0; i < PN; i++) {
    const jig = 0.7 + rnd(hash32('pi' + i)) * 0.6;
    const impressions = (120000 / Math.pow(i + 2, 1.12)) * jig;
    const position = +(1 + rnd(hash32('pp' + i)) * 20).toFixed(1);
    const ctr = ctrForPosition(position) * (0.7 + rnd(hash32('pc' + i)) * 0.6);
    const clicks = impressions * ctr;
    raw.push({ page: fakePage(i), clicks, impressions, position });
    sc += clicks;
    si += impressions;
  }
  // Normalize so page totals reconcile with the query universe totals.
  const kc = sc ? totalC / sc : 1;
  const ki = si ? totalI / si : 1;
  return raw.map((p) => ({
    page: p.page,
    clicks: Math.max(1, Math.round(p.clicks * kc)),
    impressions: Math.max(1, Math.round(p.impressions * ki)),
    position: p.position,
  }));
}

// ---- shaping into the exact rows a query asked for -------------------------
function wPos(rows: Array<{ impressions: number; position: number }>): number {
  let wp = 0;
  let w = 0;
  for (const r of rows) {
    wp += r.position * r.impressions;
    w += r.impressions;
  }
  return w ? +(wp / w).toFixed(1) : 0;
}

function applySort(rows: Record<string, unknown>[], spec: QuerySpec) {
  const sort = spec.sort?.[0];
  if (!sort) return;
  const dir = sort.direction === 'asc' ? 1 : -1;
  rows.sort((a, b) => ((Number(a[sort.field]) || 0) - (Number(b[sort.field]) || 0)) * dir);
}

function synth(spec: QuerySpec): ChartData {
  const fields = spec.fields || [];
  const has = (f: string) => fields.includes(f);
  const factor = rangeFactor(spec.date_range);
  const phase = rangePhase(spec.date_range);
  const queries = buildQueries(factor, phase);
  const pages = buildPages(queries);
  const totalC = queries.reduce((s, r) => s + r.clicks, 0);
  const totalI = queries.reduce((s, r) => s + r.impressions, 0);
  const limit = spec.limit ?? 1000;

  let rows: Record<string, unknown>[] = [];

  if (has(FD.date)) {
    // Daily time series with weekday seasonality (weekends lighter).
    const days = daysBetween(spec.date_range);
    const wk = [0.82, 1.06, 1.12, 1.1, 1.08, 1.0, 0.72]; // Sun..Sat
    let wsum = 0;
    const weights = days.map((d, i) => {
      const dow = new Date(d + 'T00:00:00Z').getUTCDay();
      const w = wk[dow] * (0.9 + rnd(hash32('d' + d)) * 0.2);
      wsum += w;
      return w;
    });
    rows = days.map((d, i) => {
      const share = wsum ? weights[i] / wsum : 1 / days.length;
      const clicks = Math.round(totalC * share);
      const impressions = Math.round(totalI * share);
      const position = +(6 + Math.sin(i / 3) * 1.4 + rnd(hash32('dp' + d)) * 1.2).toFixed(1);
      const r: Record<string, unknown> = { [FD.date]: d };
      if (has(FD.clicks)) r[FD.clicks] = clicks;
      if (has(FD.impressions)) r[FD.impressions] = impressions;
      if (has(FD.position)) r[FD.position] = position;
      return r;
    });
  } else if (has(FD.query) && has(FD.page)) {
    // query × page — split each query across 1–3 pages; ~35% get a secondary
    // page with real weight so the cannibalization view has signal.
    for (let i = 0; i < queries.length && rows.length < limit + 200; i++) {
      const qy = queries[i];
      const multi = rnd(hash32('mp' + i));
      const nPages = multi < 0.12 ? 3 : multi < 0.35 ? 2 : 1;
      // impression split fractions
      const splits = nPages === 1 ? [1] : nPages === 2 ? [0.62, 0.38] : [0.5, 0.3, 0.2];
      for (let k = 0; k < nPages; k++) {
        const pg = pages[(hash32('qp' + i + '_' + k) % pages.length)].page;
        const impressions = Math.max(1, Math.round(qy.impressions * splits[k]));
        const clicks = Math.max(0, Math.round(qy.clicks * splits[k]));
        const position = +(qy.position + (k * 2.3) + rnd(hash32('qpp' + i + k)) * 1.5).toFixed(1);
        const r: Record<string, unknown> = { [FD.query]: qy.q, [FD.page]: pg };
        if (has(FD.clicks)) r[FD.clicks] = clicks;
        if (has(FD.impressions)) r[FD.impressions] = impressions;
        if (has(FD.position)) r[FD.position] = position;
        rows.push(r);
      }
    }
  } else if (has(FD.query)) {
    rows = queries.map((qy) => {
      const r: Record<string, unknown> = { [FD.query]: qy.q };
      if (has(FD.clicks)) r[FD.clicks] = qy.clicks;
      if (has(FD.impressions)) r[FD.impressions] = qy.impressions;
      if (has(FD.position)) r[FD.position] = qy.position;
      return r;
    });
  } else if (has(FD.page)) {
    rows = pages.map((pg) => {
      const r: Record<string, unknown> = { [FD.page]: pg.page };
      if (has(FD.clicks)) r[FD.clicks] = pg.clicks;
      if (has(FD.impressions)) r[FD.impressions] = pg.impressions;
      if (has(FD.position)) r[FD.position] = pg.position;
      return r;
    });
  } else if (has(FD.country)) {
    const geo: Array<[string, number]> = [
      ['usa', 0.34], ['ind', 0.09], ['gbr', 0.07], ['bra', 0.06], ['mex', 0.05],
      ['can', 0.045], ['deu', 0.04], ['esp', 0.035], ['aus', 0.03], ['fra', 0.028],
      ['col', 0.025], ['arg', 0.022], ['nld', 0.02], ['ita', 0.018], ['phl', 0.017],
      ['idn', 0.016], ['zaf', 0.014], ['are', 0.012], ['sgp', 0.011], ['pol', 0.01],
      ['chl', 0.009], ['per', 0.008], ['irl', 0.007], ['swe', 0.006], ['tur', 0.006],
    ];
    rows = geo.map(([code, share], i) => {
      const r: Record<string, unknown> = { [FD.country]: code };
      if (has(FD.clicks)) r[FD.clicks] = Math.max(1, Math.round(totalC * share));
      if (has(FD.impressions)) r[FD.impressions] = Math.max(1, Math.round(totalI * share));
      if (has(FD.position)) r[FD.position] = +(4 + i * 0.4 + rnd(hash32('cp' + code)) * 3).toFixed(1);
      return r;
    });
  } else if (has(FD.device)) {
    const dev: Array<[string, number, number]> = [
      ['DESKTOP', 0.56, 5.8], ['MOBILE', 0.39, 7.9], ['TABLET', 0.05, 8.6],
    ];
    rows = dev.map(([d, share, pos]) => {
      const r: Record<string, unknown> = { [FD.device]: d };
      if (has(FD.clicks)) r[FD.clicks] = Math.round(totalC * share);
      if (has(FD.impressions)) r[FD.impressions] = Math.round(totalI * share);
      if (has(FD.position)) r[FD.position] = pos;
      return r;
    });
  } else {
    // metrics only (e.g. KPI totals, limit 1) → one summary row
    const r: Record<string, unknown> = {};
    if (has(FD.clicks)) r[FD.clicks] = totalC;
    if (has(FD.impressions)) r[FD.impressions] = totalI;
    if (has(FD.position)) r[FD.position] = wPos(queries);
    rows = [r];
  }

  applySort(rows, spec);
  if (rows.length > limit) rows = rows.slice(0, limit);
  return { columns: fields, rows, meta: { masked: true } };
}

/** True when a query targets Search Console — i.e. this mask fully owns it and
 *  no live data-plane call is needed. porter.query() uses this to SKIP the RPC
 *  entirely, so the masked report never queries a real property. */
export function isMaskedSpec(spec: QuerySpec): boolean {
  return (
    spec?.connector === CONNECTOR ||
    (Array.isArray(spec?.fields) && spec.fields.some((f) => f.startsWith('google_search_console_')))
  );
}

/**
 * The mask entry point wired into porter.query(). For Search Console queries it
 * returns fully synthetic data and DISCARDS `raw`. Anything else passes through
 * untouched (defensive — this report only uses GSC).
 */
export function maskResult(spec: QuerySpec, raw: QueryResult): QueryResult {
  try {
    if (!isMaskedSpec(spec)) return raw;
    return synth(spec);
  } catch {
    return raw;
  }
}
