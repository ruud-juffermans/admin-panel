import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { fmtDelta, fmtNumber } from '../format';
import { Sparkline } from './Sparkline';
import { Badge, type Tone } from './ui';
import { StatusGlyph, type Glyph } from './icons';

// One compact card per website on the Overview: name + status chip, views
// with delta, a sparkline, and one site-specific meta line.
export function SiteHealthCard({
  name,
  to,
  views,
  previous,
  period,
  trend,
  status,
  meta,
  unavailable,
}: {
  name: string;
  to: string;
  views: number | undefined;
  previous: number | undefined;
  period: string;
  trend: number[] | undefined;
  status: { tone: Tone; glyph: Glyph; label: string };
  meta: string;
  unavailable?: boolean;
}) {
  const delta = views !== undefined && previous !== undefined ? fmtDelta(views, previous) : null;
  const dir = views !== undefined && previous !== undefined ? Math.sign(views - previous) : 0;
  return (
    <CardLink to={to}>
      <Name>{name}</Name>
      <Chip>
        <Badge $tone={status.tone}>
          <StatusGlyph glyph={status.glyph} />
          {status.label}
        </Badge>
      </Chip>
      <Figures>
        <Value>{unavailable ? 'n/a' : views === undefined ? '—' : fmtNumber(views)}</Value>
        <Delta $dir={dir}>
          {delta !== null && !unavailable ? (
            <>
              <span aria-hidden="true">{dir > 0 ? '↑' : dir < 0 ? '↓' : '→'}</span> {delta} <Dim>vs {period}</Dim>
            </>
          ) : (
            <Dim>{unavailable ? 'server did not answer' : 'views'}</Dim>
          )}
        </Delta>
      </Figures>
      <Trend>{trend && trend.length > 1 && <Sparkline values={trend} width={120} height={32} />}</Trend>
      <Meta>{meta}</Meta>
    </CardLink>
  );
}

// Desktop: name/chip on top, big value with the sparkline beside it, delta
// and meta below. Phone (≤860px): a ≤72px row — name + chip, then value and
// delta inline with the sparkline on the right, meta on one short line.
const CardLink = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'name chip'
    'figures trend'
    'meta meta';
  align-items: end;
  column-gap: 12px;
  row-gap: 4px;
  min-height: 112px;
  padding: 12px 14px;
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-3);
  color: inherit;
  font-weight: inherit;
  text-decoration: none;
  min-width: 0;

  &:hover {
    text-decoration: none;
    border-color: var(--accent);
  }

  @media (max-width: 860px) {
    min-height: 64px;
    padding: 8px 12px;
    row-gap: 2px;
  }
`;

const Chip = styled.span`
  grid-area: chip;
  justify-self: end;
  align-self: center;
`;

const Name = styled.span`
  grid-area: name;
  align-self: center;
  font-family: var(--font-mono);
  font-size: var(--fs-12);
  font-weight: 500;
  color: var(--app-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Figures = styled.div`
  grid-area: figures;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  @media (max-width: 860px) {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
  }
`;

const Trend = styled.span`
  grid-area: trend;
  display: inline-flex;
  justify-self: end;
`;

const Value = styled.span`
  font-size: var(--fs-24);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--app-text-primary);

  @media (max-width: 860px) {
    font-size: var(--fs-20);
  }
`;

const Delta = styled.div<{ $dir: number }>`
  font-size: var(--fs-12);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $dir }) => ($dir > 0 ? 'var(--status-ok-text)' : $dir < 0 ? 'var(--status-bad-text)' : 'var(--app-text-muted)')};
`;

const Dim = styled.span`
  font-weight: 400;
  color: var(--app-text-muted);
`;

const Meta = styled.div`
  grid-area: meta;
  font-size: var(--fs-12);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-text-secondary);
  font-variant-numeric: tabular-nums;
`;
