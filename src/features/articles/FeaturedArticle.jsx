import {
  ArticleCard,
  Button,
  ContentState,
  Skeleton,
  VisuallyHidden,
} from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

/**
 * რჩეული სტატია (ArticlesPage დაფა) — მხოლოდ ფილტრის გარეშე; ფილტრისას ის ჩვეულებრივ შედეგებშია.
 * სათაური h2 (გვერდის სათაურების ხეში: h1 → h2 რჩეული → h2 „ყველა სტატია“). „მოუსმინე“ —
 * სტატიის გვერდის მოსმენის ღილაკზე (`#listen`). რჩეული თუ არ არის — ბლოკი არ ჩანს.
 *
 * @param {{ state: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').Page<import('@/content/model.js').ArticleSummary>> }} props
 */
export default function FeaturedArticle({ state }) {
  const article = state.data?.items[0];
  if (state.status === 'success' && !article) return null;
  return (
    <div className="site-container mc-block">
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('articles.featured')}
        skeleton={
          <Skeleton variant="card" ratio="3:2" lines={4} className="mc-skeleton--feature" />
        }
      >
        {() =>
          article && (
            <ArticleCard
              article={article}
              variant="feature"
              headingLevel="h2"
              actions={
                <Button variant="secondary" icon="listen" to={`/articles/${article.slug}#listen`}>
                  {t('articles.listen')}
                  <VisuallyHidden>: {article.title}</VisuallyHidden>
                </Button>
              }
            />
          )
        }
      </ContentState>
    </div>
  );
}
