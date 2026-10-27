import { adminDictionary, ta } from './i18n/index.js';

/**
 * შემოწმების კოდი (`checks.*`, validate.js) → წესის მოკლე სახელი დაფისა და ანგარიშისთვის.
 * უცნობი კოდი (ფორმატის შეცდომა: slug, თარიღი, სავალდებულო ველი) — „სავალდებულო ველი ან ფორმატი“.
 * @param {string} code
 * @returns {string}
 */
export function ruleLabel(code) {
  return code in adminDictionary.a11y.rules ? ta(`a11y.rules.${code}`) : ta('a11y.rules.other');
}
