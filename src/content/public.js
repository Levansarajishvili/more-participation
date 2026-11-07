import { localize, localizeSnapshot, overlay } from './localize.js';
import { withArticleDerived, withSeriesDerived } from './query.js';

/**
 * B6: საჯარო ხედი — ერთი წესი mock adapter-სა (`mock/index.js`) და სერვერზე (`server/routes/public.js`).
 *
 * 1. `localize` — მიმდინარე ენა: თარგმანი ზემოდან, `translations` ქრება, `lang` ემატება (F9).
 * 2. გამოთვლადი ველები (`model.js`: „adapter-ში ითვლება“): `readingMinutes` — სტატიის `body`-დან და
 *    სერიის სლაიდებიდან, **ენის ვერსიის ტექსტით** (ინგლისურ ვერსიას თავისი `body` აქვს). შენახული
 *    მნიშვნელობა (ადმინის ახალ მასალაზე `1`) არ გამოიყენება.
 * 3. „ჩვენ შესახებ“-ის გუნდი / პარტნიორები / ეტაპები — გვერდის ჩანაწერიდან (`orgFromPage`).
 *
 * ხილვადობას (`isPublic`), ფილტრს, ძიებას, დალაგებას და გვერდებს `query.js` აკეთებს — ამ ხედზე.
 */

/** @typedef {import('./model.js').ContentSnapshot} ContentSnapshot */
/** @typedef {import('@/i18n/locale.js').Locale} Locale */

/** საჯარო კოლექციები (გვერდების გარეშე). */
export const PUBLIC_COLLECTIONS = Object.freeze(['articles', 'series', 'videos', 'news', 'events']);

/**
 * გამოთვლადი ველები უკვე ლოკალიზებულ მასალაზე.
 * @param {string} collection
 * @param {Record<string, any>} item
 * @returns {Record<string, any>}
 */
export function deriveItem(collection, item) {
  if (collection === 'articles' && Array.isArray(item?.body)) {
    return withArticleDerived(/** @type {any} */ (item));
  }
  if (collection === 'series' && Array.isArray(item?.slides)) {
    return withSeriesDerived(/** @type {any} */ (item));
  }
  return item;
}

/**
 * ერთი მასალა საჯარო ხედში: `localize` → გამოთვლადი ველები.
 * @param {string} collection
 * @param {Record<string, any>} item
 * @param {Locale} locale
 * @returns {Record<string, any>}
 */
export function publicItem(collection, item, locale) {
  return deriveItem(collection, localize(item, locale));
}

/**
 * მთელი ნაკრები საჯარო ხედში (mock adapter).
 * @param {ContentSnapshot} raw
 * @param {Locale} locale
 * @returns {ContentSnapshot}
 */
export function publicSnapshot(raw, locale) {
  const view = localizeSnapshot(raw, locale);
  return /** @type {ContentSnapshot} */ ({
    ...view,
    articles: view.articles.map((item) => deriveItem('articles', item)),
    series: view.series.map((item) => deriveItem('series', item)),
  });
}

/**
 * ცარიელი თარგმანი არ ითვლება: `''`, ჰარი, `null` / `undefined` და დაცარიელებული ობიექტი ქრება.
 * რედაქტორის ცარიელი ინგლისური ველი (`name: ''`) სხვაგვარად `isTranslated`-ს ატყუებდა.
 * @param {unknown} value
 * @returns {unknown}  undefined — არაფერი დარჩა
 */
export function compactTranslation(value) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() ? value : undefined;
  if (Array.isArray(value)) {
    const list = value.map((entry) => compactTranslation(entry) ?? null);
    return list.some((entry) => entry !== null) ? list : undefined;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, compactTranslation(child)])
      .filter(([, child]) => child !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}

/**
 * @param {unknown} list
 * @param {unknown} translated  გვერდის `translations.en.<ველი>` (ინდექსით)
 * @returns {Record<string, any>[]}
 */
function mergeEntries(list, translated) {
  if (!Array.isArray(list)) return [];
  return list.map((entry, i) => {
    const patch = compactTranslation(Array.isArray(translated) ? translated[i] : undefined);
    if (!patch || !entry || typeof entry !== 'object') return entry;
    const own = entry.translations?.en ?? {};
    return { ...entry, translations: { ...entry.translations, en: overlay(own, patch) } };
  });
}

/**
 * „ჩვენ შესახებ“ გვერდი → გუნდი, პარტნიორები, ეტაპები (B2/B4 #4 — თარგმანი ორ ადგილას):
 * რედაქტორის English ჩანართი წერს გვერდის `translations.en.team[i]` / `partners[i]`-ს, mock-ის
 * მონაცემს კი წევრის საკუთარი `translations.en` აქვს. აქ ორივე ერთდება — წევრის თარგმანზე ზემოდან
 * გვერდისა (ცარიელი ველის გარეშე). ერთი წესი ადმინის mock-ის `setOrg`-სა და სერვერის საჯარო API-ს.
 * @param {Record<string, any> | null | undefined} page
 * @returns {{ team: Record<string, any>[], partners: Record<string, any>[], stages: Record<string, any>[] }}
 */
export function orgFromPage(page) {
  const translated = page?.translations?.en ?? {};
  return {
    team: mergeEntries(page?.team, translated.team),
    partners: mergeEntries(page?.partners, translated.partners),
    stages: Array.isArray(page?.stages) ? page.stages : [],
  };
}
