import { useMemo } from 'react';
import styled from 'styled-components';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TimeseriesPoint } from '../api/types';
import { fmtDay, fmtNumber } from '../format';

// Page views per day, split by locale (nl / en). Two series: fixed colours,
// legend always shown, crosshair tooltip with the total. Other/unknown locales
// are folded into the tooltip total only.
const SERIES = [
  { key: 'nl', label: 'Dutch (nl)', color: 'var(--viz-1)' },
  { key: 'en', label: 'English (en)', color: 'var(--viz-2)' },
] as const;

export function TrafficChart({ series }: { series: TimeseriesPoint[] }) {
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
  // Thin the x-axis labels so they never collide: ~8 ticks regardless of range.
  const interval = Math.max(0, Math.ceil(data.length / 8) - 1);

  const totals = data.reduce((acc, d) => ({ nl: acc.nl + d.nl, en: acc.en + d.en }), { nl: 0, en: 0 });
  return (
    <Wrap role="img" aria-label={`Page views per day, last ${data.length} days: ${fmtNumber(totals.nl)} Dutch, ${fmtNumber(totals.en)} English. Values per day are in the top pages table below.`}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
          <XAxis
            dataKey="label"
            interval={interval}
            tickLine={false}
            axisLine={{ stroke: 'var(--viz-axis)' }}
            tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }}
            minTickGap={16}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--app-text-muted)', fontSize: 12 }}
            tickFormatter={(v: number) => fmtNumber(v)}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: 'var(--viz-axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]!.payload as (typeof data)[number];
              return (
                <Tip>
                  <TipTitle>{fmtDay(d.day)}</TipTitle>
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
                </Tip>
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(value: string) => <LegendText>{value}</LegendText>}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.key === 'en' ? '5 3' : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--app-surface-elevated)' }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Wrap>
  );
}

const Wrap = styled.div`
  width: 100%;
  min-width: 0;
  font-family: 'Outfit Variable', 'Segoe UI', sans-serif;
`;

const LegendText = styled.span`
  color: var(--app-text-secondary);
`;

const Tip = styled.div`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: 10px;
  padding: 8px 10px;
  box-shadow: 0 8px 24px rgba(11, 17, 32, 0.12);
  font-size: 0.82rem;
  min-width: 150px;
`;

const TipTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
`;

const TipRow = styled.div<{ $total?: boolean }>`
  display: grid;
  grid-template-columns: 10px 1fr auto;
  gap: 6px;
  align-items: center;
  color: var(--app-text-secondary);
  ${({ $total }) => ($total ? 'border-top: 1px solid var(--app-divider); margin-top: 4px; padding-top: 4px;' : '')}

  b {
    color: var(--app-text-primary);
    font-variant-numeric: tabular-nums;
  }
`;

const Swatch = styled.span`
  display: inline-block;
  width: 10px;
  height: 3px;
  border-radius: 2px;
`;
