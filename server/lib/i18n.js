import en from '@/i18n/en.js';
import { registerDictionary } from '@/i18n/index.js';
import { DEFAULT_LOCALE, isLocale, withLocale } from '@/i18n/locale.js';

/**
 * B6: სერვერის ენა. frontend-ზე ინგლისური ლექსიკონი ცალკე chunk-ია და `/en`-ზე ერთვება (main.jsx),
 * სერვერს კი ორივე ენა ყოველთვის სჭირდება: საჯარო პასუხი (`localize`), `searchText` (ორივე ენის
 * კატეგორიის წარწერით) და ველის შეცდომის ტექსტი მოთხოვნის ენაზე.
 *
 * ენა მოდულის მდგომარეობაა (`getLocale()`), ამიტომ სერვერზე მხოლოდ `inLocale`-ით (`withLocale`) —
 * სინქრონულ ბლოკში, `await`-ის გარეშე: ერთი პროცესი რამდენიმე მოთხოვნას ერთდროულად ემსახურება.
 */

registerDictionary('en', en);

/**
 * მოთხოვნის ენა: `lang` (`ka` | `en`), სხვა / არარსებული → ქართული.
 * @param {unknown} value
 * @returns {import('@/i18n/locale.js').Locale}
 */
export function requestLocale(value) {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export { withLocale as inLocale };
