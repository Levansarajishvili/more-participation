import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs } from '@/components/ui/index.js';
import { getSettings } from '@/content/adapter.js';
import ContactChannels from '@/features/contact/ContactChannels.jsx';
import ContactFaq from '@/features/contact/ContactFaq.jsx';
import ContactForm from '@/features/contact/ContactForm.jsx';
import OfficeInfo from '@/features/contact/OfficeInfo.jsx';
import { useContent } from '@/hooks/useContent.js';
import { t } from '@/i18n/index.js';

import '@/features/contact/contact.css';

/**
 * კონტაქტი (`/contact`; ContactPage 1440, 390 — HomeMobile-ის პატერნებით, მობილური დაფა არ არის).
 * ბილიკი + h1 + lead (პასუხის ვადა `SiteSettings`-იდან) → ხუთი არხი → ფორმა (7fr) | რუკა, ოფისის
 * ხელმისაწვდომობა, სამუშაო საათები (5fr) → ხშირი კითხვები.
 *
 * ფორმა პარამეტრების ჩატვირთვას არ ელოდება (კონფიდენციალურობის ბმული და ვადა მერე ემატება).
 * `?topic=partnership` / `?topic=barrier` თემას წინასწარ ირჩევს.
 */
export default function ContactPage() {
  const settings = useContent(() => getSettings(), []);
  const responseTime = settings.data?.responseTime;
  return (
    <>
      <PageIntro headingId="contact-title">
        <Breadcrumbs items={[{ to: '/', label: t('nav.home') }, { label: t('nav.contact') }]} />
        <h1 id="contact-title" className="text-h1">
          {t('contact.title')}
        </h1>
        <p className="mc-lead">
          {t('contact.lead')}
          {responseTime && <> {t('contact.leadReply', { responseTime })}</>}
        </p>
      </PageIntro>
      <ContactChannels state={settings} />
      <div className="site-container mc-block">
        <div className="mc-contact-layout">
          <ContactForm settings={settings.data} />
          <OfficeInfo state={settings} />
        </div>
      </div>
      <ContactFaq state={settings} />
    </>
  );
}
