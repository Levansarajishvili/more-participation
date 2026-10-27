import { formatDate, formatTime } from '@/i18n/index.js';

/**
 * ცხრილის მოკლე თარიღი: „27 ოქტომბერი, 14:57“ (Asia/Tbilisi); მიმდინარე წლის გარეთ — წლითაც.
 * `<time dateTime>`-ში სრული ISO რჩება.
 * @param {string} iso
 * @param {number} [now]
 * @returns {string}
 */
export function shortDateTime(iso, now = Date.now()) {
  const sameYear = new Date(iso).getUTCFullYear() === new Date(now).getUTCFullYear();
  return sameYear
    ? `${formatDate(iso, 'dayMonth')}, ${formatTime(iso)}`
    : formatDate(iso, 'dateTime');
}
