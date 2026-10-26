import { createContext, useContext, useEffect } from 'react';

import { t } from '@/i18n/index.js';

/** PageShell-ის setter: გვერდის დინამიკური სათაური (null — როუტის სათაური). */
export const PageTitleContext = createContext(
  /** @type {(title: string | null) => void} */ (() => {}),
);

/**
 * დოკუმენტის სათაური: „{გვერდი} — მეტი ჩართულობა“; გვერდის სახელის გარეშე — „მეტი ჩართულობა“.
 * @param {string | null | undefined} title
 * @returns {string}
 */
export function formatDocumentTitle(title) {
  return title ? t('meta.pageTitle', { title }) : t('meta.siteName');
}

/**
 * გვერდის სათაური, რომელიც მონაცემებზეა დამოკიდებული (სტატია, ვიდეო). სტატიკური სათაური
 * როუტის `handle.title`-ში იწერება (i18n-ის გასაღები) და ეს hook არ სჭირდება.
 * გვერდიდან გასვლისას სათაური როუტისას უბრუნდება.
 *
 * @param {string | null | undefined} title
 */
export function usePageTitle(title) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title || null);
    return () => setTitle(null);
  }, [setTitle, title]);
}
