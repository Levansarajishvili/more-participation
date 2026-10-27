import { ContentState, NewsCard, Skeleton } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/**
 * რჩეული სიახლე (NewsPage დაფა) — მხოლოდ ფილტრის გარეშე. სათაური h2, მთელი ბარათი ბმულია სრულ
 * ტექსტზე (`/news/:slug`), მოქმედება (`action`: „განაცხადი“) — ცალკე ღილაკი.
 *
 * @param {{ state: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').NewsPage> }} props
 */
export default function FeaturedNews({ state }) {
  const item = state.data?.items[0];
  if (state.status === 'success' && !item) return null;
  return (
    <div className="site-container mc-block">
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('news.featured')}
        skeleton={<Skeleton variant="card" ratio="3:2" lines={4} />}
      >
        {() =>
          item && (
            <NewsCard item={item} variant="feature" headingLevel="h2" to={`/news/${item.slug}`} />
          )
        }
      </ContentState>
    </div>
  );
}
