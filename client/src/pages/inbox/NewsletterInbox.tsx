import { useState } from 'react';
import styled from 'styled-components';
import { useNewsletterMutations, useNewsletterStats, useSubscribers } from '../../api/queries';
import type { NewsletterSubscriber } from '../../api/types';
import { StatTile } from '../../components/StatTile';
import { Alert, Badge, Button, Card, CardHead, Empty, Muted, SectionTitle, Segment, Segmented, Skeleton, Table, TableWrap, Tiles } from '../../components/ui';
import { fmtDateTime, fmtNumber } from '../../format';

type Filter = 'all' | 'active' | 'unsubscribed';

// Newsletter subscribers: totals, source breakdown, list with unsubscribe/delete.
export function NewsletterInbox() {
  const stats = useNewsletterStats();
  const list = useSubscribers();
  const [filter, setFilter] = useState<Filter>('all');
  const subscribers = (list.data?.subscribers ?? []).filter((s) =>
    filter === 'all' ? true : filter === 'active' ? s.active : !s.active,
  );
  const s = stats.data;

  return (
    <>
      <Tiles>
        <StatTile label="Subscribers" value={s?.total ?? '—'} hint="all time" />
        <StatTile label="Active" value={s?.active ?? '—'} hint={s ? `${s.unsubscribed} unsubscribed` : undefined} />
        {(s?.bySource ?? []).slice(0, 2).map((b) => (
          <StatTile key={b.source} label={`Source: ${b.source}`} value={b.count} hint="all time" />
        ))}
      </Tiles>

      <Card>
        <CardHead>
          <SectionTitle>Subscribers</SectionTitle>
          <Segmented role="group" aria-label="Filter">
            {(['all', 'active', 'unsubscribed'] as Filter[]).map((f) => (
              <Segment key={f} type="button" $active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Segment>
            ))}
          </Segmented>
        </CardHead>
        {s && s.bySource.length > 0 && (
          <Sources>
            {s.bySource.map((b) => (
              <Muted key={b.source}>
                {b.source}: <b>{fmtNumber(b.count)}</b>
              </Muted>
            ))}
          </Sources>
        )}
        {list.error && <Alert>Could not load subscribers: {list.error.message}</Alert>}
        {list.isPending && <Skeleton $h={160} />}
        {list.data && subscribers.length === 0 && <Empty>No subscribers here.</Empty>}
        {subscribers.length > 0 && (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th scope="col">E-mail</th>
                  <th scope="col">Source</th>
                  <th scope="col">Status</th>
                  <th scope="col">Subscribed</th>
                  <th scope="col" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <SubscriberRow key={sub.id} sub={sub} />
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>
    </>
  );
}

function SubscriberRow({ sub }: { sub: NewsletterSubscriber }) {
  const { unsubscribe, remove } = useNewsletterMutations();
  const [confirm, setConfirm] = useState(false);
  const busy = unsubscribe.isPending || remove.isPending;
  return (
    <tr>
      <td>
        <Mono>{sub.email}</Mono>
      </td>
      <td>
        <Badge>{sub.source}</Badge>
      </td>
      <td>
        {sub.active ? (
          <Badge $tone="green">active</Badge>
        ) : (
          <Badge>unsubscribed{sub.unsubscribedAt ? ` ${fmtDateTime(sub.unsubscribedAt)}` : ''}</Badge>
        )}
      </td>
      <td>
        <Muted>{fmtDateTime(sub.createdAt)}</Muted>
      </td>
      <td className="num">
        <Actions>
          {sub.active && (
            <Button $size="sm" disabled={busy} onClick={() => unsubscribe.mutate(sub.id)}>
              Unsubscribe
            </Button>
          )}
          {confirm ? (
            <>
              <Button $size="sm" $variant="danger" disabled={busy} autoFocus onClick={() => remove.mutate(sub.id)}>
                Yes, delete
              </Button>
              <Button $size="sm" $variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button $size="sm" $variant="danger" disabled={busy} onClick={() => setConfirm(true)}>
              Delete
            </Button>
          )}
        </Actions>
      </td>
    </tr>
  );
}

const Sources = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 10px;

  b {
    color: var(--app-text-primary);
  }
`;

const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.84rem;
`;

const Actions = styled.div`
  display: inline-flex;
  gap: 6px;
  justify-content: flex-end;
`;
