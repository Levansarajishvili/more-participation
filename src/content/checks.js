import { isTranslated, localize } from './localize.js';
import {
  validateArticle,
  validateEvent,
  validateNews,
  validateSeries,
  validateVideo,
} from './validate.js';
import { isPlaceholder } from './youtube.js';

import { t } from '@/i18n/index.js';

/**
 * მასალის შემოწმება ადმინისთვის (B4): ერთი წესი სამ ადგილას — რედაქტორის ჩეკლისტი
 * (`src/admin/editor/checklist.js`), ადმინის mock (`src/admin/api/mock.js`) და სერვერი
 * (`server/routes/content.js`). F8–F10-ში ეს ფუნქციები `checklist.js`-ში იყო; სერვერს გამოქვეყნების
 * ბლოკერი იგივე უნდა ჰქონდეს, რაც რედაქტორს (§12: „frontend-ის შემოწმება მხოლოდ UX-ია“).
 *
 * - `validateEntity` — `validate.js`-ის წესები ტიპის მიხედვით + გვერდები (`validatePage`);
 * - `validateTranslation` — ინგლისური ვერსია (თუ თარგმანი არის), მხოლოდ `EN_CODES`;
 * - `publishBlockers` — ორივე ერთად, მხოლოდ `error` (გამოქვეყნებას აჩერებს);
 * - `blockerFields` — ბლოკერები → `ContentError('validation').fields` (ველის გზა → `{ code, message }`).
 *
 * საჯარო bundle-ში არ ხვდება (`validate.js`-ის მსგავსად) — მას მხოლოდ ადმინი და სერვერი იძახებს.
 */

/** @typedef {import('./validate.js').Issue} Issue */
/** @typedef {import('@/admin/content-types.js').ContentType} ContentType */

/**
 * @param {string} entity @param {string} id @param {string} field @param {string} code
 * @param {Record<string, string>} [vars]
 * @returns {Issue}
 */
function issue(entity, id, field, code, vars) {
  return {
    severity: 'error',
    entity: /** @type {any} */ (entity),
    id,
    field,
    code,
    message: t(`checks.${code}`, vars),
  };
}

/**
 * გვერდების შემოწმება (validate.js-ში გვერდის ტიპი არ არის): სახელი; „ჩვენ შესახებ“ — გუნდის
 * ფოტოს და პარტნიორის ლოგოს alt, სახელი, როლი.
 * @param {Record<string, any>} page
 * @returns {Issue[]}
 */
export function validatePage(page) {
  /** @type {Issue[]} */
  const out = [];
  const id = page.slug ?? 'page';
  if (!page.title?.trim()) out.push(issue('page', id, 'title', 'required', { field: 'title' }));
  if ((page.fields?.description ?? '').length > 160) {
    out.push(
      issue('page', id, 'fields.description', 'excerptLength', {
        length: String(page.fields.description.length),
        max: '160',
      }),
    );
  }
  (page.team ?? []).forEach((/** @type {any} */ member, /** @type {number} */ i) => {
    if (!member.name?.trim())
      out.push(issue('team', id, `team[${i}].name`, 'required', { field: `team[${i}].name` }));
    if (!member.role?.trim())
      out.push(issue('team', id, `team[${i}].role`, 'required', { field: `team[${i}].role` }));
    if (!member.photo?.alt?.trim())
      out.push(issue('team', id, `team[${i}].photo.alt`, 'altMissing'));
  });
  (page.partners ?? []).forEach((/** @type {any} */ partner, /** @type {number} */ i) => {
    if (!partner.name?.trim())
      out.push(
        issue('partner', id, `partners[${i}].name`, 'required', { field: `partners[${i}].name` }),
      );
    if (!partner.logo?.alt?.trim())
      out.push(issue('partner', id, `partners[${i}].logo.alt`, 'altMissing'));
  });
  return out;
}

/**
 * @param {ContentType} type
 * @param {Record<string, any>} values
 * @param {Set<string>} articleSlugs  საჯარო სტატიები (ბმულის შემოწმება)
 * @returns {Issue[]}
 */
export function validateEntity(type, values, articleSlugs) {
  const item = /** @type {any} */ (values);
  switch (type) {
    case 'articles':
      return validateArticle(item, articleSlugs, []);
    case 'news':
      return validateNews(item, articleSlugs, []);
    case 'series':
      return validateSeries(item, []);
    case 'videos':
      return validateVideo(item, []);
    case 'events':
      return validateEvent(item, []);
    default:
      return validatePage(item);
  }
}

/** F9: ინგლისურ ვერსიაში ცალკე მოწმდება — ტექსტთან დაკავშირებული წესები. */
export const EN_CODES = Object.freeze([
  'altMissing',
  'headingOrder',
  'linkText',
  'linkBroken',
  'excerptLength',
  'plainMissing',
]);

/** ინგლისური ვერსიის ველის პრეფიქსი. */
export const EN_PREFIX = 'translations.en';

/**
 * ინგლისური ვერსიის შემოწმება (თუ თარგმანი არის): ქართულზე ზემოდან დადებული თარგმანი →
 * იგივე წესები; შენიშვნის ველი — `translations.en.<გზა>` (შეცდომების ჯამი ინგლისურ ველზე მიდის).
 * @param {ContentType} type
 * @param {Record<string, any>} values
 * @param {Set<string>} articleSlugs
 * @returns {Issue[]}
 */
export function validateTranslation(type, values, articleSlugs) {
  if (!isTranslated(values, 'en')) return [];
  const merged = localize(values, 'en');
  return validateEntity(type, merged, articleSlugs)
    .filter((entry) => EN_CODES.includes(entry.code))
    .map((entry) => ({
      ...entry,
      field: `${EN_PREFIX}.${entry.field}`,
      message: `${entry.message} (English)`,
    }));
}

/**
 * `[ჩანაცვლება]` YouTube-ის id-ში (mock / seed: `[YouTube-ის id]`). `validate.js` მას mock-ისთვის
 * უშვებს (`validateContent` — 0 შენიშვნა dev-ში); სერვერზე ის გამოქვეყნებას აჩერებს — ჩანაცვლება
 * წარმოებაში არ უნდა გავიდეს (B2-ის ღია #2).
 * @param {ContentType} type
 * @param {Record<string, any>} item
 * @returns {Issue[]}
 */
export function placeholderIssues(type, item) {
  if (type !== 'videos') return [];
  return ['id', 'adId']
    .filter((key) => isPlaceholder(item.youtube?.[key]))
    .map((key) => issue('video', item.slug ?? 'video', `youtube.${key}`, 'youtubeInvalid'));
}

/**
 * გამოქვეყნების ბლოკერი: ქართული ვერსიის ყოველი `error` + ინგლისური ვერსიის `error` (თუ თარგმანი
 * არის). რედაქტორის `checklist.blocking`-ის იგივე ნაკრები; სერვერი (`placeholders: false`) —
 * + `[ჩანაცვლება]` YouTube-ის id-ში.
 * @param {ContentType} type
 * @param {Record<string, any>} item
 * @param {Set<string>} articleSlugs
 * @param {{ placeholders?: boolean }} [options]  `false` — ჩანაცვლება ბლოკერია (სერვერი)
 * @returns {Issue[]}
 */
export function publishBlockers(type, item, articleSlugs, { placeholders = true } = {}) {
  return [
    ...validateEntity(type, item, articleSlugs),
    ...validateTranslation(type, item, articleSlugs),
    ...(placeholders ? [] : placeholderIssues(type, item)),
  ].filter((entry) => entry.severity === 'error');
}

/**
 * ბლოკერები → `validation`-ის `fields`: ველის გზა → პირველი შენიშვნა ამ ველზე.
 * @param {Issue[]} issues
 * @returns {Record<string, { code: any, message: string }>}
 */
export function blockerFields(issues) {
  /** @type {Record<string, { code: any, message: string }>} */
  const fields = {};
  for (const entry of issues) {
    fields[entry.field] ??= { code: entry.code, message: entry.message };
  }
  return fields;
}

/**
 * სიის სტრიქონის მრიცხველი: ბლოკერები, გაფრთხილებები, უნიკალური კოდები.
 * @param {Issue[]} issues
 * @returns {{ errors: number, warnings: number, codes: string[] }}
 */
export function issueCounts(issues) {
  return {
    errors: issues.filter((i) => i.severity === 'error').length,
    warnings: issues.filter((i) => i.severity === 'warning').length,
    codes: [...new Set(issues.map((i) => i.code))],
  };
}
