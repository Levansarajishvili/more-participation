import { getLocale } from '@/i18n/locale.js';

/**
 * F9: მასალის ენის ვერსიები. თარგმანი მოდელშივეა — `translations.en` (ნაწილობრივი ასლი იმავე
 * ფორმით: `title`, `excerpt`, `cover.alt`, `body`, `slides[i].plain`…). ფოტო, ფაილი, slug,
 * თარიღი და სტრუქტურა ქართული ვერსიისაა; თარგმანი მხოლოდ ტექსტს ფარავს.
 *
 * - `localize(item, 'en')` — თარგმანი ზემოდან (ცარიელი სტრიქონი → ქართული რჩება), `lang: 'en'`;
 *   თარგმანის გარეშე — ქართული, `lang: 'ka'` (ინგლისურ საიტზე `lang="ka"` + „In Georgian“).
 * - მასივი ინდექსით ერწყმის (სლაიდები, ტრანსკრიპტი, საათები — რიგი ქართულისაა); `body` (ტექსტის
 *   ბლოკები) მთლიანად ჩანაცვლდება — თარგმანს თავისი აბზაცები აქვს.
 * - `translations` საჯარო პასუხში არ ხვდება.
 */

/** @typedef {import('@/i18n/locale.js').Locale} Locale */

/** ბლოკების მასივები, რომლებიც თარგმანში მთლიანად იცვლება. */
const REPLACE_ARRAYS = new Set(['body']);

/**
 * @param {unknown} base
 * @param {unknown} patch
 * @param {string} [key]
 * @returns {unknown}
 */
export function overlay(base, patch, key) {
  if (patch === undefined || patch === null) return base;
  if (Array.isArray(patch)) {
    if ((key && REPLACE_ARRAYS.has(key)) || !Array.isArray(base))
      return patch.length ? patch : base;
    return base.map((item, i) => (i < patch.length ? overlay(item, patch[i]) : item));
  }
  if (typeof patch === 'object') {
    if (!base || typeof base !== 'object' || Array.isArray(base)) return patch;
    /** @type {Record<string, unknown>} */
    const out = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      out[k] = overlay(/** @type {Record<string, unknown>} */ (base)[k], v, k);
    }
    return out;
  }
  if (typeof patch === 'string' && patch.trim() === '') return base;
  return patch;
}

/**
 * ითვლება თარგმნილად, თუ ენის ვერსიას სათაური / სახელი ან (პარამეტრებში) ერთი ველი მაინც აქვს.
 * @param {unknown} item
 * @param {Locale} locale
 */
export function isTranslated(item, locale) {
  const tr = /** @type {any} */ (item)?.translations?.[locale];
  if (!tr || typeof tr !== 'object') return false;
  if ('title' in tr || 'name' in tr) return Boolean(String(tr.title ?? tr.name ?? '').trim());
  return Object.keys(tr).length > 0;
}

/**
 * @template {Record<string, any>} T
 * @param {T} item
 * @param {Locale} locale
 * @returns {Omit<T, 'translations'> & { lang: Locale }}
 */
export function localize(item, locale) {
  if (!item || typeof item !== 'object') return item;
  const { translations, ...rest } = /** @type {any} */ (item);
  if (locale === 'ka' || !isTranslated(item, locale)) return { ...rest, lang: 'ka' };
  return { .../** @type {any} */ (overlay(rest, translations[locale])), lang: locale };
}

/**
 * მთელი ნაკრები მიმდინარე ენაზე (mock / CMS-ის პასუხი).
 * @param {import('./model.js').ContentSnapshot} snapshot
 * @param {Locale} locale
 * @returns {import('./model.js').ContentSnapshot}
 */
export function localizeSnapshot(snapshot, locale) {
  /** @param {any[]} list */
  const each = (list) => list.map((item) => localize(item, locale));
  return /** @type {any} */ ({
    ...snapshot,
    articles: each(snapshot.articles),
    series: each(snapshot.series),
    videos: each(snapshot.videos),
    news: each(snapshot.news),
    events: each(snapshot.events),
    team: each(snapshot.team),
    partners: each(snapshot.partners),
    settings: localize(snapshot.settings, locale),
  });
}

/**
 * მასალის ენა, თუ გვერდის ენას არ ემთხვევა — `lang` ატრიბუტისთვის (WCAG 3.1.2). ემთხვევა → undefined.
 * @param {{ lang?: string } | null | undefined} item
 * @param {Locale} [locale]
 * @returns {string | undefined}
 */
export function contentLang(item, locale = getLocale()) {
  return item?.lang && item.lang !== locale ? item.lang : undefined;
}
