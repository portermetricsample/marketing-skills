import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Chart from 'chart.js/auto';
import { porter } from '../lib/porter';
import { useAccounts, useDateRange, useReportQuery, num, type Range, type ReportQuery, type Preset } from '../lib/useReport';
import { Skeleton, SkeletonChart } from '../components/ui';
import { ComparisonToggle } from '../components/controls';

/**
 * LinkedIn Pages dashboard — a hosted Porter report for any LinkedIn Company Page:
 * Overview (page growth + engagement), Posts, Audience (B2B demographics — LinkedIn's
 * superpower) and Discovery (page-section views). LinkedIn-authentic LIGHT theme.
 * The Page is resolved at RUNTIME (useAccounts) so this exact file works for any Page.
 * Post thumbnails and the logo come from media.licdn.com: they render in the LIVE
 * report (not the server-side preview.jpg), and the logo falls back to the LinkedIn
 * glyph via onError if the CDN image can't load.
 */

const CONNECTOR = 'linkedin-pages';

// Accounts resolve at RUNTIME from the report's declared accounts_used
// (porter.getAccounts, via useAccounts). Nothing about the account is hardcoded —
// that is what lets this exact report be DUPLICATED onto another LinkedIn Page and
// just work: the header name, website and logo all come from the account's own data.
// Do NOT hardcode an ACCOUNTS array here; a hardcoded account is exactly what breaks
// cloning (duplicate_report re-points accounts_used, not the code).

const F = {
  // profile / company
  companyName: 'linkedin_pages_companyName',
  website: 'linkedin_pages_companyWebsite',
  logo: 'linkedin_pages_companyLogoOriginalUrl',
  totalFollowers: 'linkedin_pages_totalFollowers',
  newFollowers: 'linkedin_pages_newOrganicFollowers',
  // daily trend
  date: 'linkedin_pages_date',
  impressions: 'linkedin_pages_impressions',
  reach: 'linkedin_pages_reach',
  engagements: 'linkedin_pages_engagements',
  reactions: 'linkedin_pages_reactions',
  comments: 'linkedin_pages_comments',
  shares: 'linkedin_pages_shares',
  clicks: 'linkedin_pages_clicks',
  // posts
  postText: 'linkedin_pages_postText',
  postUrl: 'linkedin_pages_postUrl',
  postImageUrl: 'linkedin_pages_postImageUrl',
  postDate: 'linkedin_pages_postCreationDate',
  postUrn: 'linkedin_pages_postUrn',
  postCount: 'linkedin_pages_post_count',
  // audience (B2B demographics — metric is followers by dimension)
  seniority: 'linkedin_pages_seniority',
  industry: 'linkedin_pages_industry',
  jobFunction: 'linkedin_pages_jobFunction',
  companySize: 'linkedin_pages_companySize',
  country: 'linkedin_pages_country',
  region: 'linkedin_pages_region',
  // discovery (page-section views)
  pageViews: 'linkedin_pages_pageViews',
  uniquePageViews: 'linkedin_pages_uniquePageViews',
  mobilePageViews: 'linkedin_pages_mobilePageViews',
  desktopPageViews: 'linkedin_pages_desktopPageViews',
  aboutViews: 'linkedin_pages_aboutPageViews',
  careersViews: 'linkedin_pages_careersPageViews',
  jobsViews: 'linkedin_pages_jobsPageViews',
  productsViews: 'linkedin_pages_productsPageViews',
  overviewViews: 'linkedin_pages_overviewPageViews',
  peopleViews: 'linkedin_pages_peoplePageViews',
} as const;

// LinkedIn brand palette (blue-forward on a light canvas).
const LI = { blue: '#0a66c2', blueDark: '#004182', blueLight: '#4f9ae0', teal: '#0b8f7a', amber: '#e7a33e', gray: '#8a8d91', green: '#057642' };
const PALETTE = [LI.blue, LI.blueLight, LI.teal, LI.amber, '#7a5cff', LI.gray, '#c95b9e', '#5f9e57'];

Chart.defaults.color = '#5f5f5f';
Chart.defaults.borderColor = 'rgba(0,0,0,0.07)';
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
Chart.defaults.animation = false;

// ─── helpers ─────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function sumRows(rows: Row[] | undefined, col: string): number {
  if (!rows) return 0;
  return rows.reduce((t, r) => t + num(r[col]), 0);
}
function maxRow(rows: Row[] | undefined, col: string): number {
  if (!rows || !rows.length) return 0;
  return rows.reduce((m, r) => Math.max(m, num(r[col])), 0);
}
function fmtCompact(v: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}
function fmtFull(v: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(v));
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
function mediaSrc(u: unknown): string {
  const s = String(u ?? '');
  return s.indexOf('http') === 0 ? s : '';
}
// LinkedIn post captions carry {hashtag|\#|Foo} and @[Name](urn:...) markup — clean it.
function cleanPostText(v: unknown): string {
  let s = String(v ?? '');
  s = s.replace(/\{hashtag\|\\#\|([^}]+)\}/g, '#$1');
  s = s.replace(/@\[([^\]]+)\]\([^)]*\)/g, '$1');
  return s.trim();
}
// Infer a post "format" from the media URL (LinkedIn exposes no post-type field).
function postFormat(v: unknown): 'Video' | 'Image' | 'Text' {
  const s = String(v ?? '');
  if (!s) return 'Text';
  if (/\/vid\/|playlist|\.mp4|thumbnail-scale/.test(s)) return 'Video';
  return 'Image';
}

type Delta = { text: string; dir: 'up' | 'down' | 'flat' } | null;
function deltaFrom(cur: number, prev: number | null | undefined): Delta {
  if (prev == null || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const dir = pct > 0.05 ? 'up' : pct < -0.05 ? 'down' : 'flat';
  return { text: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`, dir };
}
function deltaOf(q: ReportQuery, col: string, agg: 'sum' | 'max' = 'sum'): Delta {
  if (!q.prev) return null;
  const cur = agg === 'max' ? maxRow(q.data?.rows as Row[], col) : sumRows(q.data?.rows as Row[], col);
  const prev = agg === 'max' ? maxRow(q.prev.rows as Row[], col) : sumRows(q.prev.rows as Row[], col);
  return deltaFrom(cur, prev);
}

function DeltaLine({ delta }: { delta: Delta }) {
  if (!delta) return <div className="porter-delta" />;
  return <div className={`porter-delta porter-delta--${delta.dir}`}>{delta.text} vs prev</div>;
}

function sortByCol(rows: Row[], col: string): Row[] {
  return rows.slice().sort((a, b) => (String(a[col]) < String(b[col]) ? -1 : 1));
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
    // Force an unconditional repaint after layout settles. resize() alone is a
    // no-op when the canvas already has the right size, so a chart that first
    // drew before its container had height would stay blank; update() redraws
    // regardless. (The big charts have no image-load event to nudge them.)
    const t1 = setTimeout(() => { c?.resize(); c?.update('none'); }, 80);
    const t2 = setTimeout(() => { c?.resize(); c?.update('none'); }, 450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
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

function LiCard({ title, q, minRows = 1, children, extraLoading, hint, className }: {
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

// ─── Doughnut / bar builders ─────────────────────────────────────────────────

function Doughnut({ labels, values, colors, format }: { labels: string[]; values: number[]; colors: string[]; format?: (v: number) => string }) {
  return (
    <div className="canvas-wrap donut">
      <ChartCanvas
        deps={[JSON.stringify(labels), JSON.stringify(values)]}
        build={(el) =>
          new Chart(el.getContext('2d')!, {
            type: 'doughnut',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: '#fff', borderWidth: 3 }] },
            options: {
              maintainAspectRatio: false,
              cutout: '62%',
              plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
                tooltip: format ? { callbacks: { label: (item) => `${item.label}: ${format(item.parsed as number)}` } } : undefined,
              },
            },
          })
        }
      />
    </div>
  );
}

function Bars({ labels, values, colors, horizontal, format, height }: {
  labels: string[];
  values: number[];
  colors: string | string[];
  horizontal?: boolean;
  format?: (v: number) => string;
  height?: number;
}) {
  return (
    <div className="canvas-wrap" style={height ? { height } : undefined}>
      <ChartCanvas
        deps={[JSON.stringify(labels), JSON.stringify(values)]}
        build={(el) =>
          new Chart(el.getContext('2d')!, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 5 }] },
            options: {
              maintainAspectRatio: false,
              indexAxis: horizontal ? ('y' as const) : ('x' as const),
              plugins: {
                legend: { display: false },
                tooltip: format ? { callbacks: { label: (item) => format((horizontal ? item.parsed.x : item.parsed.y) as number) } } : undefined,
              },
              scales: horizontal ? { x: { beginAtZero: true } } : { y: { beginAtZero: true } },
            },
          })
        }
      />
    </div>
  );
}

function StackedTrend({ labels, datasets }: { labels: string[]; datasets: Array<{ label: string; data: number[]; color: string }> }) {
  return (
    <div className="canvas-wrap">
      <ChartCanvas
        deps={[JSON.stringify(labels), JSON.stringify(datasets.map((d) => d.data))]}
        build={(el) =>
          new Chart(el.getContext('2d')!, {
            type: 'bar',
            data: {
              labels,
              datasets: datasets.map((d) => ({ label: d.label, data: d.data, backgroundColor: d.color, borderRadius: 3, stack: 's' })),
            },
            options: {
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } } },
              scales: { x: { stacked: true, ticks: { maxTicksLimit: 12 } }, y: { stacked: true, beginAtZero: true } },
            },
          })
        }
      />
    </div>
  );
}

// ─── Annotated growth chart: post thumbnails pinned to the followers line ────

type DayPosts = { count: number; impr: number; eng: number; text: string; url: string };

// A circular post thumbnail with a blue ring, drawn on a canvas for use as a
// Chart.js pointStyle (arc()-based — works in every canvas engine, unlike
// roundRect). Calls onReady once the image paints so the chart repaints.
function circleThumb(url: string, onReady: () => void): HTMLCanvasElement {
  const S = 40, R = S / 2;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d')!;
  function ring() {
    g.strokeStyle = LI.blue;
    g.lineWidth = 3;
    g.beginPath();
    g.arc(R, R, R - 2, 0, Math.PI * 2);
    g.stroke();
  }
  g.fillStyle = '#eef3f8';
  g.beginPath();
  g.arc(R, R, R - 1.5, 0, Math.PI * 2);
  g.fill();
  ring();
  if (url) {
    const img = new Image();
    // licdn serves Access-Control-Allow-Origin:* — request it as CORS so drawing
    // it does NOT taint this canvas. A tainted pointStyle canvas makes Chart.js
    // throw a SecurityError and abort the whole chart (that blanked the chart).
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      g.clearRect(0, 0, S, S);
      g.save();
      g.beginPath();
      g.arc(R, R, R - 3, 0, Math.PI * 2);
      g.clip();
      // cover-fit the landscape image into the circle
      const ar = img.width / img.height || 1;
      const d = S - 6;
      let dw = d, dh = d / ar, dx = 3, dy = 3 + (d - dh) / 2;
      if (dh < d) { dh = d; dw = d * ar; dx = 3 - (dw - d) / 2; dy = 3; }
      g.drawImage(img, dx, dy, dw, dh);
      g.restore();
      ring();
      onReady();
    };
    img.src = url;
  }
  return c;
}

function AnnotatedChart({ trendRows, postRows }: { trendRows: Row[]; postRows: Row[] }) {
  const chartHolder = useRef<Chart | null>(null);
  const rows = sortByCol(trendRows, F.date);
  const labels = rows.map((r) => fmtDate(r[F.date], 'short'));
  const dateKeys = rows.map((r) => dayKey(r[F.date]));
  const newf = rows.map((r) => num(r[F.newFollowers]));

  const byDate: Record<string, DayPosts> = {};
  for (const p of postRows) {
    const k = dayKey(p[F.postDate]);
    if (!byDate[k]) byDate[k] = { count: 0, impr: 0, eng: 0, text: '', url: '' };
    byDate[k].count += 1;
    byDate[k].impr += num(p[F.impressions]);
    byDate[k].eng += num(p[F.engagements]);
    if (!byDate[k].url) byDate[k].url = mediaSrc(p[F.postImageUrl]);
    if (!byDate[k].text) {
      const t = cleanPostText(p[F.postText]);
      byDate[k].text = t.length > 80 ? t.slice(0, 80) + '…' : t;
    }
  }

  const markerData: (number | null)[] = [];
  const markerInfo: (DayPosts | null)[] = [];
  dateKeys.forEach((k, i) => {
    const p = byDate[k];
    markerData.push(p ? newf[i] : null);
    markerInfo.push(p || null);
  });

  return (
    <div className="canvas-wrap tall">
      <ChartCanvas
        deps={[JSON.stringify(dateKeys), JSON.stringify(newf), postRows.length]}
        chartRef={(c) => { chartHolder.current = c; }}
        build={(el) => {
          const redraw = () => chartHolder.current?.update('none');
          const markerStyles: (HTMLCanvasElement | string)[] = markerInfo.map((p) =>
            p && p.url ? circleThumb(p.url, redraw) : 'rectRot'
          );
          return new Chart(el.getContext('2d')!, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'New followers',
                  data: newf,
                  borderColor: LI.blue,
                  backgroundColor: 'rgba(10, 102, 194, 0.10)',
                  pointBackgroundColor: LI.blue,
                  pointBorderColor: '#fff',
                  pointBorderWidth: 1,
                  fill: true,
                  tension: 0.35,
                  pointRadius: 2.5,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                  order: 2,
                },
                {
                  label: 'Post published',
                  data: markerData,
                  showLine: false,
                  pointStyle: markerStyles,
                  pointRadius: 16,
                  pointHoverRadius: 18,
                  pointBackgroundColor: LI.amber,
                  pointBorderColor: '#fff',
                  pointBorderWidth: 1.5,
                  order: 1,
                },
              ],
            },
            options: {
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxHeight: 6 } },
                tooltip: {
                  callbacks: {
                    title: (items) => (items.length ? fmtDate(dateKeys[items[0].dataIndex], 'long') : ''),
                    label: (item) => {
                      if (item.datasetIndex === 0) return 'New followers: ' + fmtFull(item.parsed.y as number);
                      const p = markerInfo[item.dataIndex];
                      if (!p) return '';
                      const lines = [
                        p.count + (p.count === 1 ? ' post' : ' posts') + ' — ' + fmtFull(p.impr) + ' impressions, ' + fmtFull(p.eng) + ' engagements',
                      ];
                      if (p.text) lines.push('“' + p.text + '”');
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

// ─── Top posts carousel (text cards) ─────────────────────────────────────────

const EXT_ICON = (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </svg>
);

function Carousel({ rows }: { rows: Row[] }) {
  const carRef = useRef<HTMLDivElement>(null);
  const sorted = rows.slice().sort((a, b) => num(b[F.impressions]) - num(a[F.impressions]));
  const scroll = (dir: number) => {
    const car = carRef.current;
    if (car) car.scrollBy({ left: dir * car.clientWidth, behavior: 'smooth' });
  };
  return (
    <>
      <div className="carousel-head">
        <h3>Top posts</h3>
        <div className="carousel-nav">
          <button onClick={() => scroll(-1)} aria-label="Previous">&lsaquo;</button>
          <button onClick={() => scroll(1)} aria-label="Next">&rsaquo;</button>
        </div>
      </div>
      <div className="carousel" ref={carRef}>
        {sorted.map((r, i) => {
          const link = String(r[F.postUrl] ?? '');
          const text = cleanPostText(r[F.postText]) || 'View post';
          const fmt = postFormat(r[F.postImageUrl]);
          const dateVal = r[F.postDate];
          const impr = num(r[F.impressions]);
          const eng = num(r[F.engagements]);
          const rate = impr > 0 ? (eng / impr) * 100 : 0;
          const metrics: Array<[string, string]> = [
            ['Impressions', fmtFull(impr)],
            ['Reactions', fmtFull(num(r[F.reactions]))],
            ['Comments', fmtFull(num(r[F.comments]))],
            ['Shares', fmtFull(num(r[F.shares]))],
            ['Clicks', fmtFull(num(r[F.clicks]))],
            ['Engagement rate', rate.toFixed(2) + '%'],
          ];
          const img = mediaSrc(r[F.postImageUrl]);
          return (
            <article className="post-card" key={i}>
              {img && (
                <div className="post-img-wrap">
                  <img className="post-img" src={img} loading="lazy" alt="" onError={(e) => { const el = e.target as HTMLImageElement; el.parentElement!.style.display = 'none'; }} />
                </div>
              )}
              <div className="post-body">
                <span className="post-format">{fmt}</span>
                <div className="post-text">{text}</div>
                <div className="post-meta">
                  <span>{isDateStr(dateVal) ? fmtDate(dateVal, 'long') : String(dateVal ?? '')}</span>
                </div>
                {link && (
                  <a className="post-link" href={link} target="_blank" rel="noopener noreferrer">
                    {EXT_ICON}<span>Open on LinkedIn</span>
                  </a>
                )}
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

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const POST_FIELDS = [
  F.postText, F.postUrl, F.postImageUrl, F.postDate, F.postUrn,
  F.impressions, F.engagements, F.reactions, F.comments, F.shares, F.clicks,
];

function OverviewPage({ accounts, range, compare }: PageProps) {
  const qFollowers = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.totalFollowers], limit: 5 }, range, compare);
  const qTrend = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.newFollowers, F.impressions, F.reach, F.engagements, F.clicks], sort: [{ field: F.date, direction: 'asc' }], limit: 400 },
    range,
    compare,
  );
  const qEng = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.reactions, F.comments, F.shares, F.clicks], sort: [{ field: F.date, direction: 'asc' }], limit: 400 },
    range,
    compare,
  );
  const qPosts = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.postText, F.postDate, F.postImageUrl, F.impressions, F.engagements], limit: 200 }, range);

  const trendRows = useMemo(() => sortByCol((qTrend.data?.rows ?? []) as Row[], F.date), [qTrend.data]);
  const engRows = useMemo(() => sortByCol((qEng.data?.rows ?? []) as Row[], F.date), [qEng.data]);
  // Total followers is a snapshot (max over the range), not a daily sum.
  const totalFollowers = maxRow(qFollowers.data?.rows as Row[], F.totalFollowers);

  const impr = sumRows(qTrend.data?.rows as Row[], F.impressions);
  const eng = sumRows(qTrend.data?.rows as Row[], F.engagements);
  const engRate = impr > 0 ? (eng / impr) * 100 : 0;
  const pImpr = sumRows(qTrend.prev?.rows as Row[], F.impressions);
  const pEng = sumRows(qTrend.prev?.rows as Row[], F.engagements);
  const pRate = pImpr > 0 ? (pEng / pImpr) * 100 : 0;

  const trendDefs = [
    { col: F.newFollowers, label: 'New followers', color: LI.blue, bg: 'rgba(10,102,194,0.12)', fmt: fmtFull },
    { col: F.impressions, label: 'Impressions', color: LI.blueLight, bg: 'rgba(79,154,224,0.14)', fmt: fmtCompact },
    { col: F.reach, label: 'Unique reach', color: LI.teal, bg: 'rgba(11,143,122,0.14)', fmt: fmtCompact },
    { col: F.clicks, label: 'Clicks', color: LI.amber, bg: 'rgba(231,163,62,0.16)', fmt: fmtFull },
  ];
  const engDefs = [
    { col: F.reactions, label: 'Reactions', color: LI.blue, bg: 'rgba(10,102,194,0.12)' },
    { col: F.comments, label: 'Comments', color: LI.teal, bg: 'rgba(11,143,122,0.14)' },
    { col: F.shares, label: 'Shares', color: LI.amber, bg: 'rgba(231,163,62,0.16)' },
    { col: F.clicks, label: 'Clicks', color: LI.blueLight, bg: 'rgba(79,154,224,0.14)' },
  ];

  return (
    <div className="page">
      <div className="kpi-grid">
        <KpiSpark
          label="Total followers"
          value={fmtFull(totalFollowers)}
          delta={deltaOf(qFollowers, F.totalFollowers, 'max')}
          series={trendRows.map((r) => num(r[F.newFollowers]))}
          color={LI.blue}
          bg="rgba(10,102,194,0.12)"
          loading={qLoading(qFollowers) || qLoading(qTrend)}
        />
        <div className="kpi-group">
          {trendDefs.map((d) => (
            <KpiSpark
              key={d.col}
              label={d.label}
              value={d.fmt(sumRows(qTrend.data?.rows as Row[], d.col))}
              delta={deltaOf(qTrend, d.col)}
              series={trendRows.map((r) => num(r[d.col]))}
              color={d.color}
              bg={d.bg}
              loading={qLoading(qTrend)}
            />
          ))}
        </div>
      </div>

      <LiCard
        title="New followers — with the posts published each day"
        q={qTrend}
        hint="The line is new organic followers per day. Each amber diamond marks a day you posted — hover it to see the post and the impressions & engagements it earned, so you can tie growth to content."
      >
        <AnnotatedChart trendRows={trendRows} postRows={(qPosts.data?.rows ?? []) as Row[]} />
      </LiCard>

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
        <KpiSpark
          label="Engagement rate"
          value={engRate.toFixed(2) + '%'}
          delta={qTrend.prev ? deltaFrom(engRate, pRate) : null}
          series={trendRows.map((r) => {
            const i = num(r[F.impressions]);
            return i > 0 ? (num(r[F.engagements]) / i) * 100 : 0;
          })}
          color={LI.green}
          bg="rgba(5,118,66,0.12)"
          loading={qLoading(qTrend)}
        />
      </div>
    </div>
  );
}

function PostsPage({ accounts, range, compare }: PageProps) {
  const qPosts = useReportQuery({ connector: CONNECTOR, accounts, fields: POST_FIELDS, limit: 300 }, range, compare);
  const rows = (qPosts.data?.rows ?? []) as Row[];

  const byDay = useMemo(() => {
    const acc: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const k = dayKey(r[F.postDate]);
      if (!acc[k]) acc[k] = { [F.impressions]: 0, [F.engagements]: 0, [F.reactions]: 0, [F.comments]: 0, [F.shares]: 0 };
      for (const col of [F.impressions, F.engagements, F.reactions, F.comments, F.shares]) acc[k][col] += num(r[col]);
    }
    return Object.keys(acc).sort().map((k) => acc[k]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPosts.data]);

  const defs = [
    { col: F.impressions, label: 'Impressions', color: LI.blue, bg: 'rgba(10,102,194,0.12)', fmt: fmtCompact },
    { col: F.reactions, label: 'Reactions', color: LI.blueLight, bg: 'rgba(79,154,224,0.14)', fmt: fmtFull },
    { col: F.comments, label: 'Comments', color: LI.teal, bg: 'rgba(11,143,122,0.14)', fmt: fmtFull },
    { col: F.shares, label: 'Shares', color: LI.amber, bg: 'rgba(231,163,62,0.16)', fmt: fmtFull },
    { col: F.clicks, label: 'Clicks', color: '#7a5cff', bg: 'rgba(122,92,255,0.14)', fmt: fmtFull },
  ];

  const impr = sumRows(rows, F.impressions);
  const eng = sumRows(rows, F.engagements);
  const rate = impr > 0 ? eng / impr : 0;
  const prevRows = (qPosts.prev?.rows ?? []) as Row[];
  const pImpr = sumRows(prevRows, F.impressions);
  const pEng = sumRows(prevRows, F.engagements);
  const pRate = pImpr > 0 ? pEng / pImpr : 0;
  const rateSeries = byDay.map((r) => (r[F.impressions] > 0 ? (r[F.engagements] / r[F.impressions]) * 100 : 0));

  // Best days: total impressions of posts published per weekday.
  const weekday = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const r of rows) {
      const d = parseDay(r[F.postDate]);
      if (d) totals[d.getUTCDay()] += num(r[F.impressions]);
    }
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPosts.data]);

  // Content-format mix (inferred: video / image / text).
  const formats = useMemo(() => {
    const b = { Video: 0, Image: 0, Text: 0 } as Record<string, number>;
    for (const r of rows) b[postFormat(r[F.postImageUrl])] += 1;
    return b;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qPosts.data]);

  return (
    <div className="page">
      <div className="kpi-group">
        {defs.map((d) => (
          <KpiSpark
            key={d.col}
            label={d.label}
            value={d.fmt(sumRows(rows, d.col))}
            delta={deltaOf(qPosts, d.col)}
            series={byDay.map((r) => r[d.col])}
            color={d.color}
            bg={d.bg}
            loading={qLoading(qPosts)}
          />
        ))}
        <KpiSpark
          label="Engagement rate"
          value={(rate * 100).toFixed(2) + '%'}
          delta={qPosts.prev ? deltaFrom(rate, pRate) : null}
          series={rateSeries}
          color={LI.green}
          bg="rgba(5,118,66,0.12)"
          loading={qLoading(qPosts)}
        />
      </div>

      <section className="card">
        {qLoading(qPosts) ? (
          <SkeletonChart height={220} />
        ) : rows.length === 0 ? (
          <>
            <div className="carousel-head"><h3>Top posts</h3></div>
            <div className="state-empty">No posts in this date range — widen the date picker.</div>
          </>
        ) : (
          <Carousel rows={rows} />
        )}
      </section>

      <div className="charts-row">
        <LiCard title="Best days to post — impressions by publish day" q={qPosts} hint="Total impressions of the posts published on each day of the week.">
          <Bars labels={WEEKDAYS.map((d) => d.slice(0, 3))} values={weekday} colors={LI.blue} format={fmtFull} />
        </LiCard>
        <LiCard title="Content format mix" q={qPosts} hint="Share of posts by format (inferred from the attached media — LinkedIn exposes no explicit post type).">
          <Doughnut labels={Object.keys(formats)} values={Object.values(formats)} colors={[LI.blue, LI.teal, LI.amber]} format={fmtFull} />
        </LiCard>
      </div>
    </div>
  );
}

function AudiencePage({ accounts, range }: PageProps) {
  const qSeniority = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.seniority, F.totalFollowers], limit: 30 }, range);
  const qIndustry = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.industry, F.totalFollowers], limit: 100 }, range);
  const qJob = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.jobFunction, F.totalFollowers], limit: 50 }, range);
  const qSize = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.companySize, F.totalFollowers], limit: 30 }, range);
  const qCountry = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.country, F.totalFollowers], limit: 100 }, range);

  const topN = (q: ReportQuery, dim: string, n: number) => {
    const rows = (q.data?.rows ?? []) as Row[];
    return rows.slice().sort((a, b) => num(b[F.totalFollowers]) - num(a[F.totalFollowers])).slice(0, n);
  };
  const SENIORITY_ORDER = ['Entry', 'Senior', 'Manager', 'Director', 'VP', 'CXO', 'Owner', 'Partner', 'Training', 'Unpaid'];
  const seniorityRows = useMemo(() => {
    const rows = (qSeniority.data?.rows ?? []) as Row[];
    return rows.slice().sort((a, b) => SENIORITY_ORDER.indexOf(String(a[F.seniority])) - SENIORITY_ORDER.indexOf(String(b[F.seniority])));
  }, [qSeniority.data]);
  const industryRows = useMemo(() => topN(qIndustry, F.industry, 10), [qIndustry.data]);
  const jobRows = useMemo(() => topN(qJob, F.jobFunction, 10), [qJob.data]);
  const sizeRows = useMemo(() => topN(qSize, F.companySize, 10), [qSize.data]);
  const countryRows = useMemo(() => topN(qCountry, F.country, 10), [qCountry.data]);

  return (
    <div className="page">
      <div className="charts-row">
        <LiCard title="Followers by seniority" q={qSeniority} hint="Where your followers sit in their org — Senior and Entry dominate, with a solid Manager/Director core.">
          <Bars
            labels={seniorityRows.map((r) => String(r[F.seniority] ?? ''))}
            values={seniorityRows.map((r) => num(r[F.totalFollowers]))}
            colors={LI.blue}
            format={fmtFull}
          />
        </LiCard>
        <LiCard title="Followers by job function" q={qJob}>
          <Bars
            labels={jobRows.map((r) => String(r[F.jobFunction] ?? ''))}
            values={jobRows.map((r) => num(r[F.totalFollowers]))}
            colors={LI.teal}
            horizontal
            format={fmtFull}
            height={320}
          />
        </LiCard>
      </div>
      <div className="charts-row">
        <LiCard title="Followers by industry — top 10" q={qIndustry}>
          <Bars
            labels={industryRows.map((r) => String(r[F.industry] ?? ''))}
            values={industryRows.map((r) => num(r[F.totalFollowers]))}
            colors={LI.blueLight}
            horizontal
            format={fmtFull}
            height={340}
          />
        </LiCard>
        <LiCard title="Followers by company size" q={qSize} hint="Company size of your followers' employers — a read on whether you reach SMBs or enterprises.">
          <Bars
            labels={sizeRows.map((r) => String(r[F.companySize] ?? ''))}
            values={sizeRows.map((r) => num(r[F.totalFollowers]))}
            colors={LI.amber}
            horizontal
            format={fmtFull}
            height={320}
          />
        </LiCard>
      </div>
      <LiCard title="Followers by country — top 10" q={qCountry}>
        <Bars
          labels={countryRows.map((r) => String(r[F.country] ?? ''))}
          values={countryRows.map((r) => num(r[F.totalFollowers]))}
          colors={LI.blue}
          format={fmtFull}
        />
      </LiCard>
    </div>
  );
}

function DiscoveryPage({ accounts, range, compare }: PageProps) {
  const qViews = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.pageViews, F.uniquePageViews, F.desktopPageViews, F.mobilePageViews], sort: [{ field: F.date, direction: 'asc' }], limit: 400 },
    range,
    compare,
  );
  const qSections = useReportQuery(
    { connector: CONNECTOR, accounts, fields: [F.date, F.overviewViews, F.aboutViews, F.careersViews, F.jobsViews, F.peopleViews, F.productsViews], sort: [{ field: F.date, direction: 'asc' }], limit: 400 },
    range,
  );

  const viewRows = useMemo(() => sortByCol((qViews.data?.rows ?? []) as Row[], F.date), [qViews.data]);
  const sectionRows = useMemo(() => sortByCol((qSections.data?.rows ?? []) as Row[], F.date), [qSections.data]);

  const kpis = [
    { col: F.pageViews, label: 'Page views', color: LI.blue, bg: 'rgba(10,102,194,0.12)', fmt: fmtFull },
    { col: F.uniquePageViews, label: 'Unique visitors', color: LI.teal, bg: 'rgba(11,143,122,0.14)', fmt: fmtFull },
    { col: F.desktopPageViews, label: 'Desktop views', color: LI.blueLight, bg: 'rgba(79,154,224,0.14)', fmt: fmtFull },
    { col: F.mobilePageViews, label: 'Mobile views', color: LI.amber, bg: 'rgba(231,163,62,0.16)', fmt: fmtFull },
  ];

  const sections = [
    { col: F.overviewViews, label: 'Overview', color: LI.blue },
    { col: F.aboutViews, label: 'About', color: LI.teal },
    { col: F.careersViews, label: 'Careers', color: LI.amber },
    { col: F.jobsViews, label: 'Jobs', color: '#7a5cff' },
    { col: F.peopleViews, label: 'People', color: LI.blueLight },
    { col: F.productsViews, label: 'Products', color: LI.gray },
  ];
  const sectionTotals = sections.map((s) => ({ label: s.label, value: sumRows(sectionRows, s.col), color: s.color })).filter((s) => s.value > 0);
  const labels = viewRows.map((r) => fmtDate(r[F.date], 'short'));

  return (
    <div className="page">
      <div className="kpi-group">
        {kpis.map((d) => (
          <KpiSpark
            key={d.col}
            label={d.label}
            value={d.fmt(sumRows(qViews.data?.rows as Row[], d.col))}
            delta={deltaOf(qViews, d.col)}
            series={viewRows.map((r) => num(r[d.col]))}
            color={d.color}
            bg={d.bg}
            loading={qLoading(qViews)}
          />
        ))}
      </div>

      <LiCard title="Page views over time — desktop vs mobile" q={qViews} hint="Daily visits to your LinkedIn page. Desktop-heavy traffic is a hallmark of B2B research during work hours.">
        <StackedTrend
          labels={labels}
          datasets={[
            { label: 'Desktop', data: viewRows.map((r) => num(r[F.desktopPageViews])), color: LI.blue },
            { label: 'Mobile', data: viewRows.map((r) => num(r[F.mobilePageViews])), color: LI.blueLight },
          ]}
        />
      </LiCard>

      <div className="charts-row">
        <LiCard title="Which sections people view" q={qSections} minRows={0} hint="Where visitors go on your page. Careers & Jobs views are a talent-interest signal; About & Products lean commercial research.">
          <Bars
            labels={sectionTotals.map((s) => s.label)}
            values={sectionTotals.map((s) => s.value)}
            colors={sectionTotals.map((s) => s.color)}
            horizontal
            format={fmtFull}
            height={280}
          />
        </LiCard>
        <LiCard title="Careers & Jobs interest over time" q={qSections} minRows={0} hint="Daily views of your Careers and Jobs sections — a proxy for employer-brand and hiring pull.">
          <StackedTrend
            labels={sectionRows.map((r) => fmtDate(r[F.date], 'short'))}
            datasets={[
              { label: 'Careers', data: sectionRows.map((r) => num(r[F.careersViews])), color: LI.amber },
              { label: 'Jobs', data: sectionRows.map((r) => num(r[F.jobsViews])), color: '#7a5cff' },
            ]}
          />
        </LiCard>
      </div>
    </div>
  );
}

// ─── Header + shell ──────────────────────────────────────────────────────────

function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#0a66c2" />
      <path
        fill="#fff"
        d="M8.34 18.34H5.67V9.75h2.67v8.59ZM7 8.58a1.55 1.55 0 1 1 0-3.09 1.55 1.55 0 0 1 0 3.09Zm11.34 9.76h-2.67v-4.18c0-1-.02-2.28-1.39-2.28s-1.6 1.08-1.6 2.2v4.26h-2.67V9.75h2.56v1.17h.04a2.81 2.81 0 0 1 2.53-1.39c2.7 0 3.2 1.78 3.2 4.1v4.71Z"
      />
    </svg>
  );
}

function BrandHeader({ accounts, range, controls }: { accounts: Array<{ id: string }>; range: Range; controls: React.ReactNode }) {
  const qProfile = useReportQuery({ connector: CONNECTOR, accounts, fields: [F.companyName, F.website, F.logo], limit: 5 }, range);
  const r = ((qProfile.data?.rows ?? [])[0] ?? {}) as Row;
  const name = String(r[F.companyName] ?? '') || 'LinkedIn Page';
  const site = String(r[F.website] ?? '');
  const link = site || 'https://www.linkedin.com/';
  const logo = mediaSrc(r[F.logo]);
  const [logoOk, setLogoOk] = useState(false);

  return (
    <header className="ig-header">
      <div className="brand">
        {logo && (
          <span className="avatar-ring" style={{ display: logoOk ? 'block' : 'none' }}>
            <img className="avatar" src={logo} alt="" onLoad={() => setLogoOk(true)} onError={() => setLogoOk(false)} />
          </span>
        )}
        {!logoOk && <LinkedInLogo />}
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
          <div className="subtitle">LinkedIn Pages</div>
        </div>
      </div>
      {controls}
    </header>
  );
}

function LiDateControl({ preset, setPreset, range, setCustom, compare, setCompare }: {
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
    path: 'posts',
    title: 'Posts',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M7 9h10M7 13h7" />
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
  {
    path: 'discovery',
    title: 'Discovery',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
];

export default function Home() {
  const [route, setRoute] = useState('overview');
  const [printMode, setPrintMode] = useState(false);
  const { preset, setPreset, setCustom, range } = useDateRange('30d');
  const [compare, setCompare] = useState(true);
  const { accounts } = useAccounts();

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
        <title>LinkedIn Pages — Porter report</title>
      </Head>
      <BrandHeader
        accounts={pageProps.accounts}
        range={range}
        controls={
          !printMode ? (
            <LiDateControl preset={preset} setPreset={setPreset} range={range} setCustom={setCustom} compare={compare} setCompare={setCompare} />
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
              {t.path === 'posts' && <PostsPage {...pageProps} />}
              {t.path === 'audience' && <AudiencePage {...pageProps} />}
              {t.path === 'discovery' && <DiscoveryPage {...pageProps} />}
            </section>
          ))
        ) : route === 'posts' ? (
          <PostsPage {...pageProps} />
        ) : route === 'audience' ? (
          <AudiencePage {...pageProps} />
        ) : route === 'discovery' ? (
          <DiscoveryPage {...pageProps} />
        ) : (
          <OverviewPage {...pageProps} />
        )}

        <footer className="ig-footer">Data: LinkedIn Pages via Porter Metrics</footer>
      </main>
    </div>
  );
}
