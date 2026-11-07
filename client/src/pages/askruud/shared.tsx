import styled from 'styled-components';
import { Badge } from '../../components/ui';

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

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const tone = outcome === 'answered' ? 'green' : outcome === 'refused' ? 'amber' : outcome === 'error' ? 'red' : 'blue';
  return <Badge $tone={tone}>{outcome.replace('_', ' ')}</Badge>;
}

export function FlagBadge({ flag }: { flag: string }) {
  const [stage, kind] = flag.split(':');
  return <Badge $tone={stage === 'input' ? 'amber' : 'red'}>{kind ? `${stage} · ${kind}` : flag}</Badge>;
}

export const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
`;

export const Quote = styled.blockquote`
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid var(--app-border);
  background: var(--app-surface);
  border-radius: 0 10px 10px 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
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
  font-size: 0.82rem;
  color: var(--app-text-secondary);
`;

// Share bars for a small categorical breakdown (outcome mix, refusal reasons).
export function MixBars({ rows }: { rows: Array<{ label: string; count: number; color: string }> }) {
  const total = rows.reduce((n, r) => n + r.count, 0) || 1;
  return (
    <MixWrap>
      <MixTrack>
        {rows
          .filter((r) => r.count > 0)
          .map((r) => (
            <MixSeg key={r.label} aria-hidden="true" style={{ width: `${(r.count / total) * 100}%`, background: r.color }} />
          ))}
      </MixTrack>
      <MixLegend>
        {rows.map((r) => (
          <span key={r.label}>
            <MixDot style={{ background: r.color }} /> {r.label} <b>{r.count}</b>
          </span>
        ))}
      </MixLegend>
    </MixWrap>
  );
}

const MixWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const MixTrack = styled.div`
  display: flex;
  gap: 2px;
  height: 10px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--app-gray-100);
`;
const MixSeg = styled.div`
  height: 100%;
`;
const MixLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.82rem;
  color: var(--app-text-secondary);

  b {
    color: var(--app-text-primary);
  }
`;
const MixDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  vertical-align: middle;
  margin-right: 2px;
`;
