import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router';

import { readElement } from '@/features/a11y/speech.js';
import { usePreferences } from '@/features/a11y/usePreferences.js';
import { t } from '@/i18n/index.js';

import SiteFooter from './SiteFooter.jsx';
import SiteHeader from './SiteHeader.jsx';
import { PageTitleContext, formatDocumentTitle } from './usePageTitle.js';

/**
 * საიტის გარსი: ყოველი საჯარო როუტი (404-ისა და როუტის შეცდომის ჩათვლით) აქ ეხვევა, ამიტომ
 * SiteHeader და SiteFooter გვერდზე ერთხელ ჩნდება და არსად დუბლირდება. ადმინს (F8) საკუთარი
 * AdminShell ექნება.
 *
 * როუტის ცვლილებისას (მხოლოდ pathname — ფილტრის `?category=` ამას არ იწვევს):
 * 1. `document.title` = „{გვერდი} — მეტი ჩართულობა“: როუტის `handle.title` (i18n-ის გასაღები)
 *    ან გვერდის `usePageTitle()`; მთავარზე — „მეტი ჩართულობა“;
 * 2. ფოკუსი გადადის გვერდის `<h1>`-ზე (`tabindex="-1"`, `data-route-focus`); hash-ით მისვლისას —
 *    სამიზნე ელემენტზე; h1 თუ არ არის — `<main>`-ზე. პირველ ჩატვირთვაზე ფოკუსი არ გადაიტანება;
 * 3. გვერდი ზემოთ იწევს — ScrollRestoration (RootLayout), მყისიერად; „უკან“ პოზიციას აღადგენს;
 * 4. ხმოვანი რეჟიმი ჩართულია → ახალი გვერდის ტექსტი იკითხება.
 *
 * გვერდის წესი: `<h1>` პირველივე რენდერზე უნდა იყოს (ჩატვირთვის მდგომარეობაშიც).
 */
export default function PageShell() {
  const location = useLocation();
  const matches = useMatches();
  const { prefs } = usePreferences();
  const [navOpen, setNavOpen] = useState(false);
  const [override, setOverride] = useState(/** @type {string | null} */ (null));
  const mainRef = useRef(/** @type {HTMLElement | null} */ (null));
  const previousPath = useRef(location.pathname);

  const routeTitleKey = [...matches]
    .reverse()
    .map((match) => /** @type {{ title?: string } | undefined} */ (match.handle)?.title)
    .find((key) => key !== undefined);
  const title = override ?? (routeTitleKey ? t(routeTitleKey) : null);

  useEffect(() => {
    document.title = formatDocumentTitle(title);
  }, [title]);

  useEffect(() => {
    if (previousPath.current === location.pathname) return;
    previousPath.current = location.pathname;
    const main = mainRef.current;
    if (!main) return;
    focusRouteTarget(main, location.hash);
    if (prefs.voice) readElement(main);
    // prefs.voice განზრახ არ არის deps-ში: რეჟიმის ჩართვისას გვერდს მენიუ თავად კითხულობს
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <PageTitleContext.Provider value={setOverride}>
      <SiteHeader onNavOpenChange={setNavOpen} />
      <main id="main" ref={mainRef} tabIndex={-1} inert={navOpen} className="mc-main">
        <Outlet />
      </main>
      <SiteFooter inert={navOpen} />
    </PageTitleContext.Provider>
  );
}

/**
 * @param {HTMLElement} main
 * @param {string} hash
 */
function focusRouteTarget(main, hash) {
  /** @type {HTMLElement | null} */
  let target = null;
  if (hash.length > 1) {
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      target = null;
    }
  }
  target ??= main.querySelector('h1');
  if (!target) {
    main.focus({ preventScroll: true });
    return;
  }
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) {
    target.setAttribute('tabindex', '-1');
    target.setAttribute('data-route-focus', '');
  }
  target.focus({ preventScroll: true });
}
