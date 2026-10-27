import PageSection from '@/components/layout/PageSection.jsx';
import { ArticleCard, Button, ContentState, SkeletonGroup } from '@/components/ui/index.js';
import { listArticles } from '@/content/adapter.js';
import { label } from '@/content/taxonomy.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

const HEADING_ID = 'related-title';
export const RELATED_LIMIT = 3;

/**
 * მსგავსი სტატიები: იმავე კატეგორიის 3 უახლესი, მიმდინარე სტატიის გარეშე. ბმული „ყველა სტატია —
 * {კატეგორია}“ ფილტრიან სიაზე მიდის (`/articles?category=…`).
 *
 * @param {{ slug: string, category: import('@/content/taxonomy.js').ArticleCategory }} props
 */
export default function RelatedArticles({ slug, category }) {
  const related = useContent(
    () => listArticles({ category, limit: RELATED_LIMIT + 1 }),
    [category],
  );
  const items = (related.data?.items ?? []).filter((a) => a.slug !== slug).slice(0, RELATED_LIMIT);
  return (
    <PageSection
      tone="alt"
      headingId={HEADING_ID}
      title={t('articles.related')}
      action={
        <Button variant="link" to={`/articles?category=${category}`}>
          {t('articles.relatedAll', { category: label('articleCategory', category) })}
        </Button>
      }
    >
      <ContentState
        status={related.status}
        error={related.error}
        onRetry={related.reload}
        label={t('articles.related')}
        focusId={HEADING_ID}
        skeleton={<SkeletonGroup count={RELATED_LIMIT} ratio="3:2" className="mc-grid" />}
        empty={items.length === 0}
        emptyText={t('articles.relatedEmpty')}
      >
        {() => (
          <ul className="mc-grid">
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
