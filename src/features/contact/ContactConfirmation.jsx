import { useEffect, useRef } from 'react';

import { Button, Icon } from '@/components/ui/index.js';
import { label } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

/**
 * დადასტურება (ContactPage დაფა + prompt): ფორმის ადგილას, `role="status"`, ფოკუსი სათაურზე
 * (h3, `tabindex="-1"`). „რა მოხდება შემდეგ“ — პასუხის ვადა `SiteSettings.responseTime`-იდან
 * (`[ფრჩხილებში]`, ჩატვირთვამდე `[ვადა]`), არჩეული არხი, მხარდაჭერა (თუ მიუთითა).
 * სტატუსი = ხატულა + ტექსტი + 2px `--mc-growth` ჩარჩო surface-ზე (§2: ტინტის გარეშე; მწვანე —
 * წარმატება): #08704C თეთრზე 6.09:1, #3DDC97 #0F2440-ზე 8.8:1.
 *
 * @param {object} props
 * @param {string} props.responseTime
 * @param {import('@/content/taxonomy.js').ReplyChannel} props.replyVia
 * @param {boolean} props.withSupport
 * @param {() => void} props.onAnother
 */
export default function ContactConfirmation({ responseTime, replyVia, withSupport, onAnother }) {
  const headingRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const channel = label('replyChannel', replyVia);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div role="status" className="mc-contact-confirm">
      <Icon name="check" size="1.75rem" className="mc-contact-confirm__icon" />
      <div className="mc-contact-confirm__body">
        <h3
          ref={headingRef}
          tabIndex={-1}
          data-route-focus=""
          className="mc-contact-confirm__title"
        >
          {t('contact.successTitle')}
        </h3>
        <p>{t('contact.successText', { responseTime, channel })}</p>
        <h4 className="mc-contact-confirm__next">{t('contact.nextTitle')}</h4>
        <ol className="mc-contact-confirm__steps">
          <li>{t('contact.next.read')}</li>
          <li>{t('contact.next.reply', { responseTime, channel })}</li>
          {withSupport && <li>{t('contact.next.support')}</li>}
          <li>{t('contact.next.urgent')}</li>
        </ol>
        <Button variant="secondary" icon="reset" onClick={onAnother}>
          {t('contact.another')}
        </Button>
      </div>
    </div>
  );
}
