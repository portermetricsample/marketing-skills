import { useEffect, useMemo, useRef, useState } from 'react';
import { porter, type Route } from '../lib/porter';
import { useAccounts, useDateRange, useReportQuery, num, sumField, deltaPct, type Range, type Preset } from '../lib/useReport';
import { ChartFrame } from '../components/ui';
import { Sparkline, Donut, Heatmap, FollowersChart, type Slice, type PostMarker } from '../components/ig';

/* ────────────────────────────────────────────────────────────────────────
 * the connected account — Instagram Insights
 * A faithful rebuild of the "SOY FIRA — Instagram Insights" report layout,
 * pointed at the connected account's Instagram account through the Porter bridge.
 * ──────────────────────────────────────────────────────────────────────── */

const CONNECTOR = 'instagram-insights';
/** Accounts resolve at RUNTIME from the report's declared accounts_used
 *  (porter.getAccounts). Nothing about the account is hardcoded, which is what
 *  lets this exact report be DUPLICATED onto another Instagram account and just
 *  work — the header name/avatar come from the account's own data too. */
type Acc = { id: string }[];

const F = {
  date: 'instagram_insights_date',
  newFollowers: 'instagram_insights_follower_count',
  totalFollowers: 'instagram_insights_followers_count',
  profileViews: 'instagram_insights_profile_views',
  profileImpressions: 'instagram_insights_impressions',
  profileReach: 'instagram_insights_reach',
  website: 'instagram_insights_website_clicks',
  email: 'instagram_insights_email_contacts',
  message: 'instagram_insights_text_message_clicks',
  directions: 'instagram_insights_get_directions_clicks',
  // posts
  postDate: 'instagram_insights_timestamp',
  postHour: 'instagram_insights_timestamp_hour',
  postWeekday: 'instagram_insights_week_day_timestamp',
  engagement: 'instagram_insights_engagement',
  postImpressions: 'instagram_insights_post_impressions',
  postReach: 'instagram_insights_post_reach',
  likes: 'instagram_insights_like_count',
  saves: 'instagram_insights_saved',
  comments: 'instagram_insights_comments_count',
  mediaType: 'instagram_insights_media_type',
  mediaUrl: 'instagram_insights_media_url',
  permalink: 'instagram_insights_permalink',
  caption: 'instagram_insights_caption',
  postCount: 'instagram_insights_post_count',
  // stories
  storyDate: 'instagram_insights_story_timestamp',
  storyType: 'instagram_insights_story_media_type',
  storyImpressions: 'instagram_insights_story_impressions',
  storyReach: 'instagram_insights_story_reach',
  replies: 'instagram_insights_replies',
  exits: 'instagram_insights_exits',
  // profile
  accountName: 'instagram_insights_name',
  profilePic: 'instagram_insights_profile_picture_url',
  username: 'instagram_insights_profile_username',
  // audience
  genderDim: 'instagram_insights_audience_gender_related',
  gender: 'instagram_insights_audience_gender',
  ageDim: 'instagram_insights_audience_age_related',
  age: 'instagram_insights_audience_age',
} as const;

const ROUTES: Route[] = [
  { path: 'overview', title: 'Overview' },
  { path: 'posts', title: 'Posts' },
  { path: 'stories', title: 'Stories' },
  { path: 'audience', title: 'Audience' },
];

/* ── formatting ───────────────────────────────────────────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function int(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}
function compact(n: number): string {
  if (Math.abs(n) >= 1000) return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  return int(n);
}
function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}
function dayKey(v: unknown): string {
  const s = String(v ?? '');
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(s);
  if (m) return `${m[1]}${m[2]}${m[3]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return s;
}
function prettyDay(key: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(key);
  if (m) return `${MONTHS[Number(m[2]) - 1] ?? m[2]} ${Number(m[3])}, ${m[1]}`;
  return key;
}
/** Instagram media URLs arrive scheme-less (e.g. "scontent-….cdninstagram.com/…").
 *  Add https:// so the <img> resolves against the CDN, not the report base href.
 *  Anything that isn't recognisably a host+path yields '' → the "No image"
 *  placeholder (never a bogus src the CSP would refuse). */
function imgSrc(v: unknown): string {
  const s = String(v ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\/[a-z0-9.-]+\.[a-z]{2,}\//i.test(s)) return 'https:' + s;
  if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(s)) return 'https://' + s;
  return '';
}

/* ── icons ────────────────────────────────────────────────────────────── */
const IgGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="17.2" cy="6.8" r="1.25" fill="currentColor" />
  </svg>
);
const IcoHome = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M4 11l8-6 8 6M6 10v9h12v-9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" /></svg>);
const IcoGrid = () => (<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" stroke="currentColor" strokeWidth="1.4" /></svg>);
const IcoStory = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" strokeDasharray="2.2 2.4" /><circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.8" /></svg>);
const IcoUsers = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M16 5.5a3 3 0 010 5.6M18 19c0-2.4-1.3-4.2-3.2-4.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>);
const TAB_ICON: Record<string, () => JSX.Element> = { overview: IcoHome, posts: IcoGrid, stories: IcoStory, audience: IcoUsers };

/* ── shell ────────────────────────────────────────────────────────────── */
export default function Home() {
  const [route, setRoute] = useState('overview');
  const [printMode, setPrintMode] = useState(false);
  const { preset, setPreset, custom, setCustom, range } = useDateRange('6m');
  const [compare, setCompare] = useState(true);
  const { accounts } = useAccounts();
  const profile = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.profilePic, F.username, F.accountName, F.totalFollowers], limit: 1 },
    windowEnding(range, 7),
  );
  const prow = profile.data?.rows?.[0];
  const avatarUrl = imgSrc(prow?.[F.profilePic]);
  const displayName = String(prow?.[F.accountName] || prow?.[F.username] || 'Instagram');

  useEffect(() => {
    const ctx = porter.init();
    const start = ctx.route && ROUTES.some((r) => r.path === ctx.route) ? ctx.route : 'overview';
    setRoute(start);
    if (ctx.state?.start && ctx.state?.end) {
      setCustom({ start: ctx.state.start, end: ctx.state.end });
      setPreset('custom');
    }
    applyTheme(porter.initialTheme?.mode);
    const offNav = porter.onNavigate((r) => setRoute(ROUTES.some((x) => x.path === r) ? r : 'overview'));
    const offExport = porter.onExportPdf(() => setPrintMode(true));
    const offTheme = porter.onTheme((t) => applyTheme(t.mode));
    return () => { offNav(); offExport(); offTheme(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (printMode) return;
    porter.emitRouteChanged(route, ROUTES.find((r) => r.path === route)?.title);
  }, [route, printMode]);

  useEffect(() => {
    if (!printMode) return;
    const t = setTimeout(() => {
      porter.emitResize(document.documentElement.scrollHeight);
      porter.emitExportReady(ROUTES.length);
    }, 700);
    return () => clearTimeout(t);
  }, [printMode]);

  const pages = (
    <>
      {(printMode || route === 'overview') && <Overview range={range} print={printMode} accounts={accounts} />}
      {(printMode || route === 'posts') && <Posts range={range} compare={compare} print={printMode} accounts={accounts} />}
      {(printMode || route === 'stories') && <Stories range={range} print={printMode} accounts={accounts} />}
      {(printMode || route === 'audience') && <Audience range={range} print={printMode} accounts={accounts} />}
    </>
  );

  return (
    <main className={printMode ? 'report is-printing' : 'report'}>
      {!printMode && (
        <>
          <div className="topbar">
            <div className="brand">
              <div className="brand-badge"><IgGlyph /></div>
              <div className="brand-avatar">
                {avatarUrl ? <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : null}
              </div>
              <div className="brand-text">
                <span className="brand-title">{displayName}</span>
                <span className="brand-sub">Instagram Insights</span>
              </div>
            </div>
            <div className="controls">
              <DateControl preset={preset} setPreset={setPreset} custom={custom} setCustom={setCustom} />
              <button className={compare ? 'cmp on' : 'cmp'} role="switch" aria-checked={compare} onClick={() => setCompare(!compare)}>
                <span className="dot" /> Compare vs previous period
              </button>
            </div>
          </div>
          <nav className="tabs">
            {ROUTES.map((r) => {
              const Icon = TAB_ICON[r.path];
              return (
                <button key={r.path} className={route === r.path ? 'tab on' : 'tab'} onClick={() => setRoute(r.path)}>
                  <Icon /> {r.title}
                </button>
              );
            })}
          </nav>
        </>
      )}

      {printMode && (
        <div className="print-head" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div className="brand-badge"><IgGlyph /></div>
          <div className="brand-avatar">{avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>{displayName} — Instagram Insights</div>
        </div>
      )}
      {pages}

      <div className="footer">
        <span className="ig" style={{ display: 'inline-flex' }}><IgGlyph /></span>
        Data: Instagram Insights via Porter Metrics · {prettyDay(dayKey(range.start))} → {prettyDay(dayKey(range.end))}
      </div>
    </main>
  );
}

/* ── date control ─────────────────────────────────────────────────────── */
const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: '6m', label: '6m' },
];
function DateControl({ preset, setPreset, custom, setCustom }: { preset: Preset; setPreset: (p: Preset) => void; custom: Range; setCustom: (r: Range) => void; }) {
  return (
    <>
      <div className="seg" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button key={p.id} className={preset === p.id ? 'on' : ''} onClick={() => setPreset(p.id)}>{p.label}</button>
        ))}
        <button className={preset === 'custom' ? 'on' : ''} onClick={() => setPreset('custom')}>Custom</button>
      </div>
      {preset === 'custom' && (
        <div className="date-inputs">
          <input type="date" value={custom.start} max={custom.end} onChange={(e) => setCustom({ ...custom, start: e.target.value })} />
          <span>→</span>
          <input type="date" value={custom.end} min={custom.start} onChange={(e) => setCustom({ ...custom, end: e.target.value })} />
        </div>
      )}
    </>
  );
}

/* ── scorecard ────────────────────────────────────────────────────────── */
function Scorecard({ label, value, color, spark, delta, loading }: { label: string; value: string; color?: string; spark?: number[]; delta?: number | null; loading?: boolean; }) {
  const up = delta != null && delta >= 0;
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {color && <span className="kpi-dot" style={{ background: color }} />}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 30, width: '65%', borderRadius: 8 }} />
      ) : (
        <>
          <div className="kpi">{value}</div>
          {delta != null && (
            <div className={`kpi-delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% <span className="note">vs prev</span></div>
          )}
          {spark && spark.length > 1 && <div className="kpi-spark"><Sparkline values={spark} color={color || 'var(--accent)'} /></div>}
        </>
      )}
    </div>
  );
}

/* ── daily grouping helper ────────────────────────────────────────────── */
function dailySeries(rows: Record<string, unknown>[], dateField: string, valueField: string): { label: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = dayKey(r[dateField]);
    map.set(k, (map.get(k) || 0) + num(r[valueField]));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }));
}

/* ══ OVERVIEW ═════════════════════════════════════════════════════════
 * Instagram serves account-level daily metrics (new followers, reach) for the
 * LAST 30 DAYS only, so this page always resolves against a rolling 30-day
 * window anchored at the end of the selected range. */
function Overview({ range, print, accounts }: { range: Range; print: boolean; accounts: Acc }) {
  const accRange = useMemo(() => windowEnding(range, 30), [range.start, range.end]);
  const daily = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.newFollowers, F.totalFollowers, F.profileReach], sort: [{ field: F.date, direction: 'asc' }], limit: 62 },
    accRange,
  );
  const posts = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.postDate, F.mediaUrl, F.caption, F.likes, F.engagement], sort: [{ field: F.postDate, direction: 'asc' }], limit: 60 },
    accRange,
  );

  const rows = daily.data?.rows ?? [];
  const totalFollowers = rows.reduce((m, r) => num(r[F.totalFollowers]) || m, 0);
  const followerPoints = dailySeries(rows, F.date, F.newFollowers);
  const reachSum = sumField(daily.data, F.profileReach);
  const daysWithData = dailySeries(rows, F.date, F.profileReach).filter((p) => p.value > 0).length || 1;
  const markers: PostMarker[] = (posts.data?.rows ?? []).map((r) => ({
    date: dayKey(r[F.postDate]),
    caption: String(r[F.caption] ?? ''),
    likes: num(r[F.likes]),
    engagement: num(r[F.engagement]),
    media_url: imgSrc(r[F.mediaUrl]) || undefined,
  }));

  const kpis = [
    { label: 'Total followers', value: compact(totalFollowers), color: 'var(--c-engagement)' },
    { label: 'New followers', value: int(sumField(daily.data, F.newFollowers)), color: 'var(--c-rate)' },
    { label: 'Profile reach', value: compact(reachSum), color: 'var(--c-reach)' },
    { label: 'Avg. reach / day', value: compact(reachSum / daysWithData), color: 'var(--c-views)' },
    { label: 'Posts published', value: int(markers.length), color: 'var(--c-impressions)' },
  ];

  return (
    <section className="report-page">
      {print && <div className="print-title">Overview</div>}
      <div className="kpis" style={{ marginBottom: 14 }}>
        {kpis.map((k) => <Scorecard key={k.label} {...k} loading={daily.loading} />)}
      </div>
      <ChartFrame title="New followers — annotated with the posts published each day" loading={daily.loading} error={daily.error} retry={daily.retry} empty={!followerPoints.length} skeletonHeight={240}>
        <p className="card-hint" style={{ marginTop: -4, marginBottom: 14 }}>Each marker is a post published that day — hover to see its caption, likes and interactions, so you can tell what drove a spike. Instagram provides account metrics for the last 30 days only.</p>
        <FollowersChart points={followerPoints} markers={markers} />
      </ChartFrame>

      <div className="kpis" style={{ marginTop: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {TAPS.map((t) => (
          <Scorecard key={t.label} label={t.label} value="0" color={t.color} spark={[0, 0, 0, 0, 0]} />
        ))}
      </div>
      <p className="card-hint" style={{ marginTop: 10 }}>Profile-action taps (email, message, directions) were discontinued by Instagram's API and no longer report data — they read as 0.</p>
    </section>
  );
}

const TAPS = [
  { label: 'Taps on website', color: 'var(--c-engagement)' },
  { label: 'Taps on email', color: 'var(--c-impressions)' },
  { label: 'Taps to message', color: 'var(--c-likes)' },
  { label: 'Taps to directions', color: 'var(--c-saves)' },
];

/* ══ POSTS ════════════════════════════════════════════════════════════ */
function Posts({ range, compare, print, accounts }: { range: Range; compare: boolean; print: boolean; accounts: Acc }) {
  const daily = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.postDate, F.engagement, F.postImpressions, F.likes, F.saves, F.comments], sort: [{ field: F.postDate, direction: 'asc' }], limit: 400 },
    range,
    compare,
  );
  const top = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.mediaType, F.permalink, F.caption, F.mediaUrl, F.postDate, F.postReach, F.likes, F.comments, F.saves, F.engagement], sort: [{ field: F.engagement, direction: 'desc' }], limit: 12 },
    range,
  );
  const types = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.mediaType, F.postCount, F.engagement], limit: 20 },
    range,
  );
  const times = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.postWeekday, F.postHour, F.engagement], limit: 400 },
    range,
  );

  const cur = daily.data, prev = daily.prev;
  const rows = cur?.rows ?? [];
  const sum = (f: string) => sumField(cur, f);
  const psum = (f: string) => sumField(prev, f);
  const engRate = sum(F.postImpressions) ? (sum(F.engagement) / sum(F.postImpressions)) * 100 : 0;
  const pEngRate = psum(F.postImpressions) ? (psum(F.engagement) / psum(F.postImpressions)) * 100 : 0;
  const spark = (f: string) => dailySeries(rows, F.postDate, f).map((p) => p.value);

  const kpis = [
    { label: 'Engagement', value: compact(sum(F.engagement)), color: 'var(--c-engagement)', spark: spark(F.engagement), delta: compare ? deltaPct(sum(F.engagement), psum(F.engagement)) : null },
    { label: 'Post impressions', value: compact(sum(F.postImpressions)), color: 'var(--c-impressions)', spark: spark(F.postImpressions), delta: compare ? deltaPct(sum(F.postImpressions), psum(F.postImpressions)) : null },
    { label: 'Likes', value: compact(sum(F.likes)), color: 'var(--c-likes)', spark: spark(F.likes), delta: compare ? deltaPct(sum(F.likes), psum(F.likes)) : null },
    { label: 'Saves', value: compact(sum(F.saves)), color: 'var(--c-saves)', spark: spark(F.saves), delta: compare ? deltaPct(sum(F.saves), psum(F.saves)) : null },
    { label: 'Comments', value: compact(sum(F.comments)), color: 'var(--c-comments)', spark: spark(F.comments), delta: compare ? deltaPct(sum(F.comments), psum(F.comments)) : null },
    { label: 'Engagement rate', value: pct(engRate), color: 'var(--c-rate)', spark: dailySeries(rows, F.postDate, F.engagement).map((p, i) => { const im = dailySeries(rows, F.postDate, F.postImpressions)[i]?.value || 0; return im ? (p.value / im) * 100 : 0; }), delta: compare ? deltaPct(engRate, pEngRate) : null },
  ];

  const typeRows = types.data?.rows ?? [];
  const TYPE_COLORS: Record<string, string> = { VIDEO: 'var(--c-engagement)', IMAGE: 'var(--c-likes)', CAROUSEL_ALBUM: 'var(--c-saves)' };
  const TYPE_LABEL: Record<string, string> = { VIDEO: 'Reel / Video', IMAGE: 'Image', CAROUSEL_ALBUM: 'Carousel' };
  const typeSlices: Slice[] = typeRows.map((r) => {
    const t = String(r[F.mediaType] ?? 'Other');
    return { label: TYPE_LABEL[t] ?? t, value: num(r[F.postCount]) || 1, color: TYPE_COLORS[t] ?? 'var(--muted)' };
  }).filter((s) => s.value > 0);

  const matrix = useMemo(() => buildHeat(times.data?.rows ?? []), [times.data]);

  const topRows = top.data?.rows ?? [];

  return (
    <section className="report-page">
      {print && <div className="print-title">Posts</div>}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(178px, 1fr))' }}>
        {kpis.map((k) => <Scorecard key={k.label} {...k} loading={daily.loading} />)}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-head"><div className="card-title">Top posts</div></div>
        <ChartFrame loading={top.loading} error={top.error} retry={top.retry} empty={!topRows.length} skeletonHeight={300}>
          <Carousel rows={topRows} />
        </ChartFrame>
      </div>

      <div className="grid" style={{ gridTemplateColumns: print ? '1fr 1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 14 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Post types</div>
          <ChartFrame loading={types.loading} error={types.error} retry={types.retry} empty={!typeSlices.length} skeletonHeight={160}>
            <Donut slices={typeSlices} format={int} />
          </ChartFrame>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Best times to post — interactions by day &amp; hour</div>
          <ChartFrame loading={times.loading} error={times.error} retry={times.retry} empty={!(times.data?.rows?.length)} skeletonHeight={160}>
            <Heatmap matrix={matrix} />
          </ChartFrame>
        </div>
      </div>
    </section>
  );
}

function Carousel({ rows }: { rows: Record<string, unknown>[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 274, behavior: 'smooth' });
  const METRICS: { label: string; field: string }[] = [
    { label: 'Reach', field: F.postReach },
    { label: 'Likes', field: F.likes },
    { label: 'Comments', field: F.comments },
    { label: 'Saves', field: F.saves },
    { label: 'Engagement', field: F.engagement },
  ];
  return (
    <div className="carousel">
      <div className="carousel-nav">
        <button onClick={() => scroll(-1)} aria-label="Previous">‹</button>
        <button onClick={() => scroll(1)} aria-label="Next">›</button>
      </div>
      <div className="carousel-track" ref={ref}>
        {rows.map((r, i) => {
          const url = imgSrc(r[F.mediaUrl]);
          const type = String(r[F.mediaType] ?? '');
          const link = r[F.permalink] ? String(r[F.permalink]) : '';
          const caption = String(r[F.caption] ?? '').trim() || '—';
          const Title = (link ? 'a' : 'div') as 'a';
          return (
            <div className="post-card" key={i}>
              {link ? (
                <a className="post-media" href={link} target="_blank" rel="noreferrer" aria-label="Open post on Instagram">
                  <PostImage url={url} />
                </a>
              ) : (
                <div className="post-media"><PostImage url={url} /></div>
              )}
              <div className="post-body">
                <Title className="post-title" {...(link ? { href: link, target: '_blank', rel: 'noreferrer' } : {})} title={caption}>
                  <span className="post-open" aria-hidden="true"><OpenIcon /></span>
                  <span className="post-title-text">{caption}</span>
                </Title>
                <div className="post-meta">
                  {type && <span className="post-badge">{type}</span>}
                  <span className="post-date">{esDate(dayKey(r[F.postDate]))}</span>
                </div>
                <div className="post-metrics">
                  {METRICS.map((m) => (
                    <div className="metric-row" key={m.label}>
                      <span className="metric-label">{m.label}</span>
                      <span className="metric-val">{int(num(r[m.field]))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostImage({ url }: { url: string }) {
  return (
    <>
      {url ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { const el = e.currentTarget; el.style.display = 'none'; const ph = el.nextElementSibling as HTMLElement | null; if (ph) ph.style.display = 'grid'; }} />
      ) : null}
      <div className="ph" style={{ display: url ? 'none' : 'grid' }}>No image</div>
    </>
  );
}

const OpenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="13" height="13" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 13v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ES_MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function esDate(key: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(key);
  if (m) return `${Number(m[3])} de ${ES_MONTHS[Number(m[2]) - 1] ?? m[2]} de ${m[1]}`;
  return key;
}

const WEEKDAY_MAP: Record<string, number> = {
  monday: 0, mon: 0, '1': 0, tuesday: 1, tue: 1, '2': 1, wednesday: 2, wed: 2, '3': 2,
  thursday: 3, thu: 3, '4': 3, friday: 4, fri: 4, '5': 4, saturday: 5, sat: 5, '6': 5,
  sunday: 6, sun: 6, '7': 6, '0': 6,
};
function buildHeat(rows: Record<string, unknown>[]): number[][] {
  const m: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of rows) {
    const wRaw = String(r[F.postWeekday] ?? '').trim().toLowerCase();
    let d = WEEKDAY_MAP[wRaw];
    if (d == null) { const n = parseInt(wRaw, 10); d = Number.isFinite(n) ? ((n % 7) + 7) % 7 : NaN as unknown as number; }
    const hRaw = String(r[F.postHour] ?? '').replace(/[^0-9]/g, '');
    const h = parseInt(hRaw, 10);
    if (d >= 0 && d < 7 && h >= 0 && h < 24) m[d][h] += num(r[F.engagement]);
  }
  return m;
}

/* ══ STORIES ══════════════════════════════════════════════════════════ */
function Stories({ range, print, accounts }: { range: Range; print: boolean; accounts: Acc }) {
  const daily = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.storyDate, F.storyImpressions, F.storyReach, F.replies, F.exits], sort: [{ field: F.storyDate, direction: 'asc' }], limit: 400 },
    range,
  );
  const types = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.storyType, F.storyImpressions], limit: 20 },
    range,
  );
  const rows = daily.data?.rows ?? [];
  const impPoints = dailySeries(rows, F.storyDate, F.storyImpressions);

  const kpis = [
    { label: 'Story impressions', value: compact(sumField(daily.data, F.storyImpressions)), color: 'var(--c-impressions)' },
    { label: 'Story reach', value: compact(sumField(daily.data, F.storyReach)), color: 'var(--c-reach)' },
    { label: 'Replies', value: int(sumField(daily.data, F.replies)), color: 'var(--c-rate)' },
    { label: 'Exits', value: int(sumField(daily.data, F.exits)), color: 'var(--c-engagement)' },
  ];

  const typeRows = types.data?.rows ?? [];
  const S_COLORS: Record<string, string> = { VIDEO: 'var(--c-engagement)', IMAGE: 'var(--c-likes)' };
  const typeSlices: Slice[] = typeRows.map((r) => { const t = String(r[F.storyType] ?? 'Other'); return { label: t.charAt(0) + t.slice(1).toLowerCase(), value: num(r[F.storyImpressions]), color: S_COLORS[t] ?? 'var(--muted)' }; }).filter((s) => s.value > 0);

  return (
    <section className="report-page">
      {print && <div className="print-title">Stories</div>}
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {kpis.map((k) => <Scorecard key={k.label} {...k} loading={daily.loading} />)}
      </div>
      <div className="grid" style={{ gridTemplateColumns: print ? '1.4fr 1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', marginTop: 14 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Story impressions over time</div>
          <ChartFrame loading={daily.loading} error={daily.error} retry={daily.retry} empty={!impPoints.length} skeletonHeight={200}>
            <FollowersChart points={impPoints} markers={[]} height={210} />
          </ChartFrame>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Story types</div>
          <ChartFrame loading={types.loading} error={types.error} retry={types.retry} empty={!typeSlices.length} skeletonHeight={160}>
            <Donut slices={typeSlices} format={compact} />
          </ChartFrame>
        </div>
      </div>
    </section>
  );
}

/* ══ AUDIENCE ═════════════════════════════════════════════════════════ */
function Audience({ range, print, accounts }: { range: Range; print: boolean; accounts: Acc }) {
  // Demographics are current snapshots — a short window keeps them well inside
  // Instagram's 30-day cap for follower-audience fields at any selected range.
  // Follower demographics are a single current snapshot — Instagram returns them
  // for a short recent window, so query the last 7 days regardless of selection.
  const audRange = useMemo(() => windowEnding(range, 7), [range.start, range.end]);
  const gender = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.genderDim, F.gender], limit: 20 },
    audRange,
  );
  const age = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.ageDim, F.age], limit: 20 },
    audRange,
  );

  const G_COLORS: Record<string, string> = { Female: 'var(--c-engagement)', Male: 'var(--c-saves)', Unknown: 'var(--muted)' };
  const genderSlices: Slice[] = (gender.data?.rows ?? []).map((r) => { const g = String(r[F.genderDim] ?? 'Unknown'); return { label: g, value: num(r[F.gender]), color: G_COLORS[g] ?? 'var(--c-likes)' }; }).filter((s) => s.value > 0);

  const ageRows = (age.data?.rows ?? []).map((r) => ({ label: String(r[F.ageDim] ?? '—'), value: num(r[F.age]) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
  const ageMax = Math.max(1, ...ageRows.map((r) => r.value));

  return (
    <section className="report-page">
      {print && <div className="print-title">Audience</div>}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Followers by gender</div>
          <ChartFrame loading={gender.loading} error={gender.error} retry={gender.retry} empty={!genderSlices.length} skeletonHeight={180}>
            <Donut slices={genderSlices} format={compact} />
          </ChartFrame>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>Followers by age</div>
          <ChartFrame loading={age.loading} error={age.error} retry={age.retry} empty={!ageRows.length} skeletonHeight={180}>
            <div className="bars">
              {ageRows.map((r) => (
                <div className="bar-row" key={r.label}>
                  <div className="bar-label">{r.label}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ width: `${(r.value / ageMax) * 100}%` }} /></div>
                  <div className="bar-value">{compact(r.value)}</div>
                </div>
              ))}
            </div>
          </ChartFrame>
        </div>
      </div>
    </section>
  );
}

/** A window of the last `days` days ending at range.end, never starting before
 *  range.start. Used for metrics Instagram only serves for a recent window. */
function windowEnding(range: Range, days: number): Range {
  const end = new Date(range.end + 'T00:00:00Z');
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const startStr = start.toISOString().slice(0, 10);
  return { start: startStr > range.start ? startStr : range.start, end: range.end };
}

function applyTheme(mode?: string) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode === 'light' ? 'light' : 'dark');
}
