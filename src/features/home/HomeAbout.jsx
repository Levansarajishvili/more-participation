import PageSection from '@/components/layout/PageSection.jsx';
import { Button } from '@/components/ui/index.js';
import PillarList from '@/features/about/PillarList.jsx';
import { t } from '@/i18n/index.js';

/**
 * „ჩვენ შესახებ“ მთავარზე (HomePage / HomeMobile): წარწერა, სათაური, ტექსტი, ბმული `/about` და
 * სამი მიმართულება. ვიწრო კონტეინერში მიმართულებები ჩიპებად იკეცება (HomeMobile), ტექსტი —
 * `/about`-ზე. სტატიკური ტექსტია (i18n) — ჩატვირთვის მდგომარეობა არ სჭირდება.
 */
export default function HomeAbout() {
  return (
    <PageSection
      split
      headingId="home-about-title"
      eyebrow={t('home.aboutTitle')}
      title={t('about.heroTitle')}
      lead={t('home.aboutLead')}
      action={
        <Button variant="link" to="/about">
          {t('home.aboutLink')}
        </Button>
      }
    >
      <PillarList compact />
    </PageSection>
  );
}
