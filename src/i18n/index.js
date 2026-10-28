import { formatNumber } from './format.js';
import ka from './ka.js';
import { LANG_TAG, getLocale } from './locale.js';

export {
  LOCALE,
  TIME_ZONE,
  formatDate,
  formatDateParts,
  formatDuration,
  formatFileSize,
  formatNumber,
  formatTime,
  formatTimeRange,
  getYear,
  toDate,
  toDateAttribute,
} from './format.js';

export {
  DEFAULT_LOCALE,
  EN_PREFIX,
  LANG_TAG,
  LOCALES,
  alternatePath,
  getLocale,
  isLocale,
  localeFromPath,
  localizePath,
  setLocale,
  storeLocale,
  storedLocale,
  stripLocale,
} from './locale.js';

/** მიმდინარე ინტერფეისის ენის კოდი (`<html lang>`, `lang` ატრიბუტი). */
export function getLang() {
  return getLocale();
}

/** @typedef {typeof ka} Dictionary */
/** @typedef {Record<string, string | number | null | undefined>} TranslateVars */
/** @typedef {(key: string, vars?: TranslateVars) => string} Translate */

/**
 * @param {unknown} dict
 * @param {string} key
 * @returns {unknown}
 */
function lookup(dict, key) {
  /** @type {unknown} */
  let node = dict;
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return undefined;
    node = /** @type {Record<string, unknown>} */ (node)[part];
  }
  return node;
}

/** @type {Set<string>} */
const reported = new Set();

/**
 * @param {string} message
 */
function devWarn(message) {
  if (!import.meta.env.DEV || reported.has(message)) return;
  reported.add(message);
  console.warn(`[i18n] ${message}`);
}

/** @type {Map<string, Intl.PluralRules>} */
const pluralRules = new Map();

/**
 * მრავლობითი (ინგლისური): `{ one: '{count} article', other: '{count} articles' }` — არჩევანი
 * `vars.count`-ით (`Intl.PluralRules`). ქართულს plural არ სჭირდება — იქ ფორმა ერთია.
 * @param {unknown} value
 * @param {TranslateVars | undefined} vars
 * @param {string} lang
 * @returns {unknown}
 */
function pickPlural(value, vars, lang) {
  if (
    !value ||
    typeof value !== 'object' ||
    typeof (/** @type {any} */ (value).other) !== 'string'
  ) {
    return value;
  }
  const count = Number(vars?.count);
  let rules = pluralRules.get(lang);
  if (!rules) {
    rules = new Intl.PluralRules(lang);
    pluralRules.set(lang, rules);
  }
  const form = Number.isFinite(count) ? rules.select(count) : 'other';
  return /** @type {Record<string, string>} */ (value)[form] ?? /** @type {any} */ (value).other;
}

/**
 * ლექსიკონიდან თარგმნის ფუნქცია. უცნობი გასაღები → სარეზერვო ლექსიკონი (ქართული) → თავად
 * გასაღები (dev-ში გაფრთხილებით), რიცხვი მიმდინარე ენის ფორმატით ჩაისმება, დაკარგული ცვლადი
 * `{name}`-ად რჩება; `{ one, other }` — მრავლობითი `count`-ით.
 * @param {object} dict
 * @param {{ fallback?: object, lang?: string }} [options]
 * @returns {Translate}
 */
export function createT(dict, { fallback, lang = 'ka-GE' } = {}) {
  return function translate(key, vars) {
    let value = pickPlural(lookup(dict, key), vars, lang);
    if (typeof value !== 'string' && fallback)
      value = pickPlural(lookup(fallback, key), vars, lang);
    if (typeof value !== 'string') {
      devWarn(`გასაღები არ არის: ${key}`);
      return key;
    }
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (match, name) => {
      const v = vars[name];
      if (v === undefined || v === null) {
        devWarn(`ცვლადი {${name}} არ გადაეცა: ${key}`);
        return match;
      }
      return typeof v === 'number' ? formatNumber(v) : String(v);
    });
  };
}

const tKa = createT(ka, { lang: LANG_TAG.ka });
/** ინგლისური ლექსიკონი ცალკე chunk-ია — იტვირთება მხოლოდ `/en`-ზე (main.jsx). @type {Translate | null} */
let tEn = null;

/**
 * F9: ენის ლექსიკონის რეგისტრაცია (ინგლისური — main.jsx დინამიკური import-ით, ტესტებში — setup).
 * ქართველ მომხმარებელს ინგლისური ტექსტი არ ჩამოტვირთავს.
 * @param {'en'} locale
 * @param {object} dict
 */
export function registerDictionary(locale, dict) {
  if (locale === 'en') tEn = createT(dict, { fallback: ka, lang: LANG_TAG.en });
}

/**
 * ინტერფეისის ყველა სტრიქონი აქედან — მიმდინარე ენით (`getLocale()`): ქართული `ka.js`,
 * ინგლისური `en.js` (დაკარგული გასაღები — ქართულიდან).
 * @type {Translate}
 */
export function t(key, vars) {
  return getLocale() === 'en' && tEn ? tEn(key, vars) : tKa(key, vars);
}

/**
 * ენის-წყვილი ლექსიკონი (ადმინის `ta()`): იგივე წესები, მიმდინარე ენით.
 * @param {object} kaDict
 * @param {object} enDict
 * @returns {Translate}
 */
export function createLocalizedT(kaDict, enDict) {
  const a = createT(kaDict, { lang: LANG_TAG.ka });
  const b = createT(enDict, { fallback: kaDict, lang: LANG_TAG.en });
  return (key, vars) => (getLocale() === 'en' ? b(key, vars) : a(key, vars));
}

/**
 * ხანგრძლივობა წასაკითხად (aria-label, ეკრანის მკითხველი): 270 → „4 წუთი 30 წამი“.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts = [];
  if (h) parts.push(t('time.hours', { count: h }));
  if (m) parts.push(t('time.minutes', { count: m }));
  if (s || parts.length === 0) parts.push(t('time.seconds', { count: s }));
  return parts.join(' ');
}
