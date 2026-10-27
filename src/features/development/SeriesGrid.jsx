import PageSection from '@/components/layout/PageSection.jsx';
import { ContentState, SeriesCard, SkeletonGroup } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

export const OTHER_HEADING_ID = 'series-other';

/**
 * „სხვა სერიები“ (SlidesPage დაფა): ყველა სერია, გარდა სლაიდერში მიმდინარისა — 6 ბარათი
 * (`SeriesCard` → `/development?series=:slug`). ბადე `mc-grid` (container query: 3 → 2 → 1).
 *
 * @param {object} props
 * @param {ReturnType<typeof import('@/hooks/useContent.js').useContent>} props.state  `listSeries()`
 * @param {string | null} props.currentSlug
 */
export default function SeriesGrid({ state, currentSlug }) {
  const others = (state.data ?? []).filter((series) => series.slug !== currentSlug);
  return (
    <PageSection
      headingId={OTHER_HEADING_ID}
      title={t('development.otherSeries')}
      tone="alt"
      className="mc-section--tight"
    >
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('development.otherSeries')}
        skeleton={<SkeletonGroup count={6} className="mc-grid" ratio="4:3" />}
        empty={others.length === 0}
        emptyText={t('development.otherEmpty')}
        focusId={OTHER_HEADING_ID}
      >
        {() => (
          <ul className="mc-grid" role="list">
            {others.map((series) => (
              <li key={series.slug}>
                <SeriesCard series={series} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
