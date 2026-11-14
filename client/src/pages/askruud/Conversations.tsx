import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useOverlayDialog } from '../../components/useOverlayDialog';
import styled from 'styled-components';
import { useTwinThread, useTwinThreads, useTwinTurnTrace } from '../../api/queries';
import type { TwinThreadFilters, TwinThreadSummary, TwinTurn } from '../../api/types';
import { TwinData } from '../../components/TwinState';
import { Badge, Button, Card, Empty, Input, Muted, SectionTitle, Segment, Segmented, Skeleton } from '../../components/ui';
import { fmtDateTime, fmtNumber } from '../../format';
import { useRange } from '../../range';
import { FlagBadge, fmtMs, fmtPct, fmtUsd, Meta, Mono, OutcomeBadge, Stack } from './shared';
import { Waterfall } from './Waterfall';

const TOOLS = ['search_knowledge', 'get_availability', 'draft_contact_message'];

// Every conversation the twin had: searchable list on the left, chat-style
// transcript on the right with each answer's evidence one click away.
export function ConversationsTab() {
  const { days } = useRange();
  // Filters and the open thread live in the URL: deep links from the overview
  // tiles (?feedback=down) work and the phone's back button closes the overlay.
  const [params, setParams] = useSearchParams();
  const filters: TwinThreadFilters = {
    q: params.get('q') || undefined,
    outcome: (params.get('outcome') as TwinThreadFilters['outcome']) || undefined,
    flag: params.get('flag') || undefined,
    tool: params.get('tool') || undefined,
    has_citations: params.has('cited') ? params.get('cited') === 'true' : undefined,
    feedback: (params.get('feedback') as TwinThreadFilters['feedback']) || undefined,
  };
  const selected = params.get('id');
  const update = (changes: Record<string, string | null>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    setParams(next, { replace });
  };
  const setSelected = (id: string | null) => update({ id }, id === null);
  const [draft, setDraft] = useState(filters.q ?? '');
  const threads = useTwinThreads(days, filters);
  const items = threads.data?.items ?? [];
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const retained = items.filter((t) => t.first_question).length;

  // Debounce the search box so every keystroke does not hit the twin.
  useEffect(() => {
    const t = setTimeout(() => {
      if ((filters.q ?? '') !== draft) update({ q: draft }, true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  useEffect(() => {
    if (!threads.data) return;
    if (selected && items.some((t) => t.thread_id === selected)) return;
    const wide = window.matchMedia('(min-width: 861px)').matches;
    const next = wide && items.length ? items[0]!.thread_id : null;
    // Only touch the URL when the selection changes: `items` is a new array
    // every render, so an unconditional write here loops (and Chrome then
    // blocks all navigation for seconds).
    if (next !== selected) setSelected(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, selected, threads.data]);

  useOverlayDialog(selected !== null, () => setSelected(null), panelRef, listRef);

  const toggle = (key: string, value: string, current: string | undefined) => update({ [key]: current === value ? null : value, id: null });

  return (
    <Layout>
      <ListCard ref={listRef}>
        <Input placeholder="Search questions…" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Search questions" />
        <Filters>
          <Segmented role="group" aria-label="Outcome">
            {(['answered', 'refused', 'pending_approval', 'error'] as const).map((o) => (
              <Segment key={o} type="button" $active={filters.outcome === o} onClick={() => toggle('outcome', o, filters.outcome)}>
                {o.replace('_', ' ')}
              </Segment>
            ))}
          </Segmented>
          <Segmented role="group" aria-label="More filters">
            <Segment type="button" $active={filters.feedback === 'down'} onClick={() => toggle('feedback', 'down', filters.feedback)}>
              thumbs down
            </Segment>
            <Segment type="button" $active={filters.has_citations === true} onClick={() => toggle('cited', 'true', filters.has_citations === undefined ? undefined : String(filters.has_citations))}>
              cited
            </Segment>
            <Segment type="button" $active={filters.has_citations === false} onClick={() => toggle('cited', 'false', filters.has_citations === undefined ? undefined : String(filters.has_citations))}>
              uncited
            </Segment>
            <Segment type="button" $active={filters.flag === 'input'} onClick={() => toggle('flag', 'input', filters.flag)}>
              guard flag
            </Segment>
          </Segmented>
          <Segmented role="group" aria-label="Tool used">
            {TOOLS.map((t) => (
              <Segment key={t} type="button" $active={filters.tool === t} onClick={() => toggle('tool', t, filters.tool)}>
                {t.replace('_', ' ')}
              </Segment>
            ))}
          </Segmented>
        </Filters>
        {items.length > 0 && (
          <Muted>
            {items.length} conversation{items.length === 1 ? '' : 's'}
            {retained < items.length ? ` · ${retained} with text, ${items.length - retained} purged by retention` : ''}
          </Muted>
        )}

        <TwinData query={threads} height={200}>
          {(data) =>
            data.items.length === 0 ? (
              <Empty>No conversations match.</Empty>
            ) : (
              <Rows>
                {data.items.map((t) => (
                  <ThreadRow key={t.thread_id} thread={t} active={t.thread_id === selected} onSelect={() => setSelected(t.thread_id)} />
                ))}
              </Rows>
            )
          }
        </TwinData>
      </ListCard>

      <DetailCard ref={panelRef} $open={selected !== null} role={selected ? 'region' : undefined} aria-label={selected ? 'Conversation' : undefined}>
        {selected ? <ThreadView threadId={selected} onClose={() => setSelected(null)} /> : <Empty>Select a conversation to read it.</Empty>}
      </DetailCard>
    </Layout>
  );
}

function ThreadRow({ thread: t, active, onSelect }: { thread: TwinThreadSummary; active: boolean; onSelect: () => void }) {
  return (
    <RowButton type="button" $active={active} onClick={onSelect} aria-current={active}>
      <RowTop>
        <Question>{t.first_question ?? <Muted>Transcript purged by retention</Muted>}</Question>
        <Muted>{fmtDateTime(t.started_at)}</Muted>
      </RowTop>
      <Meta>
        <span>
          {t.turns} turn{t.turns === 1 ? '' : 's'} · {fmtUsd(t.cost_usd)}
        </span>
        {t.outcomes.filter((o) => o !== 'answered').map((o) => (
          <OutcomeBadge key={o} outcome={o} />
        ))}
        {t.guard_flags.map((f) => (
          <FlagBadge key={f} flag={f} />
        ))}
        {t.feedback && t.feedback.down > 0 && <Badge $tone="red">👎 {t.feedback.down}</Badge>}
        {t.feedback && t.feedback.up > 0 && <Badge $tone="green">👍 {t.feedback.up}</Badge>}
        {t.has_citations && <Badge $tone="blue">cited</Badge>}
        {t.locale && <Badge>{t.locale}</Badge>}
      </Meta>
    </RowButton>
  );
}

// ── transcript ───────────────────────────────────────────────────────────────

function ThreadView({ threadId, onClose }: { threadId: string; onClose: () => void }) {
  const thread = useTwinThread(threadId);
  return (
    <TwinData query={thread} height={240}>
      {(data) => (
        <Stack $gap={14}>
          <DetailHead>
            <div>
              <QuestionTitle lang={data.turns[0]?.locale ?? undefined}>{data.turns[0]?.visitor_message ?? 'Conversation (transcript purged by retention)'}</QuestionTitle>
              <Meta>
                <span>{data.turns[0] ? fmtDateTime(data.turns[0].created_at) : ''}</span>
                <span>
                  {data.turns.length} turn{data.turns.length === 1 ? '' : 's'}
                </span>
                <span>{fmtUsd(data.total_cost_usd)}</span>
                {data.turns[0]?.embed !== null && data.turns[0]?.embed !== undefined && <Badge>{data.turns[0].embed ? 'widget' : 'standalone'}</Badge>}
                {data.turns[0]?.locale && <Badge>{data.turns[0].locale}</Badge>}
              </Meta>
              <ThreadId>
                thread <Mono>{data.thread_id}</Mono>
              </ThreadId>
            </div>
            <CloseButton type="button" onClick={onClose} aria-label="Close conversation" data-autofocus>
              ✕
            </CloseButton>
          </DetailHead>
          {data.pending_approval && <Badge $tone="amber">a high-risk action in this thread is waiting for approval</Badge>}
          <Transcript>
            {data.turns.map((turn) => (
              <TurnBlock key={turn.id} turn={turn} />
            ))}
          </Transcript>
          {data.feedback.length > 0 && (
            <FeedbackList>
              {data.feedback.map((f) => (
                <li key={f.id}>
                  <Badge $tone={f.verdict === 'up' ? 'green' : 'red'}>{f.verdict === 'up' ? '👍' : '👎'}</Badge> <Muted>{fmtDateTime(f.created_at)}</Muted>
                  {f.comment && <em> “{f.comment}”</em>}
                </li>
              ))}
            </FeedbackList>
          )}
        </Stack>
      )}
    </TwinData>
  );
}

function TurnBlock({ turn }: { turn: TwinTurn }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const purged = turn.visitor_message === null && turn.answer === null;
  // The waterfall is fetched only once the details are open.
  const trace = useTwinTurnTrace(open ? turn.id : null);

  async function copyEvalCase() {
    const json = JSON.stringify(evalCase(turn), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy the eval case:', json);
    }
  }

  return (
    <Stack $gap={6}>
      <Bubble $who="visitor" lang={turn.locale ?? undefined}>
        {turn.visitor_message ?? <Muted>(question purged after retention)</Muted>}
        <BubbleMeta>{fmtDateTime(turn.created_at)}</BubbleMeta>
      </Bubble>
      <Bubble $who="twin" $outcome={turn.outcome} lang={turn.locale ?? undefined}>
        {turn.answer ?? <Muted>{purged ? '(answer purged after retention)' : '(no answer text)'}</Muted>}
        <BubbleMeta>
          <OutcomeBadge outcome={turn.outcome} />
          {turn.guard_flags.map((f) => (
            <FlagBadge key={f} flag={f} />
          ))}
          {(turn.citations?.length ?? 0) > 0 && <Badge $tone="blue">{turn.citations!.length} citation{turn.citations!.length === 1 ? '' : 's'}</Badge>}
          {turn.tools_used.length > 0 && <Badge>{turn.tools_used.join(', ')}</Badge>}
          <span>{fmtUsd(turn.cost_usd)}</span>
          <span>{fmtMs(turn.latency_ms)}</span>
          {turn.ttft_ms !== null && <span title="time to first token">first token {fmtMs(turn.ttft_ms)}</span>}
          {turn.retries ? <Badge $tone="amber">{turn.retries} retr{turn.retries === 1 ? 'y' : 'ies'}</Badge> : null}
          {turn.error_type && <Badge $tone={turn.error_type === 'truncated' || turn.error_type.startsWith('tool') ? 'amber' : 'red'}>{turn.error_type.replace('_', ' ')}</Badge>}
          <MetaActions>
            <ExpandButton type="button" onClick={() => void copyEvalCase()} disabled={!turn.visitor_message}>
              {copied ? 'copied!' : 'copy as eval case'}
            </ExpandButton>
            <ExpandButton type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'hide details' : 'details'}
            </ExpandButton>
          </MetaActions>
        </BubbleMeta>
        {open && (
          <Details>
            <dl>
              <dt>Citations</dt>
              <dd>{turn.citations?.length ? turn.citations.map((c) => c.title).join(', ') : '—'}</dd>
              <dt>Retrieved chunks</dt>
              <dd>
                {turn.retrieved_chunks?.length ? (
                  <ul>
                    {turn.retrieved_chunks.map((c, i) => (
                      <li key={i}>
                        {c.document}
                        {c.heading ? ` › ${c.heading}` : ''} {c.score !== null && c.score !== undefined && <Muted>score {typeof c.score === 'number' && c.score <= 1 ? fmtPct(c.score) : c.score}</Muted>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </dd>
              <dt>Tool calls</dt>
              <dd>
                {turn.tool_calls?.length ? (
                  <ul>
                    {turn.tool_calls.map((c, i) => (
                      <li key={i}>
                        <Mono>{c.name}</Mono> <Mono>{JSON.stringify(c.input)}</Mono> <Muted>→ {fmtNumber(c.result_chars)} chars</Muted>
                      </li>
                    ))}
                  </ul>
                ) : (
                  '—'
                )}
              </dd>
              <dt>Tokens</dt>
              <dd>
                {fmtNumber(turn.input_tokens)} in ({fmtNumber(turn.cached_tokens)} cached) · {fmtNumber(turn.output_tokens)} out
              </dd>
              <dt>Cost · latency</dt>
              <dd>
                {fmtUsd(turn.cost_usd)} · {fmtMs(turn.latency_ms)}
                {turn.ttft_ms !== null && ` · first token ${fmtMs(turn.ttft_ms)}`}
                {turn.finish_reason && (
                  <>
                    {' · finish '}
                    <Mono>{turn.finish_reason}</Mono>
                  </>
                )}
              </dd>
              <dt>Length</dt>
              <dd>
                {turn.question_chars ?? '—'} / {turn.context_chars ?? '—'} / {turn.answer_chars ?? '—'} <Muted>chars: question / tool context / answer</Muted>
              </dd>
              <dt>Model</dt>
              <dd>
                <Mono>
                  {turn.provider} · {turn.model}
                </Mono>
              </dd>
              <dt>Versions</dt>
              <dd>
                prompt <Mono>{turn.prompt_version ?? '—'}</Mono> · kb <Mono>{turn.kb_version ?? '—'}</Mono>
              </dd>
            </dl>
            <TraceBlock>
              <dt>Timeline</dt>
              {trace.isPending ? <Skeleton $h={80} /> : trace.error || !trace.data ? <Muted>Timeline unavailable.</Muted> : trace.data.spans.length === 0 ? <Muted>No trace recorded for this turn (before the performance telemetry).</Muted> : <Waterfall trace={trace.data} />}
            </TraceBlock>
            <Button $size="sm" onClick={() => void copyEvalCase()} disabled={!turn.visitor_message}>
              {copied ? 'Copied!' : 'Copy as eval case'}
            </Button>
            <Muted> Produces the JSON shape of the twin's eval datasets; edit the expectations before committing.</Muted>
          </Details>
        )}
      </Bubble>
    </Stack>
  );
}

// The JSON shape of server/evals/datasets/*: a tool-selection case when the
// turn called tools, a task-completion case otherwise. The expectation
// fields start from what actually happened; edit them before committing.
export function evalCase(turn: TwinTurn): Record<string, unknown> {
  const id = (turn.visitor_message ?? 'case')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const question = turn.visitor_message ?? '';
  const realTools = turn.tools_used.filter((t) => t !== 'search_knowledge');
  if (realTools.length > 0) {
    return { id, question, expected_tools: [...new Set(realTools)] };
  }
  if (turn.outcome === 'refused') return { id, question, expect_refusal: true };
  return {
    id,
    question,
    must_contain_any: [],
    must_cite: (turn.citations?.length ?? 0) > 0,
  };
}

const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
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

const Filters = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RowButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
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

const Question = styled.span`
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const DetailCard = styled(Card)<{ $open: boolean }>`
  position: sticky;
  top: calc(var(--shell-top) + 16px);

  @media (max-width: 860px) {
    position: fixed;
    inset: 0;
    z-index: 20;
    border-radius: 0;
    overflow-y: auto;
    padding-bottom: 100px;
    display: ${({ $open }) => ($open ? 'block' : 'none')};
  }
`;

const DetailHead = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
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

const QuestionTitle = styled.h2`
  font-size: 1.1rem;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ThreadId = styled.div`
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--app-text-muted);
  user-select: all;
`;

const MetaActions = styled.span`
  margin-left: auto;
  display: inline-flex;
  gap: 10px;
`;

const Transcript = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Bubble = styled.div<{ $who: 'visitor' | 'twin'; $outcome?: string }>`
  max-width: 92%;
  align-self: ${({ $who }) => ($who === 'visitor' ? 'flex-end' : 'flex-start')};
  padding: 10px 14px;
  border-radius: var(--radius-3);
  border-bottom-right-radius: ${({ $who }) => ($who === 'visitor' ? '4px' : '14px')};
  border-bottom-left-radius: ${({ $who }) => ($who === 'twin' ? '4px' : '14px')};
  background: ${({ $who }) => ($who === 'visitor' ? 'var(--accent-muted)' : 'var(--app-surface)')};
  border: 1px solid ${({ $who, $outcome }) => ($who === 'twin' && $outcome === 'refused' ? 'var(--status-warn-border)' : 'var(--app-border-soft)')};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 0.92rem;
  line-height: 1.55;
`;

const BubbleMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 0.78rem;
  color: var(--app-text-muted);
  white-space: normal;
`;

const ExpandButton = styled.button`
  border: none;
  background: none;
  padding: 2px 0;
  min-height: 24px;
  color: var(--accent-text);
  font-weight: 600;
  font-size: 0.78rem;
  cursor: pointer;

  &:disabled {
    color: var(--app-text-muted);
    cursor: not-allowed;
  }
`;

const Details = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--app-border-soft);
  white-space: normal;
  font-size: 0.85rem;

  dl {
    margin: 0 0 8px;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
  }
  dt {
    color: var(--app-text-muted);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  ul {
    margin: 0;
    padding-left: 16px;
  }
`;

const TraceBlock = styled.div`
  margin: 0 0 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  dt {
    color: var(--app-text-muted);
  }
`;

const FeedbackList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.88rem;
`;
