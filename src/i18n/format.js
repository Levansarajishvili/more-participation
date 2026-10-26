/**
 * თარიღის, დროისა და რიცხვის ფორმატირება. ყველა თარიღი თბილისის დროით იხატება
 * (`Asia/Tbilisi`, UTC+4, საზაფხულო დროის გარეშე) — ღონისძიება 10:00-ზე 10:00-ად ჩანს
 * ნებისმიერ დროის სარტყელში მყოფი სტუმრისთვისაც.
 *
 * შესავალი მნიშვნელობა: ISO 8601 სტრიქონი, Date ან ms. არასწორ მნიშვნელობაზე ფუნქცია
 * ცარიელ სტრიქონს აბრუნებს და შეცდომას არ აგდებს.
 */

export const LOCALE = 'ka-GE';
export const TIME_ZONE = 'Asia/Tbilisi';

/** @typedef {string | number | Date} DateInput */
/** @typedef {'long' | 'weekday' | 'monthYear' | 'dayMonth' | 'dateTime'} DateStyle */

/** @type {Record<DateStyle, Intl.DateTimeFormatOptions>} */
const DATE_STYLES = {
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  weekday: { weekday: 'long', day: 'numeric', month: 'long' },
  monthYear: { month: 'long', year: 'numeric' },
  dayMonth: { day: 'numeric', month: 'long' },
  dateTime: { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** @type {Map<string, Intl.DateTimeFormat>} */
const formatters = new Map();

/**
 * @param {Intl.DateTimeFormatOptions} options
 * @returns {Intl.DateTimeFormat}
 */
function dateFormatter(options) {
  const key = JSON.stringify(options);
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...options });
    formatters.set(key, formatter);
  }
  return formatter;
}

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
 * „5 მარტი, 2026“ და სხვა წინასწარ განსაზღვრული სტილები.
 * @param {DateInput | null | undefined} value
 * @param {DateStyle} [style='long']
 * @returns {string}
 */
export function formatDate(value, style = 'long') {
  const date = toDate(value);
  return date ? dateFormatter(DATE_STYLES[style] ?? DATE_STYLES.long).format(date) : '';
}

/**
 * თარიღის ნაწილები ბარათის ნიშნისთვის („05“ / „მარ“) — ცალკე ელემენტებად იხატება.
 * @param {DateInput | null | undefined} value
 * @returns {{ day: string, month: string, monthShort: string, year: string } | null}
 */
export function formatDateParts(value) {
  const date = toDate(value);
  if (!date) return null;
  /** @param {Intl.DateTimeFormatOptions} options @param {Intl.DateTimeFormatPartTypes} type */
  const part = (options, type) =>
    dateFormatter(options)
      .formatToParts(date)
      .find((p) => p.type === type)?.value ?? '';
  return {
    day: part({ day: '2-digit' }, 'day'),
    month: part({ month: 'long' }, 'month'),
    monthShort: part({ month: 'short' }, 'month'),
    year: part({ year: 'numeric' }, 'year'),
  };
}

/**
 * „10:00“.
 * @param {DateInput | null | undefined} value
 * @returns {string}
 */
export function formatTime(value) {
  const date = toDate(value);
  return date ? dateFormatter({ hour: '2-digit', minute: '2-digit' }).format(date) : '';
}

/**
 * „10:00–16:00“; თუ დასასრული არ არის — მხოლოდ დასაწყისი.
 * @param {DateInput} start
 * @param {DateInput | null | undefined} [end]
 * @returns {string}
 */
export function formatTimeRange(start, end) {
  const from = toDate(start);
  const to = toDate(end);
  if (!from) return '';
  if (!to || to <= from) return formatTime(from);
  return dateFormatter({ hour: '2-digit', minute: '2-digit' }).formatRange(from, to);
}

/**
 * თბილისის დროით წელი (სიახლეების წლის ფილტრისთვის).
 * @param {DateInput | null | undefined} value
 * @returns {number | null}
 */
export function getYear(value) {
  const date = toDate(value);
  if (!date) return null;
  return Number(formatDateParts(date)?.year) || null;
}

/**
 * <time datetime>-ისთვის: თარიღი თბილისის დროით, YYYY-MM-DD.
 * @param {DateInput | null | undefined} value
 * @returns {string}
 */
export function toDateAttribute(value) {
  const date = toDate(value);
  if (!date) return '';
  const parts = dateFormatter({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(
    date,
  );
  /** @param {Intl.DateTimeFormatPartTypes} type */
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
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
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** @type {Intl.NumberFormat | null} */
let numberFormatter = null;

/**
 * 12345 → „12 345“.
 * @param {number} value
 * @returns {string}
 */
export function formatNumber(value) {
  numberFormatter ??= new Intl.NumberFormat(LOCALE);
  return numberFormatter.format(value);
}
