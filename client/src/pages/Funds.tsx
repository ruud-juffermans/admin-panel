import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { useFunds, useFundsMutations } from '../api/queries';
import type { FundsProvider, LlmProviderId } from '../api/types';
import { StatTile } from '../components/StatTile';
import { StatusGlyph } from '../components/icons';
import { Alert, Badge, Button, Card, CardHead, Empty, Input, Lead, Muted, Page, PageHeader, SectionTitle, Skeleton, Table, TableWrap, Tiles, Title } from '../components/ui';
import { fmtDateTime } from '../format';
import { fmtUsd, Stack } from './askruud/shared';

// What is left on each LLM provider account the twin can use. DeepSeek and
// Moonshot expose a balance API; for OpenAI and Gemini the panel estimates
// remaining funds as the top-ups you record here minus the twin's metered
// spend since the first top-up (PRD F1–F3).
export function FundsPage() {
  const funds = useFunds();
  const data = funds.data;
  const providers = data?.providers ?? [];
  const low = providers.filter((p) => p.low);
  const shown = providers.filter((p) => p.configured || p.topups.length > 0 || p.active);
  const hidden = providers.filter((p) => !shown.includes(p));

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Funds</Title>
          <Lead>Remaining credit on the LLM accounts Ask Ruud uses{data ? `, alert below ${fmtUsd(data.alert_threshold_usd, 2)}` : ''}.</Lead>
        </div>
        {data?.fetched_at && <Muted>balances fetched {fmtDateTime(data.fetched_at)} · refreshed every 15 min</Muted>}
      </PageHeader>

      {funds.error && <Alert>Could not load funds: {funds.error.message}</Alert>}
      {data && !data.twin_available && (
        <Alert $variant="info">Ask Ruud is unavailable ({data.twin_error ?? 'no answer'}): live balances and spend are missing, the top-up ledger still works.</Alert>
      )}
      {low.length > 0 && (
        <Alert>
          Low funds: {low.map((p) => `${p.label} ${fmtUsd(p.remaining_usd, 2)}`).join(', ')}. Top up before the twin starts failing.
        </Alert>
      )}

      {funds.isPending ? (
        <Skeleton $h={120} />
      ) : (
        <Tiles>
          {shown.map((p) => (
            <StatTile
              key={p.id}
              label={`${p.label}${p.active ? ' · active' : ''}`}
              value={p.remaining_usd === null ? 'unknown' : fmtUsd(p.remaining_usd, 2)}
              hint={remainingHint(p)}
              tone={p.low ? (p.active ? 'bad' : 'warn') : undefined}
            />
          ))}
        </Tiles>
      )}

      <Card>
        <CardHead>
          <SectionTitle>Providers</SectionTitle>
          <Muted>spend is the twin's own metering (turn_log)</Muted>
        </CardHead>
        {funds.isPending ? (
          <Skeleton $h={160} />
        ) : shown.length === 0 ? (
          <Empty>No provider configured. Set an API key in the twin's .env or record a top-up below.</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th scope="col">Provider</th>
                  <th scope="col">Model</th>
                  <th scope="col" className="num">Remaining</th>
                  <th scope="col">Source</th>
                  <th scope="col" className="num">Today</th>
                  <th scope="col" className="num">30 days</th>
                  <th scope="col" className="num">All time</th>
                  <th scope="col" className="num">Top-ups</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.label}</strong> {p.active && <Badge $tone="green">active</Badge>}
                      {!p.configured && <Badge>no key</Badge>}
                    </td>
                    <td>
                      <Muted>{p.model || '—'}</Muted>
                    </td>
                    <td className="num">
                      <Remaining $tone={p.low ? (p.active ? 'bad' : 'warn') : null}>
                        {p.low && <StatusGlyph glyph={p.active ? 'diamond' : 'tri'} title="low" />}
                        <b>{p.remaining_usd === null ? '—' : fmtUsd(p.remaining_usd, 2)}</b>
                      </Remaining>
                    </td>
                    <td>{sourceBadge(p)}</td>
                    <td className="num">{fmtUsd(p.spend.today_usd)}</td>
                    <td className="num">{fmtUsd(p.spend.last_30d_usd)}</td>
                    <td className="num">
                      {fmtUsd(p.spend.total_usd)}
                      {p.spend.billed_mtd_usd !== null && p.spend.billed_mtd_usd !== undefined && <Muted> · billed {fmtUsd(p.spend.billed_mtd_usd, 2)} MTD</Muted>}
                    </td>
                    <td className="num">{p.topups.length ? fmtUsd(p.topup_total_usd, 2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        {hidden.length > 0 && <Muted>Not configured: {hidden.map((p) => p.label).join(', ')}.</Muted>}
      </Card>

      <TopupsCard providers={providers} />
    </Page>
  );
}

function remainingHint(p: FundsProvider): string {
  if (p.balance && p.remaining_source === 'api') return `live balance · ${fmtUsd(p.spend.last_30d_usd)} spent in 30d`;
  if (p.balance) return `wallet shows ${p.balance.available.toFixed(2)} ${p.balance.currency}`;
  if (p.remaining_source === 'estimate') return `estimate: ${fmtUsd(p.topup_total_usd, 2)} topped up − ${fmtUsd(p.spent_since_topups_usd)} spent`;
  if (p.balance_error) return p.balance_error;
  if (p.spend.billed_mtd_usd !== null && p.spend.billed_mtd_usd !== undefined) return `${fmtUsd(p.spend.billed_mtd_usd, 2)} billed this month · record a top-up to estimate`;
  if (!p.balance_supported) return 'no balance API · record a top-up to estimate';
  return 'no balance yet';
}

function sourceBadge(p: FundsProvider) {
  if (p.balance) return <Badge $tone="green">live</Badge>;
  if (p.remaining_source === 'estimate') return <Badge $tone="blue">estimate</Badge>;
  if (p.balance_error) return <Badge $tone="amber" title={p.balance_error}>balance failed</Badge>;
  return <Badge>—</Badge>;
}

const PROVIDERS: Array<{ id: LlmProviderId; label: string }> = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'deepseek', label: 'DeepSeek' },
  { id: 'kimi', label: 'Moonshot (Kimi)' },
];

// The manual ledger. Every row is "I put this much on this account on this
// day"; the estimate for providers without a balance API starts at the first row.
function TopupsCard({ providers }: { providers: FundsProvider[] }) {
  const { addTopup, removeTopup } = useFundsMutations();
  const [provider, setProvider] = useState<LlmProviderId>('openai');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const rows = providers
    .flatMap((p) => p.topups.map((t) => ({ ...t, provider: p.label })))
    .sort((a, b) => b.toppedUpAt.localeCompare(a.toppedUpAt));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const amountUsd = Number(amount);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setError('Enter the amount in USD.');
      return;
    }
    try {
      await addTopup.mutateAsync({ provider, amountUsd, toppedUpAt: new Date(`${date}T12:00:00Z`).toISOString(), note: note || undefined });
      setAmount('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the top-up.');
    }
  }

  return (
    <Card>
      <CardHead>
        <SectionTitle>Top-ups</SectionTitle>
        <Muted>what you paid onto each account</Muted>
      </CardHead>
      <Stack $gap={16}>
        <Form onSubmit={submit} aria-label="Record a top-up">
          <label>
            <span>Provider</span>
            <Select value={provider} onChange={(e) => setProvider(e.target.value as LlmProviderId)}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>Amount (USD)</span>
            <Input type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="20.00" />
          </label>
          <label>
            <span>Date</span>
            <Input type="date" required value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="grow">
            <span>Note</span>
            <Input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="optional" />
          </label>
          <Button type="submit" $variant="primary" disabled={addTopup.isPending}>
            {addTopup.isPending ? 'Saving…' : 'Add top-up'}
          </Button>
        </Form>
        {error && <Alert>{error}</Alert>}
        {rows.length === 0 ? (
          <Empty>No top-ups recorded yet.</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Provider</th>
                  <th scope="col" className="num">Amount</th>
                  <th scope="col">Note</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.toppedUpAt.slice(0, 10)}</td>
                    <td>{r.provider}</td>
                    <td className="num">{fmtUsd(r.amountUsd, 2)}</td>
                    <td>
                      <Muted>{r.note ?? ''}</Muted>
                    </td>
                    <td className="num">
                      <Button type="button" $variant="ghost" $size="sm" disabled={removeTopup.isPending} onClick={() => removeTopup.mutate(r.id)} aria-label={`Remove top-up of ${fmtUsd(r.amountUsd, 2)} on ${r.provider}`}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Stack>
    </Card>
  );
}

const Form = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--app-text-secondary);
    min-width: 140px;
  }

  label.grow {
    flex: 1 1 200px;
  }

  input {
    width: 100%;
  }
`;

const Select = styled.select`
  min-height: 36px;
  padding: 6px 10px;
  border-radius: var(--radius-2);
  border: 1.5px solid var(--app-input-border);
  background: var(--app-bg);
  color: var(--app-text-primary);
  font-size: 0.9rem;

  &:focus-visible {
    outline: 2px solid transparent;
    border-color: var(--accent);
    box-shadow: var(--focus-ring);
  }
`;

const Remaining = styled.span<{ $tone: 'bad' | 'warn' | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  color: ${({ $tone }) => ($tone ? `var(--status-${$tone}-text)` : 'inherit')};

  b {
    color: inherit;
  }
`;
