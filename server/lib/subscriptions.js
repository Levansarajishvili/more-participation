import { createHmac } from 'node:crypto';

import { isUnsubscribeToken } from '@/content/forms.js';

import { safeEqual } from './tokens.js';

/**
 * გამოწერის გაუქმების ბმული (B6): `<id>.<HMAC-SHA256(SUBSCRIBE_SECRET, "unsubscribe:<id>")>`.
 * ბაზაში არაფერი ინახება — ბმული ყოველ წერილში თავიდან იქმნება (მისასალმებელი წერილი, მომავალი
 * newsletter-ის ინსტრუმენტი — B7). საიდუმლოს შეცვლა ყველა ძველ ბმულს აუქმებს. ხელმოწერა
 * მუდმივი დროით მოწმდება.
 */

/**
 * @param {string} secret
 * @param {string} id  გამომწერის `_id` (24 hex)
 */
function signature(secret, id) {
  return createHmac('sha256', secret).update(`unsubscribe:${id}`, 'utf8').digest('base64url');
}

/**
 * @param {string} secret
 * @param {string} id
 * @returns {string}  `forms.js`-ის `UNSUBSCRIBE_TOKEN`-ის ფორმით
 */
export function unsubscribeToken(secret, id) {
  return `${id}.${signature(secret, id)}`;
}

/**
 * @param {string} secret
 * @param {unknown} token
 * @returns {string | null}  გამომწერის id ან null (ფორმა / ხელმოწერა არასწორია)
 */
export function verifyUnsubscribeToken(secret, token) {
  if (!isUnsubscribeToken(token)) return null;
  const [id, signed] = token.split('.');
  return safeEqual(signed, signature(secret, id)) ? id : null;
}
