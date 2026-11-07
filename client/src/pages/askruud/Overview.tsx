import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styled from 'styled-components';
import { useTwinKnowledge, useTwinOverview, useTwinTimeseries } from '../../api/queries';
import { StatTile } from '../../components/StatTile';
import { TwinData } from '../../components/TwinState';
import { Badge, Card, CardHead, Grid, Muted, SectionTitle, Table, TableWrap, Tiles } from '../../components/ui';
import { fmtDateTime, fmtDay, fmtNumber } from '../../format';
import { rangeLabel, useRange } from '../../range';
import { fmtMs, fmtPct, fmtUsd, MixBars, Mono, Stack } from './shared';

// Headline twin numbers for the range, the outcome mix, turns and refusals
// per day, and the knowledge-base sync status.
export function TwinOverviewTab() {
  const { days } = useRange();
  const overview = useTwinOverview(days);
  const timeseries = useTwinTimeseries(days);
  const knowledge = useTwinKnowledge();
  const w = overview.data?.window;
  const p = overview.data?.previous;

  const chartData = useMemo(
    () => (timeseries.data?.series ?? []).map((d) => ({ ...d, label: fmtDay(d.day) })),
    [timeseries.data],
  );

  return (
    <Stack $gap={16}>
      <Tiles>
        <StatTile label="Conversations" value={w?.threads ?? '—'} previous={p?.threads} period={`previous ${days}d`} />
        <StatTile label="Turns" value={w?.turns ?? '—'} previous={p?.turns} period={`previous ${days}d`} />
        <StatTile label="Spend" value={w ? fmtUsd(w.cost_usd) : '—'} hint={p ? `previous ${fmtUsd(p.cost_usd)}` : undefined} />
        <StatTile label="Latency p50 / p95" value={w ? `${fmtMs(w.latency_p50_ms)} / ${fmtMs(w.latency_p95_ms)}` : '—'} hint="per turn" />
        <StatTile label="Tool use" value={w ? fmtPct(w.tool_use_rate) : '—'} hint="turns that called a tool" />
        <StatTile label="Thumbs down" value={w?.feedback.down ?? '—'} hint={w ? `${w.feedback.up} thumbs up · open the conversations` : rangeLabel(days)} tone={w && w.feedback.down > 0 ? 'warn' : undefined} to="/ask-ruud?tab=conversations&feedback=down" />
      </Tiles>

      <Grid $min={340}>
        <Card>
          <CardHead>
            <SectionTitle>Outcomes</SectionTitle>
            <Muted>{rangeLabel(days)}</Muted>
          </CardHead>
          <TwinData query={overview} height={60}>
            {(o) => (
              <MixBars
                rows={[
                  { label: 'answered', count: o.window.outcomes.answered, color: 'var(--viz-1)' },
                  { label: 'refused', count: o.window.outcomes.refused, color: 'var(--viz-2)' },
                  { label: 'ended pending approval', count: o.window.outcomes.pending_approval, color: 'var(--app-amber)' },
                  { label: 'error', count: o.window.outcomes.error, color: 'var(--app-red)' },
                ]}
              />
            )}
          </TwinData>
        </Card>
        <Card>
          <CardHead>
            <SectionTitle>Model</SectionTitle>
          </CardHead>
          <TwinData query={overview} height={60}>
            {(o) => (
              <KV>
                <dt>Provider</dt>
                <dd>
                  <Mono>{o.provider}</Mono>
                </dd>
                <dt>Model</dt>
                <dd>
                  <Mono>{o.model}</Mono>
                </dd>
                <dt>Daily cap</dt>
                <dd>{o.budget.daily_limit_usd > 0 ? fmtUsd(o.budget.daily_limit_usd, 2) : 'none'}</dd>
                <dt>Awaiting approval now</dt>
                <dd>{o.pending_approvals}</dd>
              </KV>
            )}
          </TwinData>
        </Card>
      </Grid>

      <Card>
        <CardHead>
          <SectionTitle>Turns per day</SectionTitle>
          <Muted>turns and refusals · UTC days</Muted>
        </CardHead>
        <TwinData query={timeseries} height={240}>
          {(ts) => (
            <ChartWrap role="img" aria-label={`Turns per day, last ${days} days: ${ts.series.reduce((n, d) => n + d.turns, 0)} turns, ${ts.series.reduce((n, d) => n + d.refusals, 0)} refusals.`}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="label" interval={Math.max(0, Math.ceil(chartData.length / 8) - 1)} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} width={44} />
                  <Tooltip
                    cursor={{ stroke: 'var(--viz-axis)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]!.payload as (typeof chartData)[number];
                      return (
                        <Tip>
                          <b>{fmtDay(d.day)}</b>
                          <div>turns {fmtNumber(d.turns)} · threads {fmtNumber(d.threads)}</div>
                          <div>refusals {fmtNumber(d.refusals)} · {fmtUsd(d.cost_usd)}</div>
                        </Tip>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                  <Line type="monotone" dataKey="turns" name="Turns" stroke="var(--viz-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="refusals" name="Refusals" stroke="var(--viz-2)" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrap>
          )}
        </TwinData>
      </Card>

      <Card>
        <CardHead>
          <SectionTitle>Knowledge base</SectionTitle>
          <TwinData query={knowledge} height={20}>
            {(k) => <Muted>{k.semantic_search ? `semantic search · ${k.chunks.embedding_model ?? k.embedding_provider}` : 'term-overlap search (no embeddings)'}</Muted>}
          </TwinData>
        </CardHead>
        <TwinData query={knowledge}>
          {(k) => (
            <>
              <KV>
                <dt>Documents</dt>
                <dd>{k.documents.length}</dd>
                <dt>Chunks embedded</dt>
                <dd>
                  {k.chunks.total}
                  {!k.semantic_search && <Muted> (no embedding provider configured, so term-overlap search)</Muted>}
                </dd>
                <dt>Last sync</dt>
                <dd>{k.chunks.last_sync ? fmtDateTime(k.chunks.last_sync) : '—'}</dd>
              </KV>
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">Slug</th>
                      <th scope="col" className="num">Chars</th>
                      <th scope="col" className="num">Chunks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k.documents.map((d) => (
                      <tr key={d.slug}>
                        <td>{d.title}</td>
                        <td>
                          <Mono>{d.slug}</Mono>
                        </td>
                        <td className="num">{fmtNumber(d.chars)}</td>
                        <td className="num">{k.chunks.by_doc.find((c) => c.doc_slug === d.slug)?.count ?? <Badge>none</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </>
          )}
        </TwinData>
      </Card>
    </Stack>
  );
}

const ChartWrap = styled.div`
  font-family: 'Outfit Variable', 'Segoe UI', sans-serif;
`;

const Tip = styled.div`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 0.82rem;
  color: var(--app-text-secondary);
  box-shadow: 0 8px 24px rgba(11, 17, 32, 0.12);

  b {
    color: var(--app-text-primary);
  }
`;

const KV = styled.dl`
  margin: 0 0 12px;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  font-size: 0.9rem;

  dt {
    color: var(--app-text-secondary);
  }
  dd {
    margin: 0;
  }
`;
