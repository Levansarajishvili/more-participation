import { contentLang } from '@/content/localize.js';
import { useRef } from 'react';
import { useParams } from 'react-router';

import { usePageTitle } from '@/components/layout/usePageTitle.js';
import { Button, ContentState, Media, SaveToggle, Skeleton } from '@/components/ui/index.js';
import { getArticle } from '@/content/adapter.js';
import { label } from '@/content/taxonomy.js';
import ArticleBody from '@/features/articles/ArticleBody.jsx';
import ListenControl from '@/features/articles/ListenControl.jsx';
import ReadingHeader from '@/features/articles/ReadingHeader.jsx';
import RelatedArticles from '@/features/articles/RelatedArticles.jsx';
import ShareButton from '@/features/articles/ShareButton.jsx';
import { useContent } from '@/hooks/useContent.js';
import { useHeadingRefocus } from '@/hooks/useHeadingRefocus.js';
import { formatDate, t, toDateAttribute } from '@/i18n/index.js';

import '@/features/articles/articles.css';

const HEADING_ID = 'article-title';

/**
 * სტატიის გვერდი (`/articles/:slug`). დაფა არ არის — შაბლონი ტიპოგრაფიის წესით: ტექსტი 20/1.75,
 * სვეტი 36em (≤ 68 სიმბოლო), ცენტრში; სათაური, აღწერა და ფოტო იმავე სვეტშია.
 *
 * თავი: ბილიკი → კატეგორია → h1 → მოკლე აღწერა → ავტორი, `<time>`, კითხვის დრო → მოსმენა (აუდიო
 * ფაილი ან ქართული ხმა), გაზიარება, შენახვა. შემდეგ ფოტო, ტექსტი ბლოკებიდან და „მსგავსი სტატიები“.
 *
 * h1 პირველივე რენდერზეა („სტატია იტვირთება…“) და ერთი კვანძია ყველა მდგომარეობაში; ჩატვირთვის
 * შემდეგ ფოკუსი თავიდან ედება (`useHeadingRefocus`), `#listen`-ით — მოსმენის ღილაკზე.
 * `not-found` → „სტატია ვერ მოიძებნა“ (გარსის შიგნით, ბმული სიაზე); სხვა შეცდომა — „თავიდან ცდა“.
 */
export default function ArticlePage() {
  const { slug = '' } = useParams();
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const state = useContent(() => getArticle(slug), [slug]);
  const article = state.status === 'success' ? state.data : undefined;
  const notFound = state.status === 'error' && state.error?.code === 'not-found';

  let title = t('articles.loadingTitle');
  if (article) title = article.title;
  else if (notFound) title = t('articles.notFoundTitle');
  else if (state.status === 'error') title = t('articles.errorTitle');

  usePageTitle(article?.title ?? (notFound ? t('articles.notFoundTitle') : null));
  useHeadingRefocus(headingRef, state.status);

  return (
    <>
      <article aria-labelledby={HEADING_ID} className="mc-reading">
        <ReadingHeader
          headingRef={headingRef}
          headingId={HEADING_ID}
          title={contentLang(article) ? <span lang={contentLang(article)}>{title}</span> : title}
          breadcrumbs={[
            { to: '/', label: t('nav.home') },
            { to: '/articles', label: t('nav.articles') },
            { label: article?.title ?? title },
          ]}
          category={
            article && {
              to: `/articles?category=${article.category}`,
              label: label('articleCategory', article.category),
            }
          }
          lead={
            article &&
            (contentLang(article) ? (
              <>
                <span className="mc-card__lang">
                  {t(`common.inLanguage.${contentLang(article)}`)}
                </span>{' '}
                <span lang={contentLang(article)}>{article.excerpt}</span>
              </>
            ) : (
              article.excerpt
            ))
          }
          meta={
            article && (
              <>
                <span>
                  {t('articles.author')}: {article.author}
                </span>
                <span>
                  {t('articles.published')}:{' '}
                  <time dateTime={toDateAttribute(article.publishedAt)}>
                    {formatDate(article.publishedAt)}
                  </time>
                </span>
                {article.updatedAt && (
                  <span>
                    {t('articles.updated')}:{' '}
                    <time dateTime={toDateAttribute(article.updatedAt)}>
                      {formatDate(article.updatedAt)}
                    </time>
                  </span>
                )}
                <span>{t('articles.readingTime', { minutes: article.readingMinutes })}</span>
              </>
            )
          }
          toolsLabel={t('articles.tools')}
          tools={
            article && (
              <>
                <ListenControl
                  audio={article.audio}
                  title={article.title}
                  excerpt={article.excerpt}
                  bodyRef={bodyRef}
                />
                <ShareButton title={article.title} fieldLabel={t('articles.shareLabel')} />
                <SaveToggle slug={article.slug} title={article.title} variant="label" />
              </>
            )
          }
        >
          {!article && <ArticleFallback state={state} notFound={notFound} />}
        </ReadingHeader>
        {article && (
          <div className="site-container mc-reading__content">
            <div className="mc-reading__column">
              <Media
                image={article.cover}
                ratio="3:2"
                loading="eager"
                className="mc-reading__cover"
              />
              <ArticleBody ref={bodyRef} blocks={article.body} lang={contentLang(article)} />
              <p className="mc-reading__back">
                <Button variant="link" to="/articles">
                  {t('articles.backToList')}
                </Button>
              </p>
            </div>
          </div>
        )}
      </article>
      {article && <RelatedArticles slug={article.slug} category={article.category} />}
    </>
  );
}

/**
 * ჩატვირთვა / ვერ მოიძებნა / შეცდომა — h1-ის ქვემოთ.
 * @param {{ state: import('@/hooks/useContent.js').ContentState<unknown>, notFound: boolean }} props
 */
function ArticleFallback({ state, notFound }) {
  if (notFound) {
    return (
      <div className="mc-reading__fallback">
        <p className="mc-lead">{t('articles.notFoundText')}</p>
        <Button variant="primary" to="/articles">
          {t('articles.backToList')}
        </Button>
      </div>
    );
  }
  return (
    <ContentState
      status={state.status}
      error={state.error}
      onRetry={state.reload}
      label={t('nav.articles')}
      skeleton={<Skeleton variant="text" lines={6} />}
      className="mc-reading__fallback"
    >
      {() => null}
    </ContentState>
  );
}
