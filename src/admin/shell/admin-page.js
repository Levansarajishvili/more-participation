import { createContext, useContext, useEffect } from 'react';

/**
 * ეკრანის სათაური და ბილიკი header-ისთვის (h1 AdminShell-ის header-შია, AdminPanel დაფის
 * მიხედვით). სტატიკური — როუტის `handle.admin.title` (i18n-ის გასაღები ან `(params) => string`),
 * დინამიკური (მასალის სათაური) — ეკრანის `useAdminPage()`.
 *
 * @typedef {{ to?: string, label: string }} Crumb
 * @typedef {object} AdminPageInfo
 * @property {string} [title]
 * @property {'ka' | undefined} [titleLang]  F9: სათაური მასალისაა და გვერდის ენაზე არ არის
 * @property {Crumb[]} [crumbs]          ბილიკი „ადმინი“-სა და მიმდინარე ეკრანს შორის
 * @property {string | null} [type]      „ახალი მასალა“-ს ტიპი
 * @property {boolean} [editor]          რედაქტორის ეკრანი: header-ის CTA → secondary
 */

/** @type {import('react').Context<(info: AdminPageInfo | null) => void>} */
export const AdminPageContext = createContext(
  /** @type {(info: AdminPageInfo | null) => void} */ (() => {}),
);

/**
 * @param {AdminPageInfo} info
 */
export function useAdminPage(info) {
  const set = useContext(AdminPageContext);
  const key = JSON.stringify(info);
  useEffect(() => {
    set(JSON.parse(key));
    return () => set(null);
  }, [set, key]);
}
