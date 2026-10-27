import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  Button,
  Checkbox,
  ErrorSummary,
  Icon,
  RadioGroup,
  Select,
  TextArea,
  TextField,
} from '@/components/ui/index.js';
import { sendContact } from '@/content/adapter.js';
import { normalizeError } from '@/content/errors.js';
import { validateContact } from '@/content/forms.js';
import { CONTACT_TOPICS, REPLY_CHANNELS, isOneOf, options } from '@/content/taxonomy.js';
import { t } from '@/i18n/index.js';

import ContactConfirmation from './ContactConfirmation.jsx';
import { FIELD_IDS, FORM_HEADING_ID, HONEYPOT_ID, summaryItems } from './contact-fields.js';

/** @typedef {import('@/content/model.js').ContactPayload} ContactPayload */
/** @typedef {import('@/content/taxonomy.js').ContactTopic} ContactTopic */
/** @typedef {import('@/content/errors.js').FieldError} FieldError */

/** @param {ContactTopic} topic @returns {Omit<ContactPayload, 'website'>} */
const emptyValues = (topic) => ({
  name: '',
  contact: '',
  topic,
  message: '',
  support: '',
  replyVia: 'email',
  consent: false,
});

/**
 * „მოგვწერე“ (ContactPage დაფა; CLAUDE.md-ის ფორმების წესები):
 *
 * - ლეიბლი ველის ზემოთ; სავალდებულო — „(სავალდებულო)“, არასავალდებულო — „(არასავალდებულო)“;
 *   placeholder არ გამოიყენება.
 * - ვალიდაცია მხოლოდ გაგზავნისას (`noValidate` + `validateContact` — adapter-ის იგივე წესი), არა
 *   ყოველ კლავიშზე; შეცდომები შემდეგ გაგზავნამდე რჩება.
 * - შეცდომისას: ფორმის თავში ჯამი (`ErrorSummary`: `role="alert"`, ფოკუსი მასზე, ბმულები ველებზე)
 *   + ყოველ ველთან ხაზოვანი შეცდომა ხატულით (`aria-invalid`, `aria-describedby`).
 * - მხარდაჭერის საჭიროება (არასავალდებულო, თავისუფალი ტექსტი) — დიაგნოზს არ ვეკითხებით.
 * - CAPTCHA და დროის ლიმიტი არ არის. spam: honeypot `website` — `aria-hidden`, `tabindex="-1"`,
 *   ეკრანს გარეთ (არა `display: none`); შევსებულს სერვერი ჩუმად აგდებს. სერვერის rate limit —
 *   TODO (adapter.js, `sendContact`).
 * - `?topic=partnership | barrier | …` თემას წინასწარ ირჩევს (URL-ის შეცვლისას გვერდზე ყოფნისასაც).
 * - წარმატება: ფორმის ადგილას დადასტურება (`role="status"`, ფოკუსი სათაურზე); ქსელის / სერვერის
 *   შეცდომა: `role="alert"` ღილაკის ზემოთ, შეყვანილი ტექსტი რჩება.
 *
 * @param {object} props
 * @param {import('@/content/model.js').SiteSettings | undefined} props.settings
 */
export default function ContactForm({ settings }) {
  const [params] = useSearchParams();
  const rawTopic = params.get('topic');
  const urlTopic = isOneOf(CONTACT_TOPICS, rawTopic) ? rawTopic : null;

  const [values, setValues] = useState(() => emptyValues(urlTopic ?? 'general'));
  const [errors, setErrors] = useState(/** @type {Record<string, FieldError>} */ ({}));
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState(/** @type {'editing' | 'sending' | 'sent'} */ ('editing'));
  const [sendError, setSendError] = useState(/** @type {string | null} */ (null));
  const [sent, setSent] = useState({ replyVia: values.replyVia, withSupport: false });
  const [syncedTopic, setSyncedTopic] = useState(urlTopic);
  const honeypotRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const refocusName = useRef(false);

  // URL-ის თემა შეიცვალა (მაგ. ფუტერის „შეგხვდა ბარიერი?“ კონტაქტის გვერდიდანვე)
  if (urlTopic !== syncedTopic) {
    setSyncedTopic(urlTopic);
    if (urlTopic) setValues((v) => ({ ...v, topic: urlTopic }));
  }

  useEffect(() => {
    if (phase !== 'editing' || !refocusName.current) return;
    refocusName.current = false;
    document.getElementById(FIELD_IDS.name)?.focus();
  }, [phase]);

  /**
   * @template {keyof ContactPayload} K
   * @param {K} name
   * @param {ContactPayload[K]} value
   */
  const set = (name, value) => setValues((v) => ({ ...v, [name]: value }));

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  const submit = async (event) => {
    event.preventDefault();
    if (phase === 'sending') return;
    const payload = { ...values, website: honeypotRef.current?.value ?? '' };
    const found = validateContact(payload);
    setSendError(null);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setAttempt((n) => n + 1);
      return;
    }
    setErrors({});
    setPhase('sending');
    try {
      await sendContact(payload);
      setSent({ replyVia: values.replyVia, withSupport: values.support.trim() !== '' });
      setPhase('sent');
    } catch (raw) {
      const failure = normalizeError(raw);
      setPhase('editing');
      if (failure.fields && Object.keys(failure.fields).length > 0) {
        setErrors(failure.fields);
        setAttempt((n) => n + 1);
      } else {
        setSendError(failure.message);
      }
    }
  };

  const another = () => {
    setValues(emptyValues(urlTopic ?? 'general'));
    setErrors({});
    setSendError(null);
    refocusName.current = true;
    setPhase('editing');
  };

  const responseTime = settings?.responseTime ?? '[ვადა]';
  const privacyUrl = settings?.links.privacy ?? null;
  const messageHint =
    values.topic === 'barrier' || values.topic === 'partnership'
      ? t(`contact.messageHints.${values.topic}`)
      : undefined;
  const items = summaryItems(errors);

  return (
    <section aria-labelledby={FORM_HEADING_ID} className="mc-contact-form">
      <h2 id={FORM_HEADING_ID} className="mc-contact-form__title">
        {t('contact.formTitle')}
      </h2>
      {phase === 'sent' ? (
        <ContactConfirmation
          responseTime={responseTime}
          replyVia={sent.replyVia}
          withSupport={sent.withSupport}
          onAnother={another}
        />
      ) : (
        <form noValidate onSubmit={submit} className="mc-contact-form__form">
          <p className="mc-contact-form__note">{t('contact.formNote')}</p>
          {items.length > 0 && (
            <ErrorSummary
              key={attempt}
              title={t('contact.errorSummary', { count: items.length })}
              items={items}
            />
          )}
          <div className="mc-contact-form__pair">
            <TextField
              id={FIELD_IDS.name}
              name="name"
              autoComplete="name"
              required
              label={t('contact.name')}
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.name}
            />
            <TextField
              id={FIELD_IDS.contact}
              name="contact"
              autoComplete="email"
              spellCheck={false}
              required
              label={t('contact.contactField')}
              hint={t('contact.contactHint')}
              value={values.contact}
              onChange={(e) => set('contact', e.target.value)}
              error={errors.contact}
            />
          </div>
          <Select
            id={FIELD_IDS.topic}
            name="topic"
            required
            label={t('contact.topic')}
            options={options('contactTopic', CONTACT_TOPICS)}
            value={values.topic}
            onChange={(e) => set('topic', /** @type {ContactTopic} */ (e.target.value))}
            error={errors.topic}
          />
          <TextArea
            id={FIELD_IDS.message}
            name="message"
            optional
            label={t('contact.message')}
            hint={messageHint}
            value={values.message}
            onChange={(e) => set('message', e.target.value)}
            error={errors.message}
          />
          <TextArea
            id={FIELD_IDS.support}
            name="support"
            rows={3}
            optional
            label={t('contact.support')}
            hint={t('contact.supportHint')}
            value={values.support}
            onChange={(e) => set('support', e.target.value)}
            error={errors.support}
          />
          <RadioGroup
            id={FIELD_IDS.replyVia}
            name="replyVia"
            required
            legend={t('contact.replyVia')}
            options={options('replyChannel', REPLY_CHANNELS)}
            value={values.replyVia}
            onChange={(value) => set('replyVia', /** @type {ContactPayload['replyVia']} */ (value))}
            error={errors.replyVia}
          />
          <Checkbox
            id={FIELD_IDS.consent}
            name="consent"
            required
            label={t('contact.consentFull')}
            checked={values.consent}
            onChange={(e) => set('consent', e.target.checked)}
            error={errors.consent}
            hint={
              privacyUrl ? (
                <Button variant="link" href={privacyUrl} newTab>
                  {t('contact.privacy')}
                </Button>
              ) : (
                <>
                  <span>{t('contact.privacy')}</span> <span>{t('footer.linkPending')}</span>
                </>
              )
            }
          />
          {/* honeypot: ეკრანს გარეთ, ასისტიური ტექნოლოგიისა და Tab-ისგან დამალული — მხოლოდ ბოტი ავსებს */}
          <div className="mc-hp" aria-hidden="true">
            <label htmlFor={HONEYPOT_ID}>{t('contact.honeypot')}</label>
            <input
              ref={honeypotRef}
              id={HONEYPOT_ID}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </div>
          {sendError && (
            <p role="alert" className="mc-form-alert">
              <Icon name="alert" size="1.5rem" className="mc-form-alert__icon" />
              <span>
                <strong>{t('contact.sendErrorTitle')}.</strong> {sendError} {t('contact.sendKept')}
              </span>
            </p>
          )}
          <div className="mc-contact-form__submit">
            <Button
              type="submit"
              variant="cta"
              loading={phase === 'sending'}
              loadingLabel={t('contact.submitting')}
            >
              {t('contact.submit')}
            </Button>
            <p className="mc-contact-form__nocaptcha">{t('contact.noCaptcha')}</p>
          </div>
        </form>
      )}
    </section>
  );
}
