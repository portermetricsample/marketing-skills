/**
 * GA4 report constants: the connector, the report's account (must match
 * accounts_used declared on the report) and the exact field ids from
 * list_fields(connector="google-analytics-4"). Rates are DERIVED client-side
 * from base counts (engaged/sessions etc.) — never aggregated server-side.
 */
export const CONNECTOR = 'google-analytics-4';

// MASKED SAMPLE: these identifiers are placeholders. This report never queries a
// live account (all data is synthesized in lib/mask.ts), so the ids are cosmetic.
export const ACCOUNTS = [
  {
    id: 'accounts/000000000/properties/000000000',
    name: 'Acme Analytics — GA4 (sample)',
    component_name: CONNECTOR,
    source_user_id: 'google-analytics-4-000000000000000000000',
    company_id: '00000000-0000-0000-0000-000000000000',
  },
];

export const PROPERTY_LABEL = 'Acme Analytics — GA4 (sample)';

const p = 'google_analytics_4_';
export const F = {
  // time
  date: p + 'date',
  dayOfWeekName: p + 'dayOfWeekName',
  hour: p + 'hour',
  // core metrics
  sessions: p + 'sessions',
  activeUsers: p + 'activeUsers',
  totalUsers: p + 'totalUsers',
  newUsers: p + 'newUsers',
  engagedSessions: p + 'engagedSessions',
  screenPageViews: p + 'screenPageViews',
  eventCount: p + 'eventCount',
  keyEvents: p + 'keyEvents',
  userEngagementDuration: p + 'userEngagementDuration',
  // conversions
  eventName: p + 'eventName',
  sessionDefaultChannelGroup: p + 'sessionDefaultChannelGroup',
  sessionSourceMedium: p + 'sessionSourceMedium',
  // audiences
  country: p + 'country',
  city: p + 'city',
  region: p + 'region',
  userAgeBracket: p + 'userAgeBracket',
  userGender: p + 'userGender',
  language: p + 'language',
  brandingInterest: p + 'brandingInterest',
  deviceCategory: p + 'deviceCategory',
  platform: p + 'platform',
  browser: p + 'browser',
  operatingSystem: p + 'operatingSystem',
  audienceName: p + 'audienceName',
  newVsReturning: p + 'newVsReturning',
  // content
  pagePath: p + 'pagePath',
  pageTitle: p + 'pageTitle',
  landingPage: p + 'landingPagePlusQueryString',
  hostName: p + 'hostName',
  searchTerm: p + 'searchTerm',
} as const;

// ── format helpers ───────────────────────────────────────────────────────────
export function int(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}
export function dec2(n: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
/** fraction (0..1) → "12.3%" */
export function pct(n: number): string {
  return isFinite(n) && n > 0 ? (n * 100).toFixed(1) + '%' : '—';
}
/** seconds → "1m 32s" */
export function dur(n: number): string {
  if (!isFinite(n) || n <= 0) return '—';
  const m = Math.floor(n / 60);
  const s = Math.round(n % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
export function ratio(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

/** compact display for big KPI numbers: 98.9K / 1.2M (small numbers stay exact) */
export function compact(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return int(n);
}
