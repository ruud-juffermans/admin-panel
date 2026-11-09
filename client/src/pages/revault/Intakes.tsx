import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import styled from 'styled-components';
import { useRevaultIntakeMutations, useRevaultIntakeStats, useRevaultIntakes } from '../../api/queries';
import { REVAULT_INTAKE_STATUSES, type RevaultIntake, type RevaultIntakeStatus } from '../../api/types';
import { Alert, Badge, Button, ButtonRow, Card, Empty, Muted, Segment, Segmented, Skeleton } from '../../components/ui';
import { StatusGlyph } from '../../components/icons';
import { useOverlayDialog } from '../../components/useOverlayDialog';
import { fmtDateTime } from '../../format';
import { ISSUE_TYPE_LABEL, OPEN_STATUSES, STATUS_GLYPH, STATUS_LABEL, STATUS_TONE, WALLET_TYPE_LABEL, isRevaultUnavailable, revaultErrorMessage } from './shared';

type Filter = RevaultIntakeStatus | 'open' | 'all';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'NEW', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'NOT_VIABLE', label: 'Not viable' },
  { value: 'all', label: 'All' },
];

function ageOf(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days === 0 ? 'today' : days === 1 ? '1 d' : `${days} d`;
}

// Intake requests from revault.nl's free-assessment form: a filterable list
// and a detail pane with the case workflow, private notes, a reply link and
// delete. The selected case lives in the URL (?ref=) like the contact inbox.
export function RevaultIntakes() {
  const [filter, setFilter] = useState<Filter>('NEW');
  const [params, setParams] = useSearchParams();
  const selectedRef = params.get('ref');
  const setSelectedRef = (ref: string | null) => {
    const next = new URLSearchParams(params);
    if (ref) next.set('ref', ref);
    else next.delete('ref');
    setParams(next, { replace: ref === null });
  };
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const stats = useRevaultIntakeStats();
  // "open" and "all" fetch everything and filter here; the rest filter server side.
  const serverStatus = filter === 'open' || filter === 'all' ? undefined : filter;
  const list = useRevaultIntakes(serverStatus);
  const intakes = (list.data?.items ?? []).filter((i) => (filter === 'open' ? OPEN_STATUSES.includes(i.status) : true));
  const selected = intakes.find((i) => i.reference === selectedRef) ?? null;
  const openCount = stats.data ? OPEN_STATUSES.reduce((n, s) => n + stats.data!.counts[s], 0) : undefined;
  const countFor = (f: Filter) => (!stats.data ? undefined : f === 'all' ? stats.data.total : f === 'open' ? openCount : stats.data.counts[f]);

  useEffect(() => {
    if (!list.data) return;
    if (selectedRef && intakes.some((i) => i.reference === selectedRef)) return;
    const wide = window.matchMedia('(min-width: 861px)').matches;
    setSelectedRef(wide && intakes.length ? intakes[0]!.reference : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakes, selectedRef, list.data]);

  useOverlayDialog(selected !== null, () => setSelectedRef(null), panelRef, listRef);

  return (
    <Layout>
      <ListCard ref={listRef}>
        <Segmented role="group" aria-label="Status">
          {FILTERS.map((f) => (
            <Segment key={f.value} type="button" $active={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              {countFor(f.value) !== undefined && <TabCount>{countFor(f.value)}</TabCount>}
            </Segment>
          ))}
        </Segmented>

        {list.error && <Alert $variant={isRevaultUnavailable(list.error) ? 'info' : 'error'}>{revaultErrorMessage(list.error)}</Alert>}
        {list.isPending && <Skeleton $h={160} />}
        {list.data && intakes.length === 0 && <Empty>Nothing here.</Empty>}

        <Rows>
          {intakes.map((i) => (
            <RowButton key={i.id} type="button" $active={i.reference === selectedRef} onClick={() => setSelectedRef(i.reference)} aria-current={i.reference === selectedRef}>
              <RowTop>
                <RowName>{i.name}</RowName>
                <Muted>{fmtDateTime(i.createdAt)}</Muted>
              </RowTop>
              <RowMeta>
                <Mono>{i.reference}</Mono>
                <span>· {ISSUE_TYPE_LABEL[i.issueType] ?? i.issueType}</span>
                <Badge $tone={STATUS_TONE[i.status]}>
                  <StatusGlyph glyph={STATUS_GLYPH[i.status]} />
                  {STATUS_LABEL[i.status]}
                </Badge>
                {i.status === 'NEW' && <Badge $tone="amber">waiting {ageOf(i.createdAt)}</Badge>}
              </RowMeta>
              <RowPreview>{i.description}</RowPreview>
            </RowButton>
          ))}
        </Rows>
      </ListCard>

      <DetailCard ref={panelRef} $open={selected !== null} role={selected ? 'region' : undefined} aria-label={selected ? `Intake ${selected.reference}` : undefined}>
        {selected ? <Detail intake={selected} onClose={() => setSelectedRef(null)} onDeleted={() => setSelectedRef(null)} /> : <Empty>Select a request to read it.</Empty>}
      </DetailCard>
    </Layout>
  );
}

function Detail({ intake: i, onClose, onDeleted }: { intake: RevaultIntake; onClose: () => void; onDeleted: () => void }) {
  const { update, remove } = useRevaultIntakeMutations();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState(i.notes ?? '');
  useEffect(() => {
    setConfirmDelete(false);
    setNotes(i.notes ?? '');
  }, [i.id, i.notes]);
  const busy = update.isPending || remove.isPending;
  const error = update.error ?? remove.error;
  const notesDirty = notes !== (i.notes ?? '');

  const subject = encodeURIComponent(`Re: your request at Revault — reference ${i.reference}`);
  const mailto = `mailto:${encodeURIComponent(i.email)}?subject=${subject}`;
  // Replying is the first assessment step: a NEW case moves to ASSESSED.
  function onReply() {
    if (i.status === 'NEW') update.mutate({ reference: i.reference, status: 'ASSESSED' });
  }

  return (
    <>
      <DetailHead>
        <div>
          <DetailName>{i.name}</DetailName>
          <DetailMeta>
            <a href={mailto}>{i.email}</a>
            {i.phone && <span>· {i.phone}</span>}
            <span>· {i.locale}</span>
          </DetailMeta>
          <DetailMeta>
            <Mono>{i.reference}</Mono>
            <Muted>{fmtDateTime(i.createdAt)}</Muted>
            <Badge $tone={STATUS_TONE[i.status]}>
                  <StatusGlyph glyph={STATUS_GLYPH[i.status]} />
                  {STATUS_LABEL[i.status]}
                </Badge>
          </DetailMeta>
        </div>
        <CloseButton type="button" onClick={onClose} aria-label="Close">
          ✕
        </CloseButton>
      </DetailHead>

      <Facts>
        <Fact>
          <dt>Wallet</dt>
          <dd>
            {WALLET_TYPE_LABEL[i.walletType] ?? i.walletType}
            {i.walletSoftware && ` · ${i.walletSoftware}`}
          </dd>
        </Fact>
        <Fact>
          <dt>Problem</dt>
          <dd>{ISSUE_TYPE_LABEL[i.issueType] ?? i.issueType}</dd>
        </Fact>
        <Fact>
          <dt>Estimated value</dt>
          <dd>{i.estimatedValue ?? '—'}</dd>
        </Fact>
      </Facts>

      <Message>{i.description}</Message>

      <label>
        <FieldLabel>Private notes</FieldLabel>
        <Notes value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Assessment, what was agreed, next step…" />
      </label>
      {notesDirty && (
        <ButtonRow>
          <Button $size="sm" $variant="primary" disabled={busy} onClick={() => update.mutate({ reference: i.reference, notes: notes.trim() || null })}>
            Save notes
          </Button>
          <Button $size="sm" $variant="ghost" disabled={busy} onClick={() => setNotes(i.notes ?? '')}>
            Discard
          </Button>
        </ButtonRow>
      )}

      {error && <Alert>{error.message}</Alert>}

      <label>
        <FieldLabel>Status</FieldLabel>
        <StatusSelect value={i.status} disabled={busy} onChange={(e) => update.mutate({ reference: i.reference, status: e.target.value as RevaultIntakeStatus })}>
          {REVAULT_INTAKE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </StatusSelect>
      </label>

      <ButtonRow>
        <Button as="a" href={mailto} $variant="primary" $size="sm" onClick={onReply} data-autofocus>
          Reply by e-mail
        </Button>
        {i.status === 'NEW' && (
          <Button $size="sm" disabled={busy} onClick={() => update.mutate({ reference: i.reference, status: 'ASSESSED' })}>
            Mark assessed
          </Button>
        )}
        {i.status === 'ASSESSED' && (
          <>
            <Button $size="sm" disabled={busy} onClick={() => update.mutate({ reference: i.reference, status: 'VIABLE' })}>
              Viable
            </Button>
            <Button $size="sm" disabled={busy} onClick={() => update.mutate({ reference: i.reference, status: 'NOT_VIABLE' })}>
              Not viable
            </Button>
          </>
        )}
        {i.status !== 'CLOSED' && i.status !== 'NEW' && (
          <Button $size="sm" $variant="ghost" disabled={busy} onClick={() => update.mutate({ reference: i.reference, status: 'CLOSED' })}>
            Close case
          </Button>
        )}
        {confirmDelete ? (
          <>
            <Button $size="sm" $variant="danger" disabled={busy} autoFocus onClick={() => remove.mutate(i.reference, { onSuccess: onDeleted })}>
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
  top: calc(var(--shell-top) + 16px);
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
  border-radius: var(--radius-2);
  border: 1px solid transparent;
  background: ${({ $active }) => ($active ? 'var(--row-selected-bg)' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? 'inset 2px 0 0 var(--accent)' : 'none')};
  cursor: pointer;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--row-selected-bg)' : 'var(--app-gray-50)')};
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

const Mono = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
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
  border-radius: var(--radius-2);

  &:hover {
    background: var(--app-gray-100);
    color: var(--app-text-primary);
  }
`;

const Facts = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 0;
`;

const Fact = styled.div`
  dt {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--app-text-muted);
  }
  dd {
    margin: 2px 0 0;
    font-size: 0.9rem;
  }
`;

const Message = styled.p`
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  padding: 14px 16px;
  border-radius: var(--radius-3);
  background: var(--app-surface);
  border: 1px solid var(--app-border-soft);
`;

const FieldLabel = styled.span`
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  margin-bottom: 6px;
`;

const Notes = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-2);
  border: 1.5px solid var(--app-input-border);
  background: var(--app-bg);
  color: var(--app-text-primary);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  resize: vertical;

  &:focus-visible {
    outline: 2px solid transparent;
    border-color: var(--accent);
    box-shadow: var(--focus-ring);
  }
`;

const StatusSelect = styled.select`
  min-height: 36px;
  padding: 6px 12px;
  border-radius: var(--radius-2);
  border: 1.5px solid var(--app-input-border);
  background: var(--app-bg);
  color: var(--app-text-primary);
  font: inherit;
  font-size: 0.9rem;
`;
