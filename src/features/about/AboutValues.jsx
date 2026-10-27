import PageSection from '@/components/layout/PageSection.jsx';
import { Card } from '@/components/ui/index.js';
import { ORG_VALUES } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

/**
 * ექვსი ღირებულება (§1, AboutPage): ბარათი სათაურით (h3) და ტექსტით, 3 სვეტი.
 * დაფის 01–06 ნომრები ამოღებულია — ღირებულებები თანმიმდევრობა არ არის, ფერადი წრეები კი
 * #FFB81C-ს (მხოლოდ CTA) და #13A06F-ს (მხოლოდ ზრდა) იყენებდა.
 */
export default function AboutValues() {
  return (
    <PageSection
      tone="alt"
      headingId="about-values-title"
      title={t('about.valuesTitle')}
      lead={t('about.valuesLead')}
    >
      <ul className="mc-grid mc-values">
        {ORG_VALUES.map((id) => (
          <li key={id}>
            <Card as="div" title={t(`about.values.${id}.title`)}>
              <p>{t(`about.values.${id}.text`)}</p>
            </Card>
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
