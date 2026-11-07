import { useState } from 'react';
import styled from 'styled-components';
import { useTwinApprovals, useTwinMutations } from '../../api/queries';
import type { TwinApproval, TwinApprovalResult } from '../../api/types';
import { TwinData } from '../../components/TwinState';
import { Alert, Badge, Button, ButtonRow, Card, CardHead, Empty, Muted, SectionTitle } from '../../components/ui';
import { Meta, Mono, Quote, Stack } from './shared';

// Pending high-risk actions (draft_contact_message) with approve / reject and
// a note; the twin resumes the paused conversation and returns the answer the
// visitor will see, which is shown right here. Replaces the curl workflow.
export function ApprovalsTab() {
  const approvals = useTwinApprovals();
  const [results, setResults] = useState<Record<string, TwinApprovalResult>>({});

  return (
    <Stack $gap={16}>
      <Card>
        <CardHead>
          <SectionTitle>Pending approvals</SectionTitle>
          <Muted>refreshes every minute</Muted>
        </CardHead>
        <TwinData query={approvals}>
          {(data) =>
            data.pending.length === 0 ? (
              <Empty>Nothing waiting for you.</Empty>
            ) : (
              <Stack $gap={14}>
                {data.pending.map((p) => (
                  <ApprovalCard key={p.thread_id} approval={p} onDecided={(r) => setResults((s) => ({ ...s, [r.thread_id]: r }))} />
                ))}
              </Stack>
            )
          }
        </TwinData>
      </Card>

      {Object.values(results).length > 0 && (
        <Card>
          <CardHead>
            <SectionTitle>Decided this session</SectionTitle>
          </CardHead>
          <Stack>
            {Object.values(results)
              .reverse()
              .map((r) => (
                <Decided key={r.thread_id}>
                  <Meta>
                    <Badge $tone={r.status === 'approved' ? 'green' : 'muted'}>{r.status}</Badge>
                    <Mono>{r.thread_id}</Mono>
                  </Meta>
                  <Muted>The visitor now sees:</Muted>
                  <Quote>{r.answer || '(no answer text)'}</Quote>
                </Decided>
              ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

function ApprovalCard({ approval, onDecided }: { approval: TwinApproval; onDecided: (r: TwinApprovalResult) => void }) {
  const { decide } = useTwinMutations();
  const [note, setNote] = useState('');
  const busy = decide.isPending && decide.variables?.threadId === approval.thread_id;

  function run(approved: boolean) {
    decide.mutate({ threadId: approval.thread_id, approved, note: note.trim() || undefined }, { onSuccess: onDecided });
  }

  return (
    <Pending>
      <Meta>
        <Badge $tone="amber">needs approval</Badge>
        <span>thread</span>
        <Mono>{approval.thread_id}</Mono>
      </Meta>
      <Label>Visitor asked</Label>
      <Quote>{approval.visitor_message}</Quote>
      {approval.tool_calls.map((call, i) => (
        <Draft key={i}>
          <Label>
            Drafted action · <Mono>{call.name}</Mono>
          </Label>
          <dl>
            {Object.entries(call.input).map(([k, v]) => (
              <div key={k}>
                <dt>{k.replace(/_/g, ' ')}</dt>
                <dd>{typeof v === 'string' ? v : JSON.stringify(v)}</dd>
              </div>
            ))}
          </dl>
        </Draft>
      ))}
      <NoteInput
        aria-label="Note to the visitor (optional, relayed on rejection)"
        placeholder="Optional note — a rejection note is relayed to the visitor"
        value={note}
        maxLength={500}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />
      {decide.error && decide.variables?.threadId === approval.thread_id && <Alert>{decide.error.message}</Alert>}
      <ButtonRow>
        <Button $variant="primary" $size="sm" disabled={busy} onClick={() => run(true)}>
          Approve
        </Button>
        <Button $variant="danger" $size="sm" disabled={busy} onClick={() => run(false)}>
          Reject
        </Button>
        {busy && <Muted role="status">Resuming the conversation…</Muted>}
      </ButtonRow>
    </Pending>
  );
}

const Pending = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--app-amber);
  border-radius: 14px;
  background: var(--app-amber-muted);
`;

const Decided = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--app-border);
  border-radius: 12px;
`;

const Label = styled.div`
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-text-muted);
`;

const Draft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 14px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--app-surface-elevated);
    border: 1px solid var(--app-border-soft);
    font-size: 0.9rem;
  }
  dl > div {
    display: contents;
  }
  dt {
    color: var(--app-text-secondary);
    text-transform: capitalize;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
`;

const NoteInput = styled.textarea`
  width: 100%;
  resize: vertical;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--app-input-border);
  background: var(--app-bg);
  color: var(--app-text-primary);
  font-size: 0.9rem;

  &::placeholder {
    color: var(--app-text-secondary);
  }

  &:focus-visible {
    outline: 2px solid transparent;
    border-color: var(--app-red);
    box-shadow: 0 0 0 3px var(--app-red-muted);
  }
`;
