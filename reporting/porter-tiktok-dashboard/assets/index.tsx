import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Chart from 'chart.js/auto';
import { porter } from '../lib/porter';
import { useAccounts, useDateRange, useReportQuery, num, type Range, type ReportQuery, type Preset } from '../lib/useReport';
import { Skeleton, SkeletonChart } from '../components/ui';
import { ComparisonToggle } from '../components/controls';

/**
 * Changan Europe — TikTok Insights. TikTok-organic twin of the SOY FIRA
 * Instagram Insights report: same use cases (profile, posts, audience) mapped to
 * TikTok's own metrics, plus a TikTok-specific video-performance page (watch
 * time, per-second retention, view sources, viewer types). TikTok dark branding.
 */

const CONNECTOR = 'tiktok-insights';

// No account is hardcoded. The report resolves its source account at runtime
// from its own accounts_used allowlist (via useAccounts), so this same build
// works for ANY TikTok account it is pointed at — which is what lets it be
// cloned/re-pointed with a single duplicate_report call.

const F = {
  // profile
  displayName: 'tiktok_insights_display_name',
  username: 'tiktok_insights_username',
  avatar: 'tiktok_insights_profile_image_url',
  deepLink: 'tiktok_insights_profile_deep_link',
  followersTotal: 'tiktok_insights_followers_count',
  // daily profile trend
  date: 'tiktok_insights_date',
  newFollowers: 'tiktok_insights_daily_new_followers',
  lostFollowers: 'tiktok_insights_daily_lost_followers',
  netFollowers: 'tiktok_insights_daily_total_followers',
  profileViews: 'tiktok_insights_profile_views',
  profileVideoViews: 'tiktok_insights_profile_video_views',
  dailyLikes: 'tiktok_insights_likes',
  dailyComments: 'tiktok_insights_comments',
  dailyShares: 'tiktok_insights_shares',
  engagedAudience: 'tiktok_insights_engaged_audience',
  // videos
  videoId: 'tiktok_insights_video_id',
  createTime: 'tiktok_insights_video_create_time',
  caption: 'tiktok_insights_video_caption',
  thumb: 'tiktok_insights_video_thumbnail_url',
  shareUrl: 'tiktok_insights_video_share_url',
  duration: 'tiktok_insights_video_duration',
  vViews: 'tiktok_insights_video_views',
  vLikes: 'tiktok_insights_video_likes',
  vComments: 'tiktok_insights_video_comments',
  vShares: 'tiktok_insights_video_shares',
  vFavorites: 'tiktok_insights_video_favorites',
  vEngagements: 'tiktok_insights_video_engagements',
  vAvgWatch: 'tiktok_insights_video_average_time_watched',
  vFullWatch: 'tiktok_insights_full_video_watched_rate',
  vNewFollowers: 'tiktok_insights_video_new_followers',
  vProfileViews: 'tiktok_insights_video_profile_views',
  vReach: 'tiktok_insights_video_reach',
  // video performance (per selected video)
  retention: 'tiktok_insights_video_view_retention_percentage',
  second: 'tiktok_insights_video_specific_second',
  imprSources: 'tiktok_insights_video_impression_sources',
  imprSource: 'tiktok_insights_impression_source',
  audTypesPct: 'tiktok_insights_video_audience_types_percentage',
  audTypes: 'tiktok_insights_video_audience_types',
  // audience
  gender: 'tiktok_insights_gender',
  genderPct: 'tiktok_insights_audience_genders_percentage',
  age: 'tiktok_insights_age',
  agePct: 'tiktok_insights_audience_ages_percentage',
  country: 'tiktok_insights_country',
  countryPct: 'tiktok_insights_audience_countries_percentage',
  city: 'tiktok_insights_city',
  cityPct: 'tiktok_insights_audience_cities_percentage',
} as const;

// TikTok brand palette.
const TT = { red: '#FE2C55', cyan: '#25F4EE', redSoft: '#FF7A9E', cyanSoft: '#7AF7F0', gray: '#a8a8a8' };
const PALETTE = [TT.red, TT.cyan, TT.redSoft, TT.cyanSoft, '#8a8b91', '#5c5d63'];

Chart.defaults.color = '#a8a8a8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.animation = false;

// ─── helpers ─────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function sumRows(rows: Row[] | undefined, col: string): number {
  if (!rows) return 0;
  return rows.reduce((t, r) => t + num(r[col]), 0);
}
function fmtCompact(v: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}
function fmtFull(v: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}
function fmtSeconds(v: number): string {
  if (v >= 60) {
    const m = Math.floor(v / 60);
    const s = Math.round(v % 60);
    return `${m}m ${s}s`;
  }
  return `${v.toFixed(1)}s`;
}
function fmtPct(v: number): string {
  return (v * 100).toFixed(1) + '%';
}
function mediaSrc(u: unknown): string {
  if (!u) return '';
  const s = String(u);
  if (s.indexOf('http') === 0) return s;
  if (!/[a-z]/i.test(s)) return '';
  return 'https://' + s;
}
function dayKey(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '').slice(0, 8);
}
function parseDay(v: unknown): Date | null {
  const d = dayKey(v);
  if (d.length !== 8) return null;
  return new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(4, 6)) - 1, Number(d.slice(6, 8))));
}
function fmtDate(v: unknown, style: 'short' | 'long'): string {
  const d = parseDay(v);
  if (!d) return String(v ?? '');
  return d.toLocaleDateString('en-US', style === 'short'
    ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}
function isDateStr(v: unknown): boolean {
  return dayKey(v).length === 8;
}

type Delta = { text: string; dir: 'up' | 'down' | 'flat' } | null;
function deltaFrom(cur: number, prev: number | null | undefined): Delta {
  if (prev == null || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, dir };
}
function deltaOf(q: ReportQuery, col: string): Delta {
  if (!q.prev) return null;
  return deltaFrom(sumRows(q.data?.rows as Row[], col), sumRows(q.prev.rows as Row[], col));
}

function DeltaLine({ delta }: { delta: Delta }) {
  if (!delta) return <div className="porter-delta" />;
  return <div className={`porter-delta porter-delta--${delta.dir}`}>{delta.text} vs prev</div>;
}

function sortByCol(rows: Row[], col: string): Row[] {
  return rows.slice().sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1));
}

/**
 * Per-video percentage metrics (impression sources, viewer types) only exist at
 * the video level. To get an account-wide share, weight each video's fraction by
 * that video's views: share_k = Σ(pct_video,k · views_video) / Σ(views_video).
 * Returns a fraction per category key.
 */
function weightedShares(rows: Row[], dimCol: string, pctCol: string, viewsCol: string, idCol: string): Record<string, number> {
  const numer: Record<string, number> = {};
  for (const r of rows) {
    const k = String(r[dimCol] ?? '');
    numer[k] = (numer[k] || 0) + num(r[pctCol]) * num(r[viewsCol]);
  }
  const seen: Record<string, boolean> = {};
  let denom = 0;
  for (const r of rows) {
    const id = String(r[idCol]);
    if (!seen[id]) {
      seen[id] = true;
      denom += num(r[viewsCol]);
    }
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(numer)) out[k] = denom > 0 ? numer[k] / denom : 0;
  return out;
}

/** Build a video_id → {source: fraction} lookup from an impression-source query. */
function perVideoShares(rows: Row[], dimCol: string, pctCol: string, idCol: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const id = String(r[idCol]);
    if (!out[id]) out[id] = {};
    out[id][String(r[dimCol] ?? '')] = num(r[pctCol]);
  }
  return out;
}

// ─── Chart.js canvas wrapper ─────────────────────────────────────────────────

function ChartCanvas({ build, deps, chartRef }: {
  build: (el: HTMLCanvasElement) => Chart | null;
  deps: unknown[];
  chartRef?: (c: Chart | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const c = build(ref.current);
    if (chartRef) chartRef(c);
    return () => {
      if (chartRef) chartRef(null);
      c?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} />;
}

function SparkCanvas({ values, color, bg }: { values: number[]; color: string; bg: string }) {
  return (
    <ChartCanvas
      deps={[JSON.stringify(values), color]}
      build={(el) =>
        new Chart(el.getContext('2d')!, {
          type: 'line',
          data: {
            labels: values.map(() => ''),
            datasets: [{ data: values, borderColor: color, backgroundColor: bg, borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.35 }],
          },
          options: {
            maintainAspectRatio: false,
            animation: false,
            events: [],
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
          },
        })
      }
    />
  );
}

function KpiSpark({ label, value, delta, series, color, bg, loading }: {
  label: string;
  value: string;
  delta: Delta;
  series?: number[];
  color?: string;
  bg?: string;
  loading: boolean;
}) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="kpi-row">
        {loading ? <Skeleton height={30} width="60%" /> : <div className="value">{value}</div>}
        {series && color && bg && (
          <div className="spark-wrap">{!loading && <SparkCanvas values={series} color={color} bg={bg} />}</div>
        )}
      </div>
      <DeltaLine delta={loading ? null : delta} />
    </div>
  );
}

function TtCard({ title, q, minRows = 1, children, extraLoading, hint, className }: {
  title?: string;
  q: ReportQuery;
  minRows?: number;
  children: React.ReactNode;
  extraLoading?: boolean;
  hint?: string;
  className?: string;
}) {
  const loading = q.loading || q.empty || extraLoading;
  const rows = (q.data?.rows ?? []) as Row[];
  return (
    <section className={`card chart-card${className ? ' ' + className : ''}`}>
      {title && <h3>{title}</h3>}
      {loading ? (
        <SkeletonChart height={180} />
      ) : q.error ? (
        <div className="state-error">
          <span>
            This block couldn&apos;t load its data — usually a temporary connection hiccup. Refresh the page or adjust the
            date range; if it persists across refreshes, the data source needs attention.
          </span>
          <button className="btn-ghost" onClick={q.retry}>Retry</button>
        </div>
      ) : rows.length < minRows ? (
        <div className="state-empty">No data in this date range — widen the date picker.</div>
      ) : (
        children
      )}
      {hint && <div className="hint">{hint}</div>}
    </section>
  );
}

// ─── Annotated growth chart: video thumbnails pinned to the followers line ───

function circleThumb(url: string, onReady: () => void): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 36;
  c.height = 36;
  const g = c.getContext('2d')!;
  function ring() {
    const grad = g.createLinearGradient(0, 36, 36, 0);
    grad.addColorStop(0, TT.cyan);
    grad.addColorStop(1, TT.red);
    g.strokeStyle = grad;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(18, 18, 15.5, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = TT.red;
  g.beginPath();
  g.arc(18, 18, 13, 0, Math.PI * 2);
  g.fill();
  ring();
  if (url) {
    const img = new Image();
    img.onload = () => {
      g.clearRect(0, 0, 36, 36);
      g.save();
      g.beginPath();
      g.arc(18, 18, 13, 0, Math.PI * 2);
      g.clip();
      g.drawImage(img, 5, 5, 26, 26);
      g.restore();
      ring();
      onReady();
    };
    img.src = url;
  }
  return c;
}

type DayVideos = { count: number; views: number; likes: number; caption: string; url: string };

function AnnotatedChart({ trendRows, followerSeries, videoRows }: { trendRows: Row[]; followerSeries?: number[]; videoRows: Row[] }) {
  const chartHolder = useRef<Chart | null>(null);
  const rows = sortByCol(trendRows, F.date);
  const labels = rows.map((r) => fmtDate(r[F.date], 'short'));
  const dateKeys = rows.map((r) => dayKey(r[F.date]));
  // Use the derived "new followers per day" series when provided (TikTok often
  // returns daily_new_followers as all-zeros); fall back to the raw field.
  const followers = followerSeries && followerSeries.length === rows.length
    ? followerSeries
    : rows.map((r) => num(r[F.newFollowers]));

  const byDate: Record<string, DayVideos> = {};
  for (const v of videoRows) {
    const k = dayKey(v[F.createTime]);
    if (!byDate[k]) byDate[k] = { count: 0, views: 0, likes: 0, caption: '', url: '' };
    byDate[k].count += 1;
    byDate[k].views += num(v[F.vViews]);
    byDate[k].likes += num(v[F.vLikes]);
    if (!byDate[k].url) {
      byDate[k].url = mediaSrc(v[F.thumb]);
      const cap = String(v[F.caption] ?? '');
      byDate[k].caption = cap.length > 70 ? cap.slice(0, 70) + '…' : cap;
    }
  }

  return (
    <div className="canvas-wrap tall">
      <ChartCanvas
        deps={[JSON.stringify(dateKeys), JSON.stringify(followers), videoRows.length]}
        chartRef={(c) => { chartHolder.current = c; }}
        build={(el) => {
          const markerData: (number | null)[] = [];
          const markerStyles: (HTMLCanvasElement | string)[] = [];
          const markerInfo: (DayVideos | null)[] = [];
          const redraw = () => chartHolder.current?.update('none');
          dateKeys.forEach((k, i) => {
            const v = byDate[k];
            if (v) {
              markerData.push(followers[i]);
              markerStyles.push(circleThumb(v.url, redraw));
              markerInfo.push(v);
            } else {
              markerData.push(null);
              markerStyles.push('circle');
              markerInfo.push(null);
            }
          });
          return new Chart(el.getContext('2d')!, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'New followers',
                  data: followers,
                  borderColor: TT.cyan,
                  backgroundColor: 'rgba(37, 244, 238, 0.12)',
                  pointBackgroundColor: TT.cyan,
                  pointBorderColor: '#000',
                  pointBorderWidth: 1,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 3,
                  pointHoverRadius: 6,
                  borderWidth: 2,
                  order: 2,
                },
                {
                  label: 'Video published',
                  data: markerData,
                  showLine: false,
                  pointStyle: markerStyles,
                  pointRadius: 16,
                  pointHoverRadius: 18,
                  order: 1,
                },
              ],
            },
            options: {
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: { usePointStyle: true, boxHeight: 6, filter: (item) => item.datasetIndex === 0 },
                },
                tooltip: {
                  callbacks: {
                    title: (items) => (items.length ? fmtDate(dateKeys[items[0].dataIndex], 'long') : ''),
                    label: (item) => {
                      if (item.datasetIndex === 0) return 'New followers: ' + fmtFull(item.parsed.y as number);
                      const v = markerInfo[item.dataIndex];
                      if (!v) return '';
                      const lines = [
                        v.count + (v.count === 1 ? ' video' : ' videos') + ' — ' + fmtFull(v.views) + ' views, ' + fmtFull(v.likes) + ' likes',
                      ];
                      if (v.caption) lines.push('“' + v.caption + '”');
                      return lines;
                    },
                  },
                },
              },
              scales: { x: { ticks: { maxTicksLimit: 10 } }, y: { beginAtZero: true } },
            },
          });
        }}
      />
    </div>
  );
}

// ─── Doughnut / bar builders ─────────────────────────────────────────────────

function Doughnut({ labels, values, colors, format }: { labels: string[]; values: number[]; colors: string[]; format?: (v: number) => string }) {
  return (
    <div className="canvas-wrap donut">
      <ChartCanvas
        deps={[JSON.stringify(labels), JSON.stringify(values)]}
        build={(el) =>
          new Chart(el.getContext('2d')!, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#000', borderWidth: 3 }] },
            options: {
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
                tooltip: format
                  ? { callbacks: { label: (item) => `${item.label}: ${format(item.parsed as number)}` } }
                  : undefined,
              },
            },
          })
        }
      />
    </div>
  );
}

function Bars({ labels, values, colors, horizontal, format }: {
  labels: string[];
  values: number[];
  colors: string | string[];
  horizontal?: boolean;
  format?: (v: number) => string;
}) {
  return (
    <div className="canvas-wrap">
      <ChartCanvas
        deps={[JSON.stringify(labels), JSON.stringify(values)]}
        build={(el) =>
          new Chart(el.getContext('2d')!, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 6 }] },
            options: {
              maintainAspectRatio: false,
              indexAxis: horizontal ? ('y' as const) : ('x' as const),
              plugins: {
                legend: { display: false },
                tooltip: format
                  ? { callbacks: { label: (item) => format((horizontal ? item.parsed.x : item.parsed.y) as number) } }
                  : undefined,
              },
              scales: horizontal ? { x: { beginAtZero: true } } : { y: { beginAtZero: true } },
            },
          })
        }
      />
    </div>
  );
}

// ─── Top videos carousel ─────────────────────────────────────────────────────

const EXT_ICON = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);

function Carousel({ rows }: { rows: Row[] }) {
  const carRef = useRef<HTMLDivElement>(null);
  const sorted = rows.slice().sort((a, b) => num(b[F.vViews]) - num(a[F.vViews]));
  const scroll = (dir: number) => {
    const car = carRef.current;
    if (car) car.scrollBy({ left: dir * car.clientWidth, behavior: 'smooth' });
  };
  return (
    <>
      <div className="carousel-head">
        <h3>Top videos</h3>
        <div className="carousel-nav">
          <button onClick={() => scroll(-1)} aria-label="Previous">&lsaquo;</button>
          <button onClick={() => scroll(1)} aria-label="Next">&rsaquo;</button>
        </div>
      </div>
      <div className="carousel" ref={carRef}>
        {sorted.map((r, i) => {
          const src = mediaSrc(r[F.thumb]);
          const link = mediaSrc(r[F.shareUrl]);
          let cap = String(r[F.caption] ?? '');
          if (cap.length > 70) cap = cap.slice(0, 70) + '…';
          if (!cap) cap = 'View video';
          const dateVal = r[F.createTime];
          const dur = num(r[F.duration]);
          const metrics: Array<[string, string]> = [
            ['Views', fmtFull(num(r[F.vViews]))],
            ['Likes', fmtFull(num(r[F.vLikes]))],
            ['Comments', fmtFull(num(r[F.vComments]))],
            ['Shares', fmtFull(num(r[F.vShares]))],
            ['Avg watch time', fmtSeconds(num(r[F.vAvgWatch]))],
            ['Watched in full', fmtPct(num(r[F.vFullWatch]))],
          ];
          return (
            <article className="post-card" key={i}>
              {src ? (
                <img className="post-img" src={src} loading="lazy" alt="" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="post-noimg">No thumbnail</div>
              )}
              <div className="post-body">
                {link ? (
                  <a className="post-link" href={link} target="_blank" rel="noopener noreferrer">
                    {EXT_ICON}
                    <span>{cap}</span>
                  </a>
                ) : (
                  <span className="post-link">{cap}</span>
                )}
                <div className="post-meta">
                  {dur > 0 && <span className="type-badge">{Math.round(dur)}s</span>}
                  <span>{isDateStr(dateVal) ? fmtDate(dateVal, 'long') : String(dateVal ?? '')}</span>
                </div>
                <div className="pc-rows">
                  {metrics.map((m) => (
                    <div className="pc-row" key={m[0]}>
                      <span className="pc-k">{m[0]}</span>
                      <span className="pc-v">{m[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ─── Pages ───────────────────────────────────────────────────────────────────

type PageProps = { accounts: Array<{ id: string }>; range: Range; compare: boolean };

function qLoading(q: ReportQuery): boolean {
  return q.loading || q.empty;
}

const VIDEO_LIST_FIELDS = [
  F.videoId, F.createTime, F.caption, F.thumb, F.shareUrl, F.duration,
  F.vViews, F.vLikes, F.vComments, F.vShares, F.vFavorites, F.vEngagements, F.vAvgWatch, F.vFullWatch,
];

function OverviewPage({ accounts, range, compare }: PageProps) {
  const qFollowers = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.followersTotal], limit: 10 }, range, compare);
  const qTrend = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.newFollowers, F.lostFollowers, F.netFollowers, F.profileViews, F.profileVideoViews, F.followersTotal], sort: [{ field: F.date, direction: 'asc' }], limit: 1000 },
    range,
    compare,
  );
  const qEng = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.dailyLikes, F.dailyComments, F.dailyShares, F.engagedAudience], sort: [{ field: F.date, direction: 'asc' }], limit: 1000 },
    range,
    compare,
  );
  const qVideos = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.videoId, F.createTime, F.caption, F.thumb, F.vViews, F.vLikes], limit: 500 },
    range,
  );

  const trendRows = useMemo(() => sortByCol((qTrend.data?.rows ?? []) as Row[], F.date), [qTrend.data]);
  const engRows = useMemo(() => sortByCol((qEng.data?.rows ?? []) as Row[], F.date), [qEng.data]);
  // Per-day total followers, when TikTok returns it (it does for most accounts).
  const followersByDay = useMemo(() => trendRows.map((r) => num(r[F.followersTotal])), [trendRows]);
  const totalFollowers =
    followersByDay.filter((v) => v > 0).slice(-1)[0] ?? sumRows(qFollowers.data?.rows as Row[], F.followersTotal);

  // "New followers per day" — TikTok leaves daily_new_followers at 0 for many
  // accounts, which flatlines the chart. When it's empty, derive the real daily
  // gain from the day-over-day change in the total-followers series instead.
  const newFollowersSeries = useMemo(() => {
    const raw = trendRows.map((r) => num(r[F.newFollowers]));
    if (raw.some((v) => v !== 0)) return raw;
    return followersByDay.map((t, i) => (i === 0 || followersByDay[i - 1] === 0 ? 0 : Math.max(0, t - followersByDay[i - 1])));
  }, [trendRows, followersByDay]);
  const newFollowersTotal = newFollowersSeries.reduce((a, b) => a + b, 0);

  // Followers sparkline: the real per-day totals when present, else reconstruct
  // backwards from today's total minus each day's net follower change.
  const followersSpark = useMemo(() => {
    if (followersByDay.some((v) => v > 0)) return followersByDay;
    const net = trendRows.map((r) => num(r[F.netFollowers]));
    const series: number[] = [];
    let running = totalFollowers;
    for (let i = net.length - 1; i >= 0; i--) {
      series[i] = running;
      running -= net[i];
    }
    return series;
  }, [trendRows, followersByDay, totalFollowers]);

  const trendDefs = [
    { col: F.newFollowers, label: 'New followers', color: TT.red, bg: 'rgba(254,44,85,0.12)', fmt: fmtFull },
    { col: F.lostFollowers, label: 'Lost followers', color: '#8a8b91', bg: 'rgba(138,139,145,0.12)', fmt: fmtFull },
    { col: F.profileViews, label: 'Profile views', color: TT.redSoft, bg: 'rgba(255,122,158,0.12)', fmt: fmtCompact },
    { col: F.profileVideoViews, label: 'Video views', color: TT.cyan, bg: 'rgba(37,244,238,0.12)', fmt: fmtCompact },
  ];
  const engDefs = [
    { col: F.dailyLikes, label: 'Likes', color: TT.red, bg: 'rgba(254,44,85,0.12)' },
    { col: F.dailyComments, label: 'Comments', color: TT.cyan, bg: 'rgba(37,244,238,0.12)' },
    { col: F.dailyShares, label: 'Shares', color: TT.redSoft, bg: 'rgba(255,122,158,0.12)' },
    { col: F.engagedAudience, label: 'Engaged audience', color: TT.cyanSoft, bg: 'rgba(122,247,240,0.12)' },
  ];

  return (
    <div className="page">
      <div className="kpi-grid">
        <KpiSpark
          label="Total followers"
          value={fmtFull(totalFollowers)}
          delta={deltaOf(qFollowers, F.followersTotal)}
          series={followersSpark}
          color={TT.cyan}
          bg="rgba(37,244,238,0.12)"
          loading={qLoading(qFollowers) || qLoading(qTrend)}
        />
        <div className="kpi-group">
          {trendDefs.map((d) => {
            const isNew = d.col === F.newFollowers;
            return (
              <KpiSpark
                key={d.col}
                label={d.label}
                value={isNew ? fmtFull(newFollowersTotal) : d.fmt(sumRows(qTrend.data?.rows as Row[], d.col))}
                delta={deltaOf(qTrend, d.col)}
                series={isNew ? newFollowersSeries : trendRows.map((r) => num(r[d.col]))}
                color={d.color}
                bg={d.bg}
                loading={qLoading(qTrend)}
              />
            );
          })}
        </div>
      </div>

      <TtCard
        title="New followers — annotated with the videos published each day"
        q={qTrend}
        extraLoading={qVideos.loading}
        hint="Each circle is a video published that day (the thumbnail is the video itself). Hover a circle to see the caption, views and likes — so you can tell exactly what drove a spike."
      >
        <AnnotatedChart trendRows={trendRows} followerSeries={newFollowersSeries} videoRows={(qVideos.data?.rows ?? []) as Row[]} />
      </TtCard>

      <div className="kpi-group mini">
        {engDefs.map((d) => (
          <KpiSpark
            key={d.col}
            label={d.label}
            value={fmtFull(sumRows(qEng.data?.rows as Row[], d.col))}
            delta={deltaOf(qEng, d.col)}
            series={engRows.map((r) => num(r[d.col]))}
            color={d.color}
            bg={d.bg}
            loading={qLoading(qEng)}
          />
        ))}
      </div>
    </div>
  );
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function VideosPage({ accounts, range, compare }: PageProps) {
  const qVideos = useReportQuery(
    { connector: CONNECTOR, accounts, fields: VIDEO_LIST_FIELDS, limit: 500 },
    range,
    compare,
  );
  const qSources = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.imprSource, F.videoId, F.imprSources, F.vViews], limit: 1000 },
    range,
  );
  const rows = (qVideos.data?.rows ?? []) as Row[];

  // Account-wide impression-source mix: weight each video's source split by views.
  const sourceMix = useMemo(() => {
    const shares = weightedShares((qSources.data?.rows ?? []) as Row[], F.imprSource, F.imprSources, F.vViews, F.videoId);
    return Object.entries(shares)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [qSources.data]);

  // Sparklines run on the publish timeline; same-day videos combine into one point.
  const byDay = useMemo(() => {
    const acc: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const k = dayKey(r[F.createTime]);
      if (!acc[k]) acc[k] = { [F.vViews]: 0, [F.vLikes]: 0, [F.vComments]: 0, [F.vShares]: 0, [F.vFavorites]: 0, [F.vEngagements]: 0 };
      for (const col of [F.vViews, F.vLikes, F.vComments, F.vShares, F.vFavorites, F.vEngagements]) acc[k][col] += num(r[col]);
    }
    return Object.keys(acc).sort().map((k) => acc[k]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qVideos.data]);

  const defs = [
    { col: F.vViews, label: 'Video views', color: TT.cyan, bg: 'rgba(37,244,238,0.12)', fmt: fmtCompact },
    { col: F.vLikes, label: 'Likes', color: TT.red, bg: 'rgba(254,44,85,0.12)', fmt: fmtCompact },
    { col: F.vComments, label: 'Comments', color: TT.redSoft, bg: 'rgba(255,122,158,0.12)', fmt: fmtFull },
    { col: F.vShares, label: 'Shares', color: TT.cyanSoft, bg: 'rgba(122,247,240,0.12)', fmt: fmtFull },
    { col: F.vFavorites, label: 'Favorites', color: '#8a8b91', bg: 'rgba(138,139,145,0.12)', fmt: fmtFull },
  ];

  const views = sumRows(rows, F.vViews);
  const engs = sumRows(rows, F.vEngagements);
  const rate = views > 0 ? engs / views : 0;
  const prevRows = (qVideos.prev?.rows ?? []) as Row[];
  const pViews = sumRows(prevRows, F.vViews);
  const pEngs = sumRows(prevRows, F.vEngagements);
  const pRate = pViews > 0 ? pEngs / pViews : 0;
  const rateSeries = byDay.map((r) => (r[F.vViews] > 0 ? (r[F.vEngagements] / r[F.vViews]) * 100 : 0));

  // Best days: total views of videos published per weekday.
  const weekday = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const r of rows) {
      const d = parseDay(r[F.createTime]);
      if (d) totals[d.getUTCDay()] += num(r[F.vViews]);
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qVideos.data]);

  // Duration mix: TikTok's analog of the IG post-type donut.
  const durations = useMemo(() => {
    const buckets = { 'Under 15s': 0, '15-30s': 0, '30-60s': 0, 'Over 60s': 0 } as Record<string, number>;
    for (const r of rows) {
      const d = num(r[F.duration]);
      if (d < 15) buckets['Under 15s'] += 1;
      else if (d < 30) buckets['15-30s'] += 1;
      else if (d < 60) buckets['30-60s'] += 1;
      else buckets['Over 60s'] += 1;
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qVideos.data]);

  return (
    <div className="page">
      <div className="kpi-group">
        {defs.map((d) => (
          <KpiSpark
            key={d.col}
            label={d.label}
            value={d.fmt(sumRows(rows, d.col))}
            delta={deltaOf(qVideos, d.col)}
            series={byDay.map((r) => r[d.col])}
            color={d.color}
            bg={d.bg}
            loading={qLoading(qVideos)}
          />
        ))}
        <KpiSpark
          label="Engagement rate"
          value={(rate * 100).toFixed(2) + '%'}
          delta={qVideos.prev ? deltaFrom(rate, pRate) : null}
          series={rateSeries}
          color="#4ade80"
          bg="rgba(74,222,128,0.12)"
          loading={qLoading(qVideos)}
        />
      </div>

      <section className="card">
        {qLoading(qVideos) ? (
          <SkeletonChart height={220} />
        ) : rows.length === 0 ? (
          <>
            <div className="carousel-head"><h3>Top videos</h3></div>
            <div className="state-empty">No videos in this date range — widen the date picker.</div>
          </>
        ) : (
          <Carousel rows={rows} />
        )}
      </section>

      <div className="charts-row">
        <TtCard
          title="Best days to post — views by publish day"
          q={qVideos}
          hint="Total views of the videos published on each day of the week."
        >
          <Bars labels={WEEKDAYS.map((d) => d.slice(0, 3))} values={weekday} colors={PALETTE[0]} format={fmtFull} />
        </TtCard>
        <TtCard title="Video length mix" q={qVideos} hint="Share of videos published in each duration bucket.">
          <Doughnut labels={Object.keys(durations)} values={Object.values(durations)} colors={PALETTE} format={fmtFull} />
        </TtCard>
      </div>

      <TtCard
        title="How your views are distributed"
        q={qSources}
        hint="Share of all video views by TikTok surface, weighted by each video's views. 'For You' is algorithmic reach; 'Search' and 'Personal Profile' are intent-driven; 'Follow' is your existing audience."
      >
        <Doughnut
          labels={sourceMix.map((s) => s[0])}
          values={sourceMix.map((s) => s[1] * 100)}
          colors={PALETTE}
          format={(v) => v.toFixed(1) + '%'}
        />
      </TtCard>
    </div>
  );
}

function PerformancePage({ accounts, range }: PageProps) {
  const qVideos = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.videoId, F.createTime, F.caption, F.thumb, F.shareUrl, F.vViews, F.vAvgWatch, F.vFullWatch, F.vNewFollowers, F.vFavorites, F.duration], limit: 500 },
    range,
  );
  const rows = (qVideos.data?.rows ?? []) as Row[];
  const sorted = useMemo(
    () => rows.slice().sort((a, b) => num(b[F.vViews]) - num(a[F.vViews])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qVideos.data],
  );
  const [videoId, setVideoId] = useState<string>('');
  const selectedId = videoId || String(sorted[0]?.[F.videoId] ?? '');
  const selected = sorted.find((r) => String(r[F.videoId]) === selectedId);

  // The production query plane takes filters as a FLAT array of filter objects
  // ([]map in Go) — the template's nested Filter[][] shape is rejected.
  const filters = selectedId
    ? ([{ fieldName: F.videoId, operator: 'equals', values: [selectedId] }] as unknown as import('../lib/porter').Filter[][])
    : undefined;
  const qRetention = useReportQuery(
    { connector: CONNECTOR, accounts: selectedId ? accounts : [], fields: [F.second, F.retention], filters, limit: 1000 },
    range,
  );
  const qSources = useReportQuery(
    { connector: CONNECTOR, accounts: selectedId ? accounts : [], fields: [F.imprSource, F.imprSources], filters, limit: 50 },
    range,
  );
  const qTypes = useReportQuery(
    { connector: CONNECTOR, accounts: selectedId ? accounts : [], fields: [F.audTypes, F.audTypesPct], filters, limit: 50 },
    range,
  );

  const retRows = useMemo(() => {
    const rr = (qRetention.data?.rows ?? []) as Row[];
    return rr.slice().sort((a, b) => num(a[F.second]) - num(b[F.second]));
  }, [qRetention.data]);
  const srcRows = (qSources.data?.rows ?? []) as Row[];
  const typeRows = (qTypes.data?.rows ?? []) as Row[];

  const kpis: Array<[string, string]> = selected
    ? [
        ['Views', fmtFull(num(selected[F.vViews]))],
        ['Avg watch time', fmtSeconds(num(selected[F.vAvgWatch]))],
        ['Watched in full', fmtPct(num(selected[F.vFullWatch]))],
        ['New followers', fmtFull(num(selected[F.vNewFollowers]))],
        ['Favorites', fmtFull(num(selected[F.vFavorites]))],
        ['Duration', fmtSeconds(num(selected[F.duration]))],
      ]
    : [];

  return (
    <div className="page">
      <section className="card">
        <div className="video-picker">
          <h3>Video deep-dive</h3>
          {qLoading(qVideos) ? (
            <Skeleton height={34} width={320} />
          ) : (
            <select className="chip preset-select video-select" value={selectedId} onChange={(e) => setVideoId(e.target.value)} aria-label="Video">
              {sorted.map((r) => {
                const cap = String(r[F.caption] ?? '').slice(0, 60) || String(r[F.videoId]);
                return (
                  <option key={String(r[F.videoId])} value={String(r[F.videoId])}>
                    {fmtDate(r[F.createTime], 'short')} · {cap} ({fmtCompact(num(r[F.vViews]))} views)
                  </option>
                );
              })}
            </select>
          )}
        </div>

        {selected && (
          <div className="selected-video">
            {mediaSrc(selected[F.thumb]) ? (
              <img className="sv-thumb" src={mediaSrc(selected[F.thumb])} alt="" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
            ) : (
              <div className="sv-thumb sv-thumb--empty">No thumbnail</div>
            )}
            <div className="sv-meta">
              <div className="sv-date">{fmtDate(selected[F.createTime], 'long')}</div>
              <div className="sv-caption">{String(selected[F.caption] ?? '') || 'Untitled video'}</div>
              {mediaSrc(selected[F.shareUrl]) && (
                <a className="sv-link" href={mediaSrc(selected[F.shareUrl])} target="_blank" rel="noopener noreferrer">
                  {EXT_ICON}<span>Open on TikTok</span>
                </a>
              )}
            </div>
          </div>
        )}

        <div className="kpi-group mini">
          {kpis.map((k) => (
            <div className="kpi" key={k[0]}>
              <div className="label">{k[0]}</div>
              <div className="value value-sm">{k[1]}</div>
            </div>
          ))}
          {!selected && !qLoading(qVideos) && <div className="state-empty">No videos in this date range — widen the date picker.</div>}
        </div>
      </section>

      <TtCard
        title="Viewer retention — % still watching at each second"
        q={qRetention}
        hint="How far into the video people keep watching. A steep early drop means the hook loses viewers in the first seconds."
      >
        <div className="canvas-wrap">
          <ChartCanvas
            deps={[JSON.stringify(retRows.map((r) => [r[F.second], r[F.retention]]))]}
            build={(el) =>
              new Chart(el.getContext('2d')!, {
                type: 'line',
                data: {
                  labels: retRows.map((r) => String(num(r[F.second])) + 's'),
                  datasets: [
                    {
                      label: 'Still watching',
                      data: retRows.map((r) => num(r[F.retention]) * 100),
                      borderColor: TT.red,
                      backgroundColor: 'rgba(254,44,85,0.15)',
                      fill: true,
                      tension: 0.3,
                      pointRadius: 0,
                      borderWidth: 2,
                    },
                  ],
                },
                options: {
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (item) => (item.parsed.y as number).toFixed(2) + '% still watching' } },
                  },
                  scales: { x: { ticks: { maxTicksLimit: 12 } }, y: { beginAtZero: true, ticks: { callback: (v) => v + '%' } } },
                },
              })
            }
          />
        </div>
      </TtCard>

      <div className="charts-row">
        <TtCard title="Where this video's views came from" q={qSources} hint="TikTok surfaces that showed this video. 'For You' is algorithmic reach to non-followers; 'Search' and 'Personal Profile' are people actively looking; 'Follow' is your own audience.">
          <Doughnut
            labels={srcRows.map((r) => String(r[F.imprSource] ?? 'Unknown'))}
            values={srcRows.map((r) => num(r[F.imprSources]) * 100)}
            colors={PALETTE}
            format={(v) => v.toFixed(1) + '%'}
          />
        </TtCard>
        <TtCard title="Who watched this video" q={qTypes} hint="Two independent splits: followers vs non-followers, and first-time vs returning viewers.">
          <ViewerTypeSplits rows={typeRows} />
        </TtCard>
      </div>
    </div>
  );
}

// TikTok returns viewer types as two overlapping binary splits (follower/non-
// follower AND new/returning), each summing to ~100%. Render them as two small
// bars, never one donut (that would sum to ~200%).
function humanizeViewerType(k: string): string {
  const map: Record<string, string> = {
    FOLLOWER_PERCENT: 'Followers',
    NON_FOLLOWER_PERCENT: 'Non-followers',
    NEW_VIEWER: 'First-time viewers',
    RETURN_VIEWER: 'Returning viewers',
  };
  return map[k] || k;
}

function ViewerTypeSplits({ rows }: { rows: Row[] }) {
  const val = (key: string) => {
    const r = rows.find((x) => String(x[F.audTypes]) === key);
    return r ? num(r[F.audTypesPct]) : 0;
  };
  const splits = [
    { a: ['Followers', val('FOLLOWER_PERCENT')], b: ['Non-followers', val('NON_FOLLOWER_PERCENT')] },
    { a: ['First-time', val('NEW_VIEWER')], b: ['Returning', val('RETURN_VIEWER')] },
  ] as const;
  return (
    <div className="split-bars">
      {splits.map((s, i) => {
        const total = (s.a[1] as number) + (s.b[1] as number) || 1;
        const aPct = ((s.a[1] as number) / total) * 100;
        return (
          <div className="split-row" key={i}>
            <div className="split-track">
              <div className="split-fill split-fill--a" style={{ width: `${aPct}%` }} />
              <div className="split-fill split-fill--b" style={{ width: `${100 - aPct}%` }} />
            </div>
            <div className="split-legend">
              <span><i className="dot dot--a" />{s.a[0]} {((s.a[1] as number) * 100).toFixed(0)}%</span>
              <span><i className="dot dot--b" />{s.b[0]} {((s.b[1] as number) * 100).toFixed(0)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AudiencePage({ accounts, range }: PageProps) {
  const qGender = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.gender, F.genderPct], limit: 20 }, range);
  const qAge = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.age, F.agePct], limit: 20 }, range);
  const qCountry = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.country, F.countryPct], limit: 100 }, range);
  const qCity = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.city, F.cityPct], limit: 200 }, range);

  const genderRows = (qGender.data?.rows ?? []) as Row[];
  const ageRows = useMemo(() => sortByCol((qAge.data?.rows ?? []) as Row[], F.age), [qAge.data]);
  const countryRows = useMemo(() => {
    const cr = (qCountry.data?.rows ?? []) as Row[];
    return cr.slice().sort((a, b) => num(b[F.countryPct]) - num(a[F.countryPct])).slice(0, 10);
  }, [qCountry.data]);
  const cityRows = useMemo(() => {
    const cr = (qCity.data?.rows ?? []) as Row[];
    return cr.slice().sort((a, b) => num(b[F.cityPct]) - num(a[F.cityPct])).slice(0, 10);
  }, [qCity.data]);

  return (
    <div className="page">
      <div className="charts-row">
        <TtCard title="Followers by gender" q={qGender}>
          <Doughnut
            labels={genderRows.map((r) => String(r[F.gender] ?? 'Unknown'))}
            values={genderRows.map((r) => num(r[F.genderPct]) * 100)}
            colors={[TT.red, TT.cyan, TT.gray]}
            format={(v) => v.toFixed(1) + '%'}
          />
        </TtCard>
        <TtCard title="Followers by age" q={qAge}>
          <Bars
            labels={ageRows.map((r) => String(r[F.age] ?? ''))}
            values={ageRows.map((r) => num(r[F.agePct]) * 100)}
            colors={PALETTE}
            format={(v) => v.toFixed(1) + '%'}
          />
        </TtCard>
      </div>
      <div className="charts-row">
        <TtCard title="Followers by country — top 10" q={qCountry}>
          <Bars
            labels={countryRows.map((r) => String(r[F.country] ?? ''))}
            values={countryRows.map((r) => num(r[F.countryPct]) * 100)}
            colors={TT.cyan}
            horizontal
            format={(v) => v.toFixed(1) + '%'}
          />
        </TtCard>
        <TtCard title="Followers by city — top 10" q={qCity}>
          <Bars
            labels={cityRows.map((r) => String(r[F.city] ?? ''))}
            values={cityRows.map((r) => num(r[F.cityPct]) * 100)}
            colors={TT.red}
            horizontal
            format={(v) => v.toFixed(2) + '%'}
          />
        </TtCard>
      </div>
    </div>
  );
}

// ─── Acquisition ─────────────────────────────────────────────────────────────

type AcqSort = 'views' | 'foryou' | 'search' | 'followers' | 'newf' | 'profile' | 'reach' | 'date';

function AcquisitionPage({ accounts, range }: PageProps) {
  const qStats = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.videoId, F.createTime, F.caption, F.thumb, F.shareUrl, F.vViews, F.vNewFollowers, F.vProfileViews, F.vReach], limit: 500 },
    range,
  );
  const qSources = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.imprSource, F.videoId, F.imprSources, F.vViews], limit: 1000 },
    range,
  );
  const qTypes = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.audTypes, F.videoId, F.audTypesPct, F.vViews], limit: 1000 },
    range,
  );

  const statRows = (qStats.data?.rows ?? []) as Row[];
  const sourceRows = (qSources.data?.rows ?? []) as Row[];
  const typeRows = (qTypes.data?.rows ?? []) as Row[];

  // Account-wide weighted mixes.
  const sourceMix = useMemo(() => {
    const shares = weightedShares(sourceRows, F.imprSource, F.imprSources, F.vViews, F.videoId);
    return Object.entries(shares).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [qSources.data]);
  const typeMix = useMemo(() => weightedShares(typeRows, F.audTypes, F.audTypesPct, F.vViews, F.videoId), [qTypes.data]);

  // Per-video lookups for the table.
  const srcByVideo = useMemo(() => perVideoShares(sourceRows, F.imprSource, F.imprSources, F.videoId), [qSources.data]);
  const typeByVideo = useMemo(() => perVideoShares(typeRows, F.audTypes, F.audTypesPct, F.videoId), [qTypes.data]);

  const [sort, setSort] = useState<AcqSort>('views');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const toggleSort = (key: AcqSort) => {
    if (key === sort) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSort(key);
      setDir('desc');
    }
  };

  const tableRows = useMemo(() => {
    const out = statRows.map((r) => {
      const id = String(r[F.videoId]);
      const src = srcByVideo[id] || {};
      const typ = typeByVideo[id] || {};
      return {
        id,
        date: dayKey(r[F.createTime]),
        caption: String(r[F.caption] ?? '') || 'Untitled video',
        thumb: mediaSrc(r[F.thumb]),
        link: mediaSrc(r[F.shareUrl]),
        views: num(r[F.vViews]),
        foryou: src['For You'] || 0,
        search: src['Search'] || 0,
        followers: typ['FOLLOWER_PERCENT'] || 0,
        newf: num(r[F.vNewFollowers]),
        profile: num(r[F.vProfileViews]),
        reach: num(r[F.vReach]),
      };
    });
    const key = sort;
    out.sort((a, b) => {
      const av = a[key] as number | string;
      const bv = b[key] as number | string;
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return dir === 'desc' ? -cmp : cmp;
    });
    return out;
  }, [qStats.data, qSources.data, qTypes.data, sort, dir]);

  const totalViews = sumRows(statRows, F.vViews);
  const totalNewF = sumRows(statRows, F.vNewFollowers);
  const totalProfile = sumRows(statRows, F.vProfileViews);
  const forYouShare = (sourceMix.find((s) => s[0] === 'For You')?.[1] ?? 0) * 100;
  const nonFollowerShare = (typeMix['NON_FOLLOWER_PERCENT'] ?? 0) * 100;

  const summary: Array<[string, string]> = [
    ['Video views', fmtCompact(totalViews)],
    ['Reached via For You', forYouShare.toFixed(0) + '%'],
    ['Reached non-followers', nonFollowerShare.toFixed(0) + '%'],
    ['New followers from videos', fmtFull(totalNewF)],
    ['Profile visits driven', fmtFull(totalProfile)],
  ];

  const th = (key: AcqSort, label: string, numeric = true) => (
    <th
      className={`${numeric ? 'num' : ''} sortable${sort === key ? ' sorted' : ''}`}
      onClick={() => toggleSort(key)}
    >
      {label}
      {sort === key && <span className="sort-caret">{dir === 'desc' ? ' ▾' : ' ▴'}</span>}
    </th>
  );

  const anyLoading = qLoading(qStats) || qLoading(qSources) || qLoading(qTypes);

  return (
    <div className="page">
      <div className="kpi-group">
        {summary.map((k) => (
          <div className="kpi" key={k[0]}>
            <div className="label">{k[0]}</div>
            {anyLoading ? <Skeleton height={30} width="60%" /> : <div className="value value-sm">{k[1]}</div>}
          </div>
        ))}
      </div>

      <div className="charts-row">
        <TtCard
          title="How people find your content"
          q={qSources}
          hint="Share of all video views by TikTok surface, weighted by each video's views. High 'For You' = the algorithm is doing the work; high 'Search' = discoverable, intent-driven reach."
        >
          <Doughnut
            labels={sourceMix.map((s) => s[0])}
            values={sourceMix.map((s) => s[1] * 100)}
            colors={PALETTE}
            format={(v) => v.toFixed(1) + '%'}
          />
        </TtCard>
        <TtCard
          title="Who is seeing your content"
          q={qTypes}
          hint="Across all videos: are viewers already following you, and are they seeing you for the first time? Two independent splits."
        >
          <ViewerTypeSplits
            rows={[
              { [F.audTypes]: 'FOLLOWER_PERCENT', [F.audTypesPct]: typeMix['FOLLOWER_PERCENT'] ?? 0 },
              { [F.audTypes]: 'NON_FOLLOWER_PERCENT', [F.audTypesPct]: typeMix['NON_FOLLOWER_PERCENT'] ?? 0 },
              { [F.audTypes]: 'NEW_VIEWER', [F.audTypesPct]: typeMix['NEW_VIEWER'] ?? 0 },
              { [F.audTypes]: 'RETURN_VIEWER', [F.audTypesPct]: typeMix['RETURN_VIEWER'] ?? 0 },
            ]}
          />
        </TtCard>
      </div>

      <section className="card">
        <h3>Acquisition by video</h3>
        <div className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
          Every video with how it was found and who it reached. Click a column to sort — by date, views, % from For You or Search, % followers, or the followers and profile visits it drove.
        </div>
        {anyLoading ? (
          <SkeletonChart height={220} />
        ) : tableRows.length === 0 ? (
          <div className="state-empty">No videos in this date range — widen the date picker.</div>
        ) : (
          <div className="table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('date')}>
                    Video{sort === 'date' && <span className="sort-caret">{dir === 'desc' ? ' ▾' : ' ▴'}</span>}
                  </th>
                  {th('views', 'Views')}
                  {th('foryou', 'For You %')}
                  {th('search', 'Search %')}
                  {th('followers', 'Followers %')}
                  {th('newf', 'New followers')}
                  {th('profile', 'Profile visits')}
                  {th('reach', 'Reach')}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="post-cell">
                        {r.thumb ? (
                          <img className="post-thumb" src={r.thumb} alt="" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }} />
                        ) : (
                          <div className="post-thumb" />
                        )}
                        <div className="post-cell-text">
                          <div className="post-cell-date">{fmtDate(r.date, 'short')}</div>
                          {r.link ? (
                            <a className="post-caption-link" href={r.link} target="_blank" rel="noopener noreferrer" title={r.caption}>{r.caption}</a>
                          ) : (
                            <span className="post-caption" title={r.caption}>{r.caption}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="num">{fmtFull(r.views)}</td>
                    <td className="num">{(r.foryou * 100).toFixed(1)}%</td>
                    <td className="num">{(r.search * 100).toFixed(1)}%</td>
                    <td className="num">{(r.followers * 100).toFixed(0)}%</td>
                    <td className="num">{fmtFull(r.newf)}</td>
                    <td className="num">{fmtFull(r.profile)}</td>
                    <td className="num">{fmtFull(r.reach)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Header + shell ──────────────────────────────────────────────────────────

// TikTok note glyph (triple-layer cyan/red/white, the brand's echo effect).
const TIKTOK_PATH =
  'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';

function TikTokLogo() {
  return (
    <svg viewBox="-3 -3 30 30" width="36" height="36" aria-hidden="true">
      <path d={TIKTOK_PATH} fill="#25F4EE" transform="translate(-0.9,-0.9)" />
      <path d={TIKTOK_PATH} fill="#FE2C55" transform="translate(0.9,0.9)" />
      <path d={TIKTOK_PATH} fill="#ffffff" />
    </svg>
  );
}

function BrandHeader({ accounts, range, controls }: { accounts: Array<{ id: string }>; range: Range; controls: React.ReactNode }) {
  const qProfile = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.displayName, F.username, F.avatar, F.deepLink], limit: 10 },
    range,
  );
  const r = ((qProfile.data?.rows ?? [])[0] ?? {}) as Row;
  const name = String(r[F.displayName] ?? '') || 'TikTok Insights';
  const user = r[F.username] ? String(r[F.username]) : '';
  const link = mediaSrc(r[F.deepLink]) || (user ? `https://www.tiktok.com/@${user}` : 'https://www.tiktok.com/');
  const pic = mediaSrc(r[F.avatar]);
  const [picOk, setPicOk] = useState(false);

  return (
    <header className="ig-header">
      <div className="brand">
        <TikTokLogo />
        {pic && (
          <span className="avatar-ring" style={{ display: picOk ? 'block' : 'none' }}>
            <img className="avatar" src={pic} alt="" onLoad={() => setPicOk(true)} onError={() => setPicOk(false)} />
          </span>
        )}
        <div>
          <h1 id="report-title">
            <a className="brand-link" href={link} target="_blank" rel="noopener noreferrer">
              <span>{name}</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
              </svg>
            </a>
          </h1>
          <div className="subtitle">TikTok Insights{user ? ` · @${user}` : ''}</div>
        </div>
      </div>
      {controls}
    </header>
  );
}

function TtDateControl({ preset, setPreset, range, setCustom, compare, setCompare }: {
  preset: Preset;
  setPreset: (p: Preset) => void;
  range: Range;
  setCustom: (r: Range) => void;
  compare: boolean;
  setCompare: (v: boolean) => void;
}) {
  const onDate = (patch: Partial<Range>) => {
    setCustom({ ...range, ...patch });
    setPreset('custom');
  };
  return (
    <div className="controls">
      <select className="chip preset-select" value={preset} onChange={(e) => setPreset(e.target.value as Preset)} aria-label="Date range preset">
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
        <option value="6m">Last 6 months</option>
        <option value="custom">Custom</option>
      </select>
      <div className="date-inputs">
        <input type="date" value={range.start} max={range.end} onChange={(e) => onDate({ start: e.target.value })} aria-label="Start date" />
        <span>→</span>
        <input type="date" value={range.end} min={range.start} onChange={(e) => onDate({ end: e.target.value })} aria-label="End date" />
      </div>
      <ComparisonToggle compare={compare} setCompare={setCompare} />
    </div>
  );
}

const TABS = [
  {
    path: 'overview',
    title: 'Overview',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M3 10.5 12 3l9 7.5V21h-6v-6h-6v6H3z" />
      </svg>
    ),
  },
  {
    path: 'videos',
    title: 'Videos',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="2" y="4" width="14" height="16" rx="2" />
        <path d="m16 10 6-3v10l-6-3" />
      </svg>
    ),
  },
  {
    path: 'performance',
    title: 'Video performance',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 20h18" />
        <path d="M5 20V9l4 4 5-7 5 6v8" />
      </svg>
    ),
  },
  {
    path: 'acquisition',
    title: 'Acquisition',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
        <path d="M11 8v6M8 11h6" />
      </svg>
    ),
  },
  {
    path: 'audience',
    title: 'Audience',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16.5 14.7c2.6.3 4.3 1.8 5 4.3" />
      </svg>
    ),
  },
];

export default function Home() {
  const [route, setRoute] = useState('overview');
  const [printMode, setPrintMode] = useState(false);
  // Source account resolved at runtime from the report's accounts_used.
  const { accounts } = useAccounts();
  // Evergreen defaults so a fresh clone works on any account, including ones on
  // Porter's Free plan (30 days of history): a rolling 30-day window with the
  // period comparison OFF (turning it on needs >30 days of history). Both are
  // safe to customize.
  const { preset, setPreset, setCustom, range } = useDateRange('30d');
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    const ctx = porter.init();
    const start = ctx.route && TABS.some((t) => t.path === ctx.route) ? ctx.route : 'overview';
    setRoute(start);
    const st = porter.initialState;
    if (st?.start && st?.end) {
      setCustom({ start: st.start, end: st.end });
      setPreset('custom');
    }
    if (st?.compare != null) setCompare(!(String(st.compare) === 'false' || String(st.compare) === '0'));
    // Own tab nav (Pattern A): no announceRoutes; keep ?page= synced below.
    const offNav = porter.onNavigate((r) => setRoute(TABS.some((t) => t.path === r) ? r : 'overview'));
    const offExport = porter.onExportPdf(() => setPrintMode(true));
    return () => {
      offNav();
      offExport();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (printMode) return;
    porter.emitRouteChanged(route, TABS.find((t) => t.path === route)?.title);
  }, [route, printMode]);

  useEffect(() => {
    porter.emitState({ start: range.start, end: range.end, compare: String(compare) });
  }, [range.start, range.end, compare]);

  useEffect(() => {
    if (!printMode) return;
    // Signal export-ready only once every chart has data (no skeletons left),
    // with a hard cap so a stuck query can never hang the export.
    let done = false;
    const started = Date.now();
    const timer = setInterval(() => {
      const pending = document.querySelectorAll('.skeleton').length;
      if (pending > 0 && Date.now() - started < 20000) return;
      if (done) return;
      done = true;
      clearInterval(timer);
      setTimeout(() => {
        porter.emitResize(document.documentElement.scrollHeight);
        porter.emitExportReady(TABS.length);
      }, 800);
    }, 300);
    return () => clearInterval(timer);
  }, [printMode]);

  const pageProps: PageProps = { accounts, range, compare };

  return (
    <div className={printMode ? 'is-printing' : ''}>
      <Head>
        <title>TikTok Insights</title>
      </Head>
      <BrandHeader
        accounts={pageProps.accounts}
        range={range}
        controls={
          !printMode ? (
            <TtDateControl preset={preset} setPreset={setPreset} range={range} setCustom={setCustom} compare={compare} setCompare={setCompare} />
          ) : (
            <div className="print-range">
              {fmtDate(range.start, 'long')} → {fmtDate(range.end, 'long')}
              {compare ? ' · compared vs the previous period' : ''}
            </div>
          )
        }
      />

      {!printMode && (
        <nav className="page-nav">
          {TABS.map((t) => (
            <button key={t.path} className={route === t.path ? 'page-tab active' : 'page-tab'} onClick={() => setRoute(t.path)}>
              {t.icon}
              {t.title}
            </button>
          ))}
        </nav>
      )}

      <main>
        {printMode ? (
          TABS.map((t) => (
            <section className="print-section" key={t.path}>
              <h2 className="print-section-title">{t.title}</h2>
              {t.path === 'overview' && <OverviewPage {...pageProps} />}
              {t.path === 'videos' && <VideosPage {...pageProps} />}
              {t.path === 'performance' && <PerformancePage {...pageProps} />}
              {t.path === 'acquisition' && <AcquisitionPage {...pageProps} />}
              {t.path === 'audience' && <AudiencePage {...pageProps} />}
            </section>
          ))
        ) : route === 'videos' ? (
          <VideosPage {...pageProps} />
        ) : route === 'performance' ? (
          <PerformancePage {...pageProps} />
        ) : route === 'acquisition' ? (
          <AcquisitionPage {...pageProps} />
        ) : route === 'audience' ? (
          <AudiencePage {...pageProps} />
        ) : (
          <OverviewPage {...pageProps} />
        )}

        <footer className="ig-footer">Data: TikTok Insights via Porter Metrics</footer>
      </main>
    </div>
  );
}
