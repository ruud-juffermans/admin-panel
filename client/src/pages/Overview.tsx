import { Link } from 'react-router-dom';
import styled from 'styled-components';
import {
  useContactList,
  useContactStats,
  useNewsletterStats,
  useFunds,
  useOverview,
  useTimeseries,
  useTwinApprovals,
  useTwinBudget,
  useTwinEvals,
  useTwinOverview,
  useTwinPerformance,
  useTwinTimeseries,
  useSettings,
} from '../api/queries';
import { StatTile } from '../components/StatTile';
import { isTwinUnavailable, twinErrorMessage } from '../components/TwinState';
import { Alert, Badge, Card, CardHead, Lead, Muted, Page, PageHeader, SectionTitle, Tiles, Title } from '../components/ui';
import { fmtDay } from '../format';
import { rangeLabel, useRange } from '../range';
import { fmtMs, fmtUsd } from './askruud/shared';

// Morning check: what needs a reply or a decision comes first, then the
// numbers (actionable tiles before traffic). A twin outage only greys out
// its tiles; the site half keeps working.
export function OverviewPage() {
  const { days } = useRange();
  const overview = useOverview(days);
  const series = useTimeseries(days);
  const contact = useContactStats();
  const newsletter = useNewsletterStats();
  const twin = useTwinOverview(days);
  const twinSeries = useTwinTimeseries(days);
  const budget = useTwinBudget(31);
  const approvals = useTwinApprovals();
  const evals = useTwinEvals();
  const fundsQuery = useFunds();
  const perf = useTwinPerformance(days);
  const settings = useSettings();

  const o = overview.data;
  const t = twin.data;
  const twinDown = twin.error && isTwinUnavailable(twin.error);
  const monthSpend = (() => {
    const month = new Date().toISOString().slice(0, 7);
    return (budget.data?.ledger ?? []).filter((r) => r.day.startsWith(month)).reduce((n, r) => n + r.spent_usd, 0);
  })();
  const spentToday = t?.budget.spent_today_usd ?? null;
  const cap = t?.budget.daily_limit_usd ?? 0;
  const budgetRatio = cap > 0 && spentToday !== null ? spentToday / cap : null;
  const pending = approvals.data?.pending.length ?? 0;
  const newMessages = contact.data?.counts.new ?? 0;
  const latestEval = evals.data?.runs[0];
  const lowFunds = (fundsQuery.data?.providers ?? []).filter((p) => p.low);
  const activeProvider = fundsQuery.data?.providers.find((p) => p.active);
  const newList = useContactList('new');
  const oldestNewAge = (count: number, _unused: undefined): string | null => {
    if (!count || !newList.data?.submissions.length) return null;
    const oldest = newList.data.submissions.reduce((a, b) => (a.createdAt < b.createdAt ? a : b));
    const days = Math.floor((Date.now() - new Date(oldest.createdAt).getTime()) / 86_400_000);
    return days === 0 ? 'oldest today' : `oldest ${days} d ago`;
  };

  // Yesterday / today from the per-day series, independent of the range.
  const viewSeries = series.data?.series ?? [];
  const viewsYesterday = viewSeries.length >= 2 ? viewSeries[viewSeries.length - 2]!.count : null;
  const twinToday = twinSeries.data?.series.at(-1)?.threads ?? null;
  const oldestNew = oldestNewAge(contact.data ? newMessages : 0, undefined);

  type Item = { key: string; object: string; tone: 'red' | 'amber'; text: string; to: string | null; when?: string };
  const attention: Item[] = [];
  if (pending > 0) attention.push({ key: 'approvals', object: 'approval', tone: 'red', text: `${pending} twin action${pending === 1 ? '' : 's'} waiting for your decision`, to: '/ask-ruud?tab=approvals' });
  if (newMessages > 0) attention.push({ key: 'contact', object: 'reply', tone: 'red', text: `${newMessages} unread contact message${newMessages === 1 ? '' : 's'}`, to: '/inbox', when: oldestNew ?? undefined });
  if (budgetRatio !== null && budgetRatio >= 0.8) attention.push({ key: 'budget', object: 'budget', tone: budgetRatio >= 1 ? 'red' : 'amber', text: `Twin budget at ${Math.round(budgetRatio * 100)}% of today's cap`, to: '/ask-ruud?tab=cost' });
  if (latestEval && !latestEval.met) attention.push({ key: 'eval', object: 'eval', tone: 'amber', text: 'Latest eval run failed its thresholds', to: '/ask-ruud?tab=evals', when: fmtDay(latestEval.created_at.slice(0, 10)) });
  for (const p of lowFunds) attention.push({ key: `funds-${p.id}`, object: 'funds', tone: p.active ? 'red' : 'amber', text: `${p.label} has ${fmtUsd(p.remaining_usd, 2)} left${p.remaining_source === 'estimate' ? ' (estimate)' : ''}${p.active ? ' and is the active provider' : ''}`, to: '/funds' });
  // Performance over the selected range; thresholds come from the server's .env.
  const pw = perf.data?.window;
  const alerts = settings.data?.twin_alerts;
  if (pw && alerts) {
    const perfTo = '/ask-ruud?tab=performance';
    if (pw.ttft_p95_ms !== null && pw.ttft_p95_ms > alerts.ttft_p95_ms) attention.push({ key: 'ttft', object: 'latency', tone: 'amber', text: `Twin time to first token p95 is ${fmtMs(pw.ttft_p95_ms)} over the last ${days}d (limit ${fmtMs(alerts.ttft_p95_ms)})`, to: perfTo });
    if (pw.turns >= 5 && pw.error_rate >= alerts.error_rate) attention.push({ key: 'errors', object: 'errors', tone: 'red', text: `${Math.round(pw.error_rate * 100)}% of twin turns ended in an error over the last ${days}d`, to: perfTo });
    if (pw.turns >= 5 && pw.truncation_rate >= alerts.truncation_rate) attention.push({ key: 'truncated', object: 'truncated', tone: 'amber', text: `${Math.round(pw.truncation_rate * 100)}% of twin answers were cut off at max_tokens`, to: perfTo });
    const rateLimited = perf.data?.error_types.rate_limited ?? 0;
    if (rateLimited > 0) attention.push({ key: 'rate-limited', object: 'provider', tone: 'amber', text: `The LLM provider rate-limited the twin ${rateLimited} time${rateLimited === 1 ? '' : 's'} over the last ${days}d`, to: perfTo });
  }
  if (twinDown) attention.push({ key: 'twin', object: 'twin', tone: 'amber', text: 'Ask Ruud is unavailable', to: '/ask-ruud' });

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Overview</Title>
          <Lead>ruudjuffermans.nl and Ask Ruud, {rangeLabel(days)}.</Lead>
        </div>
      </PageHeader>

      {overview.error && <Alert>Site analytics unavailable: {overview.error.message}</Alert>}

      {attention.length > 0 && (
        <Card>
          <CardHead>
            <SectionTitle>Needs attention</SectionTitle>
            <Muted>
              {attention.length} item{attention.length === 1 ? '' : 's'}
            </Muted>
          </CardHead>
          {twin.error && !twinDown && <Alert>{twinErrorMessage(twin.error)}</Alert>}
          <AttentionList>
            {attention.map((a) => (
              <li key={a.key}>
                <Badge $tone={a.tone}>{a.object}</Badge>
                {a.to ? <Link to={a.to}>{a.text}</Link> : <span>{a.text}</span>}
                {a.when && <Muted>· {a.when}</Muted>}
              </li>
            ))}
          </AttentionList>
        </Card>
      )}

      <Tiles>
        <StatTile label="New messages" value={contact.data?.counts.new ?? '—'} hint={oldestNew ?? 'contact form'} tone={newMessages > 0 ? 'warn' : undefined} to="/inbox" />
        <StatTile label="Pending approvals" value={twinDown ? 'n/a' : (approvals.data ? pending : '—')} hint={twinDown ? 'Ask Ruud unavailable' : 'twin actions'} tone={pending > 0 ? 'warn' : undefined} to="/ask-ruud?tab=approvals" />
        <StatTile label="Twin spend today" value={twinDown ? 'n/a' : spentToday === null ? '—' : fmtUsd(spentToday)} hint={twinDown ? 'Ask Ruud unavailable' : `${fmtUsd(monthSpend)} this month${cap > 0 ? ` · cap ${fmtUsd(cap, 2)}/day` : ''}`} tone={budgetRatio !== null && budgetRatio >= 1 ? 'bad' : budgetRatio !== null && budgetRatio >= 0.8 ? 'warn' : undefined} to="/ask-ruud?tab=cost" />
        <StatTile label="Page views" value={o?.totalViews ?? '—'} previous={o?.previous.totalViews} period={`previous ${days}d`} trend={viewSeries.map((p) => p.count)} to="/site" />
        <StatTile label="Views yesterday" value={viewsYesterday ?? '—'} hint={viewSeries.length ? `${viewSeries.at(-1)!.count} so far today` : undefined} to="/site" />
        <StatTile label="Twin conversations" value={twinDown ? 'n/a' : (t?.window.threads ?? '—')} previous={t?.previous.threads} period={`previous ${days}d`} trend={twinSeries.data?.series.map((p) => p.threads)} hint={twinDown ? 'Ask Ruud unavailable' : twinToday !== null ? `${twinToday} today` : undefined} to="/ask-ruud?tab=conversations" />
        <StatTile label="Subscribers" value={newsletter.data?.active ?? '—'} hint="active" to="/inbox?tab=newsletter" />
        <StatTile
          label="Funds, active provider"
          value={!activeProvider ? '—' : activeProvider.remaining_usd === null ? 'unknown' : fmtUsd(activeProvider.remaining_usd, 2)}
          hint={!activeProvider ? (fundsQuery.data && !fundsQuery.data.twin_available ? 'Ask Ruud unavailable' : 'LLM accounts') : `${activeProvider.label}${activeProvider.remaining_source === 'estimate' ? ' · estimate' : activeProvider.remaining_source === 'api' ? ' · live balance' : ''}`}
          tone={lowFunds.some((p) => p.active) ? 'bad' : lowFunds.length > 0 ? 'warn' : undefined}
          to="/funds"
        />
      </Tiles>

      {attention.length === 0 && (
        <Card>
          <CardHead>
            <SectionTitle>Needs attention</SectionTitle>
            <Muted>all clear</Muted>
          </CardHead>
          {twin.error && !twinDown && <Alert>{twinErrorMessage(twin.error)}</Alert>}
          <Muted>Nothing waiting. Enjoy the quiet.</Muted>
        </Card>
      )}
    </Page>
  );
}

const AttentionList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;

  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--app-surface);
  }

  a {
    color: var(--app-text-primary);
    text-decoration: underline;
    text-decoration-color: var(--app-border);
    text-underline-offset: 3px;
  }
  a:hover {
    text-decoration-color: var(--app-red);
  }
`;
