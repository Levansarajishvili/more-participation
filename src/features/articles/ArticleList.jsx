import { useRef, useState } from 'react';

import PageSection from '@/components/layout/PageSection.jsx';
import {
  ArticleCard,
  Button,
  ContentState,
  LiveRegion,
  LoadMore,
  SkeletonGroup,
} from '@/components/ui/index.js';
import { useLoadMoreFocus } from '@/hooks/useLoadMoreFocus.js';
import { t } from '@/i18n/index.js';

export const LIST_HEADING_ID = 'articles-list-title';

/** @typedef {import('@/content/model.js').ArticleSummary} ArticleSummary */

/**
 * „ყველა სტატია“: შედეგების რაოდენობა (`role="status"`, ხილული — ფოკუსი არ გადადის), ბადე
 * 3 × 2, „მეტის ჩატვირთვა“ (ფოკუსი პირველ ახალ ბარათზე + „დაემატა {n}, სულ {n}“), ცარიელ
 * შედეგზე — ახსნა და „ფილტრების გასუფთავება“.
 *
 * რაოდენობის სტატუსი მხოლოდ მაშინ იცვლება, როცა ახალი შედეგი მოვიდა (ჩატვირთვისას ძველი რჩება) —
 * ეკრანის მკითხველი ერთ ცვლილებაზე ერთხელ ისმენს.
 *
 * @param {object} props
 * @param {import('@/hooks/useLoadMore.js').LoadMoreState<ArticleSummary, import('@/content/model.js').Page<ArticleSummary>>} props.list
 * @param {string | null} props.statusText  მზა წარწერა მიმდინარე ფილტრისთვის; null — ჯერ არ არის მზად
 * @param {boolean} props.filtered
 * @param {() => void} props.onReset
 */
export default function ArticleList({ list, statusText, filtered, onReset }) {
  const listRef = useRef(/** @type {HTMLUListElement | null} */ (null));
  const announcement = useLoadMoreFocus(list, listRef);
  const settled = list.status !== 'loading' && list.status !== 'idle';
  const [shownStatus, setShownStatus] = useState('');
  if (settled && list.status !== 'error' && statusText !== null && statusText !== shownStatus) {
    setShownStatus(statusText);
  }

  // „მეტის“ შეცდომა სიას არ შლის — ბლოკი success-ად რჩება, შეცდომას LoadMore აჩვენებს
  const blockStatus =
    list.status === 'loading-more' || (list.status === 'error' && list.items.length > 0)
      ? 'success'
      : list.status;

  return (
    <PageSection
      headingId={LIST_HEADING_ID}
      title={t('articles.listTitle')}
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
        label={t('articles.listTitle')}
        focusId={LIST_HEADING_ID}
        skeleton={<SkeletonGroup count={6} ratio="3:2" className="mc-grid" />}
        empty={list.total === 0}
        emptyText={
          <>
            <span>{t('articles.empty')}</span>
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
            <ul ref={listRef} className="mc-grid">
              {list.items.map((article) => (
                <li key={article.slug}>
                  <ArticleCard article={article} />
                </li>
              ))}
            </ul>
            <LoadMore
              status={list.status}
              hasMore={list.hasMore}
              onLoadMore={list.loadMore}
              shown={list.items.length}
              total={list.total}
              error={list.status === 'error' ? list.error : null}
              label={t('nav.articles')}
            />
          </>
        )}
      </ContentState>
      <LiveRegion>{announcement}</LiveRegion>
    </PageSection>
  );
}
