import PageSection from '@/components/layout/PageSection.jsx';
import { ContentState, EventCard, SkeletonGroup } from '@/components/ui/index.js';
import { listEvents } from '@/content/adapter.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

const HEADING_ID = 'news-events-title';

/**
 * მომავალი ღონისძიებები (NewsPage დაფა): თარიღის ბლოკი, დრო (Asia/Tbilisi), ადგილი,
 * ხელმისაწვდომობის ნიშნები (`A11yBadge` — ფორმატი, ეტლი, ჟესტური ენა, სუბტიტრები; ხატულა + ტექსტი
 * + ჩარჩო, მწვანის გარეშე) და რეგისტრაცია. მუქი ზოლი (F5-ის ვიდეო-ისტორიების პატერნი) —
 * დაფის ლურჯი ბარათები; ორი სვეტი, რომ ნიშნები ერთ ხაზზე დაეტიოს.
 */
export default function UpcomingEvents() {
  const events = useContent(() => listEvents({ upcoming: true }), []);
  const items = events.data ?? [];
  return (
    <PageSection
      tone="dark"
      headingId={HEADING_ID}
      title={t('news.eventsTitle')}
      lead={t('news.eventsLead')}
    >
      <ContentState
        status={events.status}
        error={events.error}
        onRetry={events.reload}
        label={t('news.eventsTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup count={2} variant="tile" lines={4} className="mc-grid mc-news-events" />
        }
        empty={items.length === 0}
        emptyText={t('news.eventsEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-news-events">
            {items.map((event) => (
              <li key={event.slug}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
