import { Button, ContentState, PendingLink, Skeleton } from '@/components/ui/index.js';
import { label } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

/** @typedef {import('@/content/model.js').SiteSettings} SiteSettings */

/**
 * კონტაქტის გვერდითი სვეტი (ContactPage დაფა): რუკა, ოფისის ხელმისაწვდომობა, სამუშაო საათები.
 *
 * რუკა: iframe მხოლოდ მაშინ, როცა `address.embedUrl`-იც და ტექსტური ალტერნატივაც
 * (`address.directions`) არის — ტექსტი `figcaption`-ში ყოველთვის ხილულია (მისამართი + როგორ
 * მოგვაგნო + „რუკაზე ნახვა“). ჩანაცვლების ჩარჩო `aria-hidden` — ინფორმაცია ტექსტშია.
 *
 * ოფისის ხელმისაწვდომობა — `<dl>` (პუნქტი → სტატუსი `[ფრჩხილებში]`, სანამ რეალური არ არის).
 * დაფის მწვანე ✓ ხატულები არ ედება: სტატუსი ჯერ დაუდასტურებელია და ✓ მას ფაქტად აჩვენებდა;
 * მწვანე მხოლოდ ზრდა / წარმატებაა.
 *
 * @param {{ state: import('@/hooks/useContent.js').ContentState<SiteSettings> }} props
 */
export default function OfficeInfo({ state }) {
  return (
    <ContentState
      status={state.status}
      error={state.error}
      onRetry={state.reload}
      label={t('contact.officeTitle')}
      skeleton={<Skeleton variant="text" lines={8} />}
      className="mc-contact-aside"
    >
      {() => state.data && <OfficeDetails settings={state.data} />}
    </ContentState>
  );
}

/** @param {{ settings: SiteSettings }} props */
function OfficeDetails({ settings }) {
  const { address } = settings.contacts;
  const embed = address.embedUrl && address.directions ? address.embedUrl : null;
  return (
    <>
      <figure className="mc-contact-map">
        {embed ? (
          <iframe
            src={embed}
            title={t('contact.map')}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mc-contact-map__frame"
          />
        ) : (
          <div className="mc-contact-map__placeholder" aria-hidden="true">
            {t('contact.mapPlaceholder')}
          </div>
        )}
        <figcaption className="mc-contact-map__text">
          <p>
            <strong>{t('contact.channels.address')}:</strong> {address.text}
          </p>
          <p>
            <strong>{t('contact.directions')}:</strong> {address.directions}
          </p>
          {address.mapUrl ? (
            <Button variant="link" href={address.mapUrl} newTab>
              {t('contact.actions.map')}
            </Button>
          ) : (
            <PendingLink>{t('contact.actions.map')}</PendingLink>
          )}
        </figcaption>
      </figure>

      <section aria-labelledby="contact-office-title" className="mc-contact-box">
        <div className="mc-contact-box__inner">
          <h2 id="contact-office-title" className="mc-contact-box__title">
            {t('contact.officeTitle')}
          </h2>
          <dl className="mc-contact-dl">
            {settings.officeAccessibility.map((entry) => (
              <div key={entry.feature}>
                <dt>{label('officeFeature', entry.feature)}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* მუქი ბლოკი: ფონი ძირეული თემის --mc-hero, შიგთავსი data-theme="dark" ქვეხე (F5-ის წესი) */}
      <section
        aria-labelledby="contact-hours-title"
        className="mc-contact-box mc-contact-box--dark"
      >
        <div className="mc-contact-box__inner" data-theme="dark">
          <h2 id="contact-hours-title" className="mc-contact-box__title">
            {t('contact.hoursTitle')}
          </h2>
          <dl className="mc-contact-dl">
            {settings.hours.map((entry) => (
              <div key={entry.label}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
