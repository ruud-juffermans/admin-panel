import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOverlayDialog } from '../../components/useOverlayDialog';
import styled from 'styled-components';
import { useContactList, useContactMutations, useContactStats } from '../../api/queries';
import type { ContactStatus, ContactSubmission } from '../../api/types';
import { Alert, Badge, Button, ButtonRow, Card, Empty, Muted, Segment, Segmented, Skeleton } from '../../components/ui';
import { fmtDateTime } from '../../format';

type Filter = ContactStatus | 'all';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'responded', label: 'Responded' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const STATUS_TONE: Record<ContactStatus, 'red' | 'green' | 'muted'> = { new: 'red', responded: 'green', archived: 'muted' };

// Contact-form submissions: status tabs, a list, and a detail pane with the
// new → responded → archived workflow, a mailto reply link and delete.
function ageOf(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? 'today' : days === 1 ? '1 d' : `${days} d`;
}

export function ContactInbox() {
  const [filter, setFilter] = useState<Filter>('new');
  // The selected message lives in the URL so the phone's back button closes
  // the overlay and a link to a message can be shared with yourself.
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('id');
  const setSelectedId = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('id', id);
    else next.delete('id');
    setParams(next, { replace: id === null });
  };
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stats = useContactStats();
  const list = useContactList(filter === 'all' ? undefined : filter);
  const submissions = list.data?.submissions ?? [];
  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  // Keep a sensible selection: first row on wide screens, nothing on phones
  // (there the list and the detail stack, so auto-selecting would jump).
  useEffect(() => {
    if (!list.data) return;
    if (selectedId && submissions.some((s) => s.id === selectedId)) return;
    const wide = window.matchMedia('(min-width: 861px)').matches;
    setSelectedId(wide && submissions.length ? submissions[0]!.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions, selectedId, list.data]);

  useOverlayDialog(selected !== null, () => setSelectedId(null), panelRef, listRef);

  return (
    <Layout>
      <ListCard ref={listRef}>
        <Segmented role="group" aria-label="Status">
          {FILTERS.map((f) => (
            <Segment key={f.value} type="button" $active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              {stats.data && f.value !== 'all' && <TabCount>{stats.data.counts[f.value]}</TabCount>}
              {stats.data && f.value === 'all' && <TabCount>{stats.data.total}</TabCount>}
            </Segment>
          ))}
        </Segmented>

        {list.error && <Alert>Could not load messages: {list.error.message}</Alert>}
        {list.isPending && <Skeleton $h={160} />}
        {list.data && submissions.length === 0 && <Empty>Nothing here.</Empty>}

        <Rows>
          {submissions.map((s) => (
            <RowButton key={s.id} type="button" $active={s.id === selectedId} onClick={() => setSelectedId(s.id)} aria-current={s.id === selectedId}>
              <RowTop>
                <RowName>{s.name}</RowName>
                <Muted>{fmtDateTime(s.createdAt)}</Muted>
              </RowTop>
              <RowMeta>
                <span>{s.email}</span>
                {s.company && <span>· {s.company}</span>}
                <Badge $tone={STATUS_TONE[s.status]}>{s.status}</Badge>
                {s.status === 'new' && <Badge $tone="amber">waiting {ageOf(s.createdAt)}</Badge>}
              </RowMeta>
              <RowPreview>{s.message}</RowPreview>
            </RowButton>
          ))}
        </Rows>
      </ListCard>

      <DetailCard ref={panelRef} $open={selected !== null} role={selected ? 'region' : undefined} aria-label={selected ? `Message from ${selected.name}` : undefined}>
        {selected ? (
          <Detail submission={selected} onClose={() => setSelectedId(null)} onDeleted={() => setSelectedId(null)} />
        ) : (
          <Empty>Select a message to read it.</Empty>
        )}
      </DetailCard>
    </Layout>
  );
}

function Detail({ submission: s, onClose, onDeleted }: { submission: ContactSubmission; onClose: () => void; onDeleted: () => void }) {
  const { setStatus, remove } = useContactMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setConfirmDelete(false), [s.id]);
  const busy = setStatus.isPending || remove.isPending;
  const error = setStatus.error ?? remove.error;

  const subject = encodeURIComponent(`Re: your message via ruudjuffermans.nl`);
  const mailto = `mailto:${encodeURIComponent(s.email)}?subject=${subject}`;
  // Opening the mail client is the reply; mark it responded right away so the
  // badge stops counting it. "Back to new" undoes it.
  function onReply() {
    if (s.status === 'new') setStatus.mutate({ id: s.id, status: 'responded' });
  }

  return (
    <>
      <DetailHead>
        <div>
          <DetailName>{s.name}</DetailName>
          <DetailMeta>
            <a href={mailto}>{s.email}</a>
            {s.company && <span>· {s.company}</span>}
          </DetailMeta>
          <DetailMeta>
            <Muted>{fmtDateTime(s.createdAt)}</Muted>
            <Badge $tone={STATUS_TONE[s.status]}>{s.status}</Badge>
          </DetailMeta>
        </div>
        <CloseButton type="button" onClick={onClose} aria-label="Close">
          ✕
        </CloseButton>
      </DetailHead>

      <Message>{s.message}</Message>

      {error && <Alert>{error.message}</Alert>}

      <ButtonRow>
        <Button as="a" href={mailto} $variant="primary" $size="sm" onClick={onReply} data-autofocus>
          Reply by e-mail
        </Button>
        {s.status !== 'responded' && (
          <Button $size="sm" disabled={busy} onClick={() => setStatus.mutate({ id: s.id, status: 'responded' })}>
            Mark responded
          </Button>
        )}
        {s.status !== 'archived' && (
          <Button $size="sm" disabled={busy} onClick={() => setStatus.mutate({ id: s.id, status: 'archived' })}>
            Archive
          </Button>
        )}
        {s.status !== 'new' && (
          <Button $size="sm" $variant="ghost" disabled={busy} onClick={() => setStatus.mutate({ id: s.id, status: 'new' })}>
            Back to new
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button
              $size="sm"
              $variant="danger"
              disabled={busy}
              autoFocus
              onClick={() => remove.mutate(s.id, { onSuccess: onDeleted })}
            >
              Yes, delete permanently
            </Button>
            <Button $size="sm" $variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button $size="sm" $variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Delete
          </Button>
        )}
      </ButtonRow>
    </>
  );
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 16px;
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const ListCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DetailCard = styled(Card)<{ $open: boolean }>`
  position: sticky;
  top: 70px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 860px) {
    position: fixed;
    inset: 0;
    z-index: 20;
    border-radius: 0;
    overflow-y: auto;
    padding-bottom: 100px;
    display: ${({ $open }) => ($open ? 'flex' : 'none')};
  }
`;

const TabCount = styled.span`
  margin-left: 6px;
  font-size: 0.72rem;
  color: var(--app-text-muted);
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RowButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--app-red)' : 'transparent')};
  background: ${({ $active }) => ($active ? 'var(--app-red-muted)' : 'transparent')};
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--app-red-muted)' : 'var(--app-gray-50)')};
  }
`;

const RowTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`;

const RowName = styled.span`
  font-weight: 600;
`;

const RowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--app-text-secondary);
`;

const RowPreview = styled.div`
  font-size: 0.85rem;
  color: var(--app-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

const DetailHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const DetailName = styled.h2`
  font-size: 1.2rem;
`;

const DetailMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--app-text-secondary);
  margin-top: 4px;
`;

const CloseButton = styled.button`
  border: none;
  background: none;
  font-size: 1.1rem;
  color: var(--app-text-secondary);
  cursor: pointer;
  align-self: flex-start;
  min-width: 40px;
  min-height: 40px;
  border-radius: 10px;

  &:hover {
    background: var(--app-gray-100);
    color: var(--app-text-primary);
  }
`;

const Message = styled.p`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--app-surface);
  border: 1px solid var(--app-border-soft);
`;
