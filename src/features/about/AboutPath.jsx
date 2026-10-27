import PageSection from '@/components/layout/PageSection.jsx';
import { ContentState, SkeletonGroup } from '@/components/ui/index.js';
import { getStages } from '@/content/adapter.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

const HEADING_ID = 'about-path-title';

/**
 * „ჩვენი გზა“ (AboutPage, მუქი ზოლი): ეტაპები `<ol>`-ად — თანმიმდევრობაა. ყოველ ეტაპს 4px
 * ნარინჯისფერი ზედა ხაზი აქვს (`--mc-band` #FF8A3D, #0B2545-ზე 6.56:1; კონტრასტში #FFE600).
 * წელი და ტექსტი `getStages()`-იდანაა — mock-ში `[ფრჩხილებშია]`.
 */
export default function AboutPath() {
  const stages = useContent(() => getStages(), []);
  const items = stages.data ?? [];
  return (
    <PageSection tone="dark" headingId={HEADING_ID} title={t('about.pathTitle')}>
      <ContentState
        status={stages.status}
        error={stages.error}
        onRetry={stages.reload}
        label={t('about.pathTitle')}
        focusId={HEADING_ID}
        skeleton={
          <SkeletonGroup count={4} variant="text" lines={3} className="mc-grid mc-grid--4" />
        }
        empty={items.length === 0}
        emptyText={t('about.pathEmpty')}
      >
        {() => (
          <ol className="mc-grid mc-grid--4 mc-path">
            {items.map((stage) => (
              <li key={stage.id}>
                <div className="mc-path__item">
                  <p className="mc-path__year">{stage.year}</p>
                  <p className="mc-path__text">{stage.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </ContentState>
    </PageSection>
  );
}
