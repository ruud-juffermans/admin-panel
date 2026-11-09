import { Lead, Page, PageHeader, Title } from '../components/ui';
import { rangeLabel, useRange } from '../range';
import { SiteTraffic } from './site/SiteTraffic';

// loodgieterjuffermans.nl, the plumbing business: a Dutch-only static site
// without forms, so traffic (and where it comes from) is the whole story.
export function LoodgieterPage() {
  const { days } = useRange();
  return (
    <Page>
      <PageHeader>
        <div>
          <Title>loodgieterjuffermans.nl</Title>
          <Lead>Traffic on the plumbing site, {rangeLabel(days)}.</Lead>
        </div>
      </PageHeader>
      <SiteTraffic site="loodgieterjuffermans.nl" />
    </Page>
  );
}
