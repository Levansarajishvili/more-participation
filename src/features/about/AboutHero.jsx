import PageHero from '@/components/layout/PageHero.jsx';
import { Breadcrumbs, Media } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

import { aboutHeroPhotos } from './about-media.js';

/**
 * „ჩვენ შესახებ“-ის ჰერო (AboutPage დაფა): ნავიგაციის ბილიკი, h1, ტექსტი და ორი ფოტო 1:1
 * (მეორე 32px-ით დაბლაა). ფოტოები მუქ ქვეხეშია — ჩანაცვლების ჩარჩო #0B1C33 / #8FA3BC,
 * ტექსტი #B8C7D9 (9.94:1).
 */
export default function AboutHero() {
  const [first, second] = aboutHeroPhotos();
  return (
    <PageHero
      headingId="about-title"
      asideTheme="dark"
      aside={
        <div className="mc-about-photos">
          <Media image={first} ratio="1:1" loading="eager" />
          <Media image={second} ratio="1:1" loading="eager" />
        </div>
      }
    >
      <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.about') }]} />
      <h1 id="about-title" className="text-h1">
        {t('about.heroTitle')}
      </h1>
      <p className="mc-lead">{t('about.heroLead')}</p>
    </PageHero>
  );
}
