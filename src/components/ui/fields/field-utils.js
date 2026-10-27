import { useId } from 'react';

/**
 * ველის id-ები: ველი, მინიშნება, შეცდომა.
 * @param {string} [id]
 */
export function useFieldIds(id) {
  const auto = useId();
  const base = id ?? auto;
  return { id: base, hint: `${base}-hint`, error: `${base}-error` };
}

/**
 * შეცდომა: სტრიქონი ან `{ message }` (`ContentError.fields[name]`, `validateContact()`).
 * @param {string | { message: string } | null | undefined} error
 * @returns {string | null}
 */
export function errorMessage(error) {
  if (!error) return null;
  return typeof error === 'string' ? error : error.message;
}

/**
 * @param {...(string | false | null | undefined)} ids
 * @returns {string | undefined}
 */
export function describedBy(...ids) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

/**
 * ველზე ფოკუსი (F6, შეცდომების ჯამი): თავად ველი, ან ჯგუფში (რადიო) არჩეული / პირველი ველი.
 * ველი ლეიბლიანად ეკრანის შუაში ჩნდება.
 * @param {string} id
 */
export function focusField(id) {
  const node = document.getElementById(id);
  if (!node) return;
  const target = node.matches('input, select, textarea, button')
    ? node
    : /** @type {HTMLElement | null} */ (
        node.querySelector('input:checked') ?? node.querySelector('input, select, textarea')
      );
  if (!target) return;
  (target.closest('.mc-field') ?? target).scrollIntoView({ block: 'center' });
  target.focus({ preventScroll: true });
}
