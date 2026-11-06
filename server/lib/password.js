import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import argon2 from 'argon2';

import { validateRegister } from '@/admin/auth/auth-forms.js';
import { ta } from '@/admin/i18n/index.js';

import { newToken } from './tokens.js';

/**
 * პაროლი (B3): argon2id + ცნობილი პაროლების სია.
 *
 * პარამეტრები — OWASP Password Storage Cheat Sheet, „Argon2id“ (OWASP/CheatSheetSeries,
 * cheatsheets/Password_Storage_Cheat_Sheet.md, შემოწმდა 2026-11-05): მინიმალური კონფიგურაციებიდან
 * m=19456 (19 MiB), t=2, p=1. 46 MiB / t=1 ვარიანტი იგივე დაცვაა, მაგრამ Render Starter-ის
 * 512 MB-ზე პარალელური შესვლისას მეხსიერებას ორჯერ მეტს ხარჯავს. sandbox-ში ~30 ms / hash.
 *
 * პაროლი მოწმდება ზუსტად ისე, როგორც მოვიდა (ASVS 6.2.8) — trim / ასოს ზომა / Unicode-ის
 * ნორმალიზება არ ხდება. სიგრძის წესი — `auth-forms.js` (UI-ის იგივე, ≥ 12); სიის შემოწმება
 * (ASVS 6.2.4) მხოლოდ სერვერზეა — 3000 სტრიქონი ადმინის bundle-ში არ ხვდება.
 */

export const ARGON2_OPTIONS = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
});

/**
 * SecLists `Passwords/Common-Credentials/xato-net-10-million-passwords-1000000.txt` (MIT, commit
 * 48c951a3c3af): რიგით პირველი 3000 უნიკალური (პატარა ასოებით) პაროლი, რომელიც ≥ 12 სიმბოლოა —
 * ანუ ჩვენს პოლიტიკას აკმაყოფილებს (ASVS 6.2.4: „top 3000 passwords which match the policy“).
 */
export const COMMON_PASSWORDS_URL = new URL(
  '../data/common-passwords.txt',
  String(import.meta.url), // Vite-ის asset-ის გარდაქმნის გარეშე (jsdom-ის ტესტი)
);

/** @type {Set<string> | null} */
let common = null;

/** @returns {Set<string>} */
export function commonPasswords() {
  common ??= new Set(
    readFileSync(COMMON_PASSWORDS_URL, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
  return common;
}

/** @param {string} password */
export function isCommonPassword(password) {
  return commonPasswords().has(password.toLowerCase());
}

/** @param {string} password @returns {Promise<string>} PHC (`$argon2id$v=19$m=19456,…`) */
export function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * @param {string} hash
 * @param {string} password
 * @returns {Promise<boolean>}  დაზიანებული hash → false (გამონაკლისი არა)
 */
export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** ძველი პარამეტრებით შენახული hash შესვლისას ახლდება. @param {string} hash */
export function needsRehash(hash) {
  return argon2.needsRehash(hash, ARGON2_OPTIONS);
}

/** @type {Promise<string> | null} */
let dummy = null;

/**
 * უცნობი ელფოსტით შესვლაზე ამ hash-ს ვამოწმებთ — პასუხის დრო იგივეა, რაც არასწორ პაროლზე.
 * იგივე პარამეტრებით, შემთხვევითი პაროლით (არც ერთ შეყვანას არ ემთხვევა).
 * @returns {Promise<string>}
 */
export function dummyHash() {
  dummy ??= hashPassword(newToken());
  return dummy;
}

/** @typedef {import('@/admin/auth/auth-forms.js').FieldErrors} FieldErrors */

/**
 * რეგისტრაციის ველები: `validateRegister` (UI-ისა და mock-ის იგივე წესი) + ცნობილი პაროლი.
 * @param {{ name?: string, email?: string, invite?: string, password?: string }} values
 * @returns {FieldErrors}
 */
export function registerFieldErrors(values) {
  const fields = validateRegister(values);
  if (
    !fields.password &&
    typeof values.password === 'string' &&
    isCommonPassword(values.password)
  ) {
    fields.password = { code: 'passwordCommon', message: ta('fieldErrors.passwordCommon') };
  }
  return fields;
}
