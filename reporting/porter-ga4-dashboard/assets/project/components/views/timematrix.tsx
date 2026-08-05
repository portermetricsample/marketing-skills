/**
 * Time Matrix view — KPIs across periods (rows = metrics, columns = periods,
 * newest first, leading Total, per-row heat, Day/Week/Month/Quarter toggle) +
 * a day-of-week × hour heatmap. The matrix logic is the porter-reporting
 * "breakdown matrix" (time breakdown) restyled to the GA4 blue tonal ramp.
 */
import { useReportQuery, num, type Range } from '../../lib/useReport';
import { ChartFrame, Insights } from '../ui';
import { TimeMatrix, DayHourHeatmap, type MatrixMetric } from '../gviz';
import { CONNECTOR, ACCOUNTS, F, int, pct, ratio } from '../../lib/ga4';

const BASE_FIELDS = [F.sessions, F.activeUsers, F.newUsers, F.engagedSessions, F.screenPageViews, F.keyEvents, F.eventCount];

const METRICS: MatrixMetric[] = [
  { key: F.activeUsers, label: 'Active users', group: 'Audience', format: int },
  { key: F.newUsers, label: 'New users', group: 'Audience', format: int },
  { key: F.sessions, label: 'Sessions', group: 'Engagement', format: int },
  { key: F.engagedSessions, label: 'Engaged sessions', group: 'Engagement', format: int },
  {
    key: 'engagement_rate',
    label: 'Engagement rate',
    group: 'Engagement',
    format: pct,
    value: (s) => ratio(s[F.engagedSessions], s[F.sessions]),
  },
  { key: F.screenPageViews, label: 'Views', group: 'Engagement', format: int },
  { key: F.keyEvents, label: 'Key events', group: 'Conversion', format: int },
  {
    key: 'key_event_rate',
    label: 'Session key event rate',
    group: 'Conversion',
    format: pct,
    value: (s) => ratio(s[F.keyEvents], s[F.sessions]),
  },
];

export default function TimeMatrixView({ range }: { range: Range }) {
  const daily = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.date, ...BASE_FIELDS], sort: [{ field: F.date, direction: 'asc' }], limit: 400 },
    range
  );
  const byHour = useReportQuery(
    { connector: CONNECTOR, accounts: ACCOUNTS, fields: [F.dayOfWeekName, F.hour, F.sessions], limit: 200 },
    range
  );

  return (
    <section className="report-page">
      <ChartFrame
        title="Key metrics by period"
        loading={daily.loading}
        error={daily.error}
        retry={daily.retry}
        empty={!(daily.data?.rows ?? []).length}
        skeletonHeight={260}
      >
        <TimeMatrix rows={daily.data?.rows ?? []} dateField={F.date} baseFields={BASE_FIELDS} metrics={METRICS} initialGranularity="week" />
      </ChartFrame>

      <div style={{ marginTop: 16 }}>
        <ChartFrame
          title="Sessions by day of week and hour"
          loading={byHour.loading}
          error={byHour.error}
          retry={byHour.retry}
          empty={!(byHour.data?.rows ?? []).length}
          skeletonHeight={200}
        >
          <DayHourHeatmap rows={byHour.data?.rows ?? []} dayField={F.dayOfWeekName} hourField={F.hour} valueField={F.sessions} format={int} />
        </ChartFrame>
      </div>
      <Insights
        items={[
          (() => {
            const rows = daily.data?.rows ?? [];
            if (!rows.length) return null;
            const best = rows.reduce((a, b) => (num(b[F.sessions]) > num(a[F.sessions]) ? b : a));
            return `The strongest single day of the range was ${String(best[F.date])} with ${new Intl.NumberFormat('en-US').format(num(best[F.sessions]))} sessions.`;
          })(),
          'The matrix reads newest-first: darker blue = the higher values for that metric across periods.',
          (() => {
            const rows = byHour.data?.rows ?? [];
            if (!rows.length) return null;
            const best = rows.reduce((a, b) => (num(b[F.sessions]) > num(a[F.sessions]) ? b : a));
            const d = String(best[F.dayOfWeekName] ?? '');
            const h = num(best[F.hour]);
            return d ? `Peak traffic hour: ${d} ${h}:00.` : null;
          })(),
        ]}
      />
    </section>
  );
}
