import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PRESETS, useRange } from '../range';
import { Input, Segment, Segmented } from './ui';

// The global date range control: 7 / 30 / 90 days or a custom day count.
export function RangePicker() {
  const { days, setDays } = useRange();
  const isPreset = (PRESETS as readonly number[]).includes(days);
  const [custom, setCustom] = useState(isPreset ? false : true);
  const [draft, setDraft] = useState(String(days));

  useEffect(() => {
    setDraft(String(days));
  }, [days]);

  return (
    <Row>
      <Segmented role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <Segment
            key={p}
            type="button"
            $active={!custom && days === p}
            onClick={() => {
              setCustom(false);
              setDays(p);
            }}
          >
            {p}d
          </Segment>
        ))}
        <Segment type="button" $active={custom} onClick={() => setCustom(true)}>
          Custom
        </Segment>
      </Segmented>
      {custom && (
        <CustomForm
          onSubmit={(e) => {
            e.preventDefault();
            setDays(Number(draft));
          }}
        >
          <Input
            type="number"
            min={1}
            max={365}
            value={draft}
            aria-label="Number of days"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setDays(Number(draft))}
            style={{ width: 80 }}
          />
          <span>days</span>
        </CustomForm>
      )}
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`;

const CustomForm = styled.form`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--app-text-secondary);
`;
