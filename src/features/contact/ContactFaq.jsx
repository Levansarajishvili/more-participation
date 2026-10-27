import PageSection from '@/components/layout/PageSection.jsx';
import { Accordion, ContentState, SkeletonGroup } from '@/components/ui/index.js';
import { t } from '@/i18n/index.js';

const HEADING_ID = 'contact-faq-title';

/**
 * ხშირი კითხვები (ContactPage დაფა) — UI ნაკრების `Accordion` (APG: `aria-expanded`,
 * `aria-controls`, ↑ ↓ Home End; „+“ 45°, reduced-motion-ში მყისიერად). კითხვები h3-ია.
 *
 * @param {{ state: import('@/hooks/useContent.js').ContentState<import('@/content/model.js').SiteSettings> }} props
 */
export default function ContactFaq({ state }) {
  const faq = state.data?.faq ?? [];
  return (
    <PageSection headingId={HEADING_ID} title={t('contact.faqTitle')} className="mc-section--tight">
      <ContentState
        status={state.status}
        error={state.error}
        onRetry={state.reload}
        label={t('contact.faqTitle')}
        focusId={HEADING_ID}
        skeleton={<SkeletonGroup count={3} variant="text" lines={1} className="mc-contact-faq" />}
        empty={faq.length === 0}
        emptyText={t('contact.faqEmpty')}
      >
        {() => (
          <Accordion
            className="mc-contact-faq"
            items={faq.map((item) => ({
              id: item.id,
              title: item.question,
              content: <p>{item.answer}</p>,
            }))}
          />
        )}
      </ContentState>
    </PageSection>
  );
}
