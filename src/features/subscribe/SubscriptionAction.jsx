import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import PageIntro from '@/components/layout/PageIntro.jsx';
import { Breadcrumbs, Button, Icon } from '@/components/ui/index.js';
import { confirmSubscription, unsubscribe } from '@/content/adapter.js';
import { normalizeError } from '@/content/errors.js';
import {
  SUBSCRIBE_CONFIRM_DAYS,
  isSubscribeToken,
  isUnsubscribeToken,
  tokenFromHash,
} from '@/content/forms.js';
import { t } from '@/i18n/index.js';

import './subscription.css';

/**
 * წერილის ბმულის გვერდი (B6, double opt-in): `/subscribe/confirm` და `/subscribe/unsubscribe`
 * (ka / en). token — ბმულის fragment-ში (`#token=…`: სერვერამდე, ლოგსა და Referer-ში არ მიდის).
 *
 * GET თავისით არაფერს ცვლის — ფოსტის სკანერი ბმულს თვითონ ხსნის: მოქმედება მხოლოდ ღილაკით (POST).
 * მდგომარეობა: `idle` (ღილაკი; დადასტურება — CTA, ოქროსფერი; გაუქმება — primary) → `sending`
 * (ღილაკი `aria-busy`, ტექსტი იცვლება) → `done` (`role="status"`, ✓ + ტექსტი, ფოკუსი h2-ზე) ან
 * `error` (`role="alert"`, ხატულა + ტექსტი; ღილაკი რჩება — ხელახლა ცდა, თუ ქსელი იყო).
 * ბმული არასრული / დაზიანებული → შეტყობინება ღილაკის გარეშე (მოთხოვნა არ იგზავნება).
 * CAPTCHA და დროის ლიმიტი არ არის. ფერი მხოლოდ ტოკენით (`subscription.css`).
 *
 * @param {object} props
 * @param {'confirm' | 'unsubscribe'} props.kind
 */
export default function SubscriptionAction({ kind }) {
  const { hash } = useLocation();
  const token = tokenFromHash(hash);
  const valid = kind === 'confirm' ? isSubscribeToken(token) : isUnsubscribeToken(token);
  const [phase, setPhase] = useState(/** @type {'idle' | 'sending' | 'done' | 'error'} */ ('idle'));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const doneRef = useRef(/** @type {HTMLHeadingElement | null} */ (null));
  const prefix = kind === 'confirm' ? 'confirm' : 'unsubscribe';

  useEffect(() => {
    if (phase === 'done') doneRef.current?.focus();
  }, [phase]);

  /** @param {import('react').FormEvent<HTMLFormElement>} event */
  const submit = async (event) => {
    event.preventDefault();
    if (phase === 'sending') return;
    setPhase('sending');
    setError(null);
    try {
      await (kind === 'confirm' ? confirmSubscription(token) : unsubscribe(token));
      setPhase('done');
    } catch (raw) {
      const failure = normalizeError(raw);
      setError(
        failure.code === 'not-found' || failure.code === 'bad-request'
          ? t(`subscription.${prefix}Invalid`)
          : failure.message,
      );
      setPhase('error');
    }
  };

  const invalidLink = phase === 'error' && error === t(`subscription.${prefix}Invalid`);

  return (
    <>
      <PageIntro headingId="subscription-title">
        <Breadcrumbs
          items={[{ to: '/', label: t('nav.home') }, { label: t(`subscription.${prefix}Title`) }]}
        />
        <h1 id="subscription-title" className="text-h1">
          {t(`subscription.${prefix}Title`)}
        </h1>
        <p className="mc-lead">{t(`subscription.${prefix}Lead`)}</p>
      </PageIntro>
      <div className="site-container mc-block">
        <div className="mc-subscription">
          {!valid ? (
            <div className="mc-subscription__note">
              <Icon name="alert" size="1.5rem" className="mc-subscription__note-icon" />
              <p>{t('subscription.missingToken')}</p>
            </div>
          ) : phase === 'done' ? (
            <div role="status" className="mc-subscription__done">
              <Icon name="check" size="1.75rem" className="mc-subscription__done-icon" />
              <div className="mc-subscription__body">
                <h2
                  ref={doneRef}
                  tabIndex={-1}
                  data-route-focus=""
                  className="mc-subscription__title"
                >
                  {t(`subscription.${prefix}DoneTitle`)}
                </h2>
                <p>{t(`subscription.${prefix}DoneText`)}</p>
                <Button variant="secondary" to="/articles">
                  {t('subscription.toArticles')}
                </Button>
              </div>
            </div>
          ) : (
            <form noValidate onSubmit={submit} className="mc-subscription__form">
              {kind === 'confirm' && (
                <p>{t('subscription.linkNote', { days: SUBSCRIBE_CONFIRM_DAYS })}</p>
              )}
              {error && (
                <p role="alert" className="mc-subscription__alert">
                  <Icon name="alert" size="1.5rem" className="mc-subscription__alert-icon" />
                  <span>
                    <strong>{t('subscription.errorTitle')}.</strong> {error}
                  </span>
                </p>
              )}
              {invalidLink ? (
                kind === 'confirm' && (
                  <Button variant="secondary" to="/articles">
                    {t('subscription.subscribeAgain')}
                  </Button>
                )
              ) : (
                <Button
                  type="submit"
                  variant={kind === 'confirm' ? 'cta' : 'primary'}
                  loading={phase === 'sending'}
                  loadingLabel={t(`subscription.${prefix}Sending`)}
                >
                  {t(`subscription.${prefix}Action`)}
                </Button>
              )}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
