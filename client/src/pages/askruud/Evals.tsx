import { useState } from 'react';
import styled from 'styled-components';
import { useTwinEvalRun, useTwinEvals } from '../../api/queries';
import { TwinData } from '../../components/TwinState';
import { Badge, Button, Card, CardHead, Muted, SectionTitle, Table, TableWrap } from '../../components/ui';
import { fmtDateTime } from '../../format';
import { fmtMs, fmtPct, fmtUsd, Mono, Stack } from './shared';

// Eval run history with pass/fail per dataset; click a run to see its cases,
// failing ones first.
export function EvalsTab() {
  const runs = useTwinEvals();
  const [selected, setSelected] = useState<number | null>(null);
  const detail = useTwinEvalRun(selected);

  return (
    <Stack $gap={16}>
      <Card>
        <CardHead>
          <SectionTitle>Eval runs</SectionTitle>
          <Muted>thresholds: tool selection ≥ 95%, task completion ≥ 90%</Muted>
        </CardHead>
        <TwinData query={runs}>
          {(data) =>
            data.runs.length === 0 ? (
              <Muted>No eval runs recorded yet. Run them from the twin repo with the database configured.</Muted>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Result</th>
                      <th scope="col">Datasets</th>
                      <th scope="col">Provider</th>
                      <th scope="col" className="num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <RunRow key={r.id} $active={r.id === selected}>
                        <td>
                          <Button $size="sm" $variant={r.id === selected ? 'secondary' : 'ghost'} aria-expanded={r.id === selected} onClick={() => setSelected(r.id === selected ? null : r.id)}>
                            {r.id === selected ? 'Hide cases' : 'View cases'}
                          </Button>
                          <div>
                            <Muted>{fmtDateTime(r.created_at)}</Muted>
                          </div>
                        </td>
                        <td>
                          <Badge $tone={r.met ? 'green' : 'red'}>{r.met ? 'passed' : 'failed'}</Badge>
                          {r.failure_injection && (
                            <>
                              {' '}
                              <Badge>
                                failure injection {r.failure_injection.recovered}/{r.failure_injection.injected} recovered
                              </Badge>
                            </>
                          )}
                        </td>
                        <td>
                          <Datasets>
                            {r.summary.map((s) => (
                              <span key={s.dataset}>
                                <Badge $tone={s.met ? 'green' : 'red'}>{s.dataset.replace('_', ' ')}</Badge> {s.passed}/{s.total} · {fmtPct(s.accuracy)}
                              </span>
                            ))}
                          </Datasets>
                        </td>
                        <td>
                          <Mono>
                            {r.provider} · {r.model}
                          </Mono>
                        </td>
                        <td className="num">{fmtUsd(r.cost_usd, 3)}</td>
                      </RunRow>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )
          }
        </TwinData>
      </Card>

      {selected !== null && (
        <Card>
          <CardHead>
            <SectionTitle>Run #{selected} cases</SectionTitle>
            <Muted>failing first</Muted>
          </CardHead>
          <TwinData query={detail}>
            {(data) => (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <th scope="col">Case</th>
                      <th scope="col">Dataset</th>
                      <th scope="col">Result</th>
                      <th scope="col">Detail</th>
                      <th scope="col">Tools</th>
                      <th scope="col" className="num">Latency</th>
                      <th scope="col" className="num">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.cases]
                      .sort((a, b) => Number(a.passed) - Number(b.passed))
                      .map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Mono>{c.case_id}</Mono>
                          </td>
                          <td>
                            <Muted>{c.dataset.replace('_', ' ')}</Muted>
                          </td>
                          <td>
                            <Badge $tone={c.passed ? 'green' : 'red'}>{c.passed ? 'pass' : 'fail'}</Badge>
                          </td>
                          <td>
                            <Detail>
                              {typeof c.detail === 'string' ? c.detail : c.detail ? JSON.stringify(c.detail) : ''}
                              {c.errors.length > 0 && <Muted> · {c.errors.join('; ')}</Muted>}
                            </Detail>
                          </td>
                          <td>
                            <Mono>{c.tools.join(', ') || '—'}</Mono>
                          </td>
                          <td className="num">{fmtMs(c.latency_ms)}</td>
                          <td className="num">{fmtUsd(c.cost_usd, 4)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </TwinData>
        </Card>
      )}
    </Stack>
  );
}

const RunRow = styled.tr<{ $active: boolean }>`
  td {
    background: ${({ $active }) => ($active ? 'var(--row-selected-bg)' : 'transparent')};
    box-shadow: ${({ $active }) => ($active ? 'inset 2px 0 0 var(--accent)' : 'none')};
  }
`;

const Datasets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 0.85rem;
`;

const Detail = styled.span`
  display: inline-block;
  max-width: 360px;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
`;
