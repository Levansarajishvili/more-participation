/**
 * ხელმისაწვდომობის ჩეკლისტი (ATAG 2.0 Part B) — `validate.js`-ის წესებზე, ცოცხლად.
 * - ბლოკავს: სავალდებულო ველები, alt, სათაურების იერარქია, აღწერითი ბმული, ვიდეოს წყარო
 *   (YouTube-ის id, F10), ქართული სუბტიტრი (VTT: ნაგულისხმევი, ცარიელი არ არის, ვიდეოზე გრძელი არ
 *   არის), ტრანსკრიპტი, აუდიოაღწერა (YouTube-ვერსია ან „ვიზუალური ინფორმაცია აუდიოშიცაა“), მარტივი
 *   ენა, ღონისძიების ხელმისაწვდომობა;
 * - აფრთხილებს: PDF/UA (ჟესტური ენის ვერსია B0-დან არ კეთდება — წესი ამოღებულია);
 * - ინფორმაციული: კონტრასტი ≥ 7:1 (ფერის არჩევა რედაქტორში არ არსებობს), ხმოვანი ვერსია.
 *
 * B4: შემოწმების ფუნქციები (`validateEntity`, `validatePage`, `validateTranslation`, `EN_CODES`)
 * საერთო `src/content/checks.js`-შია — იმავე მოდულით ამოწმებს გამოქვეყნებას ადმინის mock და სერვერი.
 * აქ — მხოლოდ ჩეკლისტის წესები (UI) და re-export.
 */

export { EN_CODES, validateEntity, validatePage, validateTranslation } from '@/content/checks.js';

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
  videoSource: { id: 'videoSource', level: 'block', codes: ['youtubeMissing', 'youtubeInvalid'] },
  captionsMissing: {
    id: 'captionsMissing',
    level: 'block',
    codes: ['captionsMissing', 'captionsDefault', 'captionsEmpty', 'captionsLength'],
  },
  transcriptMissing: {
    id: 'transcriptMissing',
    level: 'block',
    codes: ['transcriptMissing', 'transcriptOrder'],
  },
  audioDescriptionMissing: {
    id: 'audioDescriptionMissing',
    level: 'block',
    codes: ['audioDescriptionMissing', 'audioDescriptionSame'],
  },
  plainMissing: { id: 'plainMissing', level: 'block', codes: ['plainMissing'] },
  eventAccess: { id: 'eventAccess', level: 'block', codes: ['eventAccess'] },
  pdfUntagged: { id: 'pdfUntagged', level: 'warn', codes: ['pdfUntagged'] },
  contrast: { id: 'contrast', level: 'info', codes: [] },
  voice: { id: 'voice', level: 'info', codes: [] },
});

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
