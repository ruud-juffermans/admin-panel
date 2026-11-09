import { Lead, Page, PageHeader, Title } from '../components/ui';
import { rangeLabel, useRange } from '../range';
import { SiteTraffic } from './site/SiteTraffic';

// ruudjuffermans.nl, the portfolio: bilingual, so the locale split is shown.
export function SitePage() {
  const { days } = useRange();
  return (
    <Page>
      <PageHeader>
        <div>
          <Title>ruudjuffermans.nl</Title>
          <Lead>Traffic on the portfolio site, {rangeLabel(days)}.</Lead>
        </div>
      </PageHeader>
      <SiteTraffic site="ruudjuffermans.nl" locales />
    </Page>
  );
}
