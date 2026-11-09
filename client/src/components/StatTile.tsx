import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { fmtDelta, fmtNumber } from '../format';
import { Sparkline } from './Sparkline';
import { Meter } from './Meter';
import { StatusGlyph } from './icons';

export type TileTone = 'warn' | 'bad';

// Stat tile: label · value · optional sparkline · delta vs a named period or a
// hint. Up is good for every number this dashboard shows, so ↑ = ok, ↓ = bad.
// A `tone` adds a glyph before the label and a left inset bar, never colour
// alone; the hint should then name the reason.
export function StatTile({
  label,
  value,
  previous,
  period,
  hint,
  trend,
  tone,
  to,
  meter,
}: {
  label: string;
  value: number | string;
  previous?: number;
  period?: string;
  hint?: string;
  trend?: number[];
  tone?: TileTone;
  // When set the whole tile is a link to the page that explains the number.
  to?: string;
  // A track under the value: spend vs cap, credit vs threshold.
  meter?: { value: number; max: number; threshold?: number; text?: string; invert?: boolean };
}) {
  const numeric = typeof value === 'number';
  const delta = numeric && previous !== undefined ? fmtDelta(value, previous) : null;
  const dir = numeric && previous !== undefined ? Math.sign(value - previous) : 0;
  const text = numeric ? fmtNumber(value) : value;
  const body = (
    <>
      <Label>
        {tone && (
          <GlyphWrap $tone={tone}>
            <StatusGlyph glyph={tone === 'bad' ? 'diamond' : 'tri'} title={tone === 'bad' ? 'critical' : 'warning'} />
          </GlyphWrap>
        )}
        {label}
      </Label>
      <Value $long={text.length > 10}>{text}</Value>
      {trend && trend.length > 1 && <Sparkline values={trend} />}
      {meter && <Meter value={meter.value} max={meter.max} threshold={meter.threshold} text={meter.text} invert={meter.invert} label={label} />}
      {delta !== null && (
        <Delta $dir={dir}>
          <span aria-hidden="true">{dir > 0 ? '↑' : dir < 0 ? '↓' : '→'}</span> {delta}{' '}
          <Dim>
            vs {period ?? 'previous'} ({fmtNumber(previous ?? 0)})
          </Dim>
        </Delta>
      )}
      {hint && (
        <Delta $dir={0}>
          <Dim>{hint}</Dim>
        </Delta>
      )}
    </>
  );
  return to ? (
    <TileLink to={to} $tone={tone}>
      {body}
    </TileLink>
  ) : (
    <Tile $tone={tone}>{body}</Tile>
  );
}

const tileStyle = css<{ $tone?: TileTone }>`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-3);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  min-height: 84px;
  box-shadow: ${({ $tone }) => ($tone === 'bad' ? 'inset 3px 0 0 var(--status-bad-mark)' : $tone === 'warn' ? 'inset 3px 0 0 var(--status-warn-mark)' : 'none')};
`;

const Tile = styled.div<{ $tone?: TileTone }>`
  ${tileStyle}
`;

const TileLink = styled(Link)<{ $tone?: TileTone }>`
  ${tileStyle}
  color: inherit;
  font-weight: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: none;
    border-color: var(--accent);
  }
`;

const Label = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--fs-12);
  font-weight: 500;
  line-height: var(--lh-snug);
  color: var(--app-text-secondary);
`;

const GlyphWrap = styled.span<{ $tone: TileTone }>`
  display: inline-flex;
  color: ${({ $tone }) => ($tone === 'bad' ? 'var(--status-bad-text)' : 'var(--status-warn-text)')};
`;

// Compound values ("12 ms / 127 ms") step down instead of wrapping mid-unit.
const Value = styled.div<{ $long?: boolean }>`
  font-size: ${({ $long }) => ($long ? '18px' : 'var(--fs-24)')};
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: var(--app-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Delta = styled.div<{ $dir: number }>`
  font-size: var(--fs-12);
  font-weight: 600;
  line-height: var(--lh-snug);
  font-variant-numeric: tabular-nums;
  color: ${({ $dir }) => ($dir > 0 ? 'var(--status-ok-text)' : $dir < 0 ? 'var(--status-bad-text)' : 'var(--app-text-muted)')};
`;

const Dim = styled.span`
  font-weight: 400;
  color: var(--app-text-muted);
`;
