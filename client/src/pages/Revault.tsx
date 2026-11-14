import { useSearchParams } from 'react-router-dom';
import { useRevaultIntakeStats } from '../api/queries';
import { Lead, Page, PageHeader, SegmentLink, Segmented, Title } from '../components/ui';
import { rangeLabel, useRange } from '../range';
import { RevaultIntakes } from './revault/Intakes';
import { RevaultNewsletter } from './revault/Newsletter';
import { SiteTraffic } from './site/SiteTraffic';
import { isRevaultUnavailable } from './revault/shared';

type Tab = 'intakes' | 'newsletter' | 'traffic';

// revault.nl in one place. Like the other two sites the page opens on its
// traffic; intake requests (the free-assessment form) and newsletter signups
// are the other tabs. The tab lives in the URL (?tab=).
export function RevaultPage() {
  const [params] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'newsletter' ? 'newsletter' : raw === 'intakes' ? 'intakes' : 'traffic';
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
          <SegmentLink to="/revault" $active={tab === 'traffic'}>
            Traffic
          </SegmentLink>
          <SegmentLink to="/revault?tab=intakes" $active={tab === 'intakes'}>
            Intakes{newCount > 0 ? ` · ${newCount}` : ''}
          </SegmentLink>
          <SegmentLink to="/revault?tab=newsletter" $active={tab === 'newsletter'}>
            Newsletter
          </SegmentLink>
        </Segmented>
      </PageHeader>
      {tab === 'traffic' && <SiteTraffic site="revault.nl" locales />}
      {tab === 'intakes' && <RevaultIntakes />}
      {tab === 'newsletter' && <RevaultNewsletter />}
    </Page>
  );
}
