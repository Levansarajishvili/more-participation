import PageSection from '@/components/layout/PageSection.jsx';
import { Button, ContentState, NewsCard, SkeletonGroup } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { HOME_LIMITS } from './useHomeContent.js';

const HEADING_ID = 'home-news-title';

/**
 * სიახლეები: 3 უახლესი, `NewsCard variant="compact"` (თარიღის ბლოკი, ფოტოს გარეშე).
 * ბარათი ბმული არ არის — სიახლის გვერდის როუტი F6-ში წყდება (F2, ღია საკითხი 2).
 *
 * @param {{ news: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').NewsPage> }} props
 */
export default function HomeNews({ news }) {
  const items = news.data?.items ?? [];
  return (
    <PageSection
      tone="alt"
      headingId={HEADING_ID}
      title={t('home.newsTitle')}
      lead={t('home.newsLead')}
      action={
        <Button variant="link" to="/news">
          {t('home.newsAll')}
        </Button>
      }
    >
      <ContentState
        status={news.status}
        error={news.error}
        onRetry={news.reload}
        label={t('home.newsTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup
            count={HOME_LIMITS.news}
            variant="tile"
            lines={3}
            className="mc-grid mc-home-limit-2"
          />
        }
        empty={items.length === 0}
        emptyText={t('home.newsEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-home-limit-2 mc-home-brief">
            {items.map((item) => (
              <li key={item.slug}>
                <NewsCard item={item} variant="compact" />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
