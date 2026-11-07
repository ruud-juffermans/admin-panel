import { useSearchParams } from 'react-router-dom';
import { useTwinApprovals } from '../api/queries';
import { Lead, Page, PageHeader, SegmentLink, Segmented, Title } from '../components/ui';
import { rangeLabel, useRange } from '../range';
import { ApprovalsTab } from './askruud/Approvals';
import { ConversationsTab } from './askruud/Conversations';
import { CostTab } from './askruud/Cost';
import { PromptsTab } from './askruud/Prompts';
import { EvalsTab } from './askruud/Evals';
import { PerformanceTab } from './askruud/Performance';
import { TwinOverviewTab } from './askruud/Overview';
import { SafetyTab } from './askruud/Safety';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'cost', label: 'Cost' },
  { id: 'performance', label: 'Performance' },
  { id: 'safety', label: 'Safety' },
  { id: 'evals', label: 'Evals' },
] as const;
type Tab = (typeof TABS)[number]['id'];

// Ask Ruud, the digital twin: what it did, what it cost, what it refused,
// what is waiting for a decision, and every conversation it had.
export function AskRuudPage() {
  const [params] = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as Tab;
  const { days } = useRange();
  const approvals = useTwinApprovals();
  const pending = approvals.data?.pending.length ?? 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Ask Ruud</Title>
          <Lead>The digital twin on ruudjuffermans.nl, {rangeLabel(days)}.</Lead>
        </div>
        <Segmented as="nav" aria-label="Ask Ruud section">
          {TABS.map((t) => (
            <SegmentLink key={t.id} to={t.id === 'overview' ? '/ask-ruud' : `/ask-ruud?tab=${t.id}`} $active={tab === t.id}>
              {t.label}
              {t.id === 'approvals' && pending > 0 && (
                <>
                  <span aria-hidden="true"> · {pending}</span>
                  <span className="sr-only">, {pending} pending</span>
                </>
              )}
            </SegmentLink>
          ))}
        </Segmented>
      </PageHeader>
      {tab === 'overview' && <TwinOverviewTab />}
      {tab === 'conversations' && <ConversationsTab />}
      {tab === 'prompts' && <PromptsTab />}
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'cost' && <CostTab />}
      {tab === 'performance' && <PerformanceTab />}
      {tab === 'safety' && <SafetyTab />}
      {tab === 'evals' && <EvalsTab />}
    </Page>
  );
}
