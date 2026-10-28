/**
 * ინტერფეისის ენა (F9: ქართული / ინგლისური). ქართული — ძირი (`/`, `/admin`), ინგლისური — `/en`
 * პრეფიქსი (`/en/articles`, `/en/admin`).
 *
 * მიმდინარე ენა მოდულის მდგომარეობაა: `t()`, თარიღის ფორმატი და ხმოვანი რეჟიმი მას კითხულობს.
 * საჯარო საიტზე მას URL განსაზღვრავს (RootLayout → `setLocale` render-ამდე), ადმინში — ენის
 * გადამრთველი. ენის შეცვლა ხეს თავიდან ხატავს (ცალკე როუტის შტო / `key`).
 */

/** @typedef {'ka' | 'en'} Locale */

/** @type {readonly Locale[]} */
export const LOCALES = Object.freeze(['ka', 'en']);
export const DEFAULT_LOCALE = /** @type {Locale} */ ('ka');
/** ინგლისური ვერსიის პრეფიქსი. */
export const EN_PREFIX = '/en';
/** ადმინის ენის პარამეტრი (localStorage). */
export const LANG_KEY = 'mc-lang';

/** BCP 47 ტეგი Intl-ისა და ხმისთვის. */
export const LANG_TAG = Object.freeze({ ka: 'ka-GE', en: 'en-GB' });

/** @type {Locale} */
let current = DEFAULT_LOCALE;

/** @returns {Locale} */
export function getLocale() {
  return current;
}

/** @param {unknown} value @returns {value is Locale} */
export function isLocale(value) {
  return value === 'ka' || value === 'en';
}

/**
 * ენის დაყენება: მოდულის მდგომარეობა + `<html lang>`.
 * @param {Locale} locale
 */
export function setLocale(locale) {
  const next = isLocale(locale) ? locale : DEFAULT_LOCALE;
  current = next;
  if (typeof document !== 'undefined' && document.documentElement.lang !== next) {
    document.documentElement.lang = next;
  }
}

/** @param {string} pathname @returns {Locale} */
export function localeFromPath(pathname) {
  return pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`) ? 'en' : 'ka';
}

/** `/en/articles` → `/articles`, `/en` → `/`. @param {string} pathname */
export function stripLocale(pathname) {
  if (pathname === EN_PREFIX) return '/';
  return pathname.startsWith(`${EN_PREFIX}/`) ? pathname.slice(EN_PREFIX.length) : pathname;
}

/**
 * საიტის შიდა გზა მიმდინარე (ან მითითებულ) ენაზე: ინგლისურზე `/en` ემატება — ადმინსაც
 * (`/admin` → `/en/admin`). გარე ბმული, `#`, `?`, `mailto:` / `tel:` და ფარდობითი გზა უცვლელია;
 * უკვე პრეფიქსიანი — ორჯერ არა.
 * @param {string} path
 * @param {Locale} [locale]
 * @returns {string}
 */
export function localizePath(path, locale = current) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) {
    return path;
  }
  const bare = stripLocale(path.split(/[?#]/)[0]) + path.slice(path.split(/[?#]/)[0].length);
  if (locale === 'ka') return bare;
  return bare === '/'
    ? EN_PREFIX
    : bare.startsWith('/?') || bare.startsWith('/#')
      ? `${EN_PREFIX}${bare.slice(1)}`
      : `${EN_PREFIX}${bare}`;
}

/**
 * იგივე გვერდი სხვა ენაზე (ენის გადამრთველი, hreflang).
 * @param {{ pathname: string, search?: string, hash?: string }} location
 * @param {Locale} locale
 */
export function alternatePath({ pathname, search = '', hash = '' }, locale) {
  return localizePath(`${stripLocale(pathname)}${search}${hash}`, locale);
}

/** ადმინის შენახული ენა (ან ბრაუზერის `navigator.language`). @returns {Locale} */
export function storedLocale() {
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage მიუწვდომელია
  }
  return DEFAULT_LOCALE;
}

/** @param {Locale} locale */
export function storeLocale(locale) {
  try {
    window.localStorage.setItem(LANG_KEY, locale);
  } catch {
    // storage მიუწვდომელია — ენა მხოლოდ ამ სესიაში
  }
}
