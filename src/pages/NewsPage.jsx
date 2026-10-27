import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs } from '@/components/ui/index.js';
import { listNews } from '@/content/adapter.js';
import { NEWS_TYPES } from '@/content/taxonomy.js';
import { newsFilterSummary } from '@/features/articles/filter-summary.js';
import FeaturedNews from '@/features/news/FeaturedNews.jsx';
import NewsFilters from '@/features/news/NewsFilters.jsx';
import NewsList, { NEWS_LIST_HEADING_ID } from '@/features/news/NewsList.jsx';
import UpcomingEvents from '@/features/news/UpcomingEvents.jsx';
import SubscribeForm from '@/features/subscribe/SubscribeForm.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useLoadMore } from '@/hooks/useLoadMore.js';
import { useUrlFilters } from '@/hooks/useUrlFilters.js';
import { t } from '@/i18n/index.js';

import '@/features/news/news.css';

/**
 * სიახლეები (`/news`; NewsPage 1440, 390 — HomeMobile-ის პატერნებით, მობილური დაფა არ არის).
 * ბილიკი + h1 + ტიპი და წელი → რჩეული სიახლე (ფილტრის გარეშე) → ყველა სიახლე (`<ol>`, 6 +
 * „მეტის ჩატვირთვა“) → მომავალი ღონისძიებები (ხელმისაწვდომობის ნიშნებით) → გამოწერა.
 * ფილტრი URL-შია: `?category=event&year=2025`.
 */
export default function NewsPage() {
  const filters = useUrlFilters({ categories: NEWS_TYPES });
  const { category: type, year, active } = filters;

  const featured = useContent(() => listNews({ featured: true, limit: 1 }), [], {
    enabled: !active,
  });
  const list = useLoadMore(
    (cursor) => listNews({ type, year, cursor, featured: active ? undefined : false }),
    [type, year, active],
  );

  let statusText = null;
  if (active) {
    statusText = t('news.foundIn', {
      count: list.total,
      filters: newsFilterSummary({ type, year }),
    });
  } else if (featured.status !== 'loading') {
    statusText = t('news.total', { count: list.total + (featured.data?.total ?? 0) });
  }

  const reset = () => {
    filters.reset();
    const heading = document.getElementById(NEWS_LIST_HEADING_ID);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.setAttribute('data-route-focus', '');
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <PageIntro headingId="news-title">
        <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.news') }]} />
        <h1 id="news-title" className="text-h1">
          {t('news.title')}
        </h1>
        <p className="mc-lead">{t('news.lead')}</p>
        <NewsFilters filters={filters} years={list.meta?.years ?? []} />
      </PageIntro>
      {!active && <FeaturedNews state={featured} />}
      <NewsList list={list} statusText={statusText} filtered={active} onReset={reset} />
      <UpcomingEvents />
      <div className="site-container mc-block mc-block--last mc-block--after-band">
        <SubscribeForm
          headingId="news-subscribe-title"
          title={t('subscribe.newsTitle')}
          text={t('subscribe.newsText')}
          tone="card"
        />
      </div>
    </>
  );
}
