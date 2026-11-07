import styled from 'styled-components';
import type { TwinSpan, TwinTurnTrace } from '../../api/types';
import { Badge, Muted } from '../../components/ui';
import { fmtNumber } from '../../format';
import { fmtMs, fmtUsd, Mono } from './shared';

// One turn as a timeline: graph nodes, the model call inside each generate
// node, and the tool calls inside execute_tools, each a bar positioned by its
// start offset. Identity is carried by the row label, never by color alone.
export function Waterfall({ trace }: { trace: TwinTurnTrace }) {
  const total = Math.max(trace.total_ms, ...trace.spans.map((s) => s.start_ms + s.duration_ms), 1);
  return (
    <Wrap>
      <Summary>
        <span>
          total <b>{fmtMs(Math.round(trace.total_ms))}</b>
        </span>
        <span>
          first token <b>{fmtMs(trace.ttft_ms)}</b>
        </span>
        <span>
          finish <Mono>{trace.finish_reason ?? '—'}</Mono>
        </span>
        {trace.retries ? (
          <Badge $tone="amber">
            {trace.retries} retr{trace.retries === 1 ? 'y' : 'ies'}
          </Badge>
        ) : null}
        {trace.error_type && <Badge $tone="red">{trace.error_type.replace('_', ' ')}</Badge>}
      </Summary>
      <Rows role="table" aria-label="Turn timeline">
        {trace.spans.map((span, i) => (
          <SpanRow key={i} span={span} total={total} />
        ))}
      </Rows>
      <Legend>
        <span>
          <Swatch $kind="node" /> graph node
        </span>
        <span>
          <Swatch $kind="model" /> model call
        </span>
        <span>
          <Swatch $kind="tool" /> tool
        </span>
      </Legend>
    </Wrap>
  );
}

function SpanRow({ span, total }: { span: TwinSpan; total: number }) {
  const left = (span.start_ms / total) * 100;
  const width = Math.max((span.duration_ms / total) * 100, 0.6);
  const ttft = span.detail?.ttft_ms;
  const ttftLeft = ttft !== null && ttft !== undefined ? ((span.start_ms + ttft) / total) * 100 : null;
  const label =
    span.kind === 'model' ? (
      <>
        <Mono>{span.name}</Mono>{' '}
        <Muted>
          {' '}
          {fmtNumber(span.detail!.input_tokens)} in / {fmtNumber(span.detail!.output_tokens)} out · {fmtUsd(span.detail!.cost_usd)}
          {span.detail!.tool_call_count ? ` · ${span.detail!.tool_call_count} tool call${span.detail!.tool_call_count === 1 ? '' : 's'}` : ''}
          {span.detail!.retries ? ` · ${span.detail!.retries} retr${span.detail!.retries === 1 ? 'y' : 'ies'}` : ''}
        </Muted>
      </>
    ) : (
      <Mono>{span.name}</Mono>
    );
  return (
    <Row role="row" $child={span.kind !== 'node'}>
      <Label role="cell">{label}</Label>
      <Track role="cell" aria-label={`${span.name}: starts at ${fmtMs(Math.round(span.start_ms))}, takes ${fmtMs(Math.round(span.duration_ms))}`}>
        <Bar $kind={span.kind} $bad={!span.ok} style={{ left: `${left}%`, width: `${width}%` }} />
        {ttftLeft !== null && <Tick style={{ left: `${ttftLeft}%` }} title={`first token after ${fmtMs(ttft!)}`} />}
      </Track>
      <Duration role="cell">
        {fmtMs(Math.round(span.duration_ms))}
        {!span.ok && span.error_type && (
          <>
            {' '}
            <Badge $tone="red">{span.error_type.replace('_', ' ')}</Badge>
          </>
        )}
      </Duration>
    </Row>
  );
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 0.82rem;
  color: var(--app-text-secondary);

  b {
    color: var(--app-text-primary);
  }
`;

const Rows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Row = styled.div<{ $child: boolean }>`
  display: grid;
  grid-template-columns: minmax(140px, 2fr) minmax(100px, 2fr) max-content;
  gap: 10px;
  align-items: center;
  font-size: 0.82rem;
  padding-left: ${({ $child }) => ($child ? 14 : 0)}px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr max-content;
    & > :nth-child(2) {
      grid-column: 1 / -1;
    }
  }
`;

const Label = styled.div`
  overflow-wrap: anywhere;
  line-height: 1.35;
`;

const Track = styled.div`
  position: relative;
  height: 12px;
  border-radius: 6px;
  background: var(--app-gray-100);
  overflow: hidden;
`;

const barColor = ({ $kind, $bad }: { $kind: TwinSpan['kind']; $bad: boolean }) =>
  $bad ? 'var(--app-red)' : $kind === 'model' ? 'var(--viz-1)' : $kind === 'tool' ? 'var(--viz-2)' : 'var(--viz-axis)';

const Bar = styled.div<{ $kind: TwinSpan['kind']; $bad: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 4px;
  background: ${barColor};
`;

const Tick = styled.div`
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--app-text-primary);
`;

const Duration = styled.div`
  text-align: right;
  white-space: nowrap;
  color: var(--app-text-secondary);
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 0.78rem;
  color: var(--app-text-muted);
`;

const Swatch = styled.span<{ $kind: TwinSpan['kind'] }>`
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  vertical-align: middle;
  margin-right: 4px;
  background: ${({ $kind }) => barColor({ $kind, $bad: false })};
`;
