import { useEffect, useId, useState } from 'react';

import { t } from '@/i18n/index.js';

import Button from './Button.jsx';
import Icon from './Icon.jsx';
import LiveRegion from './LiveRegion.jsx';
import VisuallyHidden from './VisuallyHidden.jsx';

/** @typedef {import('@/content/errors.js').ContentError} ContentError */

/**
 * მონაცემიანი ბლოკის სამი მდგომარეობა + შიგთავსი (F5). `useContent`-ის შედეგს იღებს:
 *
 * - **ჩატვირთვა** — `skeleton` (სტატიკური, ანიმაციის გარეშე) + ეკრანის მკითხველისთვის
 *   „იტვირთება: {label}“; ბლოკს `aria-busy="true"` აქვს;
 * - **შეცდომა** — ხატულა + `ContentError.message` + „თავიდან ცდა“. ჩარჩო 2px `--mc-error`, ფონი
 *   surface (§2: სტატუსი = ხატულა + ტექსტი + ჩარჩო, ტინტის გარეშე). ღილაკის სახელი სექციასაც
 *   შეიცავს („თავიდან ცდა: სტატიები“), რომ გვერდზე ერთნაირი სახელის რამდენიმე ღილაკი არ იყოს;
 * - **ცარიელი** — `success`, მაგრამ საჩვენებელი არაფერია: `emptyText`, წყვეტილი ჩარჩოთი.
 *
 * თავიდან ცდისას ბლოკი არ ქრება: ღილაკი ადგილზე რჩება `loading` მდგომარეობაში (ფოკუსი არ
 * იკარგება). წარმატებისას ფოკუსი გადადის სექციის სათაურზე (`focusId`) ან თავად ბლოკზე —
 * ღილაკი ქრება და ფოკუსი body-ზე არ უნდა ჩავარდეს. განმეორებითი შეცდომა `role="status"`-ით
 * ცხადდება (რეგიონი DOM-ში მუდმივად დგას).
 *
 * @param {object} props
 * @param {'idle' | 'loading' | 'success' | 'error'} props.status
 * @param {ContentError | null} props.error
 * @param {() => void} props.onRetry
 * @param {string} props.label                         სექციის სახელი („სტატიები“)
 * @param {import('react').ReactNode} props.skeleton
 * @param {boolean} [props.empty=false]
 * @param {import('react').ReactNode} [props.emptyText]
 * @param {string} [props.focusId]                     წარმატებული ცდის შემდეგ ფოკუსის სამიზნე (h2-ის id)
 * @param {string} [props.className]
 * @param {() => import('react').ReactNode} props.children  მხოლოდ `success`-ზე იძახება
 */
export default function ContentState({
  status,
  error,
  onRetry,
  label,
  skeleton,
  empty = false,
  emptyText,
  focusId,
  className,
  children,
}) {
  const messageId = useId();
  const [retrying, setRetrying] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);
  const [shownError, setShownError] = useState(error);
  const [announcement, setAnnouncement] = useState('');
  const [focusToken, setFocusToken] = useState(0);
  const [root, setRoot] = useState(/** @type {HTMLDivElement | null} */ (null));

  // მდგომარეობის ცვლილება რენდერისას (React-ის „adjusting state on prop change“ პატერნი)
  if (error && error !== shownError) setShownError(error);
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (retrying && status !== 'loading') {
      setRetrying(false);
      if (status === 'success') setFocusToken((n) => n + 1);
      if (status === 'error') setAnnouncement(error?.message ?? t('errors.unknown'));
    }
  }

  useEffect(() => {
    if (focusToken === 0) return;
    const target = (focusId && document.getElementById(focusId)) || root;
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    // პროგრამული ფოკუსი რგოლს არ აჩვენებს (focus.css, F4)
    target.setAttribute('data-route-focus', '');
    target.focus({ preventScroll: true });
  }, [focusToken, focusId, root]);

  const retry = () => {
    setAnnouncement('');
    setRetrying(true);
    onRetry();
  };

  const loading = status === 'loading' || status === 'idle';
  let body;
  if (status === 'error' || (retrying && loading)) {
    body = (
      <div className="mc-state mc-state--error">
        <Icon name="alert" className="mc-state__icon" />
        <p id={messageId} className="mc-state__text">
          {(error ?? shownError)?.message ?? t('errors.unknown')}
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon="reset"
          loading={retrying}
          aria-describedby={messageId}
          onClick={retry}
        >
          {t('common.retry')}
          <VisuallyHidden>: {label}</VisuallyHidden>
        </Button>
      </div>
    );
  } else if (loading) {
    body = (
      <>
        {skeleton}
        <VisuallyHidden as="p">{t('states.loading', { label })}</VisuallyHidden>
      </>
    );
  } else if (empty) {
    body = <p className="mc-state mc-state--empty">{emptyText}</p>;
  } else {
    body = children();
  }

  return (
    <div ref={setRoot} className={className} aria-busy={loading || undefined}>
      {body}
      <LiveRegion>{announcement}</LiveRegion>
    </div>
  );
}
