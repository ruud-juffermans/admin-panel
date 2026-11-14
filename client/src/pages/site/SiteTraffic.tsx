import { useMemo } from 'react';
import styled from 'styled-components';
import { useOverview, useTimeseries, useTopPages, useTopReferrers } from '../../api/queries';
import type { ReferrerKind, TrafficSite } from '../../api/types';
import { ShareTable, type ShareRow } from '../../components/ShareTable';
import { StatTile } from '../../components/StatTile';
import { TrafficChart } from '../../components/TrafficChart';
import { Alert, Badge, Card, CardHead, Grid, Muted, SectionTitle, Skeleton, Tiles } from '../../components/ui';
import { fmtPercent } from '../../format';
import { useRange } from '../../range';

// One neutral tone for source labels: red/amber/green mean status elsewhere.
const KIND_LABEL: Record<ReferrerKind, { label: string; tone: 'blue' | 'muted' }> = {
  linkedin: { label: 'LinkedIn', tone: 'blue' },
  github: { label: 'GitHub', tone: 'blue' },
  google: { label: 'Google', tone: 'blue' },
  udemy: { label: 'Udemy', tone: 'blue' },
  internal: { label: 'own site', tone: 'muted' },
  direct: { label: 'direct', tone: 'muted' },
  other: { label: 'other', tone: 'muted' },
};

function localeCount(rows: Array<{ locale: string; count: number }>, locale: string): number {
  return rows.find((r) => r.locale === locale)?.count ?? 0;
}

/**
 * Page views of one website: headline tiles, views per day, top pages by
 * section and referrers by host. All three sites share this; the portfolio and
 * the plumbing site read the panel's own page_views table, revault.nl its own
 * server (same response shapes, see api/queries.ts).
 *
 * `locales` adds the Dutch/English tiles for a bilingual site. A single-
 * language site gets "views yesterday" and the Google share instead — for a
 * local business found through search, that share is the number that matters.
 */
export function SiteTraffic({ site, locales = false }: { site: TrafficSite; locales?: boolean }) {
  const { days } = useRange();
  const overview = useOverview(days, site);
  const timeseries = useTimeseries(days, site);
  const pages = useTopPages(days, site);
  const referrers = useTopReferrers(days, site);

  const o = overview.data;
  const nl = o ? localeCount(o.byLocale, 'nl') : 0;
  const en = o ? localeCount(o.byLocale, 'en') : 0;

  const series = timeseries.data?.series ?? [];
  const viewsYesterday = series.length >= 2 ? series[series.length - 2]!.count : null;
  const viewsToday = series.at(-1)?.count ?? null;

  const pageRows = useMemo<ShareRow[]>(
    () =>
      (pages.data?.sections ?? []).map((s) => ({
        key: s.section,
        label: s.label,
        count: s.count,
        children: s.pages.map((p) => ({ key: p.path, label: p.path, count: p.count })),
      })),
    [pages.data],
  );
  const pageTotal = pageRows.reduce((n, r) => n + r.count, 0);

  const refRows = useMemo<ShareRow[]>(
    () =>
      (referrers.data?.referrers ?? []).map((r) => {
        const kind = KIND_LABEL[r.kind];
        return {
          key: r.host,
          label: (
            <RefLabel>
              <span>{r.host}</span>
              {r.kind !== 'other' && r.kind !== 'direct' && <Badge $tone={kind.tone}>{kind.label}</Badge>}
            </RefLabel>
          ),
          count: r.count,
        };
      }),
    [referrers.data],
  );
  const refTotal = refRows.reduce((n, r) => n + r.count, 0);
  const fromGoogle = (referrers.data?.referrers ?? []).filter((r) => r.kind === 'google').reduce((n, r) => n + r.count, 0);

  return (
    <>
      {overview.error && <Alert>Could not load the overview: {overview.error.message}</Alert>}

      <Tiles>
        <StatTile label="Page views" value={o?.totalViews ?? '—'} previous={o?.previous.totalViews} period={`previous ${days}d`} />
        {locales ? (
          <>
            <StatTile label="Dutch (nl)" value={o ? nl : '—'} previous={o ? localeCount(o.previous.byLocale, 'nl') : undefined} period={`previous ${days}d`} />
            <StatTile label="English (en)" value={o ? en : '—'} previous={o ? localeCount(o.previous.byLocale, 'en') : undefined} period={`previous ${days}d`} />
          </>
        ) : (
          <>
            <StatTile label="Views yesterday" value={viewsYesterday ?? '—'} hint={viewsToday !== null ? `${viewsToday} so far today` : undefined} />
            <StatTile label="From Google" value={referrers.data ? fmtPercent(fromGoogle, refTotal) : '—'} hint={referrers.data ? `${fromGoogle} of ${refTotal} views` : undefined} />
          </>
        )}
        <StatTile
          label="Avg views / day"
          value={o ? Math.round((o.totalViews / days) * 10) / 10 : '—'}
          hint={o && locales ? `${fmtPercent(en, o.totalViews)} English` : undefined}
        />
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Views per day</SectionTitle>
          <Muted>{locales ? 'by locale · UTC days' : 'UTC days'}</Muted>
        </CardHead>
        {timeseries.isPending ? (
          <Skeleton $h={260} />
        ) : timeseries.error ? (
          <Alert>Could not load the time series: {timeseries.error.message}</Alert>
        ) : (
          <TrafficChart series={timeseries.data.series} />
        )}
      </Card>

      <Grid $min={360}>
        <Card>
          <CardHead>
            <SectionTitle>Top pages</SectionTitle>
            <Muted>by section · expand for paths</Muted>
          </CardHead>
          {pages.isPending ? (
            <Skeleton $h={200} />
          ) : pages.error ? (
            <Alert>Could not load pages: {pages.error.message}</Alert>
          ) : pageRows.length === 0 ? (
            <Muted>No page views in this range.</Muted>
          ) : (
            <ShareTable rows={pageRows} total={pageTotal} labelHeader="Section / path" expandable />
          )}
        </Card>

        <Card>
          <CardHead>
            <SectionTitle>Referrers</SectionTitle>
            <Muted>grouped by host</Muted>
          </CardHead>
          {referrers.isPending ? (
            <Skeleton $h={200} />
          ) : referrers.error ? (
            <Alert>Could not load referrers: {referrers.error.message}</Alert>
          ) : refRows.length === 0 ? (
            <Muted>No page views in this range.</Muted>
          ) : (
            <ShareTable rows={refRows} total={refTotal} labelHeader="Source" />
          )}
        </Card>
      </Grid>
    </>
  );
}

const RefLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.84rem;
`;
