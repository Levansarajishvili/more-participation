import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs } from '@/components/ui/index.js';
import { listArticles } from '@/content/adapter.js';
import { ARTICLE_CATEGORIES, ARTICLE_SORTS } from '@/content/taxonomy.js';
import ArticleFilters from '@/features/articles/ArticleFilters.jsx';
import ArticleList, { LIST_HEADING_ID } from '@/features/articles/ArticleList.jsx';
import FeaturedArticle from '@/features/articles/FeaturedArticle.jsx';
import { articleFilterSummary } from '@/features/articles/filter-summary.js';
import SubscribeForm from '@/features/subscribe/SubscribeForm.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useLoadMore } from '@/hooks/useLoadMore.js';
import { useUrlFilters } from '@/hooks/useUrlFilters.js';
import { t } from '@/i18n/index.js';

import '@/features/articles/articles.css';

/**
 * სტატიები (`/articles`; ArticlesPage 1440, 390 — HomeMobile-ის პატერნებით, მობილური დაფა არ არის).
 * ბილიკი + h1 + ძიება და ფილტრები → რჩეული სტატია (მხოლოდ ფილტრის გარეშე) → ყველა სტატია (6 +
 * „მეტის ჩატვირთვა“) → გამოწერა.
 *
 * ფილტრი URL-შია: `?category=career&q=…&sort=shortest`; ფილტრის გარეშე რჩეული სიაში არ მეორდება
 * (`featured: false`), ფილტრისას კი ჩვეულებრივ შედეგია.
 */
export default function ArticlesPage() {
  const filters = useUrlFilters({ categories: ARTICLE_CATEGORIES, sorts: ARTICLE_SORTS });
  const { category, q, sort, active } = filters;

  const featured = useContent(() => listArticles({ featured: true, limit: 1 }), [], {
    enabled: !active,
  });
  const list = useLoadMore(
    (cursor) =>
      listArticles({
        category,
        q,
        sort: sort ?? 'newest',
        cursor,
        featured: active ? undefined : false,
      }),
    [category, q, sort, active],
  );

  // ფილტრის გარეშე „სულ“ რჩეულსაც ითვლის — სტატუსი ორივე პასუხს ელოდება (ერთი განცხადება)
  let statusText = null;
  if (active) {
    statusText = t('articles.foundIn', {
      count: list.total,
      filters: articleFilterSummary({ q, category, sort }),
    });
  } else if (featured.status !== 'loading') {
    statusText = t('articles.total', { count: list.total + (featured.data?.total ?? 0) });
  }

  const reset = () => {
    filters.reset();
    const heading = document.getElementById(LIST_HEADING_ID);
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.setAttribute('data-route-focus', '');
      heading.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <PageIntro headingId="articles-title">
        <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.articles') }]} />
        <h1 id="articles-title" className="text-h1">
          {t('articles.title')}
        </h1>
        <p className="mc-lead">{t('articles.lead')}</p>
        <ArticleFilters filters={filters} />
      </PageIntro>
      {!active && <FeaturedArticle state={featured} />}
      <ArticleList list={list} statusText={statusText} filtered={active} onReset={reset} />
      <div className="site-container mc-block mc-block--last">
        <SubscribeForm
          headingId="articles-subscribe-title"
          title={t('subscribe.articlesTitle')}
          text={t('subscribe.articlesText')}
          tone="dark"
        />
      </div>
    </>
  );
}
