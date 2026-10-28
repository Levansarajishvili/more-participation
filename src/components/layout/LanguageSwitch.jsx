import { useLocation } from 'react-router';

import { alternatePath, getLocale, t } from '@/i18n/index.js';
import { cx } from '@/components/ui/utils.js';

/**
 * ენის გადამრთველი (F9): იგივე გვერდი მეორე ენაზე — `/articles` ↔ `/en/articles`, ადმინში
 * `/admin/…` ↔ `/en/admin/…`. წარწერა მეორე ენის სახელია იმავე ენაზე („English“ / „ქართული“),
 * `lang` + `hreflang`-ით (WCAG 3.1.2 — ეკრანის მკითხველი სწორად წაიკითხავს).
 * ჩვეულებრივი `<a>`-ა: ენის შეცვლა სრული გადასვლაა (სხვა basename). mock-ში ეს სესიასა და
 * შეუნახავ მონაცემს ასუფთავებს — რეალურ API-ზე სესია cookie-შია.
 * @param {{ className?: string }} props
 */
export default function LanguageSwitch({ className }) {
  const location = useLocation();
  const other = getLocale() === 'en' ? 'ka' : 'en';
  return (
    <a
      href={alternatePath(location, other)}
      lang={other}
      hrefLang={other}
      className={cx('mc-lang-switch', className)}
    >
      {t('nav.otherLanguage')}
    </a>
  );
}

/**
 * hreflang-ის ალტერნატივები `<head>`-ში (React 19 `<link>`-ს თავად აიტანს): ka, en, x-default.
 */
export function AlternateLinks() {
  const location = useLocation();
  if (typeof window === 'undefined') return null;
  const { origin } = window.location;
  return (
    <>
      <link rel="alternate" hrefLang="ka" href={`${origin}${alternatePath(location, 'ka')}`} />
      <link rel="alternate" hrefLang="en" href={`${origin}${alternatePath(location, 'en')}`} />
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${origin}${alternatePath(location, 'ka')}`}
      />
    </>
  );
}
