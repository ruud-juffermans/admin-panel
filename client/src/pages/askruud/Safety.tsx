import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTwinFeedback, useTwinGuardIncidents, useTwinMutations, useTwinUnanswered } from '../../api/queries';
import { TwinData } from '../../components/TwinState';
import { Badge, Button, Card, CardHead, Grid, Muted, SectionTitle, Segment, Segmented, Table, TableWrap } from '../../components/ui';
import { fmtDateTime } from '../../format';
import { useRange } from '../../range';
import { FlagBadge, Meta, MixBars, Mono, Quote, Stack } from './shared';

// Guard incidents, refusal reasons (guard vs model), unanswered questions with
// an open/handled tick-off, and visitor feedback with comments.
export function SafetyTab() {
  const { days } = useRange();
  const incidents = useTwinGuardIncidents(days);
  const unanswered = useTwinUnanswered(days);
  const feedback = useTwinFeedback(days);
  const { setUnansweredStatus } = useTwinMutations();
  const [statusFilter, setStatusFilter] = useState<'open' | 'handled' | 'all'>('open');

  const reasons = useMemo(() => {
    const items = unanswered.data?.items ?? [];
    return [
      { label: 'guard refusals', count: items.filter((i) => i.reason === 'guard').length, color: 'var(--viz-2)' },
      { label: 'model “not in my knowledge”', count: items.filter((i) => i.reason === 'model').length, color: 'var(--viz-1)' },
    ];
  }, [unanswered.data]);

  const visibleUnanswered = (unanswered.data?.items ?? []).filter((i) => statusFilter === 'all' || i.status === statusFilter);

  return (
    <Stack $gap={16}>
      <Grid $min={340}>
        <Card>
          <CardHead>
            <SectionTitle>Refusal reasons</SectionTitle>
            <Muted>last {days}d</Muted>
          </CardHead>
          <TwinData query={unanswered} height={60}>
            {() => <MixBars rows={reasons} />}
          </TwinData>
        </Card>
        <Card>
          <CardHead>
            <SectionTitle>Feedback</SectionTitle>
            <Muted>👍 / 👎 on answers</Muted>
          </CardHead>
          <TwinData query={feedback} height={60}>
            {(data) => (
              <MixBars
                rows={[
                  { label: 'thumbs up', count: data.items.filter((f) => f.verdict === 'up').length, color: 'var(--status-ok-mark)', glyph: 'dot' as const },
                  { label: 'thumbs down', count: data.items.filter((f) => f.verdict === 'down').length, color: 'var(--status-bad-mark)', glyph: 'diamond' as const },
                ]}
              />
            )}
          </TwinData>
        </Card>
      </Grid>

      <Card>
        <CardHead>
          <SectionTitle>Unanswered questions</SectionTitle>
          <Segmented role="group" aria-label="Status">
            {(['open', 'handled', 'all'] as const).map((s) => (
              <Segment key={s} type="button" $active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s}
              </Segment>
            ))}
          </Segmented>
        </CardHead>
        <TwinData query={unanswered}>
          {() =>
            visibleUnanswered.length === 0 ? (
              <Muted>Nothing here.</Muted>
            ) : (
              <Stack>
                {visibleUnanswered.map((item) => (
                  <Item key={item.id}>
                    <Meta>
                      <Badge $tone={item.reason === 'guard' ? 'amber' : 'blue'}>{item.reason}</Badge>
                      <Badge $tone={item.status === 'open' ? 'red' : 'green'}>{item.status}</Badge>
                      <span>{fmtDateTime(item.created_at)}</span>
                      <Mono>{item.thread_id}</Mono>
                    </Meta>
                    <Quote>{item.question}</Quote>
                    <Answer>{item.answer}</Answer>
                    <div>
                      <Button
                        $size="sm"
                        $variant={item.status === 'open' ? 'secondary' : 'ghost'}
                        disabled={setUnansweredStatus.isPending}
                        onClick={() => setUnansweredStatus.mutate({ id: item.id, status: item.status === 'open' ? 'handled' : 'open' })}
                      >
                        {item.status === 'open' ? 'Mark handled' : 'Reopen'}
                      </Button>
                    </div>
                  </Item>
                ))}
              </Stack>
            )
          }
        </TwinData>
      </Card>

      <Card>
        <CardHead>
          <SectionTitle>Guard incidents</SectionTitle>
          <Muted>flags with the visitor's message</Muted>
        </CardHead>
        <TwinData query={incidents}>
          {(data) =>
            data.items.length === 0 ? (
              <Muted>No guard incidents in this range.</Muted>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Flags</th>
                      <th scope="col">Message</th>
                      <th scope="col">Thread</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <Muted>{fmtDateTime(i.created_at)}</Muted>
                        </td>
                        <td>
                          <Flags>
                            {i.flags.map((f) => (
                              <FlagBadge key={f} flag={f} />
                            ))}
                          </Flags>
                        </td>
                        <td>
                          <Msg>{i.visitor_message}</Msg>
                        </td>
                        <td>
                          <Mono>{i.thread_id}</Mono>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )
          }
        </TwinData>
      </Card>

      <Card>
        <CardHead>
          <SectionTitle>Feedback with comments</SectionTitle>
        </CardHead>
        <TwinData query={feedback}>
          {(data) => {
            const rows = data.items.filter((f) => f.comment || f.verdict === 'down');
            return rows.length === 0 ? (
              <Muted>No thumbs-down or commented feedback in this range.</Muted>
            ) : (
              <Stack>
                {rows.map((f) => (
                  <Item key={f.id}>
                    <Meta>
                      <Badge $tone={f.verdict === 'up' ? 'green' : 'red'}>{f.verdict === 'up' ? 'thumbs up' : 'thumbs down'}</Badge>
                      <span>{fmtDateTime(f.created_at)}</span>
                      <Mono>{f.thread_id}</Mono>
                    </Meta>
                    {f.question && <Quote>{f.question}</Quote>}
                    {f.answer && <Answer>{f.answer}</Answer>}
                    {f.comment && <Comment>“{f.comment}”</Comment>}
                  </Item>
                ))}
              </Stack>
            );
          }}
        </TwinData>
      </Card>
    </Stack>
  );
}

const Item = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--radius-3);
`;

const Answer = styled.p`
  margin: 0;
  font-size: 0.88rem;
  color: var(--app-text-secondary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Comment = styled.p`
  margin: 0;
  font-style: italic;
  overflow-wrap: anywhere;
`;

const Flags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Msg = styled.span`
  display: inline-block;
  max-width: 420px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.88rem;
`;
