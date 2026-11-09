import styled from 'styled-components';
import { Badge, type Tone } from '../../components/ui';
import { StatusGlyph, type Glyph } from '../../components/icons';

// Small LLM amounts need more digits than a price tag: $0.0012, not $0.00.
export const fmtUsd = (n: number | null | undefined, digits?: number) => {
  if (n === null || n === undefined) return '—';
  const d = digits ?? (n === 0 ? 2 : Math.abs(n) < 0.1 ? 4 : Math.abs(n) < 10 ? 3 : 2);
  return `$${n.toFixed(d)}`;
};
export const fmtPct = (ratio: number | null | undefined) =>
  ratio === null || ratio === undefined ? '—' : `${Math.round(ratio * 100)}%`;
export const fmtMs = (ms: number | null | undefined) =>
  ms === null || ms === undefined ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;

// Outcomes and their fixed tone + glyph, so every chart, chip and legend in
// the twin pages agrees: answered ● ok, pending approval ○ info, refused ▲
// warn, error ◆ bad.
export const OUTCOME_STYLE: Record<string, { tone: Tone; glyph: Glyph; mark: string }> = {
  answered: { tone: 'ok', glyph: 'dot', mark: 'var(--status-ok-mark)' },
  pending_approval: { tone: 'info', glyph: 'ring', mark: 'var(--status-info-mark)' },
  refused: { tone: 'warn', glyph: 'tri', mark: 'var(--status-warn-mark)' },
  error: { tone: 'bad', glyph: 'diamond', mark: 'var(--status-bad-mark)' },
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const s = OUTCOME_STYLE[outcome] ?? { tone: 'neutral' as Tone, glyph: 'slash' as Glyph };
  return (
    <Badge $tone={s.tone}>
      <StatusGlyph glyph={s.glyph} />
      {outcome.replace('_', ' ')}
    </Badge>
  );
}

export function FlagBadge({ flag }: { flag: string }) {
  const [stage, kind] = flag.split(':');
  const input = stage === 'input';
  return (
    <Badge $tone={input ? 'warn' : 'bad'}>
      <StatusGlyph glyph={input ? 'tri' : 'diamond'} />
      {kind ? `${stage} · ${kind}` : flag}
    </Badge>
  );
}

export const Mono = styled.span`
  font-family: var(--font-mono);
  font-size: var(--fs-12);
`;

export const Quote = styled.blockquote`
  margin: 0;
  padding: 10px 14px;
  border-left: 2px solid var(--app-border);
  background: var(--app-surface);
  border-radius: 0 var(--radius-2) var(--radius-2) 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: var(--fs-13);
  line-height: 1.55;
`;

export const Stack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap = 12 }) => $gap}px;
`;

export const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-12);
  color: var(--app-text-secondary);
`;

export interface MixRow {
  label: string;
  count: number;
  color: string;
  glyph?: Glyph;
}

// Share bars for a small categorical breakdown (outcome mix, refusal reasons).
// Callers pass rows in a fixed order (good → neutral → bad) so the bar reads
// the same every day; each legend entry carries its glyph next to the swatch.
export function MixBars({ rows }: { rows: MixRow[] }) {
  const total = rows.reduce((n, r) => n + r.count, 0) || 1;
  return (
    <MixWrap>
      <MixTrack role="img" aria-label={rows.map((r) => `${r.label} ${r.count}`).join(', ')}>
        {rows
          .filter((r) => r.count > 0)
          .map((r) => (
            <MixSeg key={r.label} style={{ width: `${(r.count / total) * 100}%`, background: r.color }} />
          ))}
      </MixTrack>
      <MixLegend>
        {rows.map((r) => (
          <span key={r.label}>
            {r.glyph ? <StatusGlyph glyph={r.glyph} style={{ color: r.color }} /> : <MixDot style={{ background: r.color }} />} {r.label} <b className="tnum">{r.count}</b>
            <Pct className="tnum">{Math.round((r.count / total) * 100)}%</Pct>
          </span>
        ))}
      </MixLegend>
    </MixWrap>
  );
}

const Pct = styled.span`
  margin-left: 4px;
  color: var(--app-text-muted);
`;

const MixWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const MixTrack = styled.div`
  display: flex;
  gap: 2px;
  height: 8px;
  border-radius: 2px;
  overflow: hidden;
  background: var(--meter-track);
`;
const MixSeg = styled.div`
  height: 100%;
`;
const MixLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: var(--fs-12);
  color: var(--app-text-secondary);

  > span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  b {
    color: var(--app-text-primary);
  }
`;
const MixDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 1px;
  vertical-align: middle;
`;
