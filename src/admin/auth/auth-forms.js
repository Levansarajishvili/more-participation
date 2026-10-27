import { isEmail } from '@/content/forms.js';

import { ta } from '../i18n/index.js';

/**
 * შესვლის / რეგისტრაციის ველების შემოწმება — UI და mock adapter-ი ერთსა და იმავე წესს იყენებს
 * (როგორც `forms.js` საჯარო ფორმებისთვის). ერთადერთი მკაცრი პაროლის წესი — ≥ 12 სიმბოლო;
 * სიმტკიცე მხოლოდ რჩევაა. შესვლისას სიგრძე არ მოწმდება — შეცდომა ზოგადია (ანგარიშს არ ამხელს).
 */

export const PASSWORD_MIN = 12;
export const NAME_MAX = 100;

/** @typedef {{ code: string, message: string }} FieldError */
/** @typedef {Record<string, FieldError>} FieldErrors */

/** @param {string} code @param {Record<string, string | number>} [vars] @returns {FieldError} */
function err(code, vars) {
  return { code, message: ta(`fieldErrors.${code}`, vars) };
}

/** @param {unknown} v */
const blank = (v) => typeof v !== 'string' || v.trim() === '';

/**
 * @param {{ email?: string, password?: string }} values
 * @returns {FieldErrors}
 */
export function validateLogin({ email, password } = {}) {
  /** @type {FieldErrors} */
  const errors = {};
  if (blank(email)) errors.email = err('required');
  else if (!isEmail(String(email).trim())) errors.email = err('email');
  if (blank(password)) errors.password = err('required');
  return errors;
}

/**
 * @param {{ name?: string, email?: string, invite?: string, password?: string }} values
 * @returns {FieldErrors}
 */
export function validateRegister({ name, email, invite, password } = {}) {
  /** @type {FieldErrors} */
  const errors = {};
  if (blank(name)) errors.name = err('required');
  else if (String(name).trim().length > NAME_MAX) errors.name = err('tooLong', { max: NAME_MAX });
  if (blank(email)) errors.email = err('required');
  else if (!isEmail(String(email).trim())) errors.email = err('email');
  if (blank(invite)) errors.invite = err('required');
  if (blank(password)) errors.password = err('required');
  else if (String(password).length < PASSWORD_MIN) {
    errors.password = err('passwordShort', { length: String(password).length });
  }
  return errors;
}

/**
 * პაროლის სიმტკიცე — რჩევა, არა ბლოკი. ქართული ასოც ასოდ ითვლება.
 * @param {string} password
 * @returns {{ level: 0 | 1 | 2 | 3, key: 'empty' | 'weak' | 'fair' | 'strong', tip: string }}
 */
export function passwordStrength(password) {
  const value = password ?? '';
  if (!value) return { level: 0, key: 'empty', tip: '' };
  const length = [...value].length;
  const variety = [/\p{Ll}|\p{Lo}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}\s]/u, /\s/].filter((re) =>
    re.test(value),
  ).length;
  if (length < PASSWORD_MIN) return { level: 1, key: 'weak', tip: ta('auth.strength.tipShort') };
  if (length >= 20 || (length >= 16 && variety >= 3)) {
    return { level: 3, key: 'strong', tip: ta('auth.strength.tipGood') };
  }
  if (variety >= 2) return { level: 2, key: 'fair', tip: ta('auth.strength.tipLonger') };
  return { level: 1, key: 'weak', tip: ta('auth.strength.tipVariety') };
}

/**
 * შესვლის შემდეგ დაბრუნების მისამართი: მხოლოდ `/admin`-ით დაწყებული შიდა გზა (open redirect-ის
 * გარეშე); შესვლის გვერდი თავისთავზე არ ბრუნდება.
 * @param {string | null | undefined} next
 * @returns {string}
 */
export function safeNext(next) {
  if (typeof next !== 'string') return '/admin';
  if (!/^\/admin(?:[/?#]|$)/.test(next) || next.startsWith('//') || next.includes('\\')) {
    return '/admin';
  }
  if (/^\/admin\/login(?:[/?#]|$)/.test(next)) return '/admin';
  return next;
}

/**
 * შესვლის გვერდის მისამართი: `?next=` (თუ დაფა არ არის) + `reason` (expired | logged-out).
 * @param {string} [next]
 * @param {string | null} [reason]
 */
export function loginHref(next, reason) {
  const params = new URLSearchParams();
  const target = safeNext(next);
  if (target !== '/admin') params.set('next', target);
  if (reason) params.set('reason', reason);
  const query = params.toString();
  return query ? `/admin/login?${query}` : '/admin/login';
}
