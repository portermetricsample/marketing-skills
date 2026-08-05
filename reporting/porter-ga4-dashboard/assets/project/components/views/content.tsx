/** Content view — pages & screens, landing pages, titles, site search (GA4 Engagement look). */
import { useMemo, useState } from 'react';
import { useReportQuery, sumField, deltaPct, num, type CompareMode, type Range } from '../../lib/useReport';
import { ChartFrame, KpiValue, Insights } from '../ui';
import { LineChart, BarChart } from '../charts';
import { TrendExplorer } from '../gviz';
import { CONNECTOR, ACCOUNTS, F, int, pct, dur, ratio, compact } from '../../lib/ga4';

export default function Content({ range, compare: mode }: { range: Range; compare: CompareMode }) {
  const compare = mode !== 'none';
  const [search, setSearch] = useState('');

  const totals = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.screenPageViews, F.activeUsers, F.userEngagementDuration, F.sessions], limit: 1 },
    range,
    mode
  );
  const daily = useReportQuery(
    {
      connector: CONNECTOR,
      accounts: ACCOUNTS,
      fields: [F.date, F.screenPageViews, F.activeUsers, F.sessions],
      sort: [{ field: F.date, direction: 'asc' }],
      limit: 400,
    },
    range,
    mode
  );
  const pages = useReportQuery(
    {
      connector: CONNECTOR,
      accounts: ACCOUNTS,
      fields: [F.pagePath, F.screenPageViews, F.activeUsers, F.userEngagementDuration, F.keyEvents],
      sort: [{ field: F.screenPageViews, direction: 'desc' }],
      limit: 100,
    },
    range,
    mode
  );
  const landing = useReportQuery(
    {
      connector: CONNECTOR,
      accounts: ACCOUNTS,
      fields: [F.landingPage, F.sessions, F.engagedSessions, F.newUsers],
      sort: [{ field: F.sessions, direction: 'desc' }],
      limit: 10,
    },
    range
  );
  const titles = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.pageTitle, F.screenPageViews], sort: [{ field: F.screenPageViews, direction: 'desc' }], limit: 10 },
    range
  );
  const siteSearch = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.searchTerm, F.eventCount], sort: [{ field: F.eventCount, direction: 'desc' }], limit: 10 },
    range
  );

  const cur = {
    views: sumField(totals.data, F.screenPageViews),
    users: sumField(totals.data, F.activeUsers),
    engDur: sumField(totals.data, F.userEngagementDuration),
    sessions: sumField(totals.data, F.sessions),
  };
  const prevTot = {
    views: sumField(totals.prev, F.screenPageViews),
    users: sumField(totals.prev, F.activeUsers),
  };



  const pageRows = useMemo(() => {
    const prevMap = new Map((pages.prev?.rows ?? []).map((r) => [String(r[F.pagePath] ?? ''), num(r[F.screenPageViews])]));
    return (pages.data?.rows ?? [])
      .map((r) => {
        const path = String(r[F.pagePath] ?? '—');
        const views = num(r[F.screenPageViews]);
        const users = num(r[F.activeUsers]);
        return {
          path,
          views,
          users,
          avgTime: ratio(num(r[F.userEngagementDuration]), users),
          keyEvents: num(r[F.keyEvents]),
          delta: deltaPct(views, prevMap.get(path) ?? 0),
        };
      })
      .filter((r) => r.views > 0);
  }, [pages.data, pages.prev]);

  const visiblePages = search
    ? pageRows.filter((r) => r.path.toLowerCase().includes(search.toLowerCase()))
    : pageRows.slice(0, 25);

  const landingRows = (landing.data?.rows ?? [])
    .map((r) => ({
      page: String(r[F.landingPage] ?? '—'),
      sessions: num(r[F.sessions]),
      engaged: num(r[F.engagedSessions]),
      newUsers: num(r[F.newUsers]),
    }))
    .filter((r) => r.sessions > 0);

  const titleBars = (titles.data?.rows ?? [])
    .map((r) => ({ label: String(r[F.pageTitle] ?? '—'), value: num(r[F.screenPageViews]) }))
    .filter((b) => b.value > 0);

  const searchRows = (siteSearch.data?.rows ?? [])
    .map((r) => ({ term: String(r[F.searchTerm] ?? ''), count: num(r[F.eventCount]) }))
    .filter((r) => r.count > 0 && r.term && r.term !== '(not set)');

  return (
    <section className="report-page">
      <div className="grid">
        <KpiValue label="Views" value={compact(cur.views)} delta={compare ? deltaPct(cur.views, prevTot.views) : null} loading={totals.loading} />
        <KpiValue label="Active users" value={compact(cur.users)} delta={compare ? deltaPct(cur.users, prevTot.users) : null} loading={totals.loading} />
        <KpiValue label="Views per active user" value={cur.users ? (cur.views / cur.users).toFixed(2) : '—'} loading={totals.loading} />
        <KpiValue label="Avg. engagement time" value={dur(ratio(cur.engDur, cur.users))} loading={totals.loading} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartFrame
          title="Views over time"
          loading={daily.loading}
          error={daily.error}
          retry={daily.retry}
          empty={!(daily.data?.rows ?? []).length}
        >
          <TrendExplorer
            rows={daily.data?.rows ?? []}
            prevRows={compare ? daily.prev?.rows ?? [] : []}
            dateField={F.date}
            baseFields={[F.screenPageViews, F.activeUsers, F.sessions]}
            metrics={[
              { id: 'views', label: 'Views', format: int, value: (s) => s[F.screenPageViews] },
              { id: 'users', label: 'Active users', format: int, value: (s) => s[F.activeUsers] },
              { id: 'sessions', label: 'Sessions', format: int, value: (s) => s[F.sessions] },
            ]}
            LineChart={LineChart}
          />
        </ChartFrame>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Pages and screens</div>
            <input
              className="tbl-search"
              placeholder="Search page path…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search pages"
            />
          </div>
          {pages.loading ? (
            <div className="state-empty">Loading…</div>
          ) : pages.error ? (
            <div className="state-error">
              <span>{pages.error}</span>
              <button className="btn-ghost" onClick={pages.retry}>Retry</button>
            </div>
          ) : !visiblePages.length ? (
            <div className="state-empty">No pages match.</div>
          ) : (
            <div className="tbl-scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Page path</th>
                    <th className="num">Views</th>
                    <th className="num">Active users</th>
                    <th className="num">Avg. engagement time</th>
                    <th className="num">Key events</th>
                    {compare && <th className="num">Views vs prev.</th>}
                  </tr>
                </thead>
                <tbody>
                  {visiblePages.map((r) => (
                    <tr key={r.path}>
                      <td className="name" title={r.path}>{r.path}</td>
                      <td className="num">{int(r.views)}</td>
                      <td className="num">{int(r.users)}</td>
                      <td className="num">{dur(r.avgTime)}</td>
                      <td className="num">{int(r.keyEvents)}</td>
                      {compare && (
                        <td className={`num ${r.delta == null ? 'delta-flat' : r.delta >= 0 ? 'delta-up' : 'delta-down'}`}>
                          {r.delta == null ? 'new' : `${r.delta >= 0 ? '▲' : '▼'} ${Math.abs(r.delta).toFixed(1)}%`}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <ChartFrame title="Landing pages" loading={landing.loading} error={landing.error} retry={landing.retry} empty={!landingRows.length}>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Landing page</th>
                  <th className="num">Sessions</th>
                  <th className="num">Engagement rate</th>
                  <th className="num">New users</th>
                </tr>
              </thead>
              <tbody>
                {landingRows.map((r) => (
                  <tr key={r.page}>
                    <td className="name" title={r.page}>{r.page}</td>
                    <td className="num">{int(r.sessions)}</td>
                    <td className="num">{pct(ratio(r.engaged, r.sessions))}</td>
                    <td className="num">{int(r.newUsers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ChartFrame title="Views by page title" loading={titles.loading} error={titles.error} retry={titles.retry} empty={!titleBars.length}>
            <BarChart points={titleBars} format={int} caption="Views" />
          </ChartFrame>
          <ChartFrame title="Site search terms" loading={siteSearch.loading} error={siteSearch.error} retry={siteSearch.retry} empty={!searchRows.length}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Search term</th>
                  <th className="num">Events</th>
                </tr>
              </thead>
              <tbody>
                {searchRows.map((r) => (
                  <tr key={r.term}>
                    <td className="name">{r.term}</td>
                    <td className="num">{int(r.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ChartFrame>
        </div>
      </div>
      <Insights
        items={[
          pageRows[0]
            ? `${pageRows[0].path} is the most viewed page with ${int(pageRows[0].views)} views (${((pageRows[0].views / Math.max(cur.views, 1)) * 100).toFixed(1)}% of all views).`
            : null,
          pageRows.length > 1 && compare
            ? (() => {
                const movers = pageRows.filter((r) => r.delta != null);
                if (!movers.length) return null;
                const top = movers.reduce((a, b) => (Math.abs(b.delta!) > Math.abs(a.delta!) ? b : a));
                return `${top.path} shows the biggest change vs the comparison period (${top.delta! >= 0 ? '+' : ''}${top.delta!.toFixed(1)}% views).`;
              })()
            : null,
          landingRows[0]
            ? `${landingRows[0].page} is the top landing page (${int(landingRows[0].sessions)} sessions, ${pct(ratio(landingRows[0].engaged, landingRows[0].sessions))} engagement rate).`
            : null,
          `Average engagement time per active user is ${dur(ratio(cur.engDur, cur.users))}.`,
        ]}
      />
    </section>
  );
}
