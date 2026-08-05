/**
 * Audiences view — four segment blocks like GA4's User attributes / Tech reports:
 * Geography · Demographics · Technology (the GA4 stand-in for "placements") ·
 * Audiences. Demographics can be thresholded by Google on low-traffic
 * properties — those cards show an honest empty state instead of fake data.
 */
import { useReportQuery, sumField, deltaPct, num, type CompareMode, type Range } from '../../lib/useReport';
import { ChartFrame, KpiValue, Insights } from '../ui';
import { BarChart } from '../charts';
import { Donut } from '../gviz';
import { CONNECTOR, ACCOUNTS, F, int, pct, ratio, compact } from '../../lib/ga4';

const bars = (q: { data: { rows: Record<string, unknown>[] } | null }, dim: string, metric: string, drop?: string[]) =>
  (q.data?.rows ?? [])
    .map((r) => ({ label: String(r[dim] ?? '—'), value: num(r[metric]) }))
    .filter((b) => b.value > 0 && !(drop ?? []).includes(b.label));

export default function Audiences({ range, compare: mode }: { range: Range; compare: CompareMode }) {
  const compare = mode !== 'none';
  const totals = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.totalUsers, F.newUsers, F.activeUsers, F.sessions, F.engagedSessions], limit: 1 },
    range,
    mode
  );
  const geo = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.country, F.activeUsers, F.sessions], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 12 },
    range
  );
  const cities = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.city, F.country, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 10 },
    range
  );
  const age = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.userAgeBracket, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 10 },
    range
  );
  const gender = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.userGender, F.activeUsers], limit: 10 },
    range
  );
  const language = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.language, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 8 },
    range
  );
  const interests = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.brandingInterest, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 10 },
    range
  );
  const device = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.deviceCategory, F.activeUsers], limit: 10 },
    range
  );
  const browser = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.browser, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 8 },
    range
  );
  const os = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.operatingSystem, F.activeUsers], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 8 },
    range
  );
  const audiences = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.audienceName, F.activeUsers, F.sessions], sort: [{ field: F.activeUsers, direction: 'desc' }], limit: 12 },
    range
  );
  const newRet = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.newVsReturning, F.activeUsers], limit: 10 },
    range
  );

  const cur = {
    users: sumField(totals.data, F.totalUsers),
    newU: sumField(totals.data, F.newUsers),
    active: sumField(totals.data, F.activeUsers),
    sessions: sumField(totals.data, F.sessions),
    engaged: sumField(totals.data, F.engagedSessions),
  };
  const prev = {
    users: sumField(totals.prev, F.totalUsers),
    newU: sumField(totals.prev, F.newUsers),
    active: sumField(totals.prev, F.activeUsers),
  };

  const geoBars = bars(geo, F.country, F.activeUsers);
  const cityRows = (cities.data?.rows ?? [])
    .map((r) => ({ city: String(r[F.city] ?? '—'), country: String(r[F.country] ?? ''), users: num(r[F.activeUsers]) }))
    .filter((r) => r.users > 0 && r.city !== '(not set)');
  const genderSlices = bars(gender, F.userGender, F.activeUsers, ['unknown']);
  const ageBars = bars(age, F.userAgeBracket, F.activeUsers, ['unknown']);
  const deviceSlices = bars(device, F.deviceCategory, F.activeUsers);
  const newRetSlices = bars(newRet, F.newVsReturning, F.activeUsers, ['(not set)']);
  const audienceRows = (audiences.data?.rows ?? [])
    .map((r) => ({ name: String(r[F.audienceName] ?? '—'), users: num(r[F.activeUsers]), sessions: num(r[F.sessions]) }))
    .filter((r) => r.users > 0);

  const thresholdNote = 'Not enough data — Google thresholds demographics on low-traffic properties.';

  return (
    <section className="report-page">
      <div className="grid">
        <KpiValue label="Total users" value={compact(cur.users)} delta={compare ? deltaPct(cur.users, prev.users) : null} loading={totals.loading} />
        <KpiValue label="New users" value={compact(cur.newU)} delta={compare ? deltaPct(cur.newU, prev.newU) : null} loading={totals.loading} />
        <KpiValue label="Active users" value={compact(cur.active)} delta={compare ? deltaPct(cur.active, prev.active) : null} loading={totals.loading} />
        <KpiValue label="Engagement rate" value={pct(ratio(cur.engaged, cur.sessions))} loading={totals.loading} />
      </div>

      <div className="section-title">Geography</div>
      <div className="grid-2">
        <ChartFrame title="Active users by country" loading={geo.loading} error={geo.error} retry={geo.retry} empty={!geoBars.length}>
          <BarChart points={geoBars} format={int} caption="Active users" />
        </ChartFrame>
        <ChartFrame title="Top cities" loading={cities.loading} error={cities.error} retry={cities.retry} empty={!cityRows.length}>
          <table className="tbl">
            <thead>
              <tr>
                <th>City</th>
                <th>Country</th>
                <th className="num">Active users</th>
              </tr>
            </thead>
            <tbody>
              {cityRows.map((r, i) => (
                <tr key={i}>
                  <td className="name">{r.city}</td>
                  <td>{r.country}</td>
                  <td className="num">{int(r.users)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ChartFrame>
      </div>

      <div className="section-title">Demographics</div>
      <div className="grid-2">
        <ChartFrame title="Active users by age" loading={age.loading} error={age.error} retry={age.retry} empty={!ageBars.length}>
          {ageBars.length ? <BarChart points={ageBars} format={int} caption="Active users" /> : <div className="state-empty">{thresholdNote}</div>}
        </ChartFrame>
        <ChartFrame title="Active users by gender" loading={gender.loading} error={gender.error} retry={gender.retry} empty={!genderSlices.length}>
          <Donut slices={genderSlices} centerLabel="active users" />
        </ChartFrame>
        <ChartFrame title="Active users by language" loading={language.loading} error={language.error} retry={language.retry} empty={!bars(language, F.language, F.activeUsers).length}>
          <BarChart points={bars(language, F.language, F.activeUsers)} format={int} caption="Active users" />
        </ChartFrame>
        <ChartFrame title="Active users by interests" loading={interests.loading} error={interests.error} retry={interests.retry} empty={!bars(interests, F.brandingInterest, F.activeUsers, ['unknown']).length}>
          <BarChart points={bars(interests, F.brandingInterest, F.activeUsers, ['unknown'])} format={int} caption="Active users" />
        </ChartFrame>
      </div>

      <div className="section-title">Technology</div>
      <div className="grid-2">
        <ChartFrame title="Active users by device category" loading={device.loading} error={device.error} retry={device.retry} empty={!deviceSlices.length}>
          <Donut slices={deviceSlices} centerLabel="active users" />
        </ChartFrame>
        <ChartFrame title="Active users by browser" loading={browser.loading} error={browser.error} retry={browser.retry} empty={!bars(browser, F.browser, F.activeUsers).length}>
          <BarChart points={bars(browser, F.browser, F.activeUsers)} format={int} caption="Active users" />
        </ChartFrame>
        <ChartFrame title="Active users by operating system" loading={os.loading} error={os.error} retry={os.retry} empty={!bars(os, F.operatingSystem, F.activeUsers).length}>
          <BarChart points={bars(os, F.operatingSystem, F.activeUsers)} format={int} caption="Active users" />
        </ChartFrame>
        <ChartFrame title="New vs returning" loading={newRet.loading} error={newRet.error} retry={newRet.retry} empty={!newRetSlices.length}>
          <Donut slices={newRetSlices} centerLabel="active users" />
        </ChartFrame>
      </div>

      <div className="section-title">Audiences</div>
      <ChartFrame title="Active users by audience" loading={audiences.loading} error={audiences.error} retry={audiences.retry} empty={!audienceRows.length}>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Audience</th>
                <th className="num">Active users</th>
                <th className="num">Sessions</th>
              </tr>
            </thead>
            <tbody>
              {audienceRows.map((r) => (
                <tr key={r.name}>
                  <td className="name">{r.name}</td>
                  <td className="num">{int(r.users)}</td>
                  <td className="num">{int(r.sessions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartFrame>
      <Insights
        items={[
          geoBars[0] ? `${geoBars[0].label} is the largest market with ${int(geoBars[0].value)} active users${geoBars[1] ? `, ahead of ${geoBars[1].label} (${int(geoBars[1].value)})` : ''}.` : null,
          deviceSlices.length
            ? `${deviceSlices[0].label} accounts for ${((deviceSlices[0].value / deviceSlices.reduce((s, x) => s + x.value, 0)) * 100).toFixed(1)}% of active users.`
            : null,
          newRetSlices.length >= 2
            ? `The audience splits ${newRetSlices.map((s) => `${s.label.toLowerCase()}: ${int(s.value)}`).join(' · ')} — interpretation: a new-heavy mix means retention is the growth lever.`
            : null,
          !ageBars.length ? 'Age and interest data is thresholded by Google for parts of this range.' : null,
        ]}
      />
    </section>
  );
}
