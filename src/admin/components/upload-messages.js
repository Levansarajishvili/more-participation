import { fileFieldError } from '../api/library.js';
import { ta } from '../i18n/index.js';

/**
 * ატვირთვის შეცდომის ტექსტი UI-სთვის (B5): ბრაუზერის წინასწარი შემოწმება (`files.js` — მხოლოდ UX)
 * და სერვერის / mock-ის პასუხი (`fields.file` — `library.js`-ის `fileError`).
 */

/**
 * @param {import('@/content/files.js').FileCheck} check
 * @param {string} [wrongTypeKey]  `fileType`-ის კონკრეტული ტექსტი (`editor.image.wrongType`)
 * @returns {string | null}
 */
export function checkMessage(check, wrongTypeKey) {
  if (check.ok) return null;
  if (check.code === 'fileType' && wrongTypeKey) return ta(wrongTypeKey);
  return fileFieldError(check.code, { max: check.max }).message;
}

/**
 * @param {unknown} error  `ContentError` (`validation` / `bad-request` + `fields.file`, `forbidden`…)
 * @returns {string}
 */
export function uploadMessage(error) {
  const e = /** @type {{ fields?: Record<string, { message?: string }>, message?: string }} */ (
    error ?? {}
  );
  const field = e.fields?.file ?? Object.values(e.fields ?? {})[0];
  return field?.message ?? e.message ?? String(error);
}
