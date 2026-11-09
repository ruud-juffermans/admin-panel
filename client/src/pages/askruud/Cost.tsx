import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styled from 'styled-components';
import { useTwinBudget, useTwinOverview } from '../../api/queries';
import { StatTile } from '../../components/StatTile';
import { TwinData } from '../../components/TwinState';
import { Card, CardHead, Muted, SectionTitle, Table, TableWrap, Tiles } from '../../components/ui';
import { fmtDay, fmtDateTime, fmtNumber } from '../../format';
import { useRange } from '../../range';
import { fmtPct, fmtUsd, Stack } from './shared';

// Spend per day against the daily cap, month-to-date, cost per turn, cache
// ratio and token volumes. Spend comes from the twin's budget_ledger, the
// same table that enforces the cap.
export function CostTab() {
  const { days } = useRange();
  const budget = useTwinBudget(days);
  const overview = useTwinOverview(days);

  const monthToDate = useMemo(() => {
    const ledger = budget.data?.ledger ?? [];
    const month = new Date().toISOString().slice(0, 7);
    return ledger.filter((r) => r.day.startsWith(month)).reduce((n, r) => n + r.spent_usd, 0);
  }, [budget.data]);

  const chartData = useMemo(() => {
    const byDay = new Map((budget.data?.ledger ?? []).map((r) => [r.day, r.spent_usd]));
    const out: Array<{ day: string; label: string; spent: number }> = [];
    const end = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ day: key, label: fmtDay(key), spent: byDay.get(key) ?? 0 });
    }
    return out;
  }, [budget.data, days]);

  const limit = budget.data?.daily_limit_usd ?? 0;
  const spentToday = budget.data?.spent_today_usd ?? null;
  const usedRatio = limit > 0 && spentToday !== null ? spentToday / limit : null;
  const w = overview.data?.window;
  const prev = overview.data?.previous;

  return (
    <Stack $gap={16}>
      <Tiles>
        <StatTile
          label="Spent today"
          value={spentToday === null ? '—' : fmtUsd(spentToday)}
          hint={limit > 0 ? `${fmtPct(usedRatio)} of ${fmtUsd(limit, 2)} cap` : 'no daily cap'}
          tone={usedRatio !== null && usedRatio >= 1 ? 'bad' : usedRatio !== null && usedRatio >= 0.8 ? 'warn' : undefined}
        />
        <StatTile label="Month to date" value={fmtUsd(monthToDate)} hint="from the budget ledger" />
        <StatTile label={`Spend, last ${days}d`} value={w ? fmtUsd(w.cost_usd) : '—'} hint={prev ? `previous ${fmtUsd(prev.cost_usd)}` : undefined} />
        <StatTile label="Cost per turn" value={w ? fmtUsd(w.cost_per_turn_usd) : '—'} hint={prev ? `previous ${fmtUsd(prev.cost_per_turn_usd)}` : undefined} />
        <StatTile label="Cache-read ratio" value={w ? fmtPct(w.cache_read_ratio) : '—'} hint={w ? `${fmtNumber(w.cached_tokens)} cached input tokens` : 'of input tokens'} />
        <StatTile label="Tokens in / out" value={w ? `${fmtNumber(w.input_tokens)} / ${fmtNumber(w.output_tokens)}` : '—'} hint={`last ${days}d`} />
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Spend per day</SectionTitle>
          <Muted>{limit > 0 ? `daily cap ${fmtUsd(limit, 2)}` : 'no cap configured'}</Muted>
        </CardHead>
        <TwinData query={budget} height={240}>
          {() => (
            <ChartWrap role="img" aria-label={`Spend per day, last ${days} days, totalling ${fmtUsd(chartData.reduce((n, d) => n + d.spent, 0))}; the ledger table below lists each day.`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} barCategoryGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                  <XAxis dataKey="label" interval={Math.max(0, Math.ceil(chartData.length / 8) - 1)} tickLine={false} axisLine={{ stroke: 'var(--viz-axis)' }} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} width={48} domain={[0, (max: number) => Math.max(max, limit || 0) * 1.1]} />
                  <Tooltip
                    cursor={{ fill: 'var(--app-gray-100)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]!.payload as (typeof chartData)[number];
                      return (
                        <Tip>
                          <b>{fmtDay(d.day)}</b> {fmtUsd(d.spent)}
                        </Tip>
                      );
                    }}
                  />
                  {limit > 0 && <ReferenceLine y={limit} stroke="var(--status-bad-mark)" strokeDasharray="6 4" label={{ value: 'daily cap', fill: 'var(--app-text-muted)', fontSize: 11, position: 'insideTopRight' }} />}
                  <Bar dataKey="spent" fill="var(--chart-1)" radius={[2, 2, 0, 0]} maxBarSize={20} isAnimationActive={false}>
                    {chartData.map((d) => (
                      <Cell key={d.day} fill={limit > 0 && d.spent >= limit ? 'var(--status-bad-mark)' : 'var(--chart-1)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartWrap>
          )}
        </TwinData>
      </Card>

      <Card>
        <CardHead>
          <SectionTitle>Budget ledger</SectionTitle>
          <Muted>days with spend, last {days}d</Muted>
        </CardHead>
        <TwinData query={budget}>
          {(data) =>
            data.ledger.length === 0 ? (
              <Muted>No spend recorded in this range.</Muted>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Day</th>
                      <th scope="col" className="num">Spent</th>
                      <th scope="col" className="num">Of cap</th>
                      <th scope="col">Last update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.ledger].reverse().map((r) => (
                      <tr key={r.day}>
                        <td>{r.day}</td>
                        <td className="num">{fmtUsd(r.spent_usd)}</td>
                        <td className="num">{limit > 0 ? fmtPct(r.spent_usd / limit) : '—'}</td>
                        <td>
                          <Muted>{fmtDateTime(r.updated_at)}</Muted>
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
    </Stack>
  );
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
  box-shadow: var(--shadow-2);
`;
