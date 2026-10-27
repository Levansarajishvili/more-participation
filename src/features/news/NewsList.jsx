import { useRef, useState } from 'react';

import PageSection from '@/components/layout/PageSection.jsx';
import {
  Button,
  ContentState,
  LiveRegion,
  LoadMore,
  NewsCard,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { useLoadMoreFocus } from '@/hooks/useLoadMoreFocus.js';
import { t } from '@/i18n/index.js';

export const NEWS_LIST_HEADING_ID = 'news-list-title';

/** @typedef {import('@/content/model.js').NewsSummary} NewsSummary */

/**
 * „ყველა სიახლე“ (NewsPage დაფა): ქრონოლოგიური სია `<ol>` (უახლესი ზემოთ), თითო ელემენტი —
 * `NewsCard variant="list"` (`<time datetime>`, ბმული `/news/:slug`-ზე). რაოდენობა `role="status"`-ით
 * სათაურის გვერდით, „მეტის ჩატვირთვა“ — ფოკუსი პირველ ახალ სიახლეზე + „დაემატა {n}, სულ {n}“.
 *
 * @param {object} props
 * @param {import('@/hooks/useLoadMore.js').LoadMoreState<NewsSummary, import('@/content/model.js').NewsPage>} props.list
 * @param {string | null} props.statusText
 * @param {boolean} props.filtered
 * @param {() => void} props.onReset
 */
export default function NewsList({ list, statusText, filtered, onReset }) {
  const listRef = useRef(/** @type {HTMLOListElement | null} */ (null));
  const announcement = useLoadMoreFocus(list, listRef);
  const settled = list.status !== 'loading' && list.status !== 'idle';
  const [shownStatus, setShownStatus] = useState('');
  if (settled && list.status !== 'error' && statusText !== null && statusText !== shownStatus) {
    setShownStatus(statusText);
  }
  const blockStatus =
    list.status === 'loading-more' || (list.status === 'error' && list.items.length > 0)
      ? 'success'
      : list.status;

  return (
    <PageSection
      headingId={NEWS_LIST_HEADING_ID}
      title={t('news.all')}
      className="mc-section--tight"
      action={
        <>
          <LiveRegion visible as="p" className="mc-result-status">
            {shownStatus}
          </LiveRegion>
          {filtered && (
            <Button variant="link" icon="reset" onClick={onReset}>
              {t('common.filtersReset')}
            </Button>
          )}
        </>
      }
    >
      <ContentState
        status={blockStatus}
        error={list.error}
        onRetry={list.reload}
        label={t('news.all')}
        focusId={NEWS_LIST_HEADING_ID}
        skeleton={<SkeletonGroup count={6} variant="tile" lines={3} className="mc-news-list" />}
        empty={list.total === 0}
        emptyText={
          <>
            <span>{t('news.empty')}</span>
            {filtered && (
              <Button variant="secondary" size="sm" icon="reset" onClick={onReset}>
                {t('common.filtersReset')}
              </Button>
            )}
          </>
        }
      >
        {() => (
          <>
            <ol ref={listRef} className="mc-news-list">
              {list.items.map((item) => (
                <li key={item.slug}>
                  <NewsCard item={item} variant="list" to={`/news/${item.slug}`} />
                </li>
              ))}
            </ol>
            <LoadMore
              status={list.status}
              hasMore={list.hasMore}
              onLoadMore={list.loadMore}
              shown={list.items.length}
              total={list.total}
              error={list.status === 'error' ? list.error : null}
              label={t('nav.news')}
            />
          </>
        )}
      </ContentState>
      <LiveRegion>{announcement}</LiveRegion>
    </PageSection>
  );
}
