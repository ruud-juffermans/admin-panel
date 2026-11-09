import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styled from 'styled-components';
import { useSettings, useTwinPerformance } from '../../api/queries';
import type { TwinPerformanceWindow } from '../../api/types';
import { StatTile } from '../../components/StatTile';
import { TwinData } from '../../components/TwinState';
import { Badge, Card, CardHead, Grid, Muted, SectionTitle, Table, TableWrap, Tiles } from '../../components/ui';
import { fmtDay, fmtNumber } from '../../format';
import { rangeLabel, useRange } from '../../range';
import { fmtMs, fmtPct, fmtUsd, MixBars, Mono, Stack } from './shared';

// How the twin performs as a system: the latency the visitor feels (time to
// first token, total), throughput, how often the provider made it retry,
// where a turn's time goes, and the same numbers per model, tool and prompt
// version so a regression can be pinned on a release.
export function PerformanceTab() {
  const { days } = useRange();
  const perf = useTwinPerformance(days);
  const settings = useSettings();
  const w = perf.data?.window;
  const p = perf.data?.previous;
  const alerts = settings.data?.twin_alerts;

  const chartData = useMemo(() => (perf.data?.series ?? []).map((d) => ({ ...d, label: fmtDay(d.day) })), [perf.data]);

  const ttftTone = w && alerts && w.ttft_p95_ms !== null && w.ttft_p95_ms > alerts.ttft_p95_ms ? 'warn' : undefined;
  const errorTone = w && alerts && w.turns >= 5 && w.error_rate >= alerts.error_rate ? 'bad' : undefined;
  const truncationTone = w && alerts && w.turns >= 5 && w.truncation_rate >= alerts.truncation_rate ? 'warn' : undefined;

  return (
    <Stack $gap={16}>
      <Tiles>
        <StatTile label="Time to first token p50 / p95" value={w ? `${fmtMs(w.ttft_p50_ms)} / ${fmtMs(w.ttft_p95_ms)}` : '—'} hint={previousHint(p, (x) => `${fmtMs(x.ttft_p50_ms)} / ${fmtMs(x.ttft_p95_ms)}`)} tone={ttftTone} />
        <StatTile label="Total latency p50 / p95" value={w ? `${fmtMs(w.latency_p50_ms)} / ${fmtMs(w.latency_p95_ms)}` : '—'} hint={previousHint(p, (x) => `${fmtMs(x.latency_p50_ms)} / ${fmtMs(x.latency_p95_ms)}`)} />
        <StatTile label="Output speed" value={w && w.tokens_per_second_p50 !== null ? `${w.tokens_per_second_p50.toFixed(1)} tok/s` : '—'} hint={w && w.ms_per_output_token_p50 !== null ? `${w.ms_per_output_token_p50.toFixed(0)} ms per output token, median` : 'median over model calls'} />
        <StatTile label="Retries" value={w ? w.retries : '—'} hint={w ? `${w.retries_per_100_turns} per 100 turns${p ? ` · previous ${p.retries}` : ''}` : 'provider errors absorbed by backoff'} tone={w && w.retries > 0 ? 'warn' : undefined} />
        <StatTile label="Error rate" value={w ? fmtPct(w.error_rate) : '—'} hint={w ? `${fmtPct(w.problem_rate)} of turns had any problem${p ? ` · previous ${fmtPct(p.error_rate)}` : ''}` : 'turns that ended in an error'} tone={errorTone} />
        <StatTile label="Truncated answers" value={w ? fmtPct(w.truncation_rate) : '—'} hint={w ? `stopped at max_tokens${p ? ` · previous ${fmtPct(p.truncation_rate)}` : ''}` : undefined} tone={truncationTone} />
        <StatTile label="Model calls per turn" value={w ? w.model_calls_per_turn : '—'} hint={w ? `${fmtNumber(w.model_calls)} calls over ${fmtNumber(w.answered)} answered turns` : undefined} />
        <StatTile label="Length, median chars" value={w ? `${fmtNumber(w.lengths.question_p50 ?? 0)} / ${fmtNumber(w.lengths.context_p50 ?? 0)} / ${fmtNumber(w.lengths.answer_p50 ?? 0)}` : '—'} hint="question / tool context / answer" />
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Latency per day</SectionTitle>
          <Muted>answered turns · p50 and p95 · UTC days</Muted>
        </CardHead>
        <TwinData query={perf} height={240}>
          {(d) => (
            <ChartWrap role="img" aria-label={`Latency per day, last ${days} days. Time to first token p50 ${fmtMs(d.window.ttft_p50_ms)}, total latency p50 ${fmtMs(d.window.latency_p50_ms)}, p95 ${fmtMs(d.window.latency_p95_ms)}.`}>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -4 }}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="label" interval={Math.max(0, Math.ceil(chartData.length / 8) - 1)} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} width={56} tickFormatter={(v: number) => fmtMs(v)} />
                  <Tooltip
                    cursor={{ stroke: 'var(--viz-axis)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]!.payload as (typeof chartData)[number];
                      return (
                        <Tip>
                          <b>{fmtDay(row.day)}</b>
                          <div>
                            total p50 {fmtMs(row.latency_p50_ms)} · p95 {fmtMs(row.latency_p95_ms)}
                          </div>
                          <div>
                            first token p50 {fmtMs(row.ttft_p50_ms)} · {row.turns} turn{row.turns === 1 ? '' : 's'}
                            {row.errors ? ` · ${row.errors} error${row.errors === 1 ? '' : 's'}` : ''}
                          </div>
                        </Tip>
                      );
                    }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} formatter={(value: string) => <span style={{ color: 'var(--app-text-secondary)' }}>{value}</span>} />
                  <Line type="monotone" dataKey="latency_p95_ms" name="Total p95" stroke="var(--chart-1)" strokeWidth={1.5} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
                  <Line type="monotone" dataKey="latency_p50_ms" name="Total p50" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                  <Line type="monotone" dataKey="ttft_p50_ms" name="First token p50" stroke="var(--chart-2)" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartWrap>
          )}
        </TwinData>
      </Card>

      <Grid $min={340}>
        <Card>
          <CardHead>
            <SectionTitle>Where the time goes</SectionTitle>
            <Muted>summed over {rangeLabel(days)}</Muted>
          </CardHead>
          <TwinData query={perf} height={60}>
            {(d) => (
              <MixBars
                rows={[
                  { label: 'model calls', count: Math.round(d.time_split_ms.model), color: 'var(--viz-1)' },
                  { label: 'tools', count: Math.round(d.time_split_ms.tools), color: 'var(--viz-2)' },
                  { label: 'guards and checks', count: Math.round(d.time_split_ms.guard + d.time_split_ms.verify), color: 'var(--viz-axis)' },
                ]}
              />
            )}
          </TwinData>
          <Muted>Milliseconds. Model time includes the retries' backoff; the deterministic nodes should stay a sliver.</Muted>
        </Card>
        <Card>
          <CardHead>
            <SectionTitle>Problems</SectionTitle>
            <Muted>by type · finish reasons of answered turns</Muted>
          </CardHead>
          <TwinData query={perf} height={60}>
            {(d) => (
              <KV>
                <dt>Error types</dt>
                <dd>{Object.keys(d.error_types).length ? Object.entries(d.error_types).map(([type, n]) => <Badge key={type} $tone={type === 'truncated' || type.startsWith('tool') ? 'amber' : 'red'}>{type.replace('_', ' ')} · {n}</Badge>) : <Muted>none</Muted>}</dd>
                <dt>Finish reasons</dt>
                <dd>{Object.keys(d.finish_reasons).length ? Object.entries(d.finish_reasons).map(([reason, n]) => <Badge key={reason} $tone={reason === 'length' ? 'amber' : 'muted'}>{reason} · {n}</Badge>) : <Muted>no answered turns</Muted>}</dd>
              </KV>
            )}
          </TwinData>
        </Card>
      </Grid>

      <Card>
        <CardHead>
          <SectionTitle>Per model</SectionTitle>
          <Muted>one row per model the provider reported</Muted>
        </CardHead>
        <TwinData query={perf}>
          {(d) =>
            d.models.length === 0 ? (
              <Muted>No model calls in this range (turns recorded before the performance telemetry have none).</Muted>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Model</th>
                      <th scope="col" className="num">Calls</th>
                      <th scope="col" className="num">First token p50 / p95</th>
                      <th scope="col" className="num">Latency p50 / p95</th>
                      <th scope="col" className="num">tok/s</th>
                      <th scope="col" className="num">Tokens in / cached / out</th>
                      <th scope="col" className="num">Retries</th>
                      <th scope="col" className="num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.models.map((m) => (
                      <tr key={m.model}>
                        <td>
                          <Mono>{m.model}</Mono>
                          {(m.finish_reasons['length'] ?? 0) > 0 && <Badge $tone="amber"> {m.finish_reasons['length']} truncated</Badge>}
                        </td>
                        <td className="num">{fmtNumber(m.calls)}</td>
                        <td className="num">
                          {fmtMs(m.ttft_p50_ms)} / {fmtMs(m.ttft_p95_ms)}
                        </td>
                        <td className="num">
                          {fmtMs(m.latency_p50_ms)} / {fmtMs(m.latency_p95_ms)}
                        </td>
                        <td className="num">{m.tokens_per_second_p50 === null ? '—' : m.tokens_per_second_p50.toFixed(1)}</td>
                        <td className="num">
                          {fmtNumber(m.input_tokens)} / {fmtNumber(m.cached_tokens)} / {fmtNumber(m.output_tokens)}
                        </td>
                        <td className="num">{m.retries}</td>
                        <td className="num">{fmtUsd(m.cost_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )
          }
        </TwinData>
      </Card>

      <Grid $min={340}>
        <Card>
          <CardHead>
            <SectionTitle>Per tool</SectionTitle>
            <Muted>execution time inside the graph</Muted>
          </CardHead>
          <TwinData query={perf}>
            {(d) =>
              d.tools.length === 0 ? (
                <Muted>No tool calls in this range.</Muted>
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th scope="col">Tool</th>
                        <th scope="col" className="num">Calls</th>
                        <th scope="col" className="num">p50 / p95</th>
                        <th scope="col" className="num">Failed</th>
                        <th scope="col" className="num">Timed out</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.tools.map((t) => (
                        <tr key={t.name}>
                          <td>
                            <Mono>{t.name}</Mono>
                          </td>
                          <td className="num">{fmtNumber(t.calls)}</td>
                          <td className="num">
                            {fmtMs(t.p50_ms)} / {fmtMs(t.p95_ms)}
                          </td>
                          <td className="num">{t.failures ? <Badge $tone="red">{t.failures}</Badge> : 0}</td>
                          <td className="num">{t.timeouts ? <Badge $tone="red">{t.timeouts}</Badge> : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )
            }
          </TwinData>
        </Card>
        <Card>
          <CardHead>
            <SectionTitle>Per prompt version</SectionTitle>
            <Muted>did a prompt edit change the numbers?</Muted>
          </CardHead>
          <TwinData query={perf}>
            {(d) =>
              d.prompt_versions.length === 0 ? (
                <Muted>No turns in this range.</Muted>
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th scope="col">Version</th>
                        <th scope="col" className="num">Turns</th>
                        <th scope="col" className="num">First token p50</th>
                        <th scope="col" className="num">Latency p50</th>
                        <th scope="col" className="num">Errors</th>
                        <th scope="col" className="num">Truncated</th>
                        <th scope="col">Last seen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.prompt_versions.map((v) => (
                        <tr key={v.prompt_version}>
                          <td>
                            <Mono>{v.prompt_version}</Mono>
                          </td>
                          <td className="num">{fmtNumber(v.turns)}</td>
                          <td className="num">{fmtMs(v.ttft_p50_ms)}</td>
                          <td className="num">{fmtMs(v.latency_p50_ms)}</td>
                          <td className="num">{fmtPct(v.error_rate)}</td>
                          <td className="num">{fmtPct(v.truncation_rate)}</td>
                          <td>
                            <Muted>{fmtDay(v.last_seen.slice(0, 10))}</Muted>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )
            }
          </TwinData>
        </Card>
      </Grid>
    </Stack>
  );
}

function previousHint(p: TwinPerformanceWindow | undefined, render: (w: TwinPerformanceWindow) => string): string | undefined {
  return p && p.turns > 0 ? `previous ${render(p)}` : undefined;
}

const ChartWrap = styled.div`
  font-family: 'Outfit Variable', 'Segoe UI', sans-serif;
`;

const Tip = styled.div`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-2);
  padding: 6px 10px;
  font-size: 0.82rem;
  color: var(--app-text-secondary);
  box-shadow: var(--shadow-2);

  b {
    color: var(--app-text-primary);
  }
`;

const KV = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 16px;
  font-size: 0.9rem;

  dt {
    color: var(--app-text-secondary);
  }
  dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
`;
