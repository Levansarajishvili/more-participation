import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * შემთხვევითი საიდუმლოები (B3): სესიის token, CSRF token, მოწვევის კოდი. ყველა — CSPRNG
 * (`crypto.randomBytes`), ბაზაში მხოლოდ sha256 hash-ით (`hashToken`). sha256 აქ საკმარისია:
 * საიდუმლო 128+ ბიტიანია და შემთხვევითი, ლექსიკონით ვერ გამოიცნობა (პაროლი — argon2id,
 * `password.js`).
 */

/** სესიის / CSRF token: 32 ბაიტი = 256 ბიტი (ASVS 7.2.3: ≥ 128). */
export const TOKEN_BYTES = 32;
/** base64url, 32 ბაიტი → 43 სიმბოლო; სხვა ფორმის cookie ბაზამდე არ მიდის. */
export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

/** მოწვევის კოდი: 16 ბაიტი (128 ბიტი) Crockford base32-ით — 26 სიმბოლო, ხელით გადასაწერად. */
export const INVITE_BYTES = 16;
export const INVITE_PREFIX = 'MC-';
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_PATTERN = /^MC-[0-9A-HJKMNP-TV-Z]{26}$/;

/** @param {number} [bytes] @returns {string} base64url */
export function newToken(bytes = TOKEN_BYTES) {
  return randomBytes(bytes).toString('base64url');
}

/**
 * @param {string} value
 * @returns {string} sha256, hex (64)
 */
export function hashToken(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/**
 * მუდმივი დროის შედარება (სიგრძე ცალკე მოწმდება — ის საიდუმლო არ არის).
 * @param {string} a
 * @param {string} b
 */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

/** @returns {string} `MC-` + 26 სიმბოლო (130 ბიტის ადგილი, 128 შემთხვევითი) */
export function newInviteCode() {
  let n = BigInt(`0x${randomBytes(INVITE_BYTES).toString('hex')}`);
  let out = '';
  for (let i = 0; i < 26; i += 1) {
    out = CROCKFORD[Number(n & 31n)] + out;
    n >>= 5n;
  }
  return INVITE_PREFIX + out;
}

/**
 * ჩასმული კოდი → შესადარებელი ფორმა: კიდეების ჰარი და ასოს ზომა არ ითვლება (ხელით აკრეფა).
 * @param {unknown} code
 * @returns {string}
 */
export function normalizeInviteCode(code) {
  return typeof code === 'string' ? code.trim().toUpperCase() : '';
}
