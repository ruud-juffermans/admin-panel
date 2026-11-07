import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { fmtDelta, fmtNumber } from '../format';
import { Sparkline } from './Sparkline';

// Stat tile: label · value · optional delta vs a named period. Up is good for
// every number this dashboard shows, so green = up, red = down.
export function StatTile({
  label,
  value,
  previous,
  period,
  hint,
  trend,
  tone,
  to,
}: {
  label: string;
  value: number | string;
  previous?: number;
  period?: string;
  hint?: string;
  trend?: number[];
  tone?: 'warn' | 'bad';
  // When set the whole tile is a link to the page that explains the number.
  to?: string;
}) {
  const numeric = typeof value === 'number';
  const delta = numeric && previous !== undefined ? fmtDelta(value, previous) : null;
  const dir = numeric && previous !== undefined ? Math.sign(value - previous) : 0;
  const text = numeric ? fmtNumber(value) : value;
  const body = (
    <>
      <Label>{label}</Label>
      <Value $long={text.length > 10}>{text}</Value>
      {trend && trend.length > 1 && <Sparkline values={trend} />}
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

const tileStyle = `
  background: var(--app-surface-elevated);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;
const toneBorder = ({ $tone }: { $tone?: 'warn' | 'bad' }) =>
  `border: 1px solid ${$tone === 'bad' ? 'var(--app-red)' : $tone === 'warn' ? 'var(--app-amber)' : 'var(--app-border)'};`;

const Tile = styled.div<{ $tone?: 'warn' | 'bad' }>`
  ${tileStyle}
  ${toneBorder}
`;

const TileLink = styled(Link)<{ $tone?: 'warn' | 'bad' }>`
  ${tileStyle}
  ${toneBorder}
  color: inherit;
  font-weight: inherit;
  text-decoration: none;

  &:hover {
    text-decoration: none;
    border-color: var(--app-red);
  }
`;

const Label = styled.div`
  font-size: 0.8rem;
  color: var(--app-text-secondary);
`;

// Compound values ("12 ms / 127 ms") step down instead of wrapping mid-unit.
const Value = styled.div<{ $long?: boolean }>`
  font-size: ${({ $long }) => ($long ? '1.25rem' : '1.7rem')};
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: var(--app-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Delta = styled.div<{ $dir: number }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ $dir }) => ($dir > 0 ? 'var(--app-green)' : $dir < 0 ? 'var(--app-red)' : 'var(--app-text-muted)')};
`;

const Dim = styled.span`
  font-weight: 500;
  color: var(--app-text-muted);
`;
