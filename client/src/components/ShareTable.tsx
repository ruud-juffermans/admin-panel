import { useState, type ReactNode } from 'react';
import styled from 'styled-components';
import { fmtNumber, fmtPercent } from '../format';
import { Table, TableWrap } from './ui';

export interface ShareRow {
  key: string;
  label: ReactNode;
  count: number;
  children?: ShareRow[];
}

// A ranked table with share bars: label · bar · count · % of total. Rows with
// children (sections) can be expanded to show the paths under them.
export function ShareTable({
  rows,
  total,
  labelHeader,
  expandable = false,
  defaultExpanded = false,
}: {
  rows: ShareRow[];
  total: number;
  labelHeader: string;
  expandable?: boolean;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const max = Math.max(1, ...rows.map((r) => r.count));
  const isOpen = (key: string) => open[key] ?? defaultExpanded;

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <th scope="col">{labelHeader}</th>
            <th scope="col" aria-label="share" />
            <th scope="col" className="num">Views</th>
            <th scope="col" className="num">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const hasChildren = expandable && row.children && row.children.length > 0;
            const expanded = hasChildren && isOpen(row.key);
            return [
              <tr key={row.key}>
                <td>
                  {hasChildren ? (
                    <Toggle
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen((o) => ({ ...o, [row.key]: !isOpen(row.key) }))}
                    >
                      <Chevron $open={!!expanded} aria-hidden="true">
                        ›
                      </Chevron>
                      {row.label}
                      <Count>{row.children!.length}</Count>
                    </Toggle>
                  ) : (
                    <Label>{row.label}</Label>
                  )}
                </td>
                <td>
                  <Bar>
                    <Fill style={{ width: `${(row.count / max) * 100}%` }} />
                  </Bar>
                </td>
                <td className="num">{fmtNumber(row.count)}</td>
                <td className="num">
                  <Share>{fmtPercent(row.count, total)}</Share>
                </td>
              </tr>,
              ...(expanded
                ? row.children!.map((child) => (
                    <ChildRow key={`${row.key}/${child.key}`}>
                      <td>
                        <Label>{child.label}</Label>
                      </td>
                      <td>
                        <Bar>
                          <Fill $soft style={{ width: `${(child.count / max) * 100}%` }} />
                        </Bar>
                      </td>
                      <td className="num">{fmtNumber(child.count)}</td>
                      <td className="num">
                        <Share>{fmtPercent(child.count, total)}</Share>
                      </td>
                    </ChildRow>
                  ))
                : []),
            ];
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}

const Label = styled.span`
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.84rem;
  overflow-wrap: anywhere;
`;

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  padding: 2px 0;
  min-height: 24px;
  cursor: pointer;
  font-weight: 600;
  color: var(--app-text-primary);

  &:hover {
    color: var(--app-red);
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-block;
  width: 12px;
  transform: rotate(${({ $open }) => ($open ? '90deg' : '0deg')});
  transition: transform 0.15s ease;
  color: var(--app-text-muted);
`;

const Count = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--app-text-muted);
  background: var(--app-gray-100);
  border-radius: 999px;
  padding: 0 7px;
`;

const ChildRow = styled.tr`
  td:first-child {
    padding-left: 30px;
  }
  td {
    background: var(--app-surface);
  }
`;

const Bar = styled.div`
  width: 100%;
  min-width: 90px;
  height: 8px;
  border-radius: 4px;
  background: var(--app-gray-100);
  overflow: hidden;
`;

const Fill = styled.div<{ $soft?: boolean }>`
  height: 100%;
  border-radius: 0 4px 4px 0;
  background: var(--viz-1);
  opacity: ${({ $soft }) => ($soft ? 0.55 : 1)};
  transition: width 0.3s ease;
`;

const Share = styled.span`
  color: var(--app-text-secondary);
`;
