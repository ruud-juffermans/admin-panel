import { useMemo } from 'react';
import { useRevaultOverview, useRevaultTimeseries, useRevaultTopPages } from '../../api/queries';
import { ShareTable, type ShareRow } from '../../components/ShareTable';
import { StatTile } from '../../components/StatTile';
import { TrafficChart } from '../../components/TrafficChart';
import { Card, CardHead, Muted, SectionTitle, Tiles } from '../../components/ui';
import { fmtPercent } from '../../format';
import { useRange } from '../../range';
import { RevaultData } from './shared';

function localeCount(rows: Array<{ locale: string; count: number }>, locale: string): number {
  return rows.find((r) => r.locale === locale)?.count ?? 0;
}

// Page views on revault.nl: the same tiles and chart as the portfolio's Site
// page, fed by the Revault server's analytics.
export function RevaultTraffic() {
  const { days } = useRange();
  const overview = useRevaultOverview(days);
  const timeseries = useRevaultTimeseries(days);
  const pages = useRevaultTopPages(days);

  const o = overview.data;
  const nl = o ? localeCount(o.byLocale, 'nl') : 0;
  const en = o ? localeCount(o.byLocale, 'en') : 0;

  const pageRows = useMemo<ShareRow[]>(() => (pages.data?.byPath ?? []).map((p) => ({ key: p.path, label: p.path, count: p.views })), [pages.data]);
  const pageTotal = pages.data?.total ?? pageRows.reduce((n, r) => n + r.count, 0);

  return (
    <>
      <Tiles>
        <StatTile label="Page views" value={o?.totalViews ?? '—'} previous={o?.previous.totalViews} period={`previous ${days}d`} />
        <StatTile label="Dutch (nl)" value={o ? nl : '—'} previous={o ? localeCount(o.previous.byLocale, 'nl') : undefined} period={`previous ${days}d`} />
        <StatTile label="English (en)" value={o ? en : '—'} previous={o ? localeCount(o.previous.byLocale, 'en') : undefined} period={`previous ${days}d`} />
        <StatTile label="Avg views / day" value={o ? Math.round((o.totalViews / days) * 10) / 10 : '—'} hint={o ? `${fmtPercent(en, o.totalViews)} English` : undefined} />
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Views per day</SectionTitle>
          <Muted>by locale · UTC days</Muted>
        </CardHead>
        <RevaultData query={timeseries} height={260}>
          {(data) => <TrafficChart series={data.series} />}
        </RevaultData>
      </Card>

      <Card>
        <CardHead>
          <SectionTitle>Top pages</SectionTitle>
          <Muted>by path</Muted>
        </CardHead>
        <RevaultData query={pages} height={200}>
          {() => (pageRows.length === 0 ? <Muted>No page views in this range.</Muted> : <ShareTable rows={pageRows} total={pageTotal} labelHeader="Path" />)}
        </RevaultData>
      </Card>
    </>
  );
}
