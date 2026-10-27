import { useRef } from 'react';
import { useParams } from 'react-router';

import { usePageTitle } from '@/components/layout/usePageTitle.js';
import { Button, ContentState, Media, Skeleton } from '@/components/ui/index.js';
import { getNews } from '@/content/adapter.js';
import { label } from '@/content/taxonomy.js';
import ArticleBody from '@/features/articles/ArticleBody.jsx';
import ReadingHeader from '@/features/articles/ReadingHeader.jsx';
import ShareButton from '@/features/articles/ShareButton.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useHeadingRefocus } from '@/hooks/useHeadingRefocus.js';
import { formatDate, t, toDateAttribute } from '@/i18n/index.js';

const HEADING_ID = 'news-item-title';

/**
 * სიახლის გვერდი (`/news/:slug`; F6-ის გადაწყვეტილება — §9.5). სტატიის შაბლონს იყენებს
 * (`ReadingHeader`, `ArticleBody`, `ShareButton`): ბილიკი → ტიპი (ბმული ფილტრიან სიაზე) → h1 →
 * მოკლე აღწერა → `<time>` → მოქმედება (`action`, `href: null` → გათიშული) და გაზიარება → ფოტო →
 * ტექსტი. h1 პირველივე რენდერზეა და ერთი კვანძია (`useHeadingRefocus`).
 */
export default function NewsItemPage() {
  const { slug = '' } = useParams();
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const state = useContent(() => getNews(slug), [slug]);
  const item = state.status === 'success' ? state.data : undefined;
  const notFound = state.status === 'error' && state.error?.code === 'not-found';

  let title = t('news.loadingTitle');
  if (item) title = item.title;
  else if (notFound) title = t('news.notFoundTitle');
  else if (state.status === 'error') title = t('news.errorTitle');

  usePageTitle(item?.title ?? (notFound ? t('news.notFoundTitle') : null));
  useHeadingRefocus(headingRef, state.status);

  return (
    <article aria-labelledby={HEADING_ID} className="mc-reading">
      <ReadingHeader
        headingRef={headingRef}
        headingId={HEADING_ID}
        title={title}
        breadcrumbs={[
          { to: '/', label: t('nav.home') },
          { to: '/news', label: t('nav.news') },
          { label: item?.title ?? title },
        ]}
        category={
          item && { to: `/news?category=${item.type}`, label: label('newsType', item.type) }
        }
        lead={item?.excerpt}
        meta={
          item && (
            <span>
              {t('articles.published')}:{' '}
              <time dateTime={toDateAttribute(item.publishedAt)}>
                {formatDate(item.publishedAt)}
              </time>
            </span>
          )
        }
        toolsLabel={t('news.tools')}
        tools={
          item && (
            <>
              {item.action && (
                <Button
                  variant="primary"
                  href={item.action.href ?? undefined}
                  newTab={Boolean(item.action.href?.startsWith('http'))}
                  disabled={!item.action.href}
                  disabledReason={t('footer.linkPending')}
                >
                  {item.action.text}
                </Button>
              )}
              <ShareButton title={item.title} fieldLabel={t('news.shareLabel')} />
            </>
          )
        }
      >
        {!item &&
          (notFound ? (
            <div className="mc-reading__fallback">
              <p className="mc-lead">{t('news.notFoundText')}</p>
              <Button variant="primary" to="/news">
                {t('news.backToList')}
              </Button>
            </div>
          ) : (
            <ContentState
              status={state.status}
              error={state.error}
              onRetry={state.reload}
              label={t('nav.news')}
              skeleton={<Skeleton variant="text" lines={6} />}
              className="mc-reading__fallback"
            >
              {() => null}
            </ContentState>
          ))}
      </ReadingHeader>
      {item && (
        <div className="site-container mc-reading__content">
          <div className="mc-reading__column">
            <Media image={item.cover} ratio="3:2" loading="eager" className="mc-reading__cover" />
            <ArticleBody blocks={item.body} />
            <p className="mc-reading__back">
              <Button variant="link" to="/news">
                {t('news.backToList')}
              </Button>
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
