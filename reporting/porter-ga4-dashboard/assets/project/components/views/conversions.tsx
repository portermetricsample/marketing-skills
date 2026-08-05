/** Conversions view — key events, styled like GA4's "Key events" report. */
import { useMemo } from 'react';
import { useReportQuery, sumField, deltaPct, num, type CompareMode, type Range } from '../../lib/useReport';
import { ChartFrame, KpiValue, Insights } from '../ui';
import { LineChart, BarChart } from '../charts';
import { TrendExplorer } from '../gviz';
import { CONNECTOR, ACCOUNTS, F, int, pct, ratio, compact } from '../../lib/ga4';

export default function Conversions({ range, compare: mode }: { range: Range; compare: CompareMode }) {
  const compare = mode !== 'none';
  const totals = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.keyEvents, F.sessions, F.eventCount, F.totalUsers], limit: 1 },
    range,
    mode
  );
  const daily = useReportQuery(
    {
      connector: CONNECTOR,
      accounts: ACCOUNTS,
      fields: [F.date, F.keyEvents, F.sessions, F.eventCount],
      sort: [{ field: F.date, direction: 'asc' }],
      limit: 400,
    },
    range,
    mode
  );
  const byEvent = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.eventName, F.keyEvents, F.eventCount], sort: [{ field: F.keyEvents, direction: 'desc' }], limit: 25 },
    range,
    mode
  );
  const byChannel = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.sessionDefaultChannelGroup, F.keyEvents, F.sessions], sort: [{ field: F.keyEvents, direction: 'desc' }], limit: 12 },
    range
  );
  const bySource = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.sessionSourceMedium, F.keyEvents, F.sessions], sort: [{ field: F.keyEvents, direction: 'desc' }], limit: 10 },
    range
  );

  const cur = {
    keyEvents: sumField(totals.data, F.keyEvents),
    sessions: sumField(totals.data, F.sessions),
    events: sumField(totals.data, F.eventCount),
    users: sumField(totals.data, F.totalUsers),
  };
  const prev = {
    keyEvents: sumField(totals.prev, F.keyEvents),
    sessions: sumField(totals.prev, F.sessions),
    events: sumField(totals.prev, F.eventCount),
  };
  const curRate = ratio(cur.keyEvents, cur.sessions);
  const prevRate = ratio(prev.keyEvents, prev.sessions);



  // key events by event name — show events that actually converted
  const eventRows = useMemo(() => {
    const cur = (byEvent.data?.rows ?? [])
      .map((r) => ({ name: String(r[F.eventName] ?? '—'), keyEvents: num(r[F.keyEvents]), events: num(r[F.eventCount]) }))
      .filter((r) => r.keyEvents > 0);
    const prevMap = new Map(
      (byEvent.prev?.rows ?? []).map((r) => [String(r[F.eventName] ?? '—'), num(r[F.keyEvents])])
    );
    const total = cur.reduce((s, r) => s + r.keyEvents, 0);
    return cur.map((r) => ({ ...r, share: total ? r.keyEvents / total : 0, delta: deltaPct(r.keyEvents, prevMap.get(r.name) ?? 0) }));
  }, [byEvent.data, byEvent.prev]);

  const channelBars = (byChannel.data?.rows ?? [])
    .map((r) => ({ label: String(r[F.sessionDefaultChannelGroup] ?? '—'), value: num(r[F.keyEvents]) }))
    .filter((b) => b.value > 0);

  const sourceRows = (bySource.data?.rows ?? [])
    .map((r) => ({
      name: String(r[F.sessionSourceMedium] ?? '—'),
      sessions: num(r[F.sessions]),
      keyEvents: num(r[F.keyEvents]),
    }))
    .filter((r) => r.keyEvents > 0);

  const maxEventShare = Math.max(...eventRows.map((r) => r.share), 0.0001);

  return (
    <section className="report-page">
      <div className="grid">
        <KpiValue label="Key events" value={compact(cur.keyEvents)} delta={compare ? deltaPct(cur.keyEvents, prev.keyEvents) : null} loading={totals.loading} />
        <KpiValue label="Session key event rate" value={pct(curRate)} delta={compare ? deltaPct(curRate, prevRate) : null} loading={totals.loading} />
        <KpiValue label="Sessions" value={compact(cur.sessions)} delta={compare ? deltaPct(cur.sessions, prev.sessions) : null} loading={totals.loading} />
        <KpiValue label="Event count (all events)" value={compact(cur.events)} delta={compare ? deltaPct(cur.events, prev.events) : null} loading={totals.loading} />
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartFrame
          title="Key events over time"
          loading={daily.loading}
          error={daily.error}
          retry={daily.retry}
          empty={!(daily.data?.rows ?? []).length}
        >
          <TrendExplorer
            rows={daily.data?.rows ?? []}
            prevRows={compare ? daily.prev?.rows ?? [] : []}
            dateField={F.date}
            baseFields={[F.keyEvents, F.sessions, F.eventCount]}
            metrics={[
              { id: 'keyEvents', label: 'Key events', format: int, value: (s) => s[F.keyEvents] },
              { id: 'sessions', label: 'Sessions', format: int, value: (s) => s[F.sessions] },
              { id: 'rate', label: 'Key event rate', format: pct, value: (s) => ratio(s[F.keyEvents], s[F.sessions]) },
              { id: 'events', label: 'Event count', format: int, value: (s) => s[F.eventCount] },
            ]}
            LineChart={LineChart}
          />
        </ChartFrame>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartFrame title="Key events by event name" loading={byEvent.loading} error={byEvent.error} retry={byEvent.retry} empty={!eventRows.length}>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Event name</th>
                  <th className="num">Key events</th>
                  <th className="num">% of total</th>
                  {compare && <th className="num">vs prev.</th>}
                </tr>
              </thead>
              <tbody>
                {eventRows.map((r) => (
                  <tr key={r.name}>
                    <td className="name row-bar">
                      <span className="row-bar-fill" style={{ width: `${(r.share / maxEventShare) * 100}%` }} />
                      <span className="row-bar-text">{r.name}</span>
                    </td>
                    <td className="num">{int(r.keyEvents)}</td>
                    <td className="num">{(r.share * 100).toFixed(1)}%</td>
                    {compare && <td className={`num ${r.delta == null ? 'delta-flat' : r.delta >= 0 ? 'delta-up' : 'delta-down'}`}>{r.delta == null ? 'new' : `${r.delta >= 0 ? '▲' : '▼'} ${Math.abs(r.delta).toFixed(1)}%`}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <ChartFrame title="Key events by default channel group" loading={byChannel.loading} error={byChannel.error} retry={byChannel.retry} empty={!channelBars.length}>
          <BarChart points={channelBars} format={int} caption="Key events" />
        </ChartFrame>
        <ChartFrame title="Key events by session source / medium" loading={bySource.loading} error={bySource.error} retry={bySource.retry} empty={!sourceRows.length}>
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Source / medium</th>
                  <th className="num">Sessions</th>
                  <th className="num">Key events</th>
                  <th className="num">Key event rate</th>
                </tr>
              </thead>
              <tbody>
                {sourceRows.map((r) => (
                  <tr key={r.name}>
                    <td className="name" title={r.name}>{r.name}</td>
                    <td className="num">{int(r.sessions)}</td>
                    <td className="num">{int(r.keyEvents)}</td>
                    <td className="num">{pct(ratio(r.keyEvents, r.sessions))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartFrame>
      </div>
      <Insights
        items={[
          cur.keyEvents > 0
            ? `The property recorded ${int(cur.keyEvents)} key events in ${int(cur.sessions)} sessions (${pct(curRate)} session key event rate).`
            : 'No key events were recorded in this range.',
          compare && prev.keyEvents > 0
            ? `Key events moved ${deltaPct(cur.keyEvents, prev.keyEvents)!.toFixed(1)}% vs the comparison period.`
            : null,
          eventRows[0] ? `"${eventRows[0].name}" is the only key event configured — it accounts for 100% of conversions; interpretation: adding more key events (e.g. sign-ups, trials) would give this page more resolution.` : null,
          sourceRows[0]
            ? `${sourceRows[0].name} drives the most key events (${int(sourceRows[0].keyEvents)}), with ${pct(ratio(sourceRows[0].keyEvents, sourceRows[0].sessions))} of its sessions converting.`
            : null,
        ]}
      />
    </section>
  );
}
