import styled from 'styled-components';

// Spend against a cap, credit against an alert threshold: a 6px track whose
// fill turns warn at 80% and bad at 100%, with the numbers always beside it.
export function Meter({
  value,
  max,
  threshold,
  label,
  text,
  invert = false,
}: {
  value: number;
  max: number;
  // Optional tick on the track (e.g. the low-funds threshold).
  threshold?: number;
  label: string;
  // Text rendered next to the track; defaults to "value / max".
  text?: string;
  // Invert: low is bad (remaining credit) instead of high is bad (spend).
  invert?: boolean;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const danger = invert ? (threshold !== undefined ? value <= threshold : ratio <= 0.1) : ratio >= 1;
  const warn = !danger && (invert ? (threshold !== undefined ? value <= threshold * 2 : ratio <= 0.25) : ratio >= 0.8);
  const tone = danger ? 'bad' : warn ? 'warn' : 'ok';
  return (
    <Wrap>
      <Track role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <Fill style={{ width: `${ratio * 100}%`, background: `var(--status-${tone}-mark)` }} />
        {threshold !== undefined && max > 0 && <Tick style={{ left: `${Math.min(100, (threshold / max) * 100)}%` }} />}
      </Track>
      {text && <Text>{text}</Text>}
    </Wrap>
  );
}

const Wrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const Track = styled.div`
  position: relative;
  flex: 1 1 60px;
  height: 6px;
  border-radius: 3px;
  background: var(--meter-track);
  overflow: visible;
`;

const Fill = styled.div`
  height: 100%;
  border-radius: 3px;
  transition: width var(--dur-2) var(--ease);
`;

const Tick = styled.div`
  position: absolute;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--app-text-muted);
`;

const Text = styled.span`
  flex: 0 0 auto;
  font-size: var(--fs-12);
  color: var(--app-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`;
