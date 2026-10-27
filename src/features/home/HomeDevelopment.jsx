import PageSection from '@/components/layout/PageSection.jsx';
import { Button, ContentState, SeriesCard, SkeletonGroup } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { HOME_LIMITS } from './useHomeContent.js';

const HEADING_ID = 'home-development-title';

/**
 * პიროვნული განვითარება: რჩეული სერია („ჩვევა — 5 ნაბიჯი“) + შემდეგი სამი თემის რიგით
 * (`listSeries()` რჩეულს პირველს აბრუნებს). ყდა ტიპოგრაფიულია და თემით არ იცვლება (§2).
 * მობილურზე ჰორიზონტალური ზოლის ნაცვლად ბადეა (WCAG 1.4.10).
 *
 * @param {{ series: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').SeriesSummary[]> }} props
 */
export default function HomeDevelopment({ series }) {
  const items = (series.data ?? []).slice(0, HOME_LIMITS.series);
  return (
    <PageSection
      headingId={HEADING_ID}
      title={t('home.developmentTitle')}
      lead={t('home.developmentLead')}
      action={
        <Button variant="link" to="/development">
          {t('home.developmentAll')}
        </Button>
      }
    >
      <ContentState
        status={series.status}
        error={series.error}
        onRetry={series.reload}
        label={t('home.developmentTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup
            count={HOME_LIMITS.series}
            ratio="4:3"
            className="mc-grid mc-grid--4 mc-home-limit-3"
          />
        }
        empty={items.length === 0}
        emptyText={t('home.developmentEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-grid--4 mc-series-grid mc-home-limit-3 mc-home-brief">
            {items.map((item) => (
              <li key={item.slug}>
                <SeriesCard series={item} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
