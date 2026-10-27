import { formatNumber } from './format.js';
import ka from './ka.js';

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

/** ინტერფეისის ენა (`<html lang>`). en.js ჯერ placeholder-ებია. */
export const LANG = 'ka';

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

/**
 * ლექსიკონიდან თარგმნის ფუნქცია. უცნობი გასაღები → თავად გასაღები (dev-ში გაფრთხილებით),
 * რიცხვი ka-GE ფორმატით ჩაისმება, დაკარგული ცვლადი `{name}`-ად რჩება.
 * @param {object} dict
 * @returns {Translate}
 */
export function createT(dict) {
  return function translate(key, vars) {
    const value = lookup(dict, key);
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

/** ქართული თარგმანი — ინტერფეისის ყველა სტრიქონი აქედან. */
export const t = createT(ka);

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
