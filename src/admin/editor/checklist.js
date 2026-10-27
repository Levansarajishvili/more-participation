import {
  validateArticle,
  validateEvent,
  validateNews,
  validateSeries,
  validateVideo,
} from '@/content/validate.js';
import { t } from '@/i18n/index.js';

/**
 * ხელმისაწვდომობის ჩეკლისტი (ATAG 2.0 Part B) — `validate.js`-ის წესებზე, ცოცხლად.
 * - ბლოკავს: სავალდებულო ველები, alt, სათაურების იერარქია, აღწერითი ბმული, სუბტიტრები,
 *   ტრანსკრიპტი, აუდიოაღწერა (ან „ვიზუალური ინფორმაცია აუდიოშიცაა“), მარტივი ენა, ღონისძიების
 *   ხელმისაწვდომობა;
 * - აფრთხილებს: ჟესტური ენის ვერსია, PDF/UA;
 * - ინფორმაციული: კონტრასტი ≥ 7:1 (ფერის არჩევა რედაქტორში არ არსებობს), ხმოვანი ვერსია.
 */

/** @typedef {import('@/content/validate.js').Issue} Issue */
/** @typedef {'block' | 'warn' | 'info'} RuleLevel */
/** @typedef {{ id: string, level: RuleLevel, codes: string[] }} RuleDef */

/** @type {Readonly<Record<string, RuleDef>>} */
export const RULES = Object.freeze({
  required: {
    id: 'required',
    level: 'block',
    codes: [
      'required',
      'slug',
      'slugDuplicate',
      'excerptLength',
      'date',
      'unknownValue',
      'ratio',
      'eventTime',
      'slidesMissing',
    ],
  },
  altMissing: { id: 'altMissing', level: 'block', codes: ['altMissing'] },
  headingOrder: { id: 'headingOrder', level: 'block', codes: ['headingOrder'] },
  linkText: { id: 'linkText', level: 'block', codes: ['linkText', 'linkBroken'] },
  captionsMissing: { id: 'captionsMissing', level: 'block', codes: ['captionsMissing'] },
  transcriptMissing: {
    id: 'transcriptMissing',
    level: 'block',
    codes: ['transcriptMissing', 'transcriptOrder'],
  },
  audioDescriptionMissing: {
    id: 'audioDescriptionMissing',
    level: 'block',
    codes: ['audioDescriptionMissing'],
  },
  plainMissing: { id: 'plainMissing', level: 'block', codes: ['plainMissing'] },
  eventAccess: { id: 'eventAccess', level: 'block', codes: ['eventAccess'] },
  signLanguageMissing: {
    id: 'signLanguageMissing',
    level: 'warn',
    codes: ['signLanguageMissing', 'captionsDefault'],
  },
  pdfUntagged: { id: 'pdfUntagged', level: 'warn', codes: ['pdfUntagged'] },
  contrast: { id: 'contrast', level: 'info', codes: [] },
  voice: { id: 'voice', level: 'info', codes: [] },
});

/** @param {string} entity @param {string} id @param {string} field @param {string} code @param {Record<string, string>} [vars] @returns {Issue} */
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
 * @param {import('../content-types.js').ContentType} type
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

/**
 * @typedef {object} ChecklistItem
 * @property {string} id
 * @property {RuleLevel} level
 * @property {'ok' | 'fail' | 'warn' | 'info'} state
 * @property {Issue[]} issues
 */

/**
 * @param {string[]} ruleIds
 * @param {Issue[]} issues
 * @returns {{ items: ChecklistItem[], done: number, total: number, blocking: Issue[] }}
 */
export function buildChecklist(ruleIds, issues) {
  const items = ruleIds.map((id) => {
    const rule = RULES[id];
    const matched = issues.filter((i) => rule.codes.includes(i.code));
    /** @type {ChecklistItem['state']} */
    let state = 'ok';
    if (rule.level === 'info') state = 'info';
    else if (matched.some((i) => i.severity === 'error')) state = 'fail';
    else if (matched.length) state = 'warn';
    return { id, level: rule.level, state, issues: matched };
  });
  const checkable = items.filter((item) => item.level !== 'info');
  return {
    items,
    done: checkable.filter((item) => item.state === 'ok').length,
    total: checkable.length,
    // ბლოკერი = ყოველი error-შენიშვნა (ჩეკლისტის გარეთა ფორმატის შეცდომებიც)
    blocking: issues.filter((i) => i.severity === 'error'),
  };
}
