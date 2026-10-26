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
