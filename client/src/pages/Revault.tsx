import { useSearchParams } from 'react-router-dom';
import { useRevaultIntakeStats } from '../api/queries';
import { Lead, Page, PageHeader, SegmentLink, Segmented, Title } from '../components/ui';
import { rangeLabel, useRange } from '../range';
import { RevaultIntakes } from './revault/Intakes';
import { RevaultNewsletter } from './revault/Newsletter';
import { RevaultTraffic } from './revault/Traffic';
import { isRevaultUnavailable } from './revault/shared';

type Tab = 'intakes' | 'newsletter' | 'traffic';

// revault.nl in one place: intake requests (the free-assessment form),
// newsletter signups and traffic. The tab lives in the URL (?tab=).
export function RevaultPage() {
  const [params] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'newsletter' ? 'newsletter' : raw === 'traffic' ? 'traffic' : 'intakes';
  const stats = useRevaultIntakeStats();
  const newCount = stats.data?.counts.NEW ?? 0;
  const { days } = useRange();
  const lead = stats.error && isRevaultUnavailable(stats.error)
    ? 'Revault is unavailable right now.'
    : tab === 'traffic'
      ? `Traffic on revault.nl, ${rangeLabel(days)}.`
      : newCount === 0
        ? 'No new intake requests.'
        : `${newCount} new intake request${newCount === 1 ? '' : 's'} waiting for an assessment.`;

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Revault</Title>
          <Lead>{lead}</Lead>
        </div>
        <Segmented as="nav" aria-label="Revault section">
          <SegmentLink to="/revault" $active={tab === 'intakes'}>
            Intakes{newCount > 0 ? ` · ${newCount}` : ''}
          </SegmentLink>
          <SegmentLink to="/revault?tab=newsletter" $active={tab === 'newsletter'}>
            Newsletter
          </SegmentLink>
          <SegmentLink to="/revault?tab=traffic" $active={tab === 'traffic'}>
            Traffic
          </SegmentLink>
        </Segmented>
      </PageHeader>
      {tab === 'intakes' && <RevaultIntakes />}
      {tab === 'newsletter' && <RevaultNewsletter />}
      {tab === 'traffic' && <RevaultTraffic />}
    </Page>
  );
}
