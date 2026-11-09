import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  useContactList,
  useContactStats,
  useNewsletterStats,
  useFunds,
  useOverview,
  useRevaultIntakeStats,
  useRevaultIntakes,
  useRevaultNewsletterStats,
  useRevaultOverview,
  useRevaultTimeseries,
  useTimeseries,
  useTopReferrers,
  useTwinApprovals,
  useTwinBudget,
  useTwinContactMessages,
  useTwinEvals,
  useTwinOverview,
  useTwinPerformance,
  useTwinTimeseries,
  useSettings,
} from '../api/queries';
import { ApiError } from '../api/client';
import { AttentionList, type AttentionItem } from '../components/AttentionList';
import { Meter } from '../components/Meter';
import { SiteHealthCard } from '../components/SiteHealthCard';
import { StatTile } from '../components/StatTile';
import { StatusGlyph } from '../components/icons';
import { isTwinUnavailable, twinErrorMessage } from '../components/TwinState';
import { Alert, Badge, Card, CardHead, Eyebrow, Lead, Muted, Page, PageHeader, SectionTitle, Skeleton, Tiles, Title } from '../components/ui';
import { fmtDay, fmtPercent } from '../format';
import { rangeLabel, useRange } from '../range';
import { fmtMs, fmtUsd } from './askruud/shared';

const unavailable = (err: unknown) => err instanceof ApiError && (err.status === 502 || err.status === 503);

function ageOf(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} d`;
}

function localeCount(rows: Array<{ locale: string; count: number }>, locale: string): number {
  return rows.find((r) => r.locale === locale)?.count ?? 0;
}

// Morning check, in reading order: what needs a decision, then the three
// sites, then the twin, then money and the inbox. Everything links to the
// page that explains it. A twin or Revault outage only greys out its own part.
export function OverviewPage() {
  const { days } = useRange();
  const period = `previous ${days}d`;
  const portfolio = useOverview(days);
  const portfolioSeries = useTimeseries(days);
  const loodgieter = useOverview(days, 'loodgieterjuffermans.nl');
  const loodgieterSeries = useTimeseries(days, 'loodgieterjuffermans.nl');
  const loodgieterRefs = useTopReferrers(days, 'loodgieterjuffermans.nl');
  const revault = useRevaultOverview(days);
  const revaultSeries = useRevaultTimeseries(days);
  const revaultIntakes = useRevaultIntakeStats();
  const revaultNew = useRevaultIntakes('NEW');
  const revaultNewsletter = useRevaultNewsletterStats();
  const contact = useContactStats();
  const newList = useContactList('new');
  const newsletter = useNewsletterStats();
  const twin = useTwinOverview(days);
  const twinSeries = useTwinTimeseries(days);
  const budget = useTwinBudget(31);
  const approvals = useTwinApprovals();
  const evals = useTwinEvals();
  const perf = useTwinPerformance(days);
  const twinMessages = useTwinContactMessages(days);
  const fundsQuery = useFunds();
  const settings = useSettings();

  const t = twin.data;
  const twinDown = !!twin.error && isTwinUnavailable(twin.error);
  const revaultDown = !!revaultIntakes.error && unavailable(revaultIntakes.error);
  const newIntakes = revaultIntakes.data?.counts.NEW ?? 0;
  const openIntakes = revaultIntakes.data ? ['NEW', 'ASSESSED', 'VIABLE', 'AGREEMENT', 'RECOVERY'].reduce((n, s) => n + (revaultIntakes.data!.counts[s as keyof typeof revaultIntakes.data.counts] ?? 0), 0) : 0;
  const pending = approvals.data?.pending.length ?? 0;
  const newMessages = contact.data?.counts.new ?? 0;
  const spentToday = t?.budget.spent_today_usd ?? null;
  const cap = t?.budget.daily_limit_usd ?? 0;
  const budgetRatio = cap > 0 && spentToday !== null ? spentToday / cap : null;
  const monthSpend = (() => {
    const month = new Date().toISOString().slice(0, 7);
    return (budget.data?.ledger ?? []).filter((r) => r.day.startsWith(month)).reduce((n, r) => n + r.spent_usd, 0);
  })();
  const latestEval = evals.data?.runs[0];
  const providers = fundsQuery.data?.providers ?? [];
  const shownProviders = providers.filter((p) => p.configured || p.topups.length > 0 || p.active);
  const lowFunds = providers.filter((p) => p.low);
  const activeProvider = providers.find((p) => p.active);
  const alerts = settings.data?.twin_alerts;
  const pw = perf.data?.window;

  const oldestNew = newList.data?.submissions.length ? newList.data.submissions.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt : undefined;
  const oldestIntake = revaultNew.data?.items.length ? revaultNew.data.items.reduce((a, b) => (a.createdAt < b.createdAt ? a : b)).createdAt : undefined;

  // Severity: bad = a person or the service is blocked; warn = needs a look.
  const attention: AttentionItem[] = [];
  if (pending > 0) attention.push({ key: 'approvals', severity: 'bad', object: 'approval', text: `${pending} twin action${pending === 1 ? '' : 's'} waiting for your decision`, to: '/ask-ruud?tab=approvals', action: 'Decide' });
  if (budgetRatio !== null && budgetRatio >= 1) attention.push({ key: 'cap', severity: 'bad', object: 'budget', text: `Twin spend reached today's cap of ${fmtUsd(cap, 2)}`, to: '/ask-ruud?tab=cost', action: 'Review' });
  for (const p of lowFunds) attention.push({ key: `funds-${p.id}`, severity: p.active ? 'bad' : 'warn', object: 'funds', text: `${p.label} has ${fmtUsd(p.remaining_usd, 2)} left${p.remaining_source === 'estimate' ? ' (estimate)' : ''}${p.active ? ' and is the active provider' : ''}`, to: '/funds', action: 'Top up' });
  if (pw && alerts && pw.turns >= 5 && pw.error_rate >= alerts.error_rate) attention.push({ key: 'errors', severity: 'bad', object: 'errors', text: `${Math.round(pw.error_rate * 100)}% of twin turns ended in an error over the last ${days}d`, to: '/ask-ruud?tab=performance', action: 'Inspect' });
  if (twinDown) attention.push({ key: 'twin', severity: 'bad', object: 'twin', text: 'Ask Ruud is unavailable: the twin did not answer', to: '/ask-ruud', action: 'Open' });
  if (revaultDown) attention.push({ key: 'revault-down', severity: 'bad', object: 'revault', text: 'revault.nl is unavailable: its server did not answer', to: '/revault', action: 'Open' });
  if (newIntakes > 0) attention.push({ key: 'intakes', severity: 'warn', object: 'intake', text: `${newIntakes} new Revault intake request${newIntakes === 1 ? '' : 's'} waiting for an assessment`, to: '/revault', action: 'Assess', age: ageOf(oldestIntake) });
  if (newMessages > 0) attention.push({ key: 'contact', severity: 'warn', object: 'reply', text: `${newMessages} unread contact message${newMessages === 1 ? '' : 's'}`, to: '/inbox', action: 'Reply', age: ageOf(oldestNew) });
  if (budgetRatio !== null && budgetRatio >= 0.8 && budgetRatio < 1) attention.push({ key: 'budget', severity: 'warn', object: 'budget', text: `Twin budget at ${Math.round(budgetRatio * 100)}% of today's cap`, to: '/ask-ruud?tab=cost', action: 'Review' });
  if (latestEval && !latestEval.met) attention.push({ key: 'eval', severity: 'warn', object: 'eval', text: 'Latest eval run failed its thresholds', to: '/ask-ruud?tab=evals', action: 'Inspect', age: fmtDay(latestEval.created_at.slice(0, 10)) });
  if (pw && alerts) {
    if (pw.ttft_p95_ms !== null && pw.ttft_p95_ms > alerts.ttft_p95_ms) attention.push({ key: 'ttft', severity: 'warn', object: 'latency', text: `Twin time to first token p95 is ${fmtMs(pw.ttft_p95_ms)} (limit ${fmtMs(alerts.ttft_p95_ms)})`, to: '/ask-ruud?tab=performance', action: 'Inspect' });
    if (pw.turns >= 5 && pw.truncation_rate >= alerts.truncation_rate) attention.push({ key: 'truncated', severity: 'warn', object: 'truncated', text: `${Math.round(pw.truncation_rate * 100)}% of twin answers were cut off at max_tokens`, to: '/ask-ruud?tab=performance', action: 'Inspect' });
    const rateLimited = perf.data?.error_types.rate_limited ?? 0;
    if (rateLimited > 0) attention.push({ key: 'rate-limited', severity: 'warn', object: 'provider', text: `The LLM provider rate-limited the twin ${rateLimited} time${rateLimited === 1 ? '' : 's'} over the last ${days}d`, to: '/ask-ruud?tab=performance', action: 'Inspect' });
  }
  const critical = attention.filter((a) => a.severity === 'bad').length;

  const p = portfolio.data;
  const nl = p ? localeCount(p.byLocale, 'nl') : 0;
  const en = p ? localeCount(p.byLocale, 'en') : 0;
  const lRefs = loodgieterRefs.data?.referrers ?? [];
  const lTotal = lRefs.reduce((n, r) => n + r.count, 0);
  const lGoogle = lRefs.filter((r) => r.kind === 'google').reduce((n, r) => n + r.count, 0);
  const p95 = t?.window.latency_p95_ms ?? null;
  const p95Over = p95 !== null && alerts ? p95 > alerts.ttft_p95_ms * 2 : false;

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Overview</Title>
          <Lead>
            {attention.length === 0 ? 'All clear' : `${attention.length} item${attention.length === 1 ? '' : 's'} need attention${critical ? `, ${critical} critical` : ''}`} · {rangeLabel(days)}.
          </Lead>
        </div>
      </PageHeader>

      {portfolio.error && <Alert>Site analytics unavailable: {portfolio.error.message}</Alert>}
      {twin.error && !twinDown && <Alert>{twinErrorMessage(twin.error)}</Alert>}

      <Card>
        <CardHead>
          <SectionTitle>Needs attention</SectionTitle>
          <Muted>{attention.length === 0 ? 'all clear' : `${attention.length} item${attention.length === 1 ? '' : 's'}`}</Muted>
        </CardHead>
        <AttentionList items={attention} />
      </Card>

      <Section>
        <Eyebrow as="h2">Sites</Eyebrow>
        <SitesRow>
          <SiteHealthCard
            name="ruudjuffermans.nl"
            to="/site"
            views={p?.totalViews}
            previous={p?.previous.totalViews}
            period={period}
            trend={portfolioSeries.data?.series.map((d) => d.count)}
            status={{ tone: 'ok', glyph: 'dot', label: 'ok' }}
            meta={p ? `nl ${fmtPercent(nl, p.totalViews)} · en ${fmtPercent(en, p.totalViews)} · ${Math.round(p.totalViews / days)}/day` : '…'}
          />
          <SiteHealthCard
            name="revault.nl"
            to="/revault"
            views={revault.data?.totalViews}
            previous={revault.data?.previous.totalViews}
            period={period}
            trend={revaultSeries.data?.series.map((d) => d.count)}
            status={revaultDown ? { tone: 'bad', glyph: 'diamond', label: 'down' } : newIntakes > 0 ? { tone: 'warn', glyph: 'tri', label: `${newIntakes} new` } : { tone: 'ok', glyph: 'dot', label: 'ok' }}
            meta={revaultIntakes.data ? `${newIntakes} new · ${openIntakes} open case${openIntakes === 1 ? '' : 's'} · ${revaultNewsletter.data?.active ?? '—'} subscribers` : revaultDown ? 'intakes unavailable' : '…'}
            unavailable={revaultDown}
          />
          <SiteHealthCard
            name="loodgieterjuffermans.nl"
            to="/loodgieter"
            views={loodgieter.data?.totalViews}
            previous={loodgieter.data?.previous.totalViews}
            period={period}
            trend={loodgieterSeries.data?.series.map((d) => d.count)}
            status={{ tone: 'ok', glyph: 'dot', label: 'ok' }}
            meta={loodgieter.data ? `${lTotal ? fmtPercent(lGoogle, lTotal) : '0%'} from Google · ${Math.round(loodgieter.data.totalViews / days)}/day` : '…'}
          />
        </SitesRow>
      </Section>

      <Section>
        <SectionRow>
          <Eyebrow as="h2">Ask Ruud</Eyebrow>
          {t && (
            <Muted>
              <StatusGlyph glyph={twinDown ? 'diamond' : 'ring'} /> {t.provider} · <code>{t.model}</code>
            </Muted>
          )}
        </SectionRow>
        <Tiles>
          <StatTile label="Conversations" value={twinDown ? 'n/a' : (t?.window.threads ?? '—')} previous={t?.previous.threads} period={period} trend={twinSeries.data?.series.map((d) => d.threads)} hint={twinDown ? 'Ask Ruud unavailable' : undefined} to="/ask-ruud?tab=conversations" />
          <StatTile
            label="Spend today"
            value={twinDown ? 'n/a' : spentToday === null ? '—' : `${fmtUsd(spentToday, 2)} / ${fmtUsd(cap, 2)}`}
            meter={!twinDown && spentToday !== null && cap > 0 ? { value: spentToday, max: cap, text: `${Math.round((spentToday / cap) * 100)}%` } : undefined}
            hint={twinDown ? 'Ask Ruud unavailable' : `${fmtUsd(monthSpend, 2)} this month`}
            tone={budgetRatio !== null && budgetRatio >= 1 ? 'bad' : budgetRatio !== null && budgetRatio >= 0.8 ? 'warn' : undefined}
            to="/ask-ruud?tab=cost"
          />
          <StatTile label="Latency p95" value={twinDown ? 'n/a' : fmtMs(p95)} hint={twinDown ? 'Ask Ruud unavailable' : t ? `p50 ${fmtMs(t.window.latency_p50_ms)} · previous p95 ${fmtMs(t.previous.latency_p95_ms)}` : undefined} tone={p95Over ? 'warn' : undefined} to="/ask-ruud?tab=performance" />
          <StatTile label="Pending approvals" value={twinDown ? 'n/a' : approvals.data ? pending : '—'} hint={twinDown ? 'Ask Ruud unavailable' : pending > 0 ? 'waiting for your decision' : 'nothing waiting'} tone={pending > 0 ? 'bad' : undefined} to="/ask-ruud?tab=approvals" />
        </Tiles>
      </Section>

      <TwoCol>
        <Card>
          <CardHead>
            <SectionTitle>Funds</SectionTitle>
            <Muted>{fundsQuery.data ? `alert below ${fmtUsd(fundsQuery.data.alert_threshold_usd, 2)}` : ''}</Muted>
          </CardHead>
          {fundsQuery.isPending ? (
            <Skeleton $h={120} />
          ) : fundsQuery.error ? (
            <Alert>Could not load funds: {fundsQuery.error.message}</Alert>
          ) : (
            <Rows>
              {shownProviders.map((pr) => {
                const tone = pr.low ? (pr.active ? 'bad' : 'warn') : pr.remaining_source === 'api' ? 'ok' : pr.remaining_source === 'estimate' ? 'info' : 'neutral';
                const glyph = pr.low ? (pr.active ? 'diamond' : 'tri') : pr.remaining_source === 'api' ? 'dot' : pr.remaining_source === 'estimate' ? 'ring' : 'slash';
                const threshold = fundsQuery.data!.alert_threshold_usd;
                const max = Math.max(pr.remaining_usd ?? 0, pr.topup_total_usd, threshold * 4, 1);
                return (
                  <FundRow key={pr.id} to="/funds">
                    <FundName>
                      {pr.label}
                      {pr.active && <Badge $tone="neutral">active</Badge>}
                    </FundName>
                    <FundStatus $tone={tone}>
                      <StatusGlyph glyph={glyph} title={pr.low ? 'low' : pr.remaining_source ?? 'no key'} />
                      <b>{pr.remaining_usd === null ? '—' : fmtUsd(pr.remaining_usd, 2)}</b>
                      {pr.remaining_source === 'estimate' && <Muted>estimate</Muted>}
                      {pr.remaining_source === null && <Muted>{pr.configured ? 'unknown' : 'no key'}</Muted>}
                    </FundStatus>
                    <FundMeter>{pr.remaining_usd !== null && <Meter value={pr.remaining_usd} max={max} threshold={threshold} label={`${pr.label} remaining`} invert />}</FundMeter>
                  </FundRow>
                );
              })}
              {shownProviders.length === 0 && <Muted>No provider configured.</Muted>}
              {!activeProvider && providers.length > 0 && <Muted>No active provider reported by the twin.</Muted>}
            </Rows>
          )}
        </Card>

        <Card>
          <CardHead>
            <SectionTitle>Inbox</SectionTitle>
            <Muted>{newMessages > 0 ? `${newMessages} new` : 'nothing new'}</Muted>
          </CardHead>
          <Rows>
            <InboxRow to="/inbox">
              <span>Contact messages</span>
              <InboxValue $warn={newMessages > 0}>
                {newMessages > 0 && <StatusGlyph glyph="tri" title="new" />}
                {contact.data ? `${newMessages} new` : '—'}
                {oldestNew && <Muted> · oldest {ageOf(oldestNew)}</Muted>}
              </InboxValue>
              <Arrow aria-hidden="true">→</Arrow>
            </InboxRow>
            <InboxRow to="/inbox?tab=newsletter">
              <span>Portfolio subscribers</span>
              <InboxValue>{newsletter.data ? `${newsletter.data.active} active` : '—'}</InboxValue>
              <Arrow aria-hidden="true">→</Arrow>
            </InboxRow>
            <InboxRow to="/revault?tab=newsletter">
              <span>Revault subscribers</span>
              <InboxValue>{revaultDown ? 'n/a' : revaultNewsletter.data ? `${revaultNewsletter.data.active} active` : '—'}</InboxValue>
              <Arrow aria-hidden="true">→</Arrow>
            </InboxRow>
            <InboxRow to="/inbox?tab=twin">
              <span>Twin contact messages</span>
              <InboxValue>{twinDown ? 'n/a' : twinMessages.data ? `${twinMessages.data.items.length} in ${days} d` : '—'}</InboxValue>
              <Arrow aria-hidden="true">→</Arrow>
            </InboxRow>
          </Rows>
        </Card>
      </TwoCol>
    </Page>
  );
}

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  code {
    font-family: var(--font-mono);
    font-size: var(--fs-12);
  }
`;

const SitesRow = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
`;

const TwoCol = styled.div`
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
`;

const rowLink = `
  display: grid;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  padding: 4px 8px;
  margin: 0 -8px;
  border-radius: var(--radius-2);
  color: var(--app-text-primary);
  font-size: var(--fs-13);
  font-weight: 400;
  text-decoration: none;
  border-bottom: 1px solid var(--app-divider);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    text-decoration: none;
    background: var(--app-gray-50);
  }
`;

const FundRow = styled(Link)`
  ${rowLink}
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(80px, 1fr);

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr) auto;
    min-height: 40px;
  }
`;

const FundName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const FundStatus = styled.span<{ $tone: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--status-${({ $tone }) => $tone}-text);
  font-variant-numeric: tabular-nums;

  b {
    color: var(--app-text-primary);
    font-weight: 600;
  }
`;

const FundMeter = styled.span`
  min-width: 0;

  @media (max-width: 600px) {
    display: none;
  }
`;

const InboxRow = styled(Link)`
  ${rowLink}
  grid-template-columns: minmax(0, 1fr) auto 16px;
`;

const InboxValue = styled.span<{ $warn?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
  color: ${({ $warn }) => ($warn ? 'var(--status-warn-text)' : 'var(--app-text-primary)')};
  font-weight: ${({ $warn }) => ($warn ? 600 : 500)};
`;

const Arrow = styled.span`
  color: var(--app-text-muted);
  text-align: right;
`;
