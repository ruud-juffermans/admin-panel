import { useMemo } from 'react';
import styled from 'styled-components';
import { useOverview, useTimeseries, useTopPages, useTopReferrers } from '../api/queries';
import type { PageSection, ReferrerKind } from '../api/types';
import { ShareTable, type ShareRow } from '../components/ShareTable';
import { StatTile } from '../components/StatTile';
import { TrafficChart } from '../components/TrafficChart';
import { Alert, Badge, Card, CardHead, Grid, Lead, Muted, Page, PageHeader, SectionTitle, Skeleton, Tiles, Title } from '../components/ui';
import { fmtPercent } from '../format';
import { rangeLabel, useRange } from '../range';

const SECTION_LABEL: Record<PageSection['section'], string> = {
  home: 'Home',
  projects: 'Projects',
  blog: 'Blog',
  expertise: 'Expertise',
  about: 'About',
  contact: 'Contact',
  other: 'Other',
};

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

export function SitePage() {
  const { days } = useRange();
  const overview = useOverview(days);
  const timeseries = useTimeseries(days);
  const pages = useTopPages(days);
  const referrers = useTopReferrers(days);

  const o = overview.data;
  const nl = o ? localeCount(o.byLocale, 'nl') : 0;
  const en = o ? localeCount(o.byLocale, 'en') : 0;

  const pageRows = useMemo<ShareRow[]>(
    () =>
      (pages.data?.sections ?? []).map((s) => ({
        key: s.section,
        label: SECTION_LABEL[s.section],
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

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Site</Title>
          <Lead>Traffic on ruudjuffermans.nl, {rangeLabel(days)}.</Lead>
        </div>
      </PageHeader>

      {overview.error && <Alert>Could not load the overview: {overview.error.message}</Alert>}

      <Tiles>
        <StatTile label="Page views" value={o?.totalViews ?? '—'} previous={o?.previous.totalViews} period={`previous ${days}d`} />
        <StatTile
          label="Dutch (nl)"
          value={o ? nl : '—'}
          previous={o ? localeCount(o.previous.byLocale, 'nl') : undefined}
          period={`previous ${days}d`}
        />
        <StatTile
          label="English (en)"
          value={o ? en : '—'}
          previous={o ? localeCount(o.previous.byLocale, 'en') : undefined}
          period={`previous ${days}d`}
        />
        <StatTile
          label="Avg views / day"
          value={o ? Math.round((o.totalViews / days) * 10) / 10 : '—'}
          hint={o ? `${fmtPercent(en, o.totalViews)} English` : undefined}
        />
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Views per day</SectionTitle>
          <Muted>by locale · UTC days</Muted>
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
    </Page>
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
