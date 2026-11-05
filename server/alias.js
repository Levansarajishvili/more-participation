import { registerHooks } from 'node:module';

/**
 * `@/` alias Node-ში — frontend-ის საერთო მოდულები (`src/content/*`, `src/i18n/*`) სერვერზე ასლის
 * გარეშე იმპორტდება, იგივე specifier-ით, რაც Vite-ში (`@/content/validate.js`).
 *
 * რატომ არა `package.json`-ის `imports`: Node `imports`-ში მხოლოდ `#`-ით დაწყებულ გასაღებს იღებს
 * (`@/a.js` პაკეტად აღიქმება → `ERR_MODULE_NOT_FOUND`), სამიზნე პაკეტს გარეთ (`../src/*`) ვერ
 * გავა (`ERR_INVALID_PACKAGE_TARGET`), საერთო მოდულები კი თავადაც `@/i18n/…`-ს შემოიტანენ — მათ
 * specifier-ს ვერ შევცვლიდით frontend-ის გადაწერის გარეშე. ამიტომ — resolve hook
 * (`module.registerHooks`, Node ≥ 22.15, სინქრონული, იმავე thread-ში).
 *
 * hook მოქმედებს მხოლოდ ამ მოდულის შესრულების შემდეგ ჩატვირთულ მოდულებზე: entry (`index.js`) მას
 * სტატიკურად შემოიტანს, აპს კი დინამიკური `import()`-ით. Vitest-ში იგივეს `resolve.alias` აკეთებს.
 */

export const ALIAS_PREFIX = '@/';
export const SRC_URL = new URL('../src/', import.meta.url);

/**
 * @param {string} specifier
 * @returns {string | null}  `file:` URL ან null, თუ specifier alias არ არის
 */
export function resolveAlias(specifier) {
  if (!specifier.startsWith(ALIAS_PREFIX)) return null;
  const target = new URL(specifier.slice(ALIAS_PREFIX.length), SRC_URL);
  // `@/../server/x` და მსგავსი `src/`-ს გარეთ არ გავა
  return target.href.startsWith(SRC_URL.href) ? target.href : null;
}

const REGISTERED = Symbol.for('mc.server.alias');

if (!(/** @type {any} */ (globalThis)[REGISTERED])) {
  /** @type {any} */ (globalThis)[REGISTERED] = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(resolveAlias(specifier) ?? specifier, context);
    },
  });
}
