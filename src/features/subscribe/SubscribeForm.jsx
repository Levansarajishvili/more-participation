import { useId, useRef, useState } from 'react';

import { Button, LiveRegion, TextField } from '@/components/ui/index.js';
import { cx } from '@/components/ui/utils.js';
import { subscribe } from '@/content/adapter.js';
import { normalizeError } from '@/content/errors.js';
import { validateSubscribe } from '@/content/forms.js';
import { t } from '@/i18n/index.js';

import './subscribe.css';

/**
 * გამოწერის ბლოკი (F6; ArticlesPage — მუქი ზოლი, NewsPage — ბარათი): სათაური (h2), ტექსტი და
 * ერთველიანი ფორმა. `<section aria-labelledby>` — სათაურების ხეში ჩანს.
 *
 * ფორმის წესები (CLAUDE.md): ლეიბლი ველის ზემოთ + „(სავალდებულო)“; ვალიდაცია მხოლოდ გაგზავნისას
 * (`noValidate`, `validateSubscribe` — adapter-ის იგივე წესი); შეცდომა ველის ქვემოთ ხატულით და
 * ტექსტით, ფოკუსი ველზე (ერთი ველისთვის ცალკე ჯამი არ ჩნდება); წარმატება — `role="status"`
 * (რეგიონი DOM-ში მუდმივად დგას), ველი სუფთავდება, ფოკუსი ღილაკზე რჩება. CAPTCHA არ არის.
 *
 * ფერი: `dark` — ფონი ძირეული თემის `--mc-hero`, შიგთავსი `data-theme="dark"` ქვეხე (#EAF0F7 #0B2545-ზე
 * 13.41:1); `card` — surface + 2px `--mc-card-border`. ღილაკი — CTA (ოქროსფერი მხოლოდ აქ).
 *
 * @param {object} props
 * @param {string} props.headingId
 * @param {string} props.title
 * @param {string} props.text
 * @param {'dark' | 'card'} [props.tone='dark']
 * @param {string} [props.className]
 */
export default function SubscribeForm({ headingId, title, text, tone = 'dark', className }) {
  const fieldId = useId();
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const [email, setEmail] = useState('');
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    const value = email.trim();
    const fields = validateSubscribe(value);
    if (fields.email) {
      setError(fields.email.message);
      setStatus('');
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setStatus('');
    setBusy(true);
    try {
      await subscribe(value);
      setEmail('');
      setStatus(t('subscribe.success', { email: value }));
    } catch (raw) {
      const failure = normalizeError(raw);
      setError(failure.fields?.email?.message ?? failure.message);
      inputRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className={cx('mc-subscribe', `mc-subscribe--${tone}`, className)}
    >
      <div className="mc-subscribe__inner" data-theme={tone === 'dark' ? 'dark' : undefined}>
        <div className="mc-subscribe__intro">
          <h2 id={headingId} className="mc-subscribe__title">
            {title}
          </h2>
          <p className="mc-subscribe__text">{text}</p>
        </div>
        <form noValidate onSubmit={submit} className="mc-subscribe__form">
          <TextField
            ref={inputRef}
            id={fieldId}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            required
            label={t('subscribe.emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <Button
            type="submit"
            variant="cta"
            loading={busy}
            loadingLabel={t('subscribe.submitting')}
            className="mc-subscribe__submit"
          >
            {t('subscribe.submit')}
          </Button>
          <LiveRegion visible className="mc-subscribe__status">
            {status}
          </LiveRegion>
        </form>
      </div>
    </section>
  );
}
