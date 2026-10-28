/**
 * თარიღის, დროისა და რიცხვის ფორმატირება. ყველა თარიღი თბილისის დროით იხატება
 * (`Asia/Tbilisi`, UTC+4, საზაფხულო დროის გარეშე) — ღონისძიება 10:00-ზე 10:00-ად ჩანს
 * ნებისმიერ დროის სარტყელში მყოფი სტუმრისთვისაც.
 *
 * F6 (§9.7): თარიღი ICU-ის ქართულ ლოკალზე აღარ არის დამოკიდებული. შეკვეცილ ICU-ში (Playwright-ის
 * Chromium, ზოგი Android WebView) `Intl.DateTimeFormat('ka-GE')` ინგლისურს აბრუნებდა („October 24,
 * 2026“, „10:00 AM“). ახლა Intl მხოლოდ რიცხვით ნაწილებს იძლევა (`en-US` + დროის სარტყელი — ყველა
 * ICU-შია), თვისა და კვირის დღის სახელები კი აქაა. შედეგი სრული ICU-ის `ka-GE`-ს სიმბოლოსიმბოლო
 * ემთხვევა (ამოწმებს i18n.test.js); დროის სარტყლის გარეშე გარემოში — ფიქსირებული UTC+4.
 *
 * შესავალი მნიშვნელობა: ISO 8601 სტრიქონი, Date ან ms. არასწორ მნიშვნელობაზე ფუნქცია
 * ცარიელ სტრიქონს აბრუნებს და შეცდომას არ აგდებს.
 */

import { LANG_TAG, getLocale } from './locale.js';

/** @deprecated F9: ენა დინამიკურია — `LANG_TAG[getLocale()]`. */
export const LOCALE = 'ka-GE';
export const TIME_ZONE = 'Asia/Tbilisi';

/** @typedef {string | number | Date} DateInput */
/** @typedef {'long' | 'weekday' | 'monthYear' | 'dayMonth' | 'dateTime'} DateStyle */

export const MONTHS = Object.freeze([
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
]);

export const MONTHS_SHORT = Object.freeze([
  'იან',
  'თებ',
  'მარ',
  'აპრ',
  'მაი',
  'ივნ',
  'ივლ',
  'აგვ',
  'სექ',
  'ოქტ',
  'ნოე',
  'დეკ',
]);

/** 0 = კვირა (`Date#getUTCDay`). */
export const WEEKDAYS = Object.freeze([
  'კვირა',
  'ორშაბათი',
  'სამშაბათი',
  'ოთხშაბათი',
  'ხუთშაბათი',
  'პარასკევი',
  'შაბათი',
]);

/** თბილისი: UTC+4, საზაფხულო დროის გარეშე (2005 წლიდან) — Intl-ის დროის სარტყლის გარეშე. */
/** F9: ინგლისური სახელები (en-GB: „24 October 2026“, დრო 24-საათიანი — თბილისის დროით). */
export const MONTHS_EN = Object.freeze([
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]);
export const MONTHS_SHORT_EN = Object.freeze(MONTHS_EN.map((m) => m.slice(0, 3)));
export const WEEKDAYS_EN = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]);

const names = () =>
  getLocale() === 'en'
    ? { months: MONTHS_EN, short: MONTHS_SHORT_EN, weekdays: WEEKDAYS_EN }
    : { months: MONTHS, short: MONTHS_SHORT, weekdays: WEEKDAYS };

const FIXED_OFFSET = 4 * 3_600_000;

/** @type {Intl.DateTimeFormat | null | undefined} undefined — ჯერ არ შექმნილა, null — მიუწვდომელია */
let partsFormatter;

/**
 * @typedef {object} LocalParts
 * @property {number} year
 * @property {number} month    0–11
 * @property {number} day      1–31
 * @property {number} weekday  0 = კვირა
 * @property {number} hour     0–23
 * @property {number} minute
 */

/** @returns {Intl.DateTimeFormat | null} */
function getPartsFormatter() {
  if (partsFormatter === undefined) {
    try {
      partsFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
    } catch {
      partsFormatter = null;
    }
  }
  return partsFormatter;
}

/**
 * თარიღის ნაწილები თბილისის დროით.
 * @param {Date} date
 * @returns {LocalParts}
 */
function localParts(date) {
  const formatter = getPartsFormatter();
  let year;
  let month;
  let day;
  let hour;
  let minute;
  if (formatter) {
    /** @type {Record<string, number>} */
    const parts = {};
    for (const part of formatter.formatToParts(date)) {
      if (part.type !== 'literal') parts[part.type] = Number(part.value);
    }
    ({ year, day, minute } = parts);
    month = parts.month - 1;
    hour = parts.hour % 24; // ზოგი ძრავა h23-ში შუაღამეს „24“-ად წერს
  } else {
    const local = new Date(date.getTime() + FIXED_OFFSET);
    year = local.getUTCFullYear();
    month = local.getUTCMonth();
    day = local.getUTCDate();
    hour = local.getUTCHours();
    minute = local.getUTCMinutes();
  }
  const weekday = new Date(Date.UTC(year, month, day)).getUTCDay();
  return { year, month, day, weekday, hour, minute };
}

/** @param {number} n */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * @param {DateInput | null | undefined} value
 * @returns {Date | null}
 */
export function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * „5 მარტი, 2026“ და სხვა წინასწარ განსაზღვრული სტილები:
 * long „5 მარტი, 2026“ · weekday „ხუთშაბათი, 5 მარტი“ · monthYear „მარტი, 2026“ ·
 * dayMonth „5 მარტი“ · dateTime „5 მარტი, 2026, 10:00“.
 * @param {DateInput | null | undefined} value
 * @param {DateStyle} [style='long']
 * @returns {string}
 */
export function formatDate(value, style = 'long') {
  const date = toDate(value);
  if (!date) return '';
  const p = localParts(date);
  const { months, weekdays } = names();
  const en = getLocale() === 'en';
  const dayMonth = `${p.day} ${months[p.month]}`;
  const time = `${pad2(p.hour)}:${pad2(p.minute)}`;
  switch (style) {
    case 'weekday':
      return `${weekdays[p.weekday]}, ${dayMonth}`;
    case 'monthYear':
      return en ? `${months[p.month]} ${p.year}` : `${months[p.month]}, ${p.year}`;
    case 'dayMonth':
      return dayMonth;
    case 'dateTime':
      return en ? `${dayMonth} ${p.year}, ${time}` : `${dayMonth}, ${p.year}, ${time}`;
    default:
      return en ? `${dayMonth} ${p.year}` : `${dayMonth}, ${p.year}`;
  }
}

export function formatDateParts(value) {
  const date = toDate(value);
  if (!date) return null;
  const p = localParts(date);
  const { months, short } = names();
  return {
    day: pad2(p.day),
    month: months[p.month],
    monthShort: short[p.month],
    year: String(p.year),
  };
}

/**
 * „10:00“ (24-საათიანი).
 * @param {DateInput | null | undefined} value
 * @returns {string}
 */
export function formatTime(value) {
  const date = toDate(value);
  if (!date) return '';
  const p = localParts(date);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * „10:00–16:00“; თუ დასასრული არ არის — მხოლოდ დასაწყისი. სხვადასხვა დღე —
 * „5 მარტი, 2026, 10:00 – 6 მარტი, 2026, 16:00“.
 * @param {DateInput} start
 * @param {DateInput | null | undefined} [end]
 * @returns {string}
 */
export function formatTimeRange(start, end) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from) return '';
  if (!to || to <= from) return formatTime(from);
  if (toDateAttribute(from) !== toDateAttribute(to)) {
    return `${formatDate(from, 'dateTime')} – ${formatDate(to, 'dateTime')}`;
  }
  return `${formatTime(from)}–${formatTime(to)}`;
}

/**
 * თბილისის დროით წელი (სიახლეების წლის ფილტრისთვის).
 * @param {DateInput | null | undefined} value
 * @returns {number | null}
 */
export function getYear(value) {
  const date = toDate(value);
  return date ? localParts(date).year : null;
}

/**
 * <time datetime>-ისთვის: თარიღი თბილისის დროით, YYYY-MM-DD.
 * @param {DateInput | null | undefined} value
 * @returns {string}
 */
export function toDateAttribute(value) {
  const date = toDate(value);
  if (!date) return '';
  const p = localParts(date);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`;
}

/**
 * ვიდეოს ხანგრძლივობა ციფრებად: 270 → „04:30“, 3725 → „1:02:05“.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

/** @type {((value: number) => string) | null} */
/** @type {Record<string, (value: number) => string>} */
const numberFormats = {};

/**
 * ka-GE-ის დაჯგუფება ICU-ის გარეშე: ოთხნიშნა — დაჯგუფების გარეშე, ხუთნიშნა და მეტი — U+00A0.
 * @param {number} value
 * @returns {string}
 */
function groupGeorgian(value) {
  const [int, frac] = String(Math.abs(value)).split('.');
  const grouped = int.length >= 5 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') : int;
  return `${value < 0 ? '-' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/**
 * 12345 → „12 345“ (U+00A0), 1234 → „1234“.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  const locale = getLocale();
  if (!numberFormats[locale]) {
    if (locale === 'en') {
      const intl = new Intl.NumberFormat(LANG_TAG.en);
      numberFormats.en = (v) => intl.format(v);
    } else {
      const intl = new Intl.NumberFormat(LANG_TAG.ka);
      numberFormats.ka = intl.resolvedOptions().locale.startsWith('ka')
        ? (v) => intl.format(v)
        : groupGeorgian;
    }
  }
  return numberFormats[locale](value);
}

export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatNumber(Math.max(1, Math.round(kb)))} KB`;
  const mb = Math.round((kb / 1024) * 10) / 10;
  return `${formatNumber(mb)} MB`;
}
