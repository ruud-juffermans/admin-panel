import { useSearchParams } from 'react-router-dom';
import { useContactStats, useTwinContactMessages } from '../api/queries';
import { useRange } from '../range';
import { Lead, Page, PageHeader, SegmentLink, Segmented, Title } from '../components/ui';
import { ContactInbox } from './inbox/ContactInbox';
import { NewsletterInbox } from './inbox/NewsletterInbox';
import { TwinInbox } from './inbox/TwinInbox';

type Tab = 'contact' | 'newsletter' | 'twin';

// The inbox: contact-form messages and newsletter subscribers. The tab lives
// in the URL (?tab=) so the phone's back button behaves.
export function InboxPage() {
  const [params] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = raw === 'newsletter' ? 'newsletter' : raw === 'twin' ? 'twin' : 'contact';
  const stats = useContactStats();
  const newCount = stats.data?.counts.new ?? 0;
  const { days } = useRange();
  const twinMessages = useTwinContactMessages(days);
  const twinCount = twinMessages.data?.items.length ?? 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <Title>Inbox</Title>
          <Lead>{newCount === 0 ? 'No unanswered messages.' : `${newCount} new message${newCount === 1 ? '' : 's'} waiting.`}</Lead>
        </div>
        <Segmented as="nav" aria-label="Inbox section">
          <SegmentLink to="/inbox" $active={tab === 'contact'}>
            Contact{newCount > 0 ? ` · ${newCount}` : ''}
          </SegmentLink>
          <SegmentLink to="/inbox?tab=newsletter" $active={tab === 'newsletter'}>
            Newsletter
          </SegmentLink>
          <SegmentLink to="/inbox?tab=twin" $active={tab === 'twin'}>
            Ask Ruud{twinCount > 0 ? ` · ${twinCount}` : ''}
          </SegmentLink>
        </Segmented>
      </PageHeader>
      {tab === 'contact' && <ContactInbox />}
      {tab === 'newsletter' && <NewsletterInbox />}
      {tab === 'twin' && <TwinInbox />}
    </Page>
  );
}
