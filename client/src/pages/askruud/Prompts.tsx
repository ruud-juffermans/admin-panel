import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useTwinPrompt, useTwinTurns } from '../../api/queries';
import type { TwinTurn } from '../../api/types';
import { TwinData } from '../../components/TwinState';
import { Badge, Card, CardHead, Grid, Muted, SectionTitle, Segment, Segmented, Table, TableWrap } from '../../components/ui';
import { fmtDateTime, fmtNumber } from '../../format';
import { rangeLabel, useRange } from '../../range';
import { fmtPct, fmtUsd, MixBars, Mono, OutcomeBadge, Quote, Stack } from './shared';

// Two views on prompts: what visitors ask (frequency, recency, refusals,
// topics) and the system prompt itself (text, version, when it changed, and
// how each version performed).
export function PromptsTab() {
  const [view, setView] = useState<'visitor' | 'system'>('visitor');
  return (
    <Stack $gap={16}>
      <Segmented role="group" aria-label="Prompt view" style={{ alignSelf: 'flex-start' }}>
        <Segment type="button" $active={view === 'visitor'} onClick={() => setView('visitor')}>
          Visitor prompts
        </Segment>
        <Segment type="button" $active={view === 'system'} onClick={() => setView('system')}>
          System prompt
        </Segment>
      </Segmented>
      {view === 'visitor' ? <VisitorPrompts /> : <SystemPrompt />}
    </Stack>
  );
}

// ── visitor prompts ──────────────────────────────────────────────────────────

// Normalise so "Is Ruud available?" and "is ruud available" count as one.
export function normaliseQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const TOPICS: Array<{ id: string; label: string; words: RegExp }> = [
  { id: 'availability', label: 'Availability & hiring', words: /\b(available|availability|hire|hiring|freelance|contract|rate|start|vacancy|role|position|interview)\b/i },
  { id: 'experience', label: 'Experience & CV', words: /\b(experience|cv|resume|work(ed)?|career|job|employer|study|studied|education|degree|years?)\b/i },
  { id: 'projects', label: 'Projects', words: /\b(project|built|build|pipeline|warehouse|lakehouse|twin|rag|dashboard|portfolio|github)\b/i },
  { id: 'tech', label: 'Tech & tools', words: /\b(kafka|dbt|spark|python|sql|airflow|snowflake|databricks|aws|azure|gcp|docker|kubernetes|llm|langgraph|postgres|stack|tools?|tech)\b/i },
  { id: 'contact', label: 'Contact', words: /\b(contact|email|e-mail|message|reach|call|linkedin|pass (on|my))\b/i },
];

export function topicOf(q: string): string {
  for (const t of TOPICS) if (t.words.test(q)) return t.id;
  return 'other';
}

function VisitorPrompts() {
  const { days } = useRange();
  const turns = useTwinTurns(days);
  const items = useMemo(() => (turns.data?.items ?? []).filter((t) => t.visitor_message), [turns.data]);

  const frequent = useMemo(() => {
    const map = new Map<string, { text: string; count: number; last: string }>();
    for (const t of items) {
      const key = normaliseQuestion(t.visitor_message!);
      if (!key) continue;
      const e = map.get(key);
      if (e) {
        e.count += 1;
        if (t.created_at > e.last) e.last = t.created_at;
      } else map.set(key, { text: t.visitor_message!, count: 1, last: t.created_at });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, 15);
  }, [items]);

  const topics = useMemo(() => {
    const colors = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
    const counts = new Map<string, number>();
    for (const t of items) counts.set(topicOf(t.visitor_message!), (counts.get(topicOf(t.visitor_message!)) ?? 0) + 1);
    return [...TOPICS.map((t) => t.id), 'other'].map((id, i) => ({
      label: TOPICS.find((t) => t.id === id)?.label ?? 'Off-topic / other',
      count: counts.get(id) ?? 0,
      color: colors[i % colors.length]!,
    }));
  }, [items]);

  const refused = items.filter((t) => t.outcome === 'refused' || (t.guard_flags.length > 0 && t.outcome !== 'answered'));

  return (
    <TwinData query={turns} height={240}>
      {() => (
        <Stack $gap={16}>
          <Grid $min={340}>
            <Card>
              <CardHead>
                <SectionTitle>Questions per topic</SectionTitle>
                <Muted>{rangeLabel(days)} · keyword buckets</Muted>
              </CardHead>
              <MixBars rows={topics} />
            </Card>
            <Card>
              <CardHead>
                <SectionTitle>Refused questions</SectionTitle>
                <Muted>{refused.length} in range</Muted>
              </CardHead>
              {refused.length === 0 ? (
                <Muted>No refusals in this range.</Muted>
              ) : (
                <Stack $gap={6}>
                  {refused.slice(0, 8).map((t) => (
                    <Line key={t.id}>
                      <Quote>{t.visitor_message}</Quote>
                      <Muted>
                        {t.guard_flags.join(', ') || 'model'} · {fmtDateTime(t.created_at)}
                      </Muted>
                    </Line>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid>

          <Grid $min={340}>
            <Card>
              <CardHead>
                <SectionTitle>Most frequent questions</SectionTitle>
                <Muted>normalised: lowercase, punctuation stripped</Muted>
              </CardHead>
              {frequent.length === 0 ? (
                <Muted>No questions in this range.</Muted>
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th scope="col">Question</th>
                        <th scope="col" className="num">Asked</th>
                        <th scope="col">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequent.map((f) => (
                        <tr key={f.text}>
                          <td>{f.text}</td>
                          <td className="num">{fmtNumber(f.count)}</td>
                          <td>
                            <Muted>{fmtDateTime(f.last)}</Muted>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>
            <Card>
              <CardHead>
                <SectionTitle>Recent questions</SectionTitle>
                <Muted>newest first</Muted>
              </CardHead>
              <Stack $gap={6}>
                {items.slice(0, 12).map((t) => (
                  <Line key={t.id}>
                    <span>{t.visitor_message}</span>
                    <Muted>
                      <OutcomeBadge outcome={t.outcome} /> {t.locale ?? ''} {fmtDateTime(t.created_at)}
                    </Muted>
                  </Line>
                ))}
                {items.length === 0 && <Muted>No questions in this range.</Muted>}
              </Stack>
            </Card>
          </Grid>
        </Stack>
      )}
    </TwinData>
  );
}

// ── system prompt ────────────────────────────────────────────────────────────

function SystemPrompt() {
  const prompt = useTwinPrompt();
  return (
    <TwinData query={prompt} height={240}>
      {(data) => {
        const current = data.versions.find((v) => v.current);
        return (
          <Stack $gap={16}>
            <Card>
              <CardHead>
                <SectionTitle>Current system prompt</SectionTitle>
                <Muted>
                  version <Mono>{data.current.prompt_version}</Mono> · kb <Mono>{data.current.kb_version}</Mono> · {data.current.provider} / {data.current.model}
                </Muted>
              </CardHead>
              <Muted>
                {current ? `In use since ${fmtDateTime(current.first_seen)} (first turn logged with this version).` : 'No turn has been logged with this version yet — it changed since the last conversation.'}
              </Muted>
              <PromptText>{data.current.text}</PromptText>
            </Card>

            <Card>
              <CardHead>
                <SectionTitle>Versions seen in the log</SectionTitle>
                <Muted>a prompt or provider change starts a new version</Muted>
              </CardHead>
              {data.versions.length === 0 ? (
                <Muted>No turns logged yet.</Muted>
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <th scope="col">Version</th>
                        <th scope="col">Active</th>
                        <th scope="col" className="num">Turns</th>
                        <th scope="col" className="num">Answered</th>
                        <th scope="col" className="num">Refused</th>
                        <th scope="col" className="num">Up / down</th>
                        <th scope="col" className="num">Cost</th>
                        <th scope="col">Provider</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.versions.map((v) => (
                        <tr key={v.prompt_version ?? 'none'}>
                          <td>
                            <Mono>{v.prompt_version ?? '—'}</Mono> {v.current && <Badge $tone="green">current</Badge>}
                          </td>
                          <td>
                            <Muted>
                              {fmtDateTime(v.first_seen)} → {fmtDateTime(v.last_seen)}
                            </Muted>
                          </td>
                          <td className="num">{fmtNumber(v.turns)}</td>
                          <td className="num">{fmtPct(v.answer_rate)}</td>
                          <td className="num">{fmtPct(v.refusal_rate)}</td>
                          <td className="num">
                            {v.feedback.up} / {v.feedback.down}
                          </td>
                          <td className="num">{fmtUsd(v.cost_usd)}</td>
                          <td>
                            <Mono>
                              {v.provider} · {v.model}
                            </Mono>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>
          </Stack>
        );
      }}
    </TwinData>
  );
}

const PromptText = styled.pre`
  margin: 12px 0 0;
  padding: 14px 16px;
  border-radius: var(--radius-3);
  background: var(--app-surface);
  border: 1px solid var(--app-border-soft);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82rem;
  line-height: 1.55;
`;

const Line = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.9rem;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--app-divider);

  &:last-child {
    border-bottom: none;
  }
`;

export type { TwinTurn };
