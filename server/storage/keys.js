import { randomBytes } from 'node:crypto';

import { MEDIA_TYPES, storedExtension } from '@/content/files.js';

import { MEDIA_PATH } from '../db/derive.js';

/**
 * საცავის გასაღები და საჯარო მისამართი (B5): `/media/<key>`. ყოველი საცავი გასაღებს `assertKey`-ით
 * ამოწმებს — სხვა ფორმის გასაღები (`../`, უცხო გაფართოება) არც იწერება, არც იკითხება.
 */

/** გასაღები: `<სახე>/<წელი>/<22 სიმბოლო base64url>.<გაფართოება>`. */
export const MEDIA_KEY_PATTERN =
  /^(image|document|track)\/\d{4}\/[A-Za-z0-9_-]{22}\.(jpg|png|webp|pdf|vtt)$/;

export const MEDIA_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** @param {unknown} key */
export const isMediaKey = (key) => typeof key === 'string' && MEDIA_KEY_PATTERN.test(key);

/**
 * @param {'image' | 'document' | 'track'} kind
 * @param {keyof typeof MEDIA_TYPES} mime
 * @param {number} [now]
 * @returns {string}
 */
export function newMediaKey(kind, mime, now = Date.now()) {
  const year = new Date(now).getUTCFullYear();
  return `${kind}/${year}/${randomBytes(16).toString('base64url')}.${storedExtension(mime)}`;
}

/**
 * გასაღების MIME (გაფართოებით) — მიწოდებისას საცავის მეტამონაცემს არ ვენდობით.
 * @param {string} key
 * @returns {string}
 */
export function contentTypeOfKey(key) {
  const extension = key.slice(key.lastIndexOf('.') + 1);
  const found = Object.entries(MEDIA_TYPES).find(([, info]) =>
    /** @type {readonly string[]} */ (info.extensions).includes(extension),
  );
  return found ? found[0] : 'application/octet-stream';
}

/** @param {string} key */
export const mediaSrc = (key) => `${MEDIA_PATH}${key}`;

/**
 * @param {unknown} src
 * @returns {string | null}
 */
export function keyOfSrc(src) {
  if (typeof src !== 'string' || !src.startsWith(MEDIA_PATH)) return null;
  const key = src.slice(MEDIA_PATH.length);
  return isMediaKey(key) ? key : null;
}

/**
 * გასაღების შემოწმება საცავის ყოველ ოპერაციაზე (path traversal, უცხო გასაღები).
 * @param {string} key
 */
export function assertKey(key) {
  if (!isMediaKey(key)) throw new Error('storage: invalid key');
}
