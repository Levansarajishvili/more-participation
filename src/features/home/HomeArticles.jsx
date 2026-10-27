import PageSection from '@/components/layout/PageSection.jsx';
import { ArticleCard, Button, ContentState, SkeletonGroup } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { HOME_LIMITS } from './useHomeContent.js';

const HEADING_ID = 'home-articles-title';

/**
 * სტატიები: 3 უახლესი (`listArticles({ limit: 3 })`, ნაგულისხმევი დალაგება — უახლესი),
 * შენახვის ღილაკით. alt ფონი.
 *
 * @param {{ articles: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').Page<import('@/content/model.js').ArticleSummary>> }} props
 */
export default function HomeArticles({ articles }) {
  const items = articles.data?.items ?? [];
  return (
    <PageSection
      tone="alt"
      headingId={HEADING_ID}
      title={t('home.articlesTitle')}
      lead={t('home.articlesLead')}
      action={
        <Button variant="link" to="/articles">
          {t('home.articlesAll')}
        </Button>
      }
    >
      <ContentState
        status={articles.status}
        error={articles.error}
        onRetry={articles.reload}
        label={t('home.articlesTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup
            count={HOME_LIMITS.articles}
            ratio="3:2"
            className="mc-grid mc-home-limit-2"
          />
        }
        empty={items.length === 0}
        emptyText={t('home.articlesEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-home-limit-2 mc-home-brief">
            {items.map((article) => (
              <li key={article.slug}>
                <ArticleCard article={article} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
