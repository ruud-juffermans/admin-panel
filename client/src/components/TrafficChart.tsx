import { useMemo } from 'react';
import styled from 'styled-components';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeseriesPoint } from '../api/types';
import { fmtDay, fmtNumber } from '../format';

// Page views per day. Two solid series (nl / en, blue / orange: distinct under
// deuteranopia) with a legend, or a single series without one when the site
// has no English traffic. Y axis from zero: views are magnitudes.
const SERIES = [
  { key: 'nl', label: 'Dutch (nl)', color: 'var(--chart-1)' },
  { key: 'en', label: 'English (en)', color: 'var(--chart-2)' },
] as const;

export function TrafficChart({ series, mode, height = 240 }: { series: TimeseriesPoint[]; mode?: 'single' | 'locales'; height?: number }) {
  const data = useMemo(
    () =>
      series.map((p) => ({
        day: p.day,
        label: fmtDay(p.day),
        total: p.count,
        nl: p.locales.nl ?? 0,
        en: p.locales.en ?? 0,
      })),
    [series],
  );
  const totals = data.reduce((acc, d) => ({ nl: acc.nl + d.nl, en: acc.en + d.en, total: acc.total + d.total }), { nl: 0, en: 0, total: 0 });
  const single = mode === 'single' || (mode === undefined && totals.en === 0);
  // Thin the x-axis labels so they never collide: ~8 ticks regardless of range.
  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);
  const summary = single
    ? `Page views per day, last ${data.length} days: ${fmtNumber(totals.total)} in total.`
    : `Page views per day, last ${data.length} days: ${fmtNumber(totals.nl)} Dutch, ${fmtNumber(totals.en)} English.`;

  return (
    <Wrap role="img" aria-label={`${summary} Values per page are in the top pages table.`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" interval={interval} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} tick={{ fill: 'var(--chart-tick-text)', fontSize: 11 }} minTickGap={16} />
          <YAxis allowDecimals={false} domain={[0, 'auto']} tickCount={5} tickLine={false} axisLine={false} tick={{ fill: 'var(--chart-tick-text)', fontSize: 11 }} tickFormatter={(v: number) => fmtNumber(v)} width={40} />
          <Tooltip
            cursor={{ stroke: 'var(--chart-axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]!.payload as (typeof data)[number];
              return (
                <Tip>
                  <TipTitle>{fmtDay(d.day)}</TipTitle>
                  {single ? (
                    <TipRow>
                      <Swatch style={{ background: 'var(--chart-1)' }} />
                      <span>Views</span>
                      <b>{fmtNumber(d.total)}</b>
                    </TipRow>
                  ) : (
                    <>
                      {SERIES.map((s) => (
                        <TipRow key={s.key}>
                          <Swatch style={{ background: s.color }} />
                          <span>{s.label}</span>
                          <b>{fmtNumber(d[s.key])}</b>
                        </TipRow>
                      ))}
                      <TipRow $total>
                        <span />
                        <span>Total</span>
                        <b>{fmtNumber(d.total)}</b>
                      </TipRow>
                    </>
                  )}
                </Tip>
              );
            }}
          />
          {!single && <Legend verticalAlign="top" align="right" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} formatter={(value: string) => <LegendText>{value}</LegendText>} />}
          {single ? (
            <Line type="monotone" dataKey="total" name="Views" stroke="var(--chart-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--app-surface-elevated)' }} isAnimationActive={false} />
          ) : (
            SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--app-surface-elevated)' }} isAnimationActive={false} />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

const Wrap = styled.div`
  width: 100%;
  min-width: 0;
  font-family: var(--font-ui);
  font-variant-numeric: tabular-nums;
`;

const LegendText = styled.span`
  color: var(--app-text-secondary);
`;

export const Tip = styled.div`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-2);
  padding: 8px 10px;
  box-shadow: var(--shadow-2);
  font-size: var(--fs-12);
  min-width: 150px;
`;

export const TipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--app-text-primary);
`;

export const TipRow = styled.div<{ $total?: boolean }>`
  display: grid;
  grid-template-columns: 12px 1fr auto;
  gap: 6px;
  align-items: center;
  color: var(--app-text-secondary);
  ${({ $total }) => ($total ? 'border-top: 1px solid var(--app-divider); margin-top: 4px; padding-top: 4px;' : '')}

  b {
    color: var(--app-text-primary);
    font-variant-numeric: tabular-nums;
  }
`;

export const Swatch = styled.span`
  display: inline-block;
  width: 12px;
  height: 2px;
  border-radius: 1px;
`;
