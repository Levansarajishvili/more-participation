import PageSection from '@/components/layout/PageSection.jsx';
import { t } from '@/i18n/index.js';

import PillarList from './PillarList.jsx';

/** მისია და სამი მიმართულება (AboutPage): მარცხნივ მისიის ტექსტი (20/1.75), მარჯვნივ ბარათები. */
export default function AboutMission() {
  return (
    <PageSection
      split
      headingId="about-mission-title"
      title={t('about.missionTitle')}
      intro={
        <>
          <p className="mc-mission__text">{t('about.mission')}</p>
          <p className="mc-mission__note">{t('about.missionNote')}</p>
        </>
      }
    >
      <PillarList />
    </PageSection>
  );
}
