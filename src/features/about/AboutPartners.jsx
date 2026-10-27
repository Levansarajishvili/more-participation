import PageSection from '@/components/layout/PageSection.jsx';
import { Button, ContentState, PartnerCard, SkeletonGroup } from '@/components/ui/index.js';
import { getPartners } from '@/content/adapter.js';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

/** ფუტერის „პარტნიორები“ (`/about#partners`) ამ სათაურზე მოდის. */
export const PARTNERS_HEADING_ID = 'partners';

/**
 * კონტაქტის ფორმა თემით „პარტნიორობა“ (ტაქსონომიის id — `partnership`; F6-ის ფორმა თემას
 * `?topic=`-იდან ირჩევს).
 */
export const BECOME_PARTNER_HREF = '/contact?topic=partnership';

/**
 * პარტნიორები (AboutPage, alt ფონი): 12 `PartnerCard`, 6 სვეტი + CTA „გახდი პარტნიორი“
 * (ოქროსფერი — ქმედებაა, 56px).
 */
export default function AboutPartners() {
  const partners = useContent(() => getPartners(), []);
  const items = partners.data ?? [];
  return (
    <PageSection
      tone="alt"
      headingId={PARTNERS_HEADING_ID}
      title={t('about.partnersTitle')}
      lead={t('about.partnersLead')}
      action={
        <Button variant="cta" to={BECOME_PARTNER_HREF}>
          {t('about.becomePartner')}
        </Button>
      }
    >
      <ContentState
        status={partners.status}
        error={partners.error}
        onRetry={partners.reload}
        label={t('about.partnersTitle')}
        focusId={PARTNERS_HEADING_ID}
        skeleton={
          <SkeletonGroup count={12} variant="logo" lines={1} className="mc-grid mc-grid--6" />
        }
        empty={items.length === 0}
        emptyText={t('about.partnersEmpty')}
      >
        {() => (
          <ul className="mc-grid mc-grid--6">
            {items.map((partner) => (
              <li key={partner.slug}>
                <PartnerCard partner={partner} />
              </li>
            ))}
          </ul>
        )}
      </ContentState>
    </PageSection>
  );
}
