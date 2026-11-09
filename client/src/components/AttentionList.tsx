import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { Badge } from './ui';
import { StatusGlyph } from './icons';

export type Severity = 'bad' | 'warn' | 'info';

export interface AttentionItem {
  key: string;
  severity: Severity;
  // The domain object, shown as a neutral chip: approval, intake, reply, funds…
  object: string;
  text: string;
  // Where to resolve it, and the verb on the link ("Decide", "Assess", "Reply").
  to: string | null;
  action?: string;
  // Age of the oldest underlying item ("12 min", "2 d"); undefined when n/a.
  age?: string;
}

const ORDER: Record<Severity, number> = { bad: 0, warn: 1, info: 2 };
const GLYPH = { bad: 'diamond', warn: 'tri', info: 'ring' } as const;
const WORD = { bad: 'critical', warn: 'warning', info: 'notice' } as const;

// The Overview's feed: one row per thing that needs Ruud, severity first then
// oldest first. The whole row is the link; the verb at the end names the job.
export function AttentionList({ items }: { items: AttentionItem[] }) {
  const sorted = [...items].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  if (sorted.length === 0) {
    return (
      <List>
        <Row as="li">
          <Sev $severity="ok">
            <StatusGlyph glyph="dot" title="all clear" />
          </Sev>
          <Badge $tone="neutral">clear</Badge>
          <Text>All clear, nothing waiting.</Text>
        </Row>
      </List>
    );
  }
  return (
    <List>
      {sorted.map((a) => {
        const body = (
          <>
            <Sev $severity={a.severity}>
              <StatusGlyph glyph={GLYPH[a.severity]} title={WORD[a.severity]} />
            </Sev>
            <Badge $tone="neutral">{a.object}</Badge>
            <Text>{a.text}</Text>
            <Age>{a.age ?? ''}</Age>
            {a.to && (
              <Action>
                {a.action ?? 'Open'} <span aria-hidden="true">→</span>
              </Action>
            )}
          </>
        );
        return (
          <li key={a.key}>
            {a.to ? (
              <RowLink to={a.to}>{body}</RowLink>
            ) : (
              <Row>{body}</Row>
            )}
          </li>
        );
      })}
    </List>
  );
}

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const rowStyle = `
  display: grid;
  grid-template-columns: 16px minmax(92px, auto) minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: var(--radius-2);
  background: var(--app-surface);
  color: var(--app-text-primary);
  font-size: var(--fs-13);
  text-decoration: none;
  font-weight: 400;

  @media (max-width: 600px) {
    grid-template-columns: 16px auto minmax(0, 1fr);
    min-height: 48px;
    row-gap: 2px;
  }
`;

const Row = styled.div`
  ${rowStyle}
`;

const RowLink = styled(Link)`
  ${rowStyle}

  &:hover {
    text-decoration: none;
    background: var(--row-selected-bg);
  }
`;

const Sev = styled.span<{ $severity: Severity | 'ok' }>`
  display: inline-flex;
  justify-content: center;
  color: var(--status-${({ $severity }) => $severity}-text);
`;

const Text = styled.span`
  min-width: 0;
  overflow-wrap: anywhere;
`;

const Age = styled.span`
  font-size: var(--fs-12);
  color: var(--app-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: right;

  @media (max-width: 600px) {
    grid-column: 2 / 3;
    text-align: left;
  }
`;

const Action = styled.span`
  font-weight: 600;
  color: var(--accent-text);
  white-space: nowrap;

  @media (max-width: 600px) {
    grid-column: 3 / 4;
    justify-self: end;
  }
`;
