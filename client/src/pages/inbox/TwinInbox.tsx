import styled from 'styled-components';
import { useTwinContactMessages } from '../../api/queries';
import { TwinData } from '../../components/TwinState';
import { Badge, Card, CardHead, Empty, Muted, SectionTitle } from '../../components/ui';
import { fmtDateTime } from '../../format';
import { useRange } from '../../range';

// Messages visitors sent through the twin's draft_contact_message tool and
// that were approved — the twin's own contact archive, shown in the inbox.
export function TwinInbox() {
  const { days } = useRange();
  const messages = useTwinContactMessages(days);
  return (
    <Card>
      <CardHead>
        <SectionTitle>Messages via Ask Ruud</SectionTitle>
        <Muted>approved drafts, last {days}d</Muted>
      </CardHead>
      <TwinData query={messages}>
        {(data) =>
          data.items.length === 0 ? (
            <Empty>No approved twin messages in this range.</Empty>
          ) : (
            <List>
              {data.items.map((m) => {
                const mailto = m.sender_contact.includes('@') ? `mailto:${encodeURIComponent(m.sender_contact)}?subject=${encodeURIComponent(`Re: ${m.subject}`)}` : null;
                return (
                  <Row key={m.id}>
                    <Top>
                      <strong>{m.subject}</strong>
                      <Badge $tone="blue">via Ask Ruud</Badge>
                      <Muted>{fmtDateTime(m.created_at)}</Muted>
                    </Top>
                    <Contact>{mailto ? <a href={mailto}>{m.sender_contact}</a> : m.sender_contact}</Contact>
                    <Body>{m.message}</Body>
                    {m.note && <Note>Your note on approval: “{m.note}”</Note>}
                  </Row>
                );
              })}
            </List>
          )
        }
      </TwinData>
    </Card>
  );
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--radius-3);
`;
const Top = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;
const Contact = styled.div`
  font-size: 0.88rem;
`;
const Body = styled.p`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
  font-size: 0.92rem;
`;
const Note = styled.div`
  font-size: 0.85rem;
  font-style: italic;
  color: var(--app-text-secondary);
`;
