/**
 * თარიღი და დრო რედაქტორში — ყოველთვის Asia/Tbilisi (UTC+4, საზაფხულო დროის გარეშე): ველი
 * `YYYY-MM-DD` + `HH:MM` ↔ ISO `…T10:00:00+04:00` (მოდელის ფორმატი). სტუმრის დროის სარტყელი
 * მნიშვნელობას არ ცვლის.
 */
const OFFSET_MS = 4 * 3_600_000;

/** @param {string | null | undefined} iso @returns {{ date: string, time: string }} */
export function splitTbilisi(iso) {
  const ms = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(ms)) return { date: '', time: '' };
  const local = new Date(ms + OFFSET_MS).toISOString();
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/** @param {string} date @param {string} time @returns {string | null} */
export function joinTbilisi(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time || '')) return null;
  return `${date}T${time}:00+04:00`;
}

/** წამები → „mm:ss“ / „h:mm:ss“. @param {number} seconds */
export function toClock(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (/** @type {number} */ n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** „mm:ss“ / „h:mm:ss“ → წამები; არასწორი → NaN. @param {string} value */
export function fromClock(value) {
  if (!/^\d{1,2}(:\d{1,2}){1,2}$/.test(value.trim())) return Number.NaN;
  return value
    .trim()
    .split(':')
    .map(Number)
    .reduce((total, n) => total * 60 + n, 0);
}
